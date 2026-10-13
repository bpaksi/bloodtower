// PreToolUse (Edit|Write|MultiEdit|Bash): pinned dependencies stay on their exact version.
// The pins live in scripts/pinned-versions.json. To upgrade one, Bob writes a new intent and changes
// that file himself. This hook is the early warning; `pnpm check` (scripts/check-pins.mjs) is the gate.
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  block,
  commandOf,
  editedPath,
  findShellWrite,
  runGuard,
  splitCommands,
  textAfter,
} from "./lib.mjs";

const PIN_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../scripts/pinned-versions.json",
);
// Read inside the guard, so a pin file that cannot be parsed blocks the call instead of crashing.
let PINS;

const why = (name) =>
  `${name} is pinned to exactly ${PINS[name]} (scripts/pinned-versions.json). An upgrade needs a new intent from Bob.`;

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Every version given for `name` as a `"name": "version"` entry in a package.json text. */
const versionsIn = (text, name) =>
  [...text.matchAll(new RegExp(`"${escapeRegExp(name)}"\\s*:\\s*"([^"]*)"`, "g"))].map(
    (match) => match[1],
  );

const PACKAGE_MANAGERS = new Set(["pnpm", "npm", "yarn", "bun"]);
const ADDING = new Set(["add", "install", "i"]);
const UPDATING = new Set(["up", "update", "upgrade"]);
const REMOVING = new Set(["remove", "rm", "uninstall", "un"]);
const FLAGS_WITH_VALUE = new Set([
  "-F",
  "--filter",
  "-C",
  "--dir",
  "--prefix",
  "--workspace",
  "-w",
]);

const guardShell = (command, cwd) => {
  const reason = findShellWrite(command, cwd, (path) => path === PIN_FILE);
  if (reason) block(`${reason}, the list of pinned versions. Only Bob changes it.`);

  for (const { words } of splitCommands(command)) {
    const { name: manager, args } = commandOf(words);
    if (!PACKAGE_MANAGERS.has(manager)) continue;

    const verb = args.find((word) => ADDING.has(word) || UPDATING.has(word) || REMOVING.has(word));
    const setsField = args.includes("pkg") && (args.includes("set") || args.includes("delete"));
    // Positional words, without the verb and without the value of a flag such as `-F <name>`.
    const packages = args.filter(
      (word, i) =>
        !word.startsWith("-") && word !== verb && !FLAGS_WITH_VALUE.has(args[i - 1] ?? ""),
    );

    for (const name of Object.keys(PINS)) {
      if (setsField && args.some((word) => word.includes(name))) {
        block(`${manager} pkg would rewrite the ${name} entry. ${why(name)}`);
      }
      if (!verb) continue;

      const versioned = packages.find((word) => word.startsWith(`${name}@`));
      if (versioned && versioned !== `${name}@${PINS[name]}`) {
        block(`the command installs ${versioned}. ${why(name)}`);
      }
      if (packages.includes(name)) {
        const effect = REMOVING.has(verb)
          ? "removes it"
          : "names no version, so it would take the latest";
        block(`the command ${effect}. ${why(name)}`);
      }

      const latest = args.some((word) => word === "--latest" || /^-[A-Za-z]*L/.test(word));
      if (UPDATING.has(verb) && latest && packages.length === 0) {
        block(
          `${manager} ${verb} --latest with no package names would move every dependency, including the pin. Name the packages to update. ${why(name)}`,
        );
      }
    }
  }
};

runGuard("pin-guard", (input) => {
  PINS = JSON.parse(readFileSync(PIN_FILE, "utf8"));
  if (input.tool_name === "Bash") return guardShell(input.tool_input?.command ?? "", input.cwd);

  const file = editedPath(input);
  if (!file) return;
  const path = resolve(input.cwd || ".", file);
  if (path === PIN_FILE) block(`${file} is the list of pinned versions. Only Bob changes it.`);
  if (basename(path) !== "package.json") return;

  const before = existsSync(path) ? readFileSync(path, "utf8") : "";
  const after = textAfter(input, before);

  for (const name of Object.keys(PINS)) {
    const wrong = versionsIn(after, name).find((version) => version !== PINS[name]);
    if (wrong !== undefined) block(`the edit sets ${name} to "${wrong}". ${why(name)}`);
    if (versionsIn(before, name).length > 0 && versionsIn(after, name).length === 0) {
      block(`the edit removes the ${name} entry. ${why(name)}`);
    }
  }
});
