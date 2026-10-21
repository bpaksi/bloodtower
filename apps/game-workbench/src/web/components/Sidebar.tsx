import { PanelToggle } from "@dark-tower/workbench/components";
import Link from "next/link";
import { loadCards } from "../lib/cards.ts";
import { CARD_TYPES } from "../lib/graph-types.ts";
import { KIND_LABEL } from "../lib/ids.ts";

const TYPE_LABEL: Record<string, string> = {
  ...KIND_LABEL,
  area: "Areas",
  question: "Questions",
  option: "Options",
  idea: "Ideas",
  piece: "RtDT pieces",
};

export function Sidebar() {
  const { cards } = loadCards();
  return (
    <nav className="sidebar" aria-label="Sections">
      <PanelToggle side="left" />
      <div className="panel-body">
        <Link href="/" className="brand">
          <span className="brand-title">Game Workbench</span>
          <span className="brand-sub">Return to Dark Tower · design</span>
        </Link>
        <ul>
          <li>
            <Link href="/map" className="nav-item">
              Map and progress
            </Link>
          </li>
          <li>
            <Link href="/" className="nav-item">
              Graph
            </Link>
          </li>
          <li>
            <Link href="/docs" className="nav-item">
              Documents
            </Link>
          </li>
        </ul>
        <div className="card-index">
          {CARD_TYPES.map((type) => {
            const ofType = cards.filter((c) => c.type === type);
            if (ofType.length === 0) return null;
            return (
              <section key={type}>
                <h2>
                  <span className={`swatch chip-${type}`} />
                  {TYPE_LABEL[type] ?? type} <span className="muted">{ofType.length}</span>
                </h2>
                <ul>
                  {ofType.map((c) => (
                    <li key={c.id}>
                      <Link href={`/?focus=${c.id}`} className={`card-item st-${c.status}`}>
                        <span className="mono">{c.id}</span>
                        <span className="card-item-title">{c.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        <p className="sidebar-foot">Source: research/game-design</p>
      </div>
    </nav>
  );
}
