// Decides which CI jobs a change needs, from the list of paths it touches. Used by the
// `scope` job in .github/workflows/check.yml: paths come in on stdin, one per line, and the
// answers go out as `name=value` lines for $GITHUB_OUTPUT.
//
//   needs_full_ci  a path outside the lite allowlist changed: run `pnpm check`
//   needs_cards    lite change that touches the design cards: run `pnpm check:cards`
//   needs_packs    lite change that touches a story pack: run `pnpm check:packs`
//   needs_e2e      a path that can reach the Bloodtower build changed: run the Playwright suite
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Lite CI (Bob / Warden, 2026-10-25/26): a change that stays in these trees skips `pnpm check`. */
export const LITE_TREES = [
  "research/game-design",
  "docs",
  "packs",
  "assets/stories",
  "assets/app-icon",
];

const CARDS_TREE = "research/game-design";
const PACKS_TREE = "packs";

/** Trees the Bloodtower build and its e2e run never read. `packs` is not one: the host loads it. */
const E2E_SAFE_TREES = ["research", "docs", "assets/stories", "assets/app-icon", ".claude"];

const under = (path, tree) => path === tree || path.startsWith(`${tree}/`);

/** Another app's folder. Apps never import each other (scripts/check-imports.mjs). */
const otherApp = (path) => under(path, "apps") && !under(path, "apps/bloodtower");

const rootMarkdown = (path) => !path.includes("/") && path.endsWith(".md");

const e2eSafe = (path) =>
  E2E_SAFE_TREES.some((tree) => under(path, tree)) || otherApp(path) || rootMarkdown(path);

/** `paths` is every path the change touches. Blank entries are ignored. */
export const classify = (paths) => {
  const changed = [...new Set(paths.map((path) => path.trim()).filter(Boolean))];
  const outside = changed.filter((path) => !LITE_TREES.some((tree) => under(path, tree)));
  const full = outside.length > 0;
  return {
    needs_full_ci: full,
    needs_cards: !full && changed.some((path) => under(path, CARDS_TREE)),
    needs_packs: !full && changed.some((path) => under(path, PACKS_TREE)),
    needs_e2e: changed.some((path) => !e2eSafe(path)),
    count: changed.length,
    outside,
  };
};

/** One sentence for the job summary. */
export const describe = (scope) => {
  const runs = [
    scope.needs_full_ci && "pnpm check",
    scope.needs_cards && "the card lint",
    scope.needs_packs && "the pack checks",
    scope.needs_e2e && "the e2e suite",
  ].filter(Boolean);
  const why = scope.needs_full_ci
    ? "A changed path is outside the docs/design/packs allowlist."
    : `Every changed path is docs, game-design, packs, story scripts, or app icons (${scope.count} paths).`;
  return `${why} Runs: ${runs.length > 0 ? runs.join(", ") : "Gitleaks only"}.`;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const scope = classify(readFileSync(0, "utf8").split("\n"));
  for (const name of ["needs_full_ci", "needs_cards", "needs_packs", "needs_e2e"]) {
    console.log(`${name}=${scope[name]}`);
  }
  console.log(`detail=${describe(scope)}`);
  if (scope.outside.length > 0) {
    console.error("Paths outside the lite allowlist:");
    for (const path of scope.outside.slice(0, 40)) console.error(`  ${path}`);
  }
}
