import { Marked, type Tokens } from "marked";
import type { IdScheme } from "./ids.ts";
import { anchorMaker } from "./sections.ts";

export function chipHtml(id: string, ids: IdScheme): string {
  const kind = ids.kindOf(id);
  return `<span class="chip chip-${kind}" data-id="${id}" role="button" tabindex="0" title="${ids.label(kind)} · click to copy">${id}</span>`;
}

export type LinkTarget = { kind: "doc" | "external" | "outside"; href: string };

/**
 * Where a link in a document should go. A sibling `.md` opens in the workbench (at
 * `docHref(slug)`); anything else relative points outside the folder and is shown as text with its
 * path (no dead link).
 */
export function linkTarget(href: string, docHref: (slug: string) => string): LinkTarget {
  if (/^https?:\/\//.test(href)) return { kind: "external", href };
  const sibling = /^(?:\.\/)?([\w-]+)\.md(#.*)?$/.exec(href);
  if (sibling) return { kind: "doc", href: `${docHref(sibling[1] as string)}${sibling[2] ?? ""}` };
  if (href.startsWith("#")) return { kind: "doc", href };
  return { kind: "outside", href };
}

/**
 * A markdown renderer for one workbench: IDs become copyable chips, headings get the same anchors
 * as `parseSections` plus a Prompt button, and sibling `.md` links stay inside the workbench.
 */
export function makeRenderer(opts: {
  ids: IdScheme;
  docHref: (slug: string) => string;
}): (markdown: string) => string {
  const { ids, docHref } = opts;
  const anywhere = new RegExp(ids.atStart.source.slice(1));
  // Headings get the same anchors as parseSections; reset per render so repeats count from one.
  let nextAnchor = anchorMaker();

  const marked = new Marked({
    gfm: true,
    extensions: [
      {
        name: "designId",
        level: "inline",
        start(src) {
          const at = src.search(anywhere);
          return at < 0 ? undefined : at;
        },
        tokenizer(src) {
          const match = ids.atStart.exec(src);
          if (!match) return undefined;
          return { type: "designId", raw: match[0], id: match[0] };
        },
        renderer(token) {
          return chipHtml(token.id as string, ids);
        },
      },
    ],
    renderer: {
      heading({ tokens, depth, text }: Tokens.Heading) {
        const inner = this.parser.parseInline(tokens);
        const anchor = nextAnchor(text);
        const button =
          depth === 1
            ? ""
            : ` <button type="button" class="prompt-btn" data-prompt="sec:${anchor}" title="Start a prompt scoped to this section">Prompt</button>`;
        return `<h${depth} id="${anchor}">${inner}${button}</h${depth}>\n`;
      },
      link({ href, tokens }: Tokens.Link) {
        const inner = this.parser.parseInline(tokens);
        const target = linkTarget(href, docHref);
        if (target.kind === "outside") {
          return `<span class="outside-link" title="Outside this folder: ${href}">${inner}</span>`;
        }
        const ext = target.kind === "external" ? ' target="_blank" rel="noreferrer"' : "";
        return `<a href="${target.href}"${ext}>${inner}</a>`;
      },
    },
  });

  return (markdown) => {
    nextAnchor = anchorMaker();
    return marked.parse(markdown, { async: false });
  };
}
