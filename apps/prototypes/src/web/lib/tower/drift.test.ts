import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CALIBRATION_STATES,
  CAPABILITY_IDS,
  CLIENT_TYPES,
  CONNECTION_STATES,
  ERROR_CODES,
  LIFECYCLE_STAGES,
  PAYLOAD_FIELDS,
  PROTOCOL_VERSION,
  SERVER_TYPES,
} from "./types.ts";

// Reads tower-poc's protocols as text. Importing from another app is not allowed.
const dir = resolve(import.meta.dirname, "../../../../../tower-poc/src/protocols");
const read = (file: string) =>
  readFileSync(resolve(dir, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** The text inside the balanced brackets that open at or after `from`. */
const balanced = (text: string, from: number, open: string, close: string) => {
  const start = text.indexOf(open, from);
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === open) depth++;
    if (text[i] === close && --depth === 0) return text.slice(start + 1, i);
  }
  throw new Error(`Unbalanced ${open} after ${from}`);
};

const enumValues = (file: string, name: string) => {
  const text = read(file);
  const at = text.indexOf(`export const ${name} =`);
  if (at < 0) throw new Error(`${name} not found in ${file}`);
  const body = balanced(text, text.indexOf("z.enum(", at), "[", "]");
  return [...body.matchAll(/"([^"]+)"/g)].map((m) => m[1] as string);
};

/** Top-level keys of the first `{...}` object literal after `export const name =`. */
const fieldNames = (file: string, name: string) => {
  const text = read(file);
  const at = text.indexOf(`export const ${name} =`);
  if (at < 0) throw new Error(`${name} not found in ${file}`);
  const body = balanced(text, at, "{", "}");
  const keys: string[] = [];
  let line = "";
  for (const ch of `${body}\n`) {
    if (ch === "\n") {
      const m = line.match(/^\s*(\w+):/);
      if (m && lineDepthZero(line)) keys.push(m[1] as string);
      line = "";
    } else line += ch;
  }
  return keys;
};
// Keys are found by line start; nested keys sit deeper than the first indent level.
const lineDepthZero = (line: string) => {
  const indent = line.match(/^\s*/)?.[0].length ?? 0;
  return indent === 2 || indent === 4;
};

const sorted = (xs: readonly string[]) => [...xs].sort();

describe("drift against tower-poc/src/protocols", () => {
  it("has the same protocol version", () => {
    expect(read("envelope.ts")).toContain(`PROTOCOL_VERSION = ${PROTOCOL_VERSION};`);
  });

  it("has every copied message type in the right direction", () => {
    const messages = read("messages.ts");
    const defined = [...messages.matchAll(/message\(\s*"([^"]+)"/g)].map((m) => m[1] as string);
    const clientUnion = balanced(messages, messages.indexOf("clientMessageSchema ="), "[", "]");
    const serverUnion = balanced(messages, messages.indexOf("serverMessageSchema ="), "[", "]");
    for (const type of CLIENT_TYPES) {
      expect(defined, `client type ${type}`).toContain(type);
      expect(clientUnion, `client type ${type}`).toContain(`${camel(type)}MessageSchema`);
    }
    for (const type of SERVER_TYPES) {
      expect(defined, `server type ${type}`).toContain(type);
      expect(serverUnion, `server type ${type}`).toContain(`${camel(type)}MessageSchema`);
    }
  });

  it("has the same enums", () => {
    expect(sorted(LIFECYCLE_STAGES)).toEqual(
      sorted(enumValues("command.ts", "lifecycleStageSchema")),
    );
    expect(sorted(CONNECTION_STATES)).toEqual(
      sorted(enumValues("connection.ts", "connectionStateSchema")),
    );
    expect(sorted(CALIBRATION_STATES)).toEqual(
      sorted(enumValues("connection.ts", "calibrationStateSchema")),
    );
    expect(sorted(ERROR_CODES)).toEqual(sorted(enumValues("messages.ts", "errorCodeSchema")));
  });

  it("has the same end stages", async () => {
    const { END_STAGES } = await import("./types.ts");
    const text = read("command.ts");
    const body = balanced(
      text,
      text.indexOf("= [", text.indexOf("export const END_STAGES")),
      "[",
      "]",
    );
    const theirs = [...body.matchAll(/"([^"]+)"/g)].map((m) => m[1] as string);
    expect(sorted(END_STAGES)).toEqual(sorted(theirs));
  });

  it("has the same payload fields", () => {
    const files: Record<string, string> = {
      helloPayloadSchema: "messages.ts",
      commandPayloadSchema: "command.ts",
      commandLifecyclePayloadSchema: "command.ts",
      connectionPayloadSchema: "connection.ts",
      errorPayloadSchema: "messages.ts",
      envelopeSchema: "envelope.ts",
    };
    for (const [name, fields] of Object.entries(PAYLOAD_FIELDS)) {
      expect(sorted(fieldNames(files[name] as string, name)), name).toEqual(sorted(fields));
    }
  });

  it("names only capability ids that exist and can be commanded", () => {
    const inventory = read("inventory.ts");
    for (const id of CAPABILITY_IDS) {
      const at = inventory.indexOf(`id: "${id}"`);
      expect(at, `capability ${id}`).toBeGreaterThan(-1);
      const entry = inventory.slice(at, at + 900);
      expect(entry, `${id} is a command`).toContain('kind: "command"');
      expect(entry, `${id} is offered`).toMatch(/availability: "(available|requires-calibration)"/);
    }
  });

  it("carries no raw bytes: command is { capabilityId, params } only", () => {
    expect(PAYLOAD_FIELDS.commandPayloadSchema).toEqual(["capabilityId", "params"]);
    expect(CLIENT_TYPES).not.toContain("raw");
  });
});

/** "command.lifecycle" -> "commandLifecycle" */
function camel(type: string) {
  return type.replace(/\.(\w)/g, (_, c: string) => c.toUpperCase());
}
