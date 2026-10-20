import { spawn, spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { loadConfig } from "../config.ts";
import { joinHost } from "../lanUrls.ts";
import { lintPath } from "./packLint.ts";
import { formatTimingReport, readRun } from "./timingReport.ts";

/**
 * Guided playtest for the whole game: builds and starts the host, runs the pack lints, walks Bob
 * through every check on the Mac board, the devices and (with --tower) the real tower, and saves
 * the answers after each one to apps/bloodtower/docs/playtests/<stamp>.{json,md}. Failures end up
 * in a paste-ready fix prompt at the bottom of the Markdown file.
 *
 * It never talks to the tower itself: every tower action is a button Bob presses on a device.
 */

const APP_DIR = resolve(import.meta.dirname, "../../..");
const REPO_ROOT = resolve(APP_DIR, "../..");
const RESULTS_DIR = join(APP_DIR, "docs", "playtests");

export type Who = "Mac" | "iPad" | "Phone" | "Tower" | "All";

export interface Check {
  id: string;
  section: string;
  who: Who;
  do: string;
  expect: string;
  /** true: only with --tower. false: only without it. Absent: always. */
  tower?: boolean;
}

export const SECTIONS: Record<string, string> = {
  A: "Landing and sound",
  B: "Join",
  C: "Pick game",
  D: "Game settings",
  E: "Connect tower",
  F: "Tower volume test",
  G: "Claim hunters",
  H: "Setup steps",
  I: "Play",
  J: "Quit",
  K: "Display and safety",
};

/** `{base}`, `{board}` and `{join}` are filled in with this run's URLs. */
export const CHECKS: readonly Check[] = [
  {
    id: "A1",
    section: "A",
    who: "Mac",
    do: "Open {base}/ and choose Story board. Put the window on the TV.",
    expect: "The landing painting fills the screen. The board shows no buttons.",
  },
  {
    id: "A2",
    section: "A",
    who: "Mac",
    do: "Click the board or press a key.",
    expect:
      "The Sound dialog opens in the parchment dialog frame, with Music, Ambient and Voice sliders. The motif sting plays once and the signature bed starts.",
  },
  {
    id: "A3",
    section: "A",
    who: "Mac",
    do: "Press each test button and move each slider, with the mouse and then with Tab and the arrow keys.",
    expect:
      "Each clip plays at its slider's level. Keyboard focus shows a candle-coloured ring, not a grey box.",
  },
  {
    id: "A4",
    section: "A",
    who: "Mac",
    do: "Set the sliders to different levels, press Continue, reload the page and open the Sound dialog again.",
    expect: "The levels you set are still there after the reload.",
  },
  {
    id: "A5",
    section: "A",
    who: "Mac",
    do: "Watch the tower window, the stair lanterns and the lamp post for 20 seconds. Skip if step 2 has not merged.",
    expect:
      "Only those lights flicker, irregularly, and the groups don't change together. Never a strobe, never a smooth pulse.",
  },
  {
    id: "B1",
    section: "B",
    who: "iPad",
    do: "Scan the board's QR code, or open {join} and type the six-digit code.",
    expect: '"Game is loading..." and then Pick Game on the iPad.',
  },
  {
    id: "B2",
    section: "B",
    who: "Phone",
    do: "Join the phone the same way.",
    expect:
      "The phone joins too. Both devices show only text and buttons: no images, and no sound plays on them.",
  },
  {
    id: "C1",
    section: "C",
    who: "Mac",
    do: "Look at the board.",
    expect:
      'Pick Game in the dialog frame: the focused card is large with a 16:9 cover, the title, the tagline and "4 hunters"; the neighbours peek smaller, with no duplicate peek; the summary column and join QR on the right.',
  },
  {
    id: "C2",
    section: "C",
    who: "iPad",
    do: "Press Next and Previous several times.",
    expect: 'The board carousel moves and wraps. The main button reads "Choose <title>".',
  },
  {
    id: "C3",
    section: "C",
    who: "iPad",
    do: "Choose The Count of Vellmoor, then press Continue on Game settings.",
    expect:
      '"Not playable yet". Back returns to Game settings, and Back again returns to Pick Game.',
  },
  {
    id: "C4",
    section: "C",
    who: "All",
    do: "On Proving Ground, press Choose on the iPad and the phone at the same moment.",
    expect: "The first press wins. The game is chosen once and both devices move on together.",
  },
  {
    id: "D1",
    section: "D",
    who: "Mac",
    do: "Look at Game settings.",
    expect:
      'Length (Short, Standard, Long) with Standard selected, and Difficulty (Standard). The summary shows the game; empty rows read "not chosen yet".',
  },
  {
    id: "D2",
    section: "D",
    who: "iPad",
    do: "Pick Long, press Back, then choose Proving Ground again.",
    expect: "The settings are back to their defaults and the summary's settings row is cleared.",
  },
  {
    id: "D3",
    section: "D",
    who: "iPad",
    do: "Pick a length and press Continue.",
    expect: "Connect Tower opens. The summary shows the chosen settings.",
  },
  {
    id: "E1",
    section: "E",
    who: "iPad",
    tower: false,
    do: 'Wait 10 seconds, then press "Play without tower".',
    expect:
      'Nothing connects on its own. "Play without tower" sits next to "Connect tower". After the press the flow moves on and the summary\'s tower row says there is no tower.',
  },
  {
    id: "E2",
    section: "E",
    who: "Tower",
    tower: true,
    do: 'Wait 10 seconds without pressing anything, then press "Connect tower", then Calibrate.',
    expect:
      "The tower does nothing until the press. It connects only on Connect and calibrates only on Calibrate. On a failure it shows the error and does not retry. The board and device show the state.",
  },
  {
    id: "E3",
    section: "E",
    who: "iPad",
    tower: true,
    do: "Press Back on Connect Tower, then Continue to come back.",
    expect: "Back returns to Game settings and the tower stays connected.",
  },
  {
    id: "F1",
    section: "F",
    who: "Mac",
    tower: false,
    do: "On the tower volume test, listen, then answer on the iPad and continue.",
    expect:
      "A room sound check only: the board plays its bed and sliders work. No tower command is sent. Continue goes to Claim Hunters.",
  },
  {
    id: "F2",
    section: "F",
    who: "Tower",
    tower: true,
    do: "Press Play levels. In the note, write what each level sounded like.",
    expect:
      'The tower plays the same sound three times about 4 s apart while the board shows "Level 0", "Level 1", "Level 2". No lights change.',
  },
  {
    id: "F3",
    section: "F",
    who: "Tower",
    tower: true,
    do: "Listen to the balance check.",
    expect:
      'The board reads "Tower over the room sound". The start-up bed ducks while the tower plays and comes back after.',
  },
  {
    id: "F4",
    section: "F",
    who: "iPad",
    tower: true,
    do: "Press Play again, then answer the question, including a write-in.",
    expect:
      "The levels play again. The answer is accepted, the write-in shows on no other device, and Continue goes to Claim Hunters.",
  },
  {
    id: "F5",
    section: "F",
    who: "Mac",
    do: "Open {board}?debug=1 in a second window.",
    expect:
      'The tower-volume-test stat shows the answer, the time and the firmware, or "unavailable" for the firmware. Never 0 or blank.',
  },
  {
    id: "G1",
    section: "G",
    who: "All",
    do: "Look at Claim Hunters on the board and devices.",
    expect:
      "Continue is disabled with the reason until every hunter is held. Portraits show on the board only.",
  },
  {
    id: "G2",
    section: "G",
    who: "All",
    do: 'Claim two hunters on the iPad, then press "Take all" on the phone.',
    expect:
      "The phone takes the rest. The summary lists the hunters per device, and Continue unlocks.",
  },
  {
    id: "H1",
    section: "H",
    who: "All",
    do: "Continue into setup.",
    expect:
      'Three setup dialogs in order, starting with "Lay out the board and orient the kingdoms." (its illustration, or no image while the art is a placeholder). Devices show Done and Back.',
  },
  {
    id: "H2",
    section: "H",
    who: "iPad",
    do: "Press Done on step 1, then Back on step 2.",
    expect: "Back returns to step 1 and the summary's setup count drops.",
  },
  {
    id: "H3",
    section: "H",
    who: "iPad",
    do: "Press Done on every step, then Begin the story.",
    expect: "Play starts on the board.",
  },
  {
    id: "I1",
    section: "I",
    who: "Mac",
    do: "Look at the play screen.",
    expect:
      'Header with Tower and Join as ink panels. Hunter cartouches read Waiting, Away or the device id. Corruption reads "unavailable", never 0.',
  },
  {
    id: "I2",
    section: "I",
    who: "Mac",
    do: "Advance to a picture moment (a still).",
    expect:
      "The picture zooms in from the screen centre in under a second to a full-screen 16:9 frame, with a caption of at most 3 lines. The camera pan runs. The music fades for it.",
  },
  {
    id: "I3",
    section: "I",
    who: "Mac",
    do: "Continue to a text-only moment.",
    expect:
      "The picture zooms back out. A small waiting dialog shows the text and the prompt band, with the waiting music under it.",
  },
  {
    id: "I4",
    section: "I",
    who: "iPad",
    do: "Press Continue quickly, about twice a second, across picture and text moments.",
    expect: "No flashing: never more than 3 bright changes a second, and no jumps mid-zoom.",
  },
  {
    id: "I5",
    section: "I",
    who: "Mac",
    do: 'At the Keeper, watch one line, then press "c" on the Mac twice.',
    expect:
      "The Keeper fills the frame with the caption in the lower third, readable from the couch and clear of the face. c turns captions off and back on.",
  },
  {
    id: "I6",
    section: "I",
    who: "All",
    do: "At a private moment, read both devices.",
    expect: "The private text shows only on the device holding that hunter.",
  },
  {
    id: "I7",
    section: "I",
    who: "Phone",
    do: "Close the phone's tab, wait 10 seconds, then rejoin.",
    expect: "Its hunters read Away on the board, then come back after the rejoin.",
  },
  {
    id: "J1",
    section: "J",
    who: "iPad",
    do: "Quit the game.",
    expect: "The board shows the closing summary and the join block, not the play layout.",
  },
  {
    id: "K1",
    section: "K",
    who: "Mac",
    do: "Resize the board window to about 1180×820, then back to full screen on the TV.",
    expect: "No sideways scrolling at either size. Text is readable from the couch on the TV.",
  },
  {
    id: "K2",
    section: "K",
    who: "Mac",
    do: "Turn on Reduce motion (System Settings > Accessibility > Display), reload the board and step to a picture moment.",
    expect:
      "The window glow holds steady. Pictures fade in over about 0.3 s with no zoom. Dialogs appear without an ink-in.",
  },
  {
    id: "K3",
    section: "K",
    who: "All",
    do: "Think back over the whole run.",
    expect:
      'Nothing physical happened on its own: no auto-connect, auto-calibrate or automatic retry. Unknown values read "unavailable", never 0 or blank.',
  },
];

export type Status = "pass" | "fail" | "skip";

export interface Answer {
  status: Status;
  note?: string;
  at: string;
}

export interface PreflightResult {
  name: string;
  ok: boolean;
  detail: string[];
}

export interface Results {
  version: 1;
  startedAt: string;
  finishedAt?: string;
  git: { sha: string; branch: string; dirty: boolean };
  tower: boolean;
  only?: string[];
  setup: { board?: string; devices?: string; health?: string; server: string };
  preflight: PreflightResult[];
  answers: Record<string, Answer>;
  timingReport?: string[];
}

export interface Args {
  tower: boolean;
  only?: string[];
  resume?: string;
  server: boolean;
  build: boolean;
  check: boolean;
  e2e: boolean;
  help: boolean;
}

export const USAGE = `Usage: pnpm --dir apps/bloodtower playtest [options]

  --tower          Real tower through tower-poc (TOWER_URL=ws://127.0.0.1:4747/ws). Start tower-poc first.
  --only A,F       Run only these sections (${Object.entries(SECTIONS)
    .map(([key, name]) => `${key} ${name}`)
    .join(", ")}).
  --resume <file>  Continue an earlier run's .json file; answered checks are kept.
  --no-server      Use a host that is already running instead of building and starting one.
  --no-build       Start the host without building first.
  --check          Run pnpm check first and record the result.
  --e2e            Run the e2e suite first and record the result.
  --help           Show this text.`;

/** Returns null on a usage error. A bare `--` (pnpm passes it through) is ignored. */
export const parseArgs = (argv: readonly string[]): Args | null => {
  const args: Args = {
    tower: false,
    server: true,
    build: true,
    check: false,
    e2e: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (arg === "--tower") args.tower = true;
    else if (arg === "--no-server") args.server = false;
    else if (arg === "--no-build") args.build = false;
    else if (arg === "--check") args.check = true;
    else if (arg === "--e2e") args.e2e = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--only" || arg === "--resume") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) return null;
      index += 1;
      if (arg === "--resume") args.resume = value;
      else {
        const sections = value.split(",").map((part) => part.trim().toUpperCase());
        if (sections.some((section) => !(section in SECTIONS))) return null;
        args.only = sections;
      }
    } else return null;
  }
  return args;
};

