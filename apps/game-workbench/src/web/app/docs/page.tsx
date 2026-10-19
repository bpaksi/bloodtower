import { PromptScopes } from "@dark-tower/workbench/components";
import Link from "next/link";
import { Chip } from "../../components/Chip.tsx";
import { groupDocs, loadDocs } from "../../lib/content.ts";
import { type IdKind, idKind, KIND_LABEL } from "../../lib/ids.ts";
import type { PromptScope } from "../../lib/prompt.ts";

// Read the folder on every request so edits made through Claude show on reload.
export const dynamic = "force-dynamic";

const CARD_CHIPS = 10;

export default function Home() {
  const docs = loadDocs();
  const groups = groupDocs(docs);
  const allIds = new Set(docs.flatMap((d) => d.ids));
  const byKind = new Map<IdKind, number>();
  for (const id of allIds) byKind.set(idKind(id), (byKind.get(idKind(id)) ?? 0) + 1);

  const scopes: Record<string, PromptScope> = Object.fromEntries(
    docs.map((d) => [
      `doc:${d.slug}`,
      {
        file: `research/game-design/${d.file}`,
        section: [],
        lines: { start: 1, end: d.lines },
        ids: d.ids,
      },
    ]),
  );

  return (
    <>
      <PromptScopes scopes={scopes} />
      <section className="page-head">
        <h1>Game design document</h1>
        <p className="muted">
          Story-neutral design, read from research/game-design. Click an ID to copy it. Use Prompt
          to start a change scoped to a document or section.
        </p>
      </section>

      <dl className="stats">
        <div>
          <dt>Documents</dt>
          <dd>{docs.length}</dd>
        </div>
        <div>
          <dt>Distinct IDs</dt>
          <dd>{allIds.size}</dd>
        </div>
        {[...byKind].map(([kind, n]) => (
          <div key={kind}>
            <dt>
              <span className={`swatch chip-${kind}`} />
              {KIND_LABEL[kind]}
            </dt>
            <dd>{n}</dd>
          </div>
        ))}
      </dl>

      {groups.map((group) => (
        <section key={group.title} className="group">
          <header className="group-head">
            <h2>{group.title}</h2>
            <span className="muted">{group.note}</span>
          </header>
          <div className="cards">
            {group.docs.map((doc) => (
              <article key={doc.slug} className="card">
                <div className="card-top">
                  <span className="mono muted">{doc.file}</span>
                  <button type="button" className="prompt-btn" data-prompt={`doc:${doc.slug}`}>
                    Prompt
                  </button>
                </div>
                <h3>
                  <Link href={`/doc/${doc.slug}`} className="card-link">
                    {doc.title}
                  </Link>
                </h3>
                <p className={doc.status ? "card-status" : "card-status unavailable"}>
                  {doc.status ?? "Status unavailable"}
                </p>
                <p className="card-meta">
                  {doc.lines} lines · {doc.ids.length} IDs
                </p>
                {doc.ids.length > 0 && (
                  <div className="chips">
                    {doc.ids.slice(0, CARD_CHIPS).map((id) => (
                      <Chip key={id} id={id} />
                    ))}
                    {doc.ids.length > CARD_CHIPS && (
                      <span className="chip-more">+{doc.ids.length - CARD_CHIPS}</span>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
