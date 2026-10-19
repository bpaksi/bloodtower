import { Marked, type Tokens } from "marked";
import { ID_AT_START, idKind, KIND_LABEL } from "./ids.ts";

const ID_ANYWHERE = new RegExp(ID_AT_START.source.slice(1));

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function chipHtml(id: string): string {
  const kind = idKind(id);
  return `<span class="chip chip-${kind}" data-id="${id}" role="button" tabindex="0" title="${KIND_LABEL[kind]} · click to copy">${id}</span>`;
}

/**
 * Where a link in a design doc should go. A sibling `.md` opens in the workbench; anything else
 * relative points outside the design folder and is shown as text with its path (no dead link).
 */
export function linkTarget(href: string): { kind: "doc" | "external" | "outside"; href: string } {
  if (/^https?:\/\//.test(href)) return { kind: "external", href };
  const sibling = /^(?:\.\/)?([\w-]+)\.md(#.*)?$/.exec(href);
  if (sibling) return { kind: "doc", href: `/doc/${sibling[1]}${sibling[2] ?? ""}` };
  if (href.startsWith("#")) return { kind: "doc", href };
  return { kind: "outside", href };
}

const marked = new Marked({
  gfm: true,
  extensions: [
    {
      name: "designId",
      level: "inline",
      start(src) {
        const at = src.search(ID_ANYWHERE);
        return at < 0 ? undefined : at;
      },
      tokenizer(src) {
        const match = ID_AT_START.exec(src);
        if (!match) return undefined;
        return { type: "designId", raw: match[0], id: match[0] };
      },
      renderer(token) {
        return chipHtml(token.id as string);
      },
    },
  ],
  renderer: {
    heading({ tokens, depth, text }: Tokens.Heading) {
      const inner = this.parser.parseInline(tokens);
      return `<h${depth} id="${slugify(text)}">${inner}</h${depth}>\n`;
    },
    link({ href, tokens }: Tokens.Link) {
      const inner = this.parser.parseInline(tokens);
      const target = linkTarget(href);
      if (target.kind === "outside") {
        return `<span class="outside-link" title="Outside the design folder: ${href}">${inner}</span>`;
      }
      const ext = target.kind === "external" ? ' target="_blank" rel="noreferrer"' : "";
      return `<a href="${target.href}"${ext}>${inner}</a>`;
    },
  },
});

export function renderMarkdown(markdown: string): string {
  return marked.parse(markdown, { async: false });
}