/** The checks this run asks, in order: tower-only checks need --tower, no-tower checks drop with it. */
export const selectChecks = (tower: boolean, only?: readonly string[]): Check[] =>
  CHECKS.filter(
    (check) =>
      (check.tower === undefined || check.tower === tower) &&
      (!only || only.includes(check.section)),
  );

export const fillUrls = (text: string, urls: { base: string; board: string; join: string }) =>
  text
    .replaceAll("{base}", urls.base)
    .replaceAll("{board}", urls.board)
    .replaceAll("{join}", urls.join);

/** Index of the first check without an answer, or checks.length when all are answered. */
export const nextUnanswered = (checks: readonly Check[], answers: Results["answers"]) => {
  const index = checks.findIndex((check) => !answers[check.id]);
  return index === -1 ? checks.length : index;
};

const failuresOf = (checks: readonly Check[], results: Results) =>
  checks.filter((check) => results.answers[check.id]?.status === "fail");

/** A paste-ready prompt for the failures, or null when nothing failed. */
export const fixPrompt = (checks: readonly Check[], results: Results, file: string) => {
  const failures = failuresOf(checks, results);
  if (failures.length === 0) return null;
  const lines = [
    `Fix the failures from the Bloodtower playtest ${file} (commit ${results.git.sha}, ${results.tower ? "real tower" : "mock tower"}).`,
    "",
    "Read CLAUDE.md, docs/sdlc.md and apps/bloodtower/spec.md first. Use the bugfix skill: reproduce each failure with a failing test before the fix. One fix/bloodtower-<slug> branch per failure, or one branch for failures in the same screen and files; say which in each PR. Follow CLAUDE.md Tower safety. If a failure is a hardware or environment problem rather than a code defect, write it up instead of changing code. Each PR body cites the playtest file and the check ids it fixes.",
    "",
    "Failures:",
  ];
  for (const check of failures) {
    const answer = results.answers[check.id];
    lines.push(
      `- ${check.id} (${SECTIONS[check.section]}, ${check.who}). Did: ${check.do} Expected: ${check.expect} Happened: ${answer?.note ?? "no note"}`,
    );
  }
  lines.push("", "Run pnpm check and the affected spec files, push, and open each PR.");
  return lines.join("\n");
};

