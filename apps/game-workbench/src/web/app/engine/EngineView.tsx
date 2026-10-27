"use client";

import { Fragment, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  type CardLite,
  callTarget,
  compile,
  type Item,
  KIND_ROLE,
  type Loop,
  NODE_KINDS,
  type NodeKind,
  type Op,
  type RNode,
  type Role,
  roleCounts,
  type StackRow,
  type Trigger,
} from "../../lib/engine.ts";

type Cited = Record<string, { direct: string[]; near: string[] }>;
type Props = {
  loops: Loop[];
  tree: StackRow[];
  triggers: Trigger[];
  cards: CardLite[];
  cited: Cited;
};
type Tab = "designed" | "events" | "walk" | "cards";
type Lens = "loops" | "events";

const TABS: { id: Tab; label: string }[] = [
  { id: "designed", label: "Loops · as designed" },
  { id: "events", label: "Events · as built" },
  { id: "walk", label: "Walk through" },
  { id: "cards", label: "Cards and ideas" },
];

const INTERRUPT = "MEC-071";
const ID_IN_TEXT = /([A-Z]+(?:-[A-Z]+)*-[A-Z]?\d+[a-z]?)/g;

const ROLE_LABEL: Record<Role, string> = {
  wait: "waits for an event",
  effect: "effect",
  pure: "inside step()",
  frame: "push frame",
};

/** The chip colour for a card type; tower outputs share the engine colour. */
function chipKind(type: string | undefined): string {
  if (!type) return "requirement";
  if (type === "piece") return "asset";
  if (["glyph", "seal", "light", "light-effect", "light-sequence", "drum"].includes(type)) {
    return "engine";
  }
  return type;
}

const shortTitle = (t: string) => t.replace(/^"|"$/g, "").split(":")[0] as string;

/* ---------- the walkthrough: the loops run as one reducer ---------- */

type Frame = {
  loopId: string;
  pc: number;
  section: string;
  /** An interrupt frame resumes its parent at the same node instead of the next one. */
  held: boolean;
  quit: boolean;
  /** The interrupt's kind, taken at its first check without asking. */
  hint: string | null;
  uid: number;
};
type Tag = "event" | "effect" | "pure" | "frame" | "check" | "note" | "domain";
type Entry = { step: number; tag: Tag; text: string; at?: string };
type Wait =
  | { w: "prompt"; node: RNode }
  | { w: "branch"; node: RNode; targets: { name: string; pc: number }[] }
  | { w: "again"; node: RNode | null; start: number }
  | { w: "stub"; node: RNode }
  | { w: "done"; text: string };
type Sim = { frames: Frame[]; log: Entry[]; step: number; wait: Wait };
type Programs = { ops: Record<string, Op[]>; ids: Set<string> };

let frameCount = 0;
const frame = (loopId: string, held = false, hint: string | null = null): Frame => ({
  uid: ++frameCount,
  loopId,
  pc: 0,
  section: "",
  held,
  quit: false,
  hint,
});

