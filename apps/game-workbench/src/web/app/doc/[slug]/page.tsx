import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "../../../components/Chip.tsx";
import { loadDoc } from "../../../lib/content.ts";
import { idFamily } from "../../../lib/ids.ts";
import { renderMarkdown } from "../../../lib/markdown.ts";

export const dynamic = "force-dynamic";

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = loadDoc(slug);
  if (!doc) notFound();

  const families = new Map<string, string[]>();
  const sorted = [...doc.ids].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  for (const id of sorted) {
    const family = idFamily(id);
    families.set(family, [...(families.get(family) ?? []), id]);
  }

  return (
    <div className="doc-layout">
      <article className="page">
        <nav className="crumbs">
          <Link href="/">Design document</Link> / <span>{doc.file}</span>
        </nav>
        {/* Our own repo markdown, rendered on the server. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: trusted local design docs */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.markdown) }} />
      </article>
      <aside className="rail">
        <h2>This document</h2>
        <dl className="rail-meta">
          <dt>File</dt>
          <dd>research/game-design/{doc.file}</dd>
          <dt>Status</dt>
          <dd className={doc.status ? undefined : "unavailable"}>{doc.status ?? "unavailable"}</dd>
          <dt>Size</dt>
          <dd>{doc.lines} lines</dd>
        </dl>
        <h2>IDs here ({doc.ids.length})</h2>
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