const cell = (text: string) => text.replaceAll("|", "\\|").replaceAll("\n", " ");

export const renderMarkdown = (checks: readonly Check[], results: Results, file: string) => {
  const count = (status: Status) =>
    checks.filter((check) => results.answers[check.id]?.status === status).length;
  const open = checks.length - count("pass") - count("fail") - count("skip");
  const lines = [
    `# Bloodtower playtest ${results.startedAt.slice(0, 16).replace("T", " ")}`,
    "",
    `- Commit: \`${results.git.sha}\` on \`${results.git.branch}\`${results.git.dirty ? " (uncommitted changes)" : ""}`,
    `- Tower: ${results.tower ? "real tower through tower-poc" : "mock (no tower)"}`,
    `- Sections: ${results.only ? results.only.join(", ") : "all"}`,
    `- Board display: ${results.setup.board || "not recorded"}`,
    `- Devices: ${results.setup.devices || "not recorded"}`,
    `- Host: ${results.setup.server}`,
    `- Health: ${results.setup.health ?? "unavailable"}`,
    `- Result: ${count("pass")} pass, ${count("fail")} fail, ${count("skip")} skip, ${open} not run${results.finishedAt ? "" : " (in progress)"}`,
    "",
  ];
  if (results.preflight.length > 0) {
    lines.push("## Automated checks", "", "| Check | Result |", "|---|---|");
    for (const item of results.preflight) {
      lines.push(`| ${cell(item.name)} | ${item.ok ? "pass" : "**fail**"} |`);
    }
    lines.push("");
    for (const item of results.preflight.filter((entry) => !entry.ok)) {
      lines.push(`### ${item.name}`, "", "```text", ...item.detail, "```", "");
    }
  }
  lines.push(
    "## Checks",
    "",
    "| Id | Section | Who | Expect | Result | Note |",
    "|---|---|---|---|---|---|",
  );
  for (const check of checks) {
    const answer = results.answers[check.id];
    const result = !answer ? "not run" : answer.status === "fail" ? "**FAIL**" : answer.status;
    lines.push(
      `| ${check.id} | ${SECTIONS[check.section]} | ${check.who} | ${cell(check.expect)} | ${result} | ${cell(answer?.note ?? "")} |`,
    );
  }
  lines.push("");
  const prompt = fixPrompt(checks, results, file);
  if (prompt) lines.push("## Fix prompt", "", "```text", prompt, "```", "");
  if (results.timingReport) {
    lines.push(
      "## Timing report (latest session)",
      "",
      "```text",
      ...results.timingReport,
      "```",
      "",
    );
  }
  return lines.join("\n");
};