function run(s: Sim, P: Programs, triggerAt: Map<string, string>): Sim {
  const frames = s.frames.map((f) => ({ ...f }));
  const log = [...s.log];
  const put = (tag: Tag, text: string, at?: string) => log.push({ step: s.step, tag, text, at });
  const stop = (wait: Wait): Sim => ({ ...s, frames, log, wait });
  for (let guard = 0; guard < 2000; guard++) {
    const top = frames[frames.length - 1];
    if (!top) return stop({ w: "done", text: "The stack is empty: nothing is running." });
    const op = P.ops[top.loopId]?.[top.pc];
    if (!op) {
      frames.pop();
      put("frame", `pop ${top.loopId}: its result is handed up`, top.loopId);
      if (top.quit) {
        frames.length = 0;
        put("frame", "quit is handed up through every loop; the autosave is kept");
        continue;
      }
      const parent = frames[frames.length - 1];
      if (parent && !top.held) parent.pc++;
      continue;
    }
    if (op.op === "section") {
      top.section = op.name;
      top.pc++;
      continue;
    }
    if (op.op === "jump") {
      top.pc = op.to;
      continue;
    }
    if (op.op === "again") return stop({ w: "again", node: op.node, start: op.start });
    if (op.op === "branch") {
      const hinted = top.hint ? op.targets.find((t) => t.name === top.hint) : undefined;
      if (hinted) {
        put(
          "check",
          `.${op.node.num} ${op.node.label} → ${hinted.name}`,
          `${top.loopId}.${op.node.num}`,
        );
        top.hint = null;
        top.pc = hinted.pc;
        continue;
      }
      return stop({ w: "branch", node: op.node, targets: op.targets });
    }
    const n = op.node;
    const at = `${top.loopId}.${n.num}`;
    if (n.kind === "prompt") return stop({ w: "prompt", node: n });
    if (n.kind === "call") {
      const target = callTarget(n, P.ids);
      if (!target) return stop({ w: "stub", node: n });
      put("frame", `push ${target} (${n.label})`, at);
      frames.push(frame(target));
      continue;
    }
    const role = KIND_ROLE[n.kind as NodeKind]?.role;
    const what: Record<string, string> = {
      board: "board view",
      story: "story hook",
      tower: "tower command{capabilityId, params}",
      roll: "seeded roll",
      change: "state",
      check: "check",
    };
    put(role === "effect" ? "effect" : "pure", `${what[n.kind] ?? n.kind}: ${n.label}`, at);
    const domain = triggerAt.get(at);
    if (domain) put("domain", `domain event "${domain}": the chapter's hooks match on it`, at);
    top.pc++;
  }
  return stop({ w: "done", text: "Stopped after 2000 nodes with no wait: a loop never waits." });
}

/* ---------- the view ---------- */

