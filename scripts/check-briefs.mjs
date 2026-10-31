// Fails when a Bloodtower brief is missing the Brief Gate headings, when a filled
// brief does not have exactly one of "Cutover: Y" or "Cutover: N", or when a
// feature folder briefs/<plan>/##-<feature>/ is missing plan.md, eval.md,
// approval.md, a complete eval, or mockup.html after plan.md names a screen change.
// Legacy flat briefs at the briefs root, including *-step-*.md, keep the heading
// and cutover rules. Templates and README are excluded from the filled-file rules.
// Part of `pnpm check`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BRIEF_DIR = "apps/bloodtower/plans/briefs";
const TEMPLATE_NAME = "BRIEF-TEMPLATE.md";
const README_NAME = "README.md";
const FEATURE_DIR = /^\d{2}-/;
const MOCKUP_FILE = "mockup.html";
const EV_FIELDS = ["Requirement", "Method", "How", "Pass evidence", "Fails if"];
const METHODS = new Set(["unit", "playwright", "screenshot"]);

const REQUIRED_HEADINGS = [
  "## Cutover",
  "## Survival invariants",
  "## Done-when (e2e)",
  "## AREA / DEC checklist",
];

const missingHeadings = (text) => REQUIRED_HEADINGS.filter((heading) => !text.includes(heading));

const errno = (error) =>
  typeof error === "object" && error !== null && "code" in error ? error.code : undefined;

const statKind = (path) => {
  try {
    const stat = statSync(path);
    if (stat.isDirectory()) return "dir";
    if (stat.isFile()) return "file";
    return "other";
  } catch (error) {
    if (errno(error) === "ENOENT") return "missing";
    throw error;
  }
};

const readDir = (path) => {
  try {
    return readdirSync(path, { withFileTypes: true });
  } catch (error) {
    if (errno(error) === "ENOENT") return null;
    throw error;
  }
};

const readFileIfFile = (path) => (statKind(path) === "file" ? readFileSync(path, "utf8") : null);

const headingErrors = (rel, text) =>
  missingHeadings(text).map((heading) => `${rel}: missing heading "${heading}".`);

const cutoverError = (rel, text) => {
  const hasY = text.includes("Cutover: Y");
  const hasN = text.includes("Cutover: N");
  if (hasY !== hasN) return null;
  const found = hasY ? "found both" : "found neither";
  return `${rel}: need exactly one of "Cutover: Y" or "Cutover: N" (${found}).`;
};

const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fieldValue = (body, label) => {
  // Spaces and tabs only: \s would swallow the next line and hide a blank field.
  const match = body.match(new RegExp(`^[ \\t]*[-*][ \\t]+${escapeRe(label)}:[ \\t]*(.*)$`, "im"));
  if (!match) return null;
  return match[1].trim();
};

const safeFileName = (token) => {
  if (!token || token.includes("..") || token.includes("\\") || token.startsWith("/")) return null;
  const name = token.startsWith("./") ? token.slice(2) : token;
  if (!name || name === "." || name === ".." || name.includes("/") || name.includes("..")) {
    return null;
  }
  if (!/^[\w.-]+$/.test(name)) return null;
  return name;
};

// A Mockup line declares a screen change unless the value starts with "none".
// Screen changes need mockup.html in the feature folder. Any other file the
// line names must be present too, and a path that leaves the folder fails.
const declaredMockupErrors = (folder, rel, text) => {
  const errors = [];
  let screenChange = false;
  let outside = false;
  const named = new Set();
  const lineRe = /^[ \t]*(?:[-*][ \t]+)?Mockup:[ \t]*(.+)$/gim;
  for (const match of text.matchAll(lineRe)) {
    const value = match[1].trim();
    if (/^none\b/i.test(value)) continue;
    screenChange = true;
    const token = value
      .split("|")[0]
      .trim()
      .split(/\s+/)[0]
      .replace(/^["']|["']$/g, "");
    if (!token || /^none$/i.test(token)) continue;
    const name = safeFileName(token);
    if (name === null) {
      outside = true;
      continue;
    }
    named.add(name);
  }
  if (outside) errors.push(`${rel}: Mockup names a file outside the feature folder.`);
  if (screenChange) named.add(MOCKUP_FILE);
  for (const name of [...named].sort()) {
    if (statKind(join(folder, name)) !== "file") {
      errors.push(`${rel}: Mockup names missing file "${name}".`);
    }
  }
  return errors;
};

const parseEvs = (text) => {
  const heading = /^#{2,6}[ \t]+(EV-\d+)\b.*$/gm;
  const matches = [...text.matchAll(heading)];
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
    return { id: match[1], body: text.slice(start, end) };
  });
};

const evalErrors = (rel, mockupRel, text, hasMockup) => {
  const errors = [];
  const evs = parseEvs(text);
  let screenshot = false;
  if (evs.length === 0) {
    errors.push(`${rel}: no EV ids.`);
  } else {
    const seen = new Set();
    const dupes = [];
    for (const ev of evs) {
      if (seen.has(ev.id) && !dupes.includes(ev.id)) dupes.push(ev.id);
      seen.add(ev.id);
    }
    for (const id of dupes) errors.push(`${rel}: duplicate EV id "${id}".`);
    for (const ev of evs) {
      for (const label of EV_FIELDS) {
        if (label === "Method") continue;
        const value = fieldValue(ev.body, label);
        if (value === null || value === "") errors.push(`${rel}: ${ev.id} missing ${label}.`);
      }
      const method = fieldValue(ev.body, "Method");
      if (method === null || method === "") {
        errors.push(`${rel}: ${ev.id} missing Method.`);
      } else if (!METHODS.has(method.toLowerCase())) {
        errors.push(
          `${rel}: ${ev.id} Method must be unit, playwright, or screenshot (found ${JSON.stringify(method)}).`,
        );
      } else if (method.toLowerCase() === "screenshot") {
        screenshot = true;
      }
    }
  }
  if (hasMockup && !screenshot) {
    errors.push(`${mockupRel}: no EV with method screenshot.`);
  }
  return errors;
};

