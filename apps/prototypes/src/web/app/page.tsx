import Link from "next/link";
import { PROTOTYPES } from "../lib/prototypes.ts";

export default function Index() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h1>Bloodtower prototypes</h1>
      <p>
        Throwaway pages that answer one design question each. A page may 404 until its step is
        built.
      </p>
      <ul>
        {PROTOTYPES.map((p) => (
          <li key={p.id} style={{ marginBottom: 8 }}>
            <Link href={p.path}>
              {p.id} {p.name}
            </Link>
            <div style={{ opacity: 0.7 }}>{p.question}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