export function EngineView({ loops, tree, triggers, cards, cited }: Props) {
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const loopById = useMemo(() => new Map(loops.map((l) => [l.id, l])), [loops]);
  const programs = useMemo<Programs>(
    () => ({
      ops: Object.fromEntries(loops.map((l) => [l.id, compile(l.sections)])),
      ids: new Set(loops.map((l) => l.id)),
    }),
    [loops],
  );
  const triggerAt = useMemo(
    () => new Map(triggers.map((t) => [`${t.loop}.${t.num}`, t.event])),
    [triggers],
  );

  const [tab, setTab] = useState<Tab>("designed");
  const [loopId, setLoopId] = useState<string>(tree[0]?.id ?? loops[0]?.id ?? "");
  const [node, setNode] = useState<number | null>(null);
  const [card, setCard] = useState<string | null>(null);
  const [lens, setLens] = useState<Lens>("loops");
  const [hashRead, setHashRead] = useState(false);

  // The hash keeps the view, so a link can be pasted into a chat: #tab=designed&loop=MEC-034&card=DEC-290.
  useEffect(() => {
    const q = new URLSearchParams(window.location.hash.slice(1));
    const t = q.get("tab");
    if (t && TABS.some((x) => x.id === t)) setTab(t as Tab);
    const l = q.get("loop");
    if (l) setLoopId(l);
    const n = q.get("node");
    if (n) setNode(Number(n));
    setCard(q.get("card"));
    if (q.get("lens") === "events") setLens("events");
    setHashRead(true);
  }, []);
  useEffect(() => {
    if (!hashRead) return;
    const q = new URLSearchParams({ tab, loop: loopId });
    if (node !== null) q.set("node", String(node));
    if (card) q.set("card", card);
    if (lens === "events") q.set("lens", "events");
    window.history.replaceState(null, "", `#${q.toString()}`);
  }, [hashRead, tab, loopId, node, card, lens]);
  useEffect(() => {
    if (node === null) return;
    document.getElementById(`n-${loopId}-${node}`)?.scrollIntoView({ block: "center" });
  }, [loopId, node]);

  const goNode = useCallback((ref: string) => {
    const [l, n] = ref.split(".");
    setTab("designed");
    setLoopId(l as string);
    setNode(n ? Number(n) : null);
  }, []);

  const Ref = ({ id }: { id: string }) => {
    const c = byId.get(id);
    return (
      <button
        type="button"
        className={`chip chip-${chipKind(c?.type)} eng-ref`}
        title={c ? `${c.title} (${c.status})` : "No card: an ID from a document"}
        onClick={() => setCard(id)}
      >
        {id}
      </button>
    );
  };
  const Rich = ({ text }: { text: string }) => (
    <>
      {text.split(ID_IN_TEXT).map((part, i) =>
        i % 2 === 1 ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: the split pieces have no other identity.
          <Ref key={i} id={part} />
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: as above.
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
  const LoopLink = ({ id }: { id: string }) => (
    <button type="button" className="eng-link" onClick={() => goNode(id)}>
      {id}
    </button>
  );

  /* ---------- railroad ---------- */

  const Railroad = ({
    loop,
    active,
    lensNow,
  }: {
    loop: Loop;
    active: number | null;
    lensNow: Lens;
  }) => {
    const Items = ({ items }: { items: Item[] }): ReactNode =>
      items.map((it, i) => {
        if (it.t === "repeat") {
          const last = it.items[it.items.length - 1];
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: a repeat has no number of its own.
            <div key={`r${i}`} className="rr-repeat">
              <div className="rr-repeat-tag">
                ↻ repeat{last && last.t === "node" ? ` · exit test .${last.num}` : ""}
              </div>
              <Items items={it.items} />
            </div>
          );
        }
        const role = KIND_ROLE[it.kind as NodeKind]?.role;
        const target = it.kind === "call" ? callTarget(it, programs.ids) : null;
        return (
          <div key={it.num} className="rr-step">
            <div
              id={`n-${loop.id}-${it.num}`}
              className={`rr-node k-${it.kind} ${active === it.num ? "is-active" : ""} ${
                lensNow === "events" ? `role-${role ?? "other"}` : ""
              }`}
            >
              <span className="rr-num mono">.{it.num}</span>
              <span className={`kind k-${it.kind}`}>{it.kind}</span>
              <span className="rr-label">{it.label}</span>
              {lensNow === "events" && role && (
                <span className={`role role-${role}`}>{ROLE_LABEL[role]}</span>
              )}
              {triggerAt.has(`${loop.id}.${it.num}`) && (
                <span className="role role-domain">
                  trigger: {triggerAt.get(`${loop.id}.${it.num}`)}
                </span>
              )}
              <span className="rr-ids">
                {it.ids.map((id) => (
                  <Ref key={id} id={id} />
                ))}
              </span>
              {target && (
                <button
                  type="button"
                  className="btn-ghost rr-open"
                  onClick={() => {
                    setLoopId(target);
                    setNode(null);
                  }}
                >
                  open {target} ↘
                </button>
              )}
            </div>
            {it.tracks.length > 0 && (
              <div className="rr-tracks">
                {it.tracks.map((t) => (
                  <div key={t.name} className="rr-track">
                    <div className="rr-track-name">{t.name}</div>
                    {t.items.length ? (
                      <Items items={t.items} />
                    ) : (
                      <div className="rr-bypass">bypass</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      });
    return (
      <div className="rr">
        {loop.sections.map((s) => (
          <section key={s.name} className={`rr-section sec-${s.name}`}>
            <h4>{s.name}</h4>
            {s.items.length ? <Items items={s.items} /> : <p className="muted">nothing</p>}
          </section>
        ))}
      </div>
    );
  };

  const LoopHead = ({ loop }: { loop: Loop }) => (
    <header className="loop-head">
      <h2>
        <Ref id={loop.id} /> <Rich text={loop.title.replace(/^"|"$/g, "")} />
      </h2>
      <span className={`status st-${loop.status}`}>{loop.status}</span>
    </header>
  );

  const StackTree = ({ current }: { current: string }) => (
    <nav className="stack-tree" aria-label="Loop stack">
      {tree.map((r) => {
        const l = loopById.get(r.id);
        return (
          <button
            type="button"
            key={r.key}
            className={`stack-row ${r.id === current ? "is-current" : ""}`}
            style={{ paddingLeft: `${0.5 + r.depth * 0.9}rem` }}
            onClick={() => {
              setLoopId(r.id);
              setNode(null);
            }}
            title={r.via ? `called from ${r.via}` : "top level"}
          >
            <span className="mono">{r.id}</span>
            <span>{l ? shortTitle(l.title) : "not drawn"}</span>
          </button>
        );
      })}
      <p className="muted small">
        A loop called from two places shows under each. {INTERRUPT} can fire between any two nodes.
      </p>
    </nav>
  );

  /* ---------- tab: as designed ---------- */

  const loop = loopById.get(loopId) ?? loops[0];
  const designed = loop && (
    <div className="eng-split">
      <StackTree current={loop.id} />
      <div className="eng-main">
        <LoopHead loop={loop} />
        <fieldset className="lens" aria-label="Read the diagram as">
          <button type="button" aria-pressed={lens === "loops"} onClick={() => setLens("loops")}>
            Loops, as designed
          </button>
          <button type="button" aria-pressed={lens === "events"} onClick={() => setLens("events")}>
            Read as events
          </button>
          {lens === "events" && (
            <span className="muted small">
              Green nodes are where the reducer stops; grey ones run inside one step() call.
            </span>
          )}
        </fieldset>
        <dl className="loop-fields">
          {loop.fields.map((f) => (
            <Fragment key={f.name}>
              <dt>{f.name}</dt>
              <dd>
                <Rich text={f.text.replace(/\*\*/g, "")} />
              </dd>
            </Fragment>
          ))}
        </dl>
        <Railroad loop={loop} active={node} lensNow={lens} />
      </div>
    </div>
  );

  /* ---------- tab: as built (events) ---------- */

  const kindCount = (k: string) =>
    loops.reduce((n, l) => n + l.nodes.filter((x) => x.kind === k).length, 0);
  const events = (
    <div className="eng-events">
      <section>
        <h2>One reducer instead of nested loops</h2>
        <p>
          <Rich text="On paper each level is a loop that calls the next (DEC-132, DEC-267). In code nothing loops and waits. The loop stack is data: one frame per running level, each at a node. Every input is an event; the reducer moves the frames forward until the next node that needs a person or the tower, and returns the effects for the host to carry out." />
        </p>
        <div className="pipe">
          <div className="pipe-col">
            <h3>Events in</h3>
            <ul>
              <li>
                <b>press</b> act{"{promptId, actionId}"} from an iPad
              </li>
              <li>
                <b>device joined / dropped</b>, a hero claimed
              </li>
              <li>
                <b>tower outcome</b> confirmed, indeterminate, failed
              </li>
              <li>
                <b>timer</b> the host fires, <b>narration-ended</b>
              </li>
              <li>
                <b>pause</b>, <b>quit</b>
              </li>
            </ul>
          </div>
          <div className="pipe-arrow">→</div>
          <div className="pipe-col pipe-core">
            <h3>step(state, event)</h3>
            <p className="small">Pure: no I/O, no clock, randomness only from the seed.</p>
            <div className="mini-stack">
              {[
                "MEC-039 session",
                "MEC-032 game",
                "MEC-033 chapter",
                "MEC-034 day",
                "MEC-035 group turn",
                "MEC-036 encounter ← at .6, waiting",
              ]
                .reverse()
                .map((f) => (
                  <div key={f} className="mini-frame">
                    {f}
                  </div>
                ))}
            </div>
            <p className="small">The loop stack: frames, not call stacks.</p>
          </div>
          <div className="pipe-arrow">→</div>
          <div className="pipe-col">
            <h3>Effects out</h3>
            <ul>
              <li>
                <b>views</b>: project(state, board) and one per iPad
              </li>
              <li>
                <b>tower command</b>
                {"{capabilityId, params}"}
              </li>
              <li>
                <b>timer</b> start, <b>checkpoint</b> at the day's end
              </li>
              <li>
                <b>log</b>: every event is one row in the append-only events table
              </li>
            </ul>
          </div>
        </div>
        <p className="small muted">
          <Rich text="The host applies events one at a time, so the first press on a prompt wins. The tower's outcome and the host's timers come back in as events. Sources: DEC-107, DEC-132, DEC-143, and the bloodtower spec D32 (reducer), D35 (tower), D36 (views and act), D37 (event log)." />
        </p>
      </section>

      <section>
        <h2>The same node, two readings</h2>
        <table className="eng-table">
          <thead>
            <tr>
              <th>Node kind</th>
              <th>Nodes</th>
              <th>In the event model</th>
              <th>What the reducer does</th>
            </tr>
          </thead>
          <tbody>
            {NODE_KINDS.map((k) => (
              <tr key={k}>
                <td>
                  <span className={`kind k-${k}`}>{k}</span>
                </td>
                <td className="num">{kindCount(k)}</td>
                <td>
                  <span className={`role role-${KIND_ROLE[k].role}`}>
                    {ROLE_LABEL[KIND_ROLE[k].role]}
                  </span>
                </td>
                <td>{KIND_ROLE[k].reads}</td>
              </tr>
            ))}
            <tr>
              <td>
                <span className="kind">repeat</span>
              </td>
              <td className="num">—</td>
              <td>
                <span className="role role-pure">inside step()</span>
              </td>
              <td>
                The frame stays; its exit check (DEC-137) sends the pc back to the top of the body.
                A repeat never waits by itself, only the prompts inside it do.
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Each loop as the reducer sees it</h2>
        <p className="small muted">
          Waits are the only places a frame rests between events, so they are also what a save holds
          and where an interrupt can cut in.
        </p>
        <table className="eng-table">
          <thead>
            <tr>
              <th>Loop</th>
              <th>Nodes</th>
              <th title="prompt nodes">Waits</th>
              <th>Effects</th>
              <th>Inside step()</th>
              <th>Pushes</th>
              <th>Calls</th>
            </tr>
          </thead>
          <tbody>
            {tree
              .filter((r, i) => tree.findIndex((x) => x.id === r.id) === i)
              .map((r) => {
                const l = loopById.get(r.id);
                if (!l) return null;
                const c = roleCounts(l);
                return (
                  <tr key={l.id}>
                    <td>
                      <LoopLink id={l.id} /> {shortTitle(l.title)}
                    </td>
                    <td className="num">{l.nodes.length}</td>
                    <td className="num role-wait-text">{c.wait}</td>
                    <td className="num">{c.effect}</td>
                    <td className="num">{c.pure}</td>
                    <td className="num">{c.frame}</td>
                    <td>
                      {l.children.map((ch) => (
                        <LoopLink key={ch} id={ch} />
                      ))}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Story triggers become domain events</h2>
        <p>
          <Rich text="The five trigger nodes (DEC-288, DEC-290) are where the engine says what just happened. In the event model each is a named domain event; a story hook matches on it, with an optional flag or lead condition, once per game unless marked every time (DEC-291). World happenings at the day's end raise none (DEC-289)." />
        </p>
        <table className="eng-table">
          <thead>
            <tr>
              <th>Domain event</th>
              <th>Trigger</th>
              <th>Raised at</th>
            </tr>
          </thead>
          <tbody>
            {triggers.map((t) => (
              <tr key={`${t.loop}.${t.num}`}>
                <td className="mono">{t.event}</td>
                <td>{t.name}</td>
                <td>
                  <LoopLink id={`${t.loop}.${t.num}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Interrupts are just events</h2>
        <p>
          <Rich text="Pause, a dropped iPad and a lost tower (MEC-071, DEC-282) can fire between any two nodes. Because the reducer only ever rests at a wait, an interrupt event pushes the interrupt frame on top of the stack; when it pops, the held frame is still at its wait and play resumes there. Quit hands 'quit' up and keeps the autosave (DEC-208)." />
        </p>
      </section>

      <section className="eng-warn">
        <h2>Where the spec and the cards now disagree</h2>
        <p className="small muted">
          The spec's engine rows were written on 2026-10-23; these cards came later. Worth a ruling
          before the engine steps that build them.
        </p>
        <ul>
          <li>
            <Rich text="Spec D35 says there is no play without the tower. DEC-275 reopened that and DEC-305, DEC-306 define the fallbacks; MEC-032, MEC-034 and MEC-039 have tower-in-play tracks." />
          </li>
          <li>
            <Rich text="Spec D32 lists the stack as session → game → chapter → day → group turn → encounter → quest or battle. The cards add the event loop called from the day's close (MEC-072, DEC-294), the talk, buy and rest picks (MEC-073 to MEC-075, DEC-296), and the interrupt diagram (MEC-071)." />
          </li>
          <li>
            <Rich text="Spec D38 renames set piece to quest in the engine. The loop cards and their triggers still say set piece (MEC-037, DEC-297), so the domain event names here use it." />
          </li>
        </ul>
      </section>
    </div>
  );

  /* ---------- tab: walk through ---------- */

  const [start, setStart] = useState<string>(tree[0]?.id ?? "");
  const begin = useCallback(
    (from: string): Sim =>
      run(
        {
          frames: [frame(from)],
          log: [{ step: 1, tag: "event", text: `start ${from}` }],
          step: 1,
          wait: { w: "done", text: "" },
        },
        programs,
        triggerAt,
      ),
    [programs, triggerAt],
  );
  const [sim, setSim] = useState<Sim | null>(null);
  const live = sim ?? (start ? begin(start) : null);

  const act = (f: (s: Sim, top: Frame) => Sim) => {
    if (!live) return;
    const frames = live.frames.map((x) => ({ ...x }));
    const top = frames[frames.length - 1];
    if (!top) return;
    setSim(run(f({ ...live, frames }, top), programs, triggerAt));
  };
  const press = () =>
    act((s, top) => {
      const w = s.wait as { node: RNode };
      top.pc++;
      const step = s.step + 1;
      return {
        ...s,
        step,
        log: [
          ...s.log,
          {
            step,
            tag: "event",
            text: `press "${w.node.label}"`,
            at: `${top.loopId}.${w.node.num}`,
          },
        ],
      };
    });
  const choose = (name: string, pc: number) =>
    act((s, top) => {
      const w = s.wait as { node: RNode };
      if (top.loopId === INTERRUPT && top.section === "close" && name === "quit") top.quit = true;
      top.pc = pc;
      return {
        ...s,
        log: [
          ...s.log,
          {
            step: s.step,
            tag: "check",
            text: `.${w.node.num} ${w.node.label} → ${name}`,
            at: `${top.loopId}.${w.node.num}`,
          },
        ],
      };
    });
  const again = (round: boolean) =>
    act((s, top) => {
      const w = s.wait as { node: RNode | null; start: number };
      top.pc = round ? w.start : top.pc + 1;
      const label = w.node ? `.${w.node.num} ${w.node.label}` : "repeat";
      return {
        ...s,
        log: [
          ...s.log,
          {
            step: s.step,
            tag: "check",
            text: `${label} → ${round ? "again" : "go on"}`,
            at: w.node ? `${top.loopId}.${w.node.num}` : undefined,
          },
        ],
      };
    });
  const skip = () =>
    act((s, top) => {
      const w = s.wait as { node: RNode };
      top.pc++;
      return {
        ...s,
        log: [
          ...s.log,
          {
            step: s.step,
            tag: "note",
            text: `call not drawn as a loop yet, skipped: ${w.node.label} (${w.node.ids.join(", ")})`,
            at: `${top.loopId}.${w.node.num}`,
          },
        ],
      };
    });
  const interrupt = (kind: string, label: string) =>
    act((s) => {
      const step = s.step + 1;
      return {
        ...s,
        step,
        frames: [...s.frames, frame(INTERRUPT, true, kind)],
        log: [
          ...s.log,
          { step, tag: "event", text: label },
          {
            step,
            tag: "frame",
            text: `push ${INTERRUPT} on top; the frame below is held at its wait`,
          },
        ],
      };
    });

  const top = live?.frames[live.frames.length - 1];
  const topLoop = top ? loopById.get(top.loopId) : undefined;
  const waitNode = live && "node" in live.wait ? live.wait.node : null;
  const steps = useMemo(() => {
    const out = new Map<number, Entry[]>();
    for (const e of live?.log ?? []) out.set(e.step, [...(out.get(e.step) ?? []), e]);
    return [...out.entries()].reverse();
  }, [live]);

  const walk = live && (
    <div className="eng-walk">
      <div className="walk-bar">
        <label>
          Start at{" "}
          <select
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              setSim(begin(e.target.value));
            }}
          >
            {loops.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id} {shortTitle(l.title)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn-ghost" onClick={() => setSim(begin(start))}>
          Restart
        </button>
        <span className="muted small">
          You play the people and the state: press prompts, and pick each check's answer that the
          real engine would read from the state.
        </span>
      </div>
      <div className="walk-grid">
        <div className="walk-left">
          <div className="walk-wait">
            {live.wait.w === "prompt" && (
              <>
                <p>
                  <span className="role role-wait">waits</span> for a press at{" "}
                  <span className="mono">
                    {top?.loopId}.{live.wait.node.num}
                  </span>
                  : {live.wait.node.label}
                </p>
                <div className="walk-actions">
                  <button type="button" className="btn-primary" onClick={press}>
                    Send event: press
                  </button>
                  {programs.ids.has(INTERRUPT) && top?.loopId !== INTERRUPT && (
                    <>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => interrupt("paused", "pause")}
                      >
                        Pause
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => interrupt("ipad-gone", "device dropped")}
                      >
                        Drop an iPad
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => interrupt("tower-lost", "tower lost")}
                      >
                        Lose the tower
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
            {live.wait.w === "branch" && (
              <>
                <p>
                  <span className="role role-pure">check</span> .{live.wait.node.num}{" "}
                  {live.wait.node.label}
                </p>
                <div className="walk-actions">
                  {live.wait.targets.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      className="btn-ghost"
                      onClick={() => choose(t.name, t.pc)}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </>
            )}
            {live.wait.w === "again" && (
              <>
                <p>
                  <span className="role role-pure">exit test</span>{" "}
                  {live.wait.node
                    ? `.${live.wait.node.num} ${live.wait.node.label}`
                    : "end of the repeat"}
                </p>
                <div className="walk-actions">
                  <button type="button" className="btn-ghost" onClick={() => again(true)}>
                    Again
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => again(false)}>
                    Go on
                  </button>
                </div>
              </>
            )}
            {live.wait.w === "stub" && (
              <>
                <p>
                  <span className="role role-frame">call</span> .{live.wait.node.num}{" "}
                  {live.wait.node.label}: <Rich text={live.wait.node.ids.join(" ")} /> has no loop
                  diagram yet.
                </p>
                <button type="button" className="btn-ghost" onClick={skip}>
                  Skip it
                </button>
              </>
            )}
            {live.wait.w === "done" && <p>{live.wait.text}</p>}
          </div>
          <h3>Loop stack</h3>
          <ol className="walk-stack">
            {[...(live.frames ?? [])].reverse().map((f, i) => {
              const l = loopById.get(f.loopId);
              const op = programs.ops[f.loopId]?.[f.pc];
              const at = op && "node" in op && op.node ? `.${op.node.num}` : "";
              return (
                <li key={f.uid} className={i === 0 ? "is-top" : ""}>
                  <span className="mono">
                    {f.loopId}
                    {at}
                  </span>{" "}
                  {l ? shortTitle(l.title) : ""}
                  {f.held && <span className="muted small"> · holds the frame below</span>}
                </li>
              );
            })}
          </ol>
          {topLoop && (
            <>
              <h3>
                Now in <Ref id={topLoop.id} />
              </h3>
              <Railroad loop={topLoop} active={waitNode?.num ?? null} lensNow="events" />
            </>
          )}
        </div>
        <div className="walk-log">
          <h3>Event log and effects, newest first</h3>
          {steps.map(([n, entries]) => (
            <div key={n} className="log-step">
              <div className="log-head">
                step() #{n} · {entries.filter((e) => e.tag !== "event" && e.tag !== "check").length}{" "}
                nodes ran
              </div>
              {entries.map((e, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: log rows are append-only and never reorder.
                <div key={i} className={`log-row tag-${e.tag}`}>
                  <span className="log-tag">{e.tag}</span>
                  {e.at && (
                    <button
                      type="button"
                      className="eng-link"
                      onClick={() => goNode(e.at as string)}
                    >
                      {e.at}
                    </button>
                  )}
                  <span>{e.text}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ---------- tab: cards and ideas ---------- */

  const [filter, setFilter] = useState("");
  const [type, setType] = useState<string>("idea");
  const matches = (c: CardLite) => {
    const f = filter.trim().toLowerCase();
    return !f || c.id.toLowerCase().includes(f) || c.title.toLowerCase().includes(f);
  };
  const citedCards = cards.filter((c) => cited[c.id]);
  const types = [...new Set(citedCards.map((c) => c.type))].filter((t) => t !== "idea");
  const shown = (
    type === "idea"
      ? cards.filter((c) => c.type === "idea")
      : citedCards.filter((c) => type === "all" || c.type === type)
  ).filter(matches);
  const cardsTab = (
    <div className="eng-cards">
      <div className="walk-bar">
        <input
          type="search"
          placeholder="Filter by ID or title"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter cards"
        />
        <fieldset className="lens" aria-label="Card type">
          <button type="button" aria-pressed={type === "idea"} onClick={() => setType("idea")}>
            Every idea ({cards.filter((c) => c.type === "idea").length})
          </button>
          <button type="button" aria-pressed={type === "all"} onClick={() => setType("all")}>
            Every card on a loop ({citedCards.length})
          </button>
          {types.map((t) => (
            <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}>
              {t} ({citedCards.filter((c) => c.type === t).length})
            </button>
          ))}
        </fieldset>
      </div>
      <p className="small muted">
        "On" is a loop node that names the card. "Near" is a node that names a card this one links
        with, so an idea shows where in the engine it would land.
      </p>
      <table className="eng-table">
        <thead>
          <tr>
            <th>Card</th>
            <th>Title</th>
            <th>Status</th>
            <th>On</th>
            <th>Near</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((c) => (
            <tr key={c.id}>
              <td>
                <Ref id={c.id} />
              </td>
              <td>{c.title.replace(/^"|"$/g, "")}</td>
              <td>
                <span className={`status st-${c.status}`}>{c.status}</span>
              </td>
              <td className="refs">
                {(cited[c.id]?.direct ?? []).map((w) => (
                  <LoopLink key={w} id={w} />
                ))}
              </td>
              <td className="refs">
                {(cited[c.id]?.near ?? []).slice(0, 8).map((w) => (
                  <LoopLink key={w} id={w} />
                ))}
                {(cited[c.id]?.near.length ?? 0) > 8 && (
                  <span className="muted small"> +{(cited[c.id]?.near.length ?? 0) - 8}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  /* ---------- card panel ---------- */

  const open = card ? byId.get(card) : undefined;
  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCard(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card]);
  const panel = card && (
    <aside className="eng-panel" aria-label={`Card ${card}`}>
      <div className="eng-panel-head">
        <span className={`chip chip-${chipKind(open?.type)}`}>{card}</span>
        {open && (
          <span className="muted small">
            {open.type} · <span className={`status st-${open.status}`}>{open.status}</span>
            {open.layer ? ` · ${open.layer}` : ""}
          </span>
        )}
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setCard(null)}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      {open ? (
        <>
          <h3>{open.title.replace(/^"|"$/g, "")}</h3>
          {cited[card] && (
            <p className="small">
              On:{" "}
              {cited[card].direct.length ? (
                cited[card].direct.map((w) => <LoopLink key={w} id={w} />)
              ) : (
                <span className="muted">no node</span>
              )}
            </p>
          )}
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: trusted local design cards, rendered on the server */}
          <div className="prose eng-panel-body" dangerouslySetInnerHTML={{ __html: open.html }} />
          {open.links.length > 0 && (
            <>
              <h4>Links</h4>
              <ul className="eng-panel-links">
                {open.links.map((l) => (
                  <li key={`${l.rel}-${l.to}`}>
                    <span className="muted">{l.rel}</span> <Ref id={l.to} />{" "}
                    <span className="small">
                      {byId.get(l.to)?.title.replace(/^"|"$/g, "") ?? ""}
                      {l.note ? <span className="muted"> · {l.note}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p>
            <a href={`/?focus=${card}`}>Open in the graph</a>
          </p>
        </>
      ) : (
        <p className="muted">No card has this ID; it lives in a document.</p>
      )}
    </aside>
  );

  return (
    <div className="eng">
      <div className="eng-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "designed" && designed}
      {tab === "events" && events}
      {tab === "walk" && walk}
      {tab === "cards" && cardsTab}
      {panel}
    </div>
  );
}
