// Fails when a Bloodtower brief is missing the Brief Gate headings, or when a filled
// brief does not have exactly one of "Cutover: Y" or "Cutover: N". Part of `pnpm check`.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BRIEF_DIR = "apps/bloodtower/plans/briefs";
const TEMPLATE_NAME = "BRIEF-TEMPLATE.md";
const README_NAME = "README.md";

const REQUIRED_HEADINGS = [
  "## Cutover",
  "## Survival invariants",
  "## Done-when (e2e)",
  "## AREA / DEC checklist",
];

const missingHeadings = (text) => REQUIRED_HEADINGS.filter((heading) => !text.includes(heading));

/** Returns one message per violation. An empty list means the briefs pass. */
export const checkBriefs = (root) => {
  const dir = join(root, BRIEF_DIR);
  if (!existsSync(dir)) return [`${BRIEF_DIR}: folder is missing.`];

  const errors = [];
  const files = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();

  if (!files.includes(TEMPLATE_NAME)) {
    errors.push(`${BRIEF_DIR}/${TEMPLATE_NAME}: file is missing.`);
  }

  for (const name of files) {
    const rel = `${BRIEF_DIR}/${name}`;
    const text = readFileSync(join(dir, name), "utf8");
    if (name === README_NAME) continue;

    for (const heading of missingHeadings(text)) {
      errors.push(`${rel}: missing heading "${heading}".`);
    }
    if (name === TEMPLATE_NAME) continue;

    const hasY = text.includes("Cutover: Y");
    const hasN = text.includes("Cutover: N");
    if (hasY === hasN) {
      const found = hasY ? "found both" : "found neither";
      errors.push(`${rel}: need exactly one of "Cutover: Y" or "Cutover: N" (${found}).`);
    }
  }

  return errors;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const errors = checkBriefs(root);
  for (const error of errors) console.error(error);
  if (errors.length > 0) {
    console.error("\nFilled briefs need the Brief Gate headings and one cutover line.");
    console.error("See apps/bloodtower/plans/briefs/README.md.");
    process.exit(1);
  }
}
