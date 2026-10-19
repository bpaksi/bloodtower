import Link from "next/link";
import { Chip } from "../components/Chip.tsx";
import { groupDocs, loadDocs } from "../lib/content.ts";
import { type IdKind, idKind, KIND_LABEL } from "../lib/ids.ts";

// Read the folder on every request so edits made through Claude show on reload.
export const dynamic = "force-dynamic";

const CARD_CHIPS = 10;

export default function Home() {
  const docs = loadDocs();
  const groups = groupDocs(docs);
  const allIds = new Set(docs.flatMap((d) => d.ids));
  const byKind = new Map<IdKind, number>();
  for (const id of allIds) byKind.set(idKind(id), (byKind.get(idKind(id)) ?? 0) + 1);

  return (
    <>
      <section className="hero">
        <p className="kicker">Game design document · story-neutral</p>
        <h1>The Design Codex</h1>
        <p className="lede">
          Everything about how the game works, apart from any one story. Every piece carries an ID:
          click one to copy it, then name it in chat.
        </p>
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
      </section>

      {groups.map((group) => (
        <section key={group.title} className="group">
          <header className="group-head">
            <h2>{group.title}</h2>
            <p>{group.note}</p>
          </header>
          <div className="cards">
            {group.docs.map((doc) => (
              <Link key={doc.slug} href={`/doc/${doc.slug}`} className="card">
                <span className="card-file">{doc.file}</span>
                <h3>{doc.title}</h3>
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
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
