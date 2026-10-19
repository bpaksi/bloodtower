import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "../../../components/Chip.tsx";
import { LineJump } from "../../../components/LineJump.tsx";
import { PromptScopes } from "../../../components/PromptScopes.tsx";
import { loadDoc } from "../../../lib/content.ts";
import { idFamily } from "../../../lib/ids.ts";
import { renderMarkdown } from "../../../lib/markdown.ts";
import type { PromptScope } from "../../../lib/prompt.ts";
import { parseSections } from "../../../lib/sections.ts";

export const dynamic = "force-dynamic";

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = loadDoc(slug);
  if (!doc) notFound();

  const file = `research/game-design/${doc.file}`;
  const sections = parseSections(doc.markdown);
  const scopes: Record<string, PromptScope> = {
    [`doc:${doc.slug}`]: { file, section: [], lines: { start: 1, end: doc.lines }, ids: doc.ids },
  };
  for (const s of sections) {
    scopes[`sec:${s.anchor}`] = {
      file,
      section: s.path,
      lines: { start: s.startLine, end: s.endLine },
      ids: s.ids,
    };
  }

  const families = new Map<string, string[]>();
  const sorted = [...doc.ids].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  for (const id of sorted) {
    const family = idFamily(id);
    families.set(family, [...(families.get(family) ?? []), id]);
  }

  return (
    <div className="doc-layout">
      <PromptScopes scopes={scopes} />
      <LineJump
        sections={sections.map((s) => ({ anchor: s.anchor, start: s.startLine, end: s.endLine }))}
      />
      <article className="doc">
        <div className="doc-bar">
          <nav className="crumbs">
            <Link href="/docs">Documents</Link> / <span className="mono">{doc.file}</span>
          </nav>
          <button type="button" className="prompt-btn" data-prompt={`doc:${doc.slug}`}>
            Prompt (whole doc)
          </button>
        </div>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: trusted local design docs */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.markdown) }} />
      </article>
      <aside className="rail">
        <h2>Document</h2>
        <dl className="rail-meta">
          <dt>File</dt>
          <dd className="mono">{file}</dd>
          <dt>Status</dt>
          <dd className={doc.status ? undefined : "unavailable"}>{doc.status ?? "unavailable"}</dd>
          <dt>Size</dt>
          <dd>{doc.lines} lines</dd>
        </dl>
        <h2>Sections</h2>
        <ol className="toc">
          {sections
            .filter((s) => s.depth > 1 && s.depth <= 3)
            .map((s) => (
              <li key={s.anchor} className={`toc-d${s.depth}`}>
                <a href={`#${s.anchor}`}>{s.title}</a>
                <span className="mono muted">
                  {s.startLine}–{s.endLine}
                </span>
              </li>
            ))}
        </ol>
        <h2>IDs ({doc.ids.length})</h2>
        {[...families].map(([family, ids]) => (
          <div key={family} className="rail-family">
            <h3>{family}</h3>
            <div className="chips">
              {ids.map((id) => (
                <Chip key={id} id={id} />
              ))}
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}
