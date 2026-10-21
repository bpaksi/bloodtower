import type { CSSProperties, ReactNode } from "react";
import { Placeholder } from "../../../components/Placeholder.tsx";
import { tvPx } from "../../../lib/tv.ts";
import { type Hero, ITEMS, JOIN_URL, type LayoutId, POOL_HEROES, SUMMARY_ROWS } from "./data.ts";

// Sizes are design px at 1920 wide. `sizes` comes from the tuning panel; every size is raised to
// `min` so no text is ever smaller than the minimum (the unit test scans the markup for this).
export type Sizes = { min: number; body: number; heading: number; big: number };

const fs = (n: number, s: Sizes): CSSProperties => ({ fontSize: tvPx(Math.max(n, s.min)) });
const panel: CSSProperties = {
  background: "rgba(16,20,24,0.88)",
  border: `${tvPx(3)} solid #6b5b3a`,
  borderRadius: tvPx(14),
  padding: tvPx(24),
  boxSizing: "border-box",
};

function Painting({ s }: { s: Sizes }) {
  return (
    <Placeholder
      label="Landing painting (always behind)"
      style={{ position: "absolute", inset: 0, ...fs(s.min, s) }}
    />
  );
}

function PromptBand({ text, s }: { text: string; s: Sizes }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: tvPx(96),
        background: "#2a2216",
        borderTop: `${tvPx(4)} solid #c9a24a`,
        display: "flex",
        alignItems: "center",
        padding: `0 ${tvPx(48)}`,
        ...fs(s.heading, s),
      }}
    >
      {text}
    </div>
  );
}

function WaitingDialog({
  s,
  text,
  top = "42%",
  cx = "50%",
  width = 900,
}: {
  s: Sizes;
  text: string;
  top?: string;
  cx?: string;
  width?: number;
}) {
  return (
    <div
      style={{
        ...panel,
        position: "absolute",
        left: cx,
        top,
        transform: "translate(-50%, -50%)",
        width: tvPx(width),
        textAlign: "center",
        ...fs(s.heading, s),
      }}
    >
      <div style={fs(s.big, s)}>Waiting for heroes</div>
      <p style={{ margin: `${tvPx(16)} 0 0`, ...fs(s.body, s) }}>{text}</p>
    </div>
  );
}

function Qr({ s, large }: { s: Sizes; large: boolean }) {
  const side = large ? 420 : 200;
  return (
    <div style={{ ...panel, textAlign: "center", ...fs(s.body, s) }}>
      <Placeholder label="QR code" width={tvPx(side)} height={tvPx(side)} style={fs(s.min, s)} />
      <div style={{ marginTop: tvPx(12) }}>{large ? `Scan or visit ${JOIN_URL}` : JOIN_URL}</div>
    </div>
  );
}

function NowActing({ s, hero }: { s: Sizes; hero: Hero }) {
  return (
    <div style={{ ...panel, display: "flex", gap: tvPx(24), ...fs(s.body, s) }}>
      <Placeholder
        label={`Portrait: ${hero.role}`}
        width={tvPx(200)}
        height={tvPx(240)}
        style={fs(s.min, s)}
      />
      <div>
        <div style={fs(s.heading, s)}>Now acting: {hero.name}</div>
        <div>{hero.role}</div>
        <div>Corruption: unavailable</div>
        <div>Carries: unavailable</div>
      </div>
    </div>
  );
}

function HeroCard({ hero, holder, s }: { hero: Hero; holder: string | null; s: Sizes }) {
  return (
    <div style={{ ...panel, padding: tvPx(16), ...fs(s.body, s) }}>
      <Placeholder
        label={`Portrait: ${hero.role}`}
        width="100%"
        height={tvPx(200)}
        style={fs(s.min, s)}
      />
      <div style={fs(s.heading, s)}>
        {hero.name}, {hero.role}
      </div>
      <div>
        Might {hero.might} Stealth {hero.stealth}
      </div>
      <div>
        Magic {hero.magic} Wits {hero.wits}
      </div>
      <div style={{ color: holder ? "#c9a24a" : "#9fb0a0" }}>{holder ?? "Free"}</div>
    </div>
  );
}

