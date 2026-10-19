import Link from "next/link";

type Section = { label: string; prefix: string; href?: string };

/** The planned sections. Only the GDD is live; the rest come with the reorg and later steps. */
const SECTIONS: Section[] = [
  { label: "Design document", prefix: "GDD", href: "/" },
  { label: "Screens", prefix: "SCR" },
  { label: "UI pieces", prefix: "UI" },
  { label: "Tower cues", prefix: "CUE" },
  { label: "Tower sounds", prefix: "SND" },
  { label: "Mechanics", prefix: "MEC" },
  { label: "Sketches", prefix: "SK" },
  { label: "Ideas", prefix: "IDEA" },
  { label: "Questions", prefix: "Q" },
];

export function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Sections">
      <Link href="/" className="brand">
        <span className="brand-initial">W</span>
        <span>
          <span className="brand-title">Game Workbench</span>
          <span className="brand-sub">Return to Dark Tower</span>
        </span>
      </Link>
      <ul>
        {SECTIONS.map((s) => (
          <li key={s.prefix}>
            {s.href ? (
              <Link href={s.href} className="nav-item">
                <span className="nav-prefix">{s.prefix}</span>
                {s.label}
              </Link>
            ) : (
              <span className="nav-item nav-coming" title="Coming after the reorg">
                <span className="nav-prefix">{s.prefix}</span>
                {s.label}
                <span className="nav-soon">soon</span>
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="sidebar-foot">Source: research/game-design</p>
    </nav>
  );
}