const git = (...args: string[]) =>
  spawnSync("git", ["-C", REPO_ROOT, ...args], { encoding: "utf8" }).stdout.trim();

const runCommand = (name: string, command: string, args: string[]): PreflightResult => {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const run = spawnSync(command, args, { cwd: REPO_ROOT, encoding: "utf8", stdio: "pipe" });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`.trimEnd().split("\n");
  const ok = run.status === 0;
  console.log(ok ? "  pass" : "  FAIL");
  return { name, ok, detail: output.slice(-40) };
};

const lintPack = (name: string, dir: string): PreflightResult => {
  const report = lintPath(dir, REPO_ROOT);
  console.log(`  pack:lint ${name}: ${report.exitCode === 0 ? "pass" : "FAIL"}`);
  return { name: `pack:lint ${name}`, ok: report.exitCode === 0, detail: report.lines };
};

const health = async (port: number) => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    return response.ok ? await response.text() : undefined;
  } catch {
    return undefined;
  }
};

const waitForHealth = async (port: number, timeoutMs: number) => {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const body = await health(port);
    if (body) return body;
    await new Promise((done) => setTimeout(done, 500));
  }
  return undefined;
};

const stamp = (date: Date) => date.toISOString().slice(0, 16).replace(":", "").replace("T", "-");

const main = async (args: Args) => {
  const config = loadConfig();
  const port = config.port;
  const lan = joinHost("0.0.0.0");
  const urls = {
    base: `http://127.0.0.1:${port}`,
    board: `http://127.0.0.1:${port}/board`,
    join: `http://${lan ?? "127.0.0.1"}:${port}/join`,
  };

  let jsonFile: string;
  let results: Results;
  if (args.resume) {
    // pnpm runs this from the server package, and with --dir INIT_CWD is the app folder, so a
    // relative path is tried from there, from the repo root and from the results folder.
    const resumeFrom = args.resume;
    const bases = [process.env.INIT_CWD ?? process.cwd(), REPO_ROOT, RESULTS_DIR];
    const found = bases.map((base) => resolve(base, resumeFrom)).find((path) => existsSync(path));
    if (!found) throw new Error(`No playtest file ${resumeFrom}.`);
    jsonFile = found;
    results = JSON.parse(readFileSync(jsonFile, "utf8")) as Results;
    results.finishedAt = undefined;
  } else {
    mkdirSync(RESULTS_DIR, { recursive: true });
    const startedAt = new Date();
    jsonFile = join(RESULTS_DIR, `${stamp(startedAt)}${args.tower ? "-tower" : ""}.json`);
    results = {
      version: 1,
      startedAt: startedAt.toISOString(),
      git: {
        sha: git("rev-parse", "--short", "HEAD"),
        branch: git("branch", "--show-current"),
        dirty: git("status", "--porcelain") !== "",
      },
      tower: args.tower,
      only: args.only,
      setup: { server: "" },
      preflight: [],
      answers: {},
    };
  }
  const mdFile = jsonFile.replace(/\.json$/, ".md");
  const shownFile = relative(REPO_ROOT, mdFile);
  const checks = selectChecks(results.tower, results.only);
  const save = () => {
    writeFileSync(jsonFile, `${JSON.stringify(results, null, 2)}\n`);
    writeFileSync(mdFile, renderMarkdown(checks, results, shownFile));
  };

  if (!args.resume) {
    console.log("Automated checks");
    results.preflight.push(lintPack("packs/test", "packs/test"));
    results.preflight.push(lintPack("packs/dracula", "packs/dracula"));
    if (args.check) results.preflight.push(runCommand("pnpm check", "pnpm", ["check"]));
    if (args.e2e) {
      results.preflight.push(runCommand("e2e", "pnpm", ["--dir", "apps/bloodtower", "e2e"]));
    }
    save();
  }

  let child: ReturnType<typeof spawn> | undefined;
  const stopServer = () => {
    // Only the process group this script started; never other dev servers (CLAUDE.md).
    if (child?.pid && child.exitCode === null) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {}
    }
  };
  const running = await health(port);
  if (running) {
    results.setup.server = `already running on port ${port}`;
    results.setup.health = running;
  } else if (!args.server) {
    console.error(`No host answers on port ${port}. Start it, or drop --no-server.`);
    process.exit(1);
  } else {
    if (args.build) {
      const build = runCommand("pnpm build", "pnpm", ["--dir", "apps/bloodtower", "build"]);
      if (!build.ok) {
        results.preflight.push(build);
        save();
        console.error(`Build failed. Details in ${shownFile}.`);
        process.exit(1);
      }
    }
    const logDir = join(config.dataDir, "playtests");
    mkdirSync(logDir, { recursive: true });
    const logFile = join(logDir, `${stamp(new Date())}-server.log`);
    const log = openSync(logFile, "a");
    const env: NodeJS.ProcessEnv = { ...process.env, PORT: String(port) };
    if (results.tower) env.TOWER_URL = "ws://127.0.0.1:4747/ws";
    child = spawn("pnpm", ["--dir", "apps/bloodtower", "start"], {
      cwd: REPO_ROOT,
      env,
      detached: true,
      stdio: ["ignore", log, log],
    });
    closeSync(log);
    process.on("exit", stopServer);
    const body = await waitForHealth(port, 30_000);
    if (!body) {
      stopServer();
      console.error(`The host did not answer /health within 30 s. Log: ${logFile}`);
      process.exit(1);
    }
    results.setup.server = `started by playtest on port ${port}${results.tower ? " with TOWER_URL" : " (mock tower)"}; log ${relative(REPO_ROOT, logFile)}`;
    results.setup.health = body;
  }
  save();

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  // End of input (Ctrl-D) or Ctrl-C counts as "save and quit": a pending question never resolves
  // once the stream closes, so every question races the close.
  const closed = new Promise<null>((done) => rl.once("close", () => done(null)));
  rl.on("SIGINT", () => rl.close());
  const ask = (text: string) => Promise.race([rl.question(text), closed]);

  try {
    console.log(`\nStory board: ${urls.board}`);
    console.log(
      `Join:        ${urls.join}${lan ? "" : "  (no LAN address: connect the Mac to Wi-Fi)"}`,
    );
    if (results.tower) console.log("Tower:       tower-poc must be running on port 4747.");
    if (!args.resume) {
      results.setup.board = (
        (await ask("\nBoard display (e.g. LG TV 1920x1080), Enter to skip: ")) ?? ""
      ).trim();
      results.setup.devices = (
        (await ask("Devices (e.g. iPad Air, iPhone 15), Enter to skip: ")) ?? ""
      ).trim();
      save();
    }

    let index = nextUnanswered(checks, results.answers);
    while (index < checks.length) {
      const check = checks[index] as Check;
      const current = results.answers[check.id];
      console.log(
        `\n[${check.id}] ${index + 1}/${checks.length}  ${SECTIONS[check.section]} · ${check.who}`,
      );
      console.log(`  Do:     ${fillUrls(check.do, urls)}`);
      console.log(`  Expect: ${fillUrls(check.expect, urls)}`);
      if (current)
        console.log(`  Before: ${current.status}${current.note ? ` (${current.note})` : ""}`);
      const reply = await ask(
        "  p pass · f fail · s skip · n pass with note · b back · q save and quit > ",
      );
      const key = reply?.trim().toLowerCase();
      if (key === undefined || key === "q") break;
      if (key === "b") {
        index = Math.max(0, index - 1);
        continue;
      }
      const at = new Date().toISOString();
      if (key === "p" || key === "s") {
        results.answers[check.id] = { status: key === "p" ? "pass" : "skip", at };
      } else if (key === "n" || key === "f") {
        let note: string | null = "";
        while (note === "")
          note = (await ask(key === "f" ? "  What happened? " : "  Note: "))?.trim() ?? null;
        if (note === null) break;
        results.answers[check.id] = { status: key === "f" ? "fail" : "pass", note, at };
      } else {
        console.log("  Type p, f, s, n, b or q.");
        continue;
      }
      save();
      index += 1;
    }
  } finally {
    rl.close();
  }

  if (nextUnanswered(checks, results.answers) === checks.length) {
    results.finishedAt = new Date().toISOString();
  }
  const sqlite = join(config.dataDir, "session.sqlite");
  if (existsSync(sqlite)) {
    try {
      results.timingReport = formatTimingReport(readRun(sqlite));
    } catch (error) {
      results.timingReport = [
        `Timing report unavailable: ${error instanceof Error ? error.message : String(error)}`,
      ];
    }
  }
  save();
  stopServer();

  const failed = failuresOf(checks, results).length;
  console.log(
    `\nSaved ${shownFile}${failed > 0 ? ` with ${failed} failure(s) and a fix prompt at the bottom` : ""}.`,
  );
  if (!results.finishedAt) {
    console.log(
      `Not finished. Continue with: pnpm --dir apps/bloodtower playtest --resume ${relative(REPO_ROOT, jsonFile)}`,
    );
  }
};

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(resolve(entry)).href) {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    console.error(USAGE);
    process.exit(2);
  }
  if (args.help) {
    console.log(USAGE);
    process.exit(0);
  }
  main(args).then(
    () => process.exit(0),
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    },
  );
}