function HeroRoll({ s, holders }: { s: Sizes; holders: (string | null)[] }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: `${tvPx(40)} ${tvPx(40)} ${tvPx(120)}`,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: tvPx(20),
      }}
    >
      {POOL_HEROES.map((h, i) => (
        <HeroCard key={h.name} hero={h} holder={holders[i] ?? null} s={s} />
      ))}
    </div>
  );
}

function Items({ s }: { s: Sizes }) {
  return (
    <div style={{ ...panel, ...fs(s.body, s) }}>
      <div style={fs(s.heading, s)}>Party items</div>
      <ul style={{ margin: `${tvPx(8)} 0 0`, paddingLeft: tvPx(32) }}>
        {ITEMS.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function Summary({ s }: { s: Sizes }) {
  return (
    <div style={{ ...panel, ...fs(s.body, s) }}>
      <div style={fs(s.heading, s)}>Tonight's game</div>
      {SUMMARY_ROWS.map(([k, v]) => (
        <div key={k}>
          {k}: {v}
        </div>
      ))}
    </div>
  );
}

const slot = (style: CSSProperties): CSSProperties => ({ position: "absolute", ...style });

export function Layout({
  id,
  sizes: s,
  holders,
}: {
  id: LayoutId;
  sizes: Sizes;
  holders: (string | null)[];
}): ReactNode {
  const acting = POOL_HEROES[0] as Hero;
  const left = tvPx(48);
  const prompt = (t: string) => <PromptBand s={s} text={t} />;
  switch (id) {
    case "waiting":
      return (
        <>
          <Painting s={s} />
          <WaitingDialog s={s} text="Waiting for the group to be ready." />
          <div style={slot({ right: left, top: tvPx(48) })}>
            <Qr s={s} large={false} />
          </div>
          {prompt("Next: press Ready on your iPad")}
        </>
      );
    case "acting":
      return (
        <>
          <Painting s={s} />
          <div style={slot({ left, top: tvPx(48), width: tvPx(1000) })}>
            <NowActing s={s} hero={acting} />
          </div>
          {prompt("Next: Hero A chooses a move")}
        </>
      );
    case "roll":
      return (
        <>
          <Painting s={s} />
          <HeroRoll s={s} holders={holders} />
          {prompt("Next: pick a hero on your iPad")}
        </>
      );
    case "items":
      return (
        <>
          <Painting s={s} />
          <div style={slot({ left, top: tvPx(48), width: tvPx(700) })}>
            <Items s={s} />
          </div>
          {prompt("Next: Player 1 uses an item or continues")}
        </>
      );
    case "summary":
      return (
        <>
          <Painting s={s} />
          <WaitingDialog s={s} text="Choose the difficulty." cx="66%" width={800} />
          <div style={slot({ left, top: tvPx(48), width: tvPx(760) })}>
            <Summary s={s} />
          </div>
          {prompt("Next: Player 1 picks a difficulty")}
        </>
      );
    case "qr":
      return (
        <>
          <Painting s={s} />
          <div style={slot({ left: "50%", top: "44%", transform: "translate(-50%, -50%)" })}>
            <Qr s={s} large />
          </div>
          {prompt("Next: scan the code to join")}
        </>
      );
    case "play":
      return (
        <>
          <Painting s={s} />
          <WaitingDialog s={s} text="The party enters the village." top="62%" />
          <div style={slot({ left, top: tvPx(48), width: tvPx(1000) })}>
            <NowActing s={s} hero={acting} />
          </div>
          <div style={slot({ right: left, top: tvPx(48), width: tvPx(520) })}>
            <Items s={s} />
          </div>
          <div style={slot({ left, bottom: tvPx(120) })}>
            <Qr s={s} large={false} />
          </div>
          {prompt("Next: Hero A chooses a move")}
        </>
      );
  }
}
