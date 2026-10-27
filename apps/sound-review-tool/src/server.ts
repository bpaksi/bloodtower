// Local-only server for the sound review tool. Serves the page, keeps Bob's descriptions in
// ~/Desktop/sound-feel.json, saved on every change, and reaches the tower only through
// `ReviewTower`. That file is the tool's output; there is no export.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { dirname, extname, join } from "node:path";
import { SOUND_CATALOG, SOUND_COUNT } from "@dark-tower/tower";
import { SessionStateError } from "@dark-tower/tower/runtime";
import {
  applyChange,
  type Draft,
  isReviewed,
  ModelError,
  type SoundChange,
  TONES,
} from "./model.ts";
import { type ReviewTower, type TowerAction, TowerRequestError } from "./tower.ts";

export interface ServerOptions {
  tower: ReviewTower;
  draft: Draft;
  /** What was wrong with the saved draft when it was loaded, shown on the page. */
  loadProblems?: readonly string[];
  /** Where the draft is saved after each change. */
  draftPath: string;
  publicDir: string;
  port: number;
  now?: () => number;
}

/** An error the page shows to Bob with its code. */
interface Problem {
  code: string;
  message: string;
}

const ACTIONS: readonly TowerAction[] = ["connect", "reconnect", "disconnect", "calibrate"];
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};
const BODY_LIMIT = 16_384;

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

const readBody = (req: IncomingMessage) =>
  new Promise<unknown>((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => {
      raw += chunk;
      if (raw.length > BODY_LIMIT) {
        reject(new ModelError("too-large", "The request is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new ModelError("bad-json", "The request is not JSON."));
      }
    });
    req.on("error", reject);
  });

/** A refusal with a code, or undefined for an error nobody expected. */
const problemOf = (error: unknown): Problem | undefined => {
  if (error instanceof ModelError || error instanceof TowerRequestError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof SessionStateError) {
    return { code: `cannot-${error.action}`, message: error.message };
  }
  return undefined;
};

export const startServer = async (options: ServerOptions): Promise<Server> => {
  const { tower, draft, draftPath, publicDir } = options;
  const loadProblems = options.loadProblems ?? [];
  const now = options.now ?? Date.now;

  const write = async () => {
    await mkdir(dirname(draftPath), { recursive: true });
    const tmp = `${draftPath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(draft, null, 2)}\n`);
    await rename(tmp, draftPath);
  };
  // One write at a time, so two saves never share the temp file. Each writes the whole draft as it
  // is then; a failed write is reported to its own caller, and the next save writes again.
  let queue: Promise<void> = Promise.resolve();
  const save = () => {
    const run = queue.then(write, write);
    queue = run;
    return run;
  };

  const state = () => ({
    file: draftPath,
    problems: loadProblems,
    connection: tower.status(),
    busy: tower.busy(),
    tones: TONES,
    sounds: SOUND_CATALOG.map((sound) => ({ ...sound, record: draft.sounds[String(sound.index)] })),
    reviewed: SOUND_CATALOG.filter((sound) => isReviewed(draft.sounds[String(sound.index)])).length,
    total: SOUND_COUNT,
  });

  const route = async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = url.pathname;

    // Only this tool's own page may use the API: another page open in the browser must not reach
    // the tower (tower-poc D20). The Host check stops a rebound DNS name; Origin, which a browser
    // sends on every POST, stops another site; JSON-only bodies stop a form or a no-preflight post.
    if (path.startsWith("/api/")) {
      const refusal = refuseForeign(req, (server.address() as AddressInfo | null)?.port);
      if (refusal) {
        console.error(`Refused ${req.method} ${req.url}: [${refusal.code}] ${refusal.message}`);
        return send(res, 403, { error: refusal });
      }
    }

    if (req.method === "GET" && path === "/api/state") return send(res, 200, state());

    if (req.method === "POST" && path.startsWith("/api/tower/")) {
      const action = path.slice("/api/tower/".length) as TowerAction;
      if (!ACTIONS.includes(action)) return send(res, 404, { error: notFound });
      await tower.act(action);
      return send(res, 200, state());
    }

    if (req.method === "POST" && path === "/api/command") {
      const body = (await readBody(req)) as { capabilityId?: unknown; params?: unknown };
      const result = await tower.command(String(body.capabilityId), body.params);
      return send(res, 200, { ...result, ...state() });
    }

    if (req.method === "POST" && path === "/api/sound") {
      const change = (await readBody(req)) as SoundChange;
      applyChange(draft, change, SOUND_COUNT, now());
      await save();
      return send(res, 200, state());
    }

    if (req.method === "GET") {
      const file = path === "/" ? "index.html" : path.slice(1);
      const type = TYPES[extname(file)];
      // Only the page's own files, by name: no folders, so no path can leave public/.
      if (!type || file.includes("/") || file.includes("..")) {
        return send(res, 404, { error: notFound });
      }
      try {
        const body = await readFile(join(publicDir, file));
        res.writeHead(200, { "content-type": type });
        return res.end(body);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return send(res, 404, { error: notFound });
        }
        throw error;
      }
    }
    return send(res, 405, { error: { code: "bad-method", message: "Method not allowed." } });
  };

  const server = createServer((req, res) => {
    route(req, res).catch((error: unknown) => {
      const problem = problemOf(error);
      if (problem) {
        console.error(`Refused ${req.method} ${req.url}: [${problem.code}] ${problem.message}`);
        return send(res, 409, { error: problem, ...state() });
      }
      console.error(`Failed ${req.method} ${req.url}:`, error);
      const message = error instanceof Error ? error.message : String(error);
      return send(res, 500, { error: { code: "server-error", message }, ...state() });
    });
  });
  await new Promise<void>((resolve) => server.listen(options.port, "127.0.0.1", resolve));
  return server;
};

const notFound: Problem = { code: "not-found", message: "Not found." };

const LOCAL_HOSTS = ["127.0.0.1", "localhost"];

/**
 * Why an API request does not come from this tool's own page, or undefined when it does. Exported
 * for the tests.
 */
export const refuseForeign = (
  req: IncomingMessage,
  port: number | undefined,
): Problem | undefined => {
  const own = LOCAL_HOSTS.map((name) => `${name}:${port}`);
  const host = req.headers.host;
  if (!host || !own.includes(host)) {
    return { code: "foreign-host", message: `This tool only answers on 127.0.0.1:${port}.` };
  }
  if (req.method === "GET") return undefined;
  const origin = req.headers.origin;
  if (!origin || !own.map((name) => `http://${name}`).includes(origin)) {
    return { code: "foreign-origin", message: "Only the tool's own page may change anything." };
  }
  const type = req.headers["content-type"]?.split(";")[0]?.trim();
  const length = req.headers["content-length"];
  const hasBody =
    req.headers["transfer-encoding"] !== undefined || (length !== undefined && length !== "0");
  if (hasBody && type !== "application/json") {
    return { code: "not-json", message: "The request body must be application/json." };
  }
  return undefined;
};