const splitRow = (line) => {
  const trimmed = line.trim();
  const body = trimmed.endsWith("|") ? trimmed.slice(1, -1) : trimmed.slice(1);
  return body.split("|").map((cell) => cell.trim());
};

const isSeparatorRow = (cells) =>
  cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));

const isHeaderRow = (cells) =>
  cells.some((cell) => /^item$/i.test(cell) || /^approved by$/i.test(cell));

const isApprover = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^<[^>]+>$/.test(trimmed)) return false;
  return !/^(?:n\/a|na|none|tbd|todo|-+|—+|–+)$/i.test(trimmed);
};

const isDate = (value) =>
  /\d{4}-\d{2}-\d{2}/.test(value) || /\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(value);

const approvalRows = (text) => {
  let approverIdx = 1;
  let whenIdx = 2;
  const rows = [];
  for (const line of text.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = splitRow(line);
    if (isSeparatorRow(cells)) continue;
    if (isHeaderRow(cells)) {
      const by = cells.findIndex((cell) => /^approved by$/i.test(cell));
      const when = cells.findIndex((cell) => /^when\b/i.test(cell));
      if (by !== -1) approverIdx = by;
      if (when !== -1) whenIdx = when;
      continue;
    }
    rows.push({ by: cells[approverIdx] ?? "", when: cells[whenIdx] ?? "" });
  }
  return rows;
};

const approvalErrors = (rel, text) => {
  const rows = approvalRows(text);
  if (rows.some((row) => isApprover(row.by) && isDate(row.when))) return [];
  const errors = [];
  const anyBy = rows.some((row) => isApprover(row.by));
  const anyWhen = rows.some((row) => isDate(row.when));
  if (!anyBy) errors.push(`${rel}: no approver.`);
  if (!anyWhen) errors.push(`${rel}: no date.`);
  if (anyBy && anyWhen) errors.push(`${rel}: no row with both an approver and a date.`);
  return errors;
};

const checkLegacyFile = (dir, name) => {
  const rel = `${BRIEF_DIR}/${name}`;
  if (name === README_NAME) return [];
  if (name.endsWith("TEMPLATE.md") && name !== TEMPLATE_NAME) return [];
  const text = readFileSync(join(dir, name), "utf8");
  const errors = headingErrors(rel, text);
  if (name === TEMPLATE_NAME) return errors;
  const cutover = cutoverError(rel, text);
  if (cutover) errors.push(cutover);
  return errors;
};

const checkFeature = (planDir, plan, feature) => {
  const errors = [];
  const folder = join(planDir, feature);
  const relFolder = `${BRIEF_DIR}/${plan}/${feature}`;
  const planText = readFileIfFile(join(folder, "plan.md"));
  const evalText = readFileIfFile(join(folder, "eval.md"));
  const approvalText = readFileIfFile(join(folder, "approval.md"));
  const hasMockup = statKind(join(folder, MOCKUP_FILE)) === "file";

  if (planText === null) errors.push(`${relFolder}: missing plan.md.`);
  if (evalText === null) errors.push(`${relFolder}: missing eval.md.`);
  if (approvalText === null) errors.push(`${relFolder}: missing approval.md.`);

  if (planText !== null) {
    const rel = `${relFolder}/plan.md`;
    errors.push(...headingErrors(rel, planText));
    const cutover = cutoverError(rel, planText);
    if (cutover) errors.push(cutover);
    errors.push(...declaredMockupErrors(folder, rel, planText));
  }
  if (evalText !== null) {
    errors.push(
      ...evalErrors(`${relFolder}/eval.md`, `${relFolder}/${MOCKUP_FILE}`, evalText, hasMockup),
    );
  }
  if (approvalText !== null)
    errors.push(...approvalErrors(`${relFolder}/approval.md`, approvalText));
  return errors;
};

/** Returns one message per violation. An empty list means the briefs pass. */
export const checkBriefs = (root) => {
  const dir = join(root, BRIEF_DIR);
  if (statKind(dir) !== "dir") return [`${BRIEF_DIR}: folder is missing.`];

  const errors = [];
  if (statKind(join(dir, TEMPLATE_NAME)) !== "file") {
    errors.push(`${BRIEF_DIR}/${TEMPLATE_NAME}: file is missing.`);
  }

  const entries = readDir(dir) ?? [];
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
  for (const name of files) errors.push(...checkLegacyFile(dir, name));

  const plans = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const plan of plans) {
    const planDir = join(dir, plan);
    const features = (readDir(planDir) ?? [])
      .filter((entry) => entry.isDirectory() && FEATURE_DIR.test(entry.name))
      .map((entry) => entry.name)
      .sort();
    for (const feature of features) errors.push(...checkFeature(planDir, plan, feature));
  }

  return errors;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const errors = checkBriefs(root);
  for (const error of errors) console.error(error);
  if (errors.length > 0) {
    console.error("\nFilled briefs need the Brief Gate headings and one cutover line.");
    console.error(
      "Feature folders need plan.md, eval.md, and approval.md, plus mockup.html when the brief names a screen change.",
    );
    console.error("See apps/bloodtower/plans/briefs/README.md.");
    process.exit(1);
  }
}
