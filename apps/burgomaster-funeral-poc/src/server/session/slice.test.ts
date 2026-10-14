import { join } from "node:path";
import { HUNTER_IDS, isDashboardSafe } from "burgomaster-funeral-poc-protocols";
import { afterEach, describe, expect, it } from "vitest";
import { loadCatalog } from "../assets/catalog.ts";
import { appendEvent, type OpenLog, openLog, readEvents } from "../db/log.ts";
import { ACCENT_ID, accentDelayMs } from "./accent.ts";
import { FakeClock } from "./clock.ts";
import { DEMO_SEED, type DemoSession, DemoSession as Session } from "./slice.ts";

const catalog = loadCatalog(join(import.meta.dirname, "../../../assets"));

interface Harness {
  clock: FakeClock;
  log: OpenLog;
  session: DemoSession;
}

const open = (): Harness => {
  const clock = new FakeClock();
  const log = openLog(":memory:");
  const session = new Session({
    catalog,
    clock,
    joinUrlFor: (code) => `http://127.0.0.1:9/join?code=${code}`,
    log: (event) => appendEvent(log.db, event),
  });
  return { clock, log, session };
};

const logs: OpenLog[] = [];
const sessions: DemoSession[] = [];

const start = () => {
  const harness = open();
  logs.push(harness.log);
  sessions.push(harness.session);
  return harness;
};

afterEach(() => {
  for (const session of sessions) session.close();
  sessions.length = 0;
  for (const log of logs) log.close();
  logs.length = 0;
});

const takeAll = (session: DemoSession, deviceId: string) => {
  for (const hunter of HUNTER_IDS) {
    const result = session.hold(deviceId, hunter, "take");
    expect(result.ok).toBe(true);
  }
};

describe("demo slice", () => {
  it("keeps Begin shut until one device holds all four hunters", () => {
    const { session } = start();
    const dash = session.helloDashboard();
    const joined = session.helloDevice("ipad", session.joinCode, undefined);
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    const blocked = session.dashboardView(dash.token);
    expect(blocked.gate.canBegin).toBe(false);
    expect(blocked.gate.unheld).toEqual([...HUNTER_IDS]);
    expect(blocked.join.url).toContain(session.joinCode);
    expect(blocked.roster.every((hunter) => hunter.corruption === null)).toBe(true);
    expect(blocked.skulls).toBe("unavailable");

    expect(session.begin().ok).toBe(false);
    takeAll(session, joined.hello.clientId);
    const openGate = session.dashboardView(dash.token);
    expect(openGate.gate.canBegin).toBe(true);
    expect(openGate.gate.unheld).toEqual([]);
    expect(session.begin().ok).toBe(true);
  });

  it("plays the opening lines from the script, pulses between them, and stops at the picks", () => {
    const { session, clock, log } = start();
    const dash = session.helloDashboard();
    const joined = session.helloDevice("ipad", session.joinCode, undefined);
    if (!joined.ok) throw new Error("join failed");
    takeAll(session, joined.hello.clientId);
    expect(session.begin().ok).toBe(true);

    const reveal = session.dashboardView(dash.token);
    expect(reveal.playback?.momentId).toBe("n2-burgomasters-funeral.01");
    expect(reveal.playback?.caption).toBeNull();
    expect(reveal.playback?.stillUrl).toContain("n2-burgomasters-funeral.01");
    expect(reveal.ambient.live).toBe(true);
    expect(reveal.ambient.suppressed).toBe(false);
    expect(isDashboardSafe(reveal)).toBe(true);
    expect(isDashboardSafe(session.dashboardState())).toBe(true);

    clock.advance(4_000);
    const spoken = session.dashboardView(dash.token);
    expect(spoken.playback?.speaking).toBe(true);
    expect(spoken.playback?.caption?.text).toContain("Vellmoor buries its burgomaster");
    expect(spoken.playback?.caption?.audioUrl).toContain("01.vo-01.narrator.wav");
    expect(spoken.ambient.suppressed).toBe(true);
    expect(spoken.ambient.reason).toBe("speech");

    clock.advance(120_000);
    const picks = session.dashboardView(dash.token);
    expect(picks.choosing).toBe(true);
    expect(picks.ambient.reason).toBe("choice");
    expect(picks.playback?.momentId).toBe("n2-burgomasters-funeral.investigate");
    expect(JSON.stringify(picks)).not.toContain("Two bites");
    expect(JSON.stringify(picks)).not.toContain(".private.");
    expect(isDashboardSafe(session.dashboardState())).toBe(true);

    const types = readEvents(log.db).map((event) => event.type);
    expect(types).toContain("moment_played");
    expect(types).toContain("cue_fired");
    expect(types).toContain("ambient_bed");
    expect(types).not.toContain("private_delivered");
    const cues = readEvents(log.db).filter((event) => event.type === "cue_fired");
    expect(
      cues.every(
        (event) => event.payload.result === "fallback" && event.payload.reason === "no_tower",
      ),
    ).toBe(true);
  });

  it("shows one private finding only on a device that holds the hunter who picked it", () => {
    const { session, clock } = start();
    const dash = session.helloDashboard();
    const holder = session.helloDevice("ipad", session.joinCode, undefined);
    const other = session.helloDevice("phone", session.joinCode, undefined);
    if (!holder.ok || !other.ok) throw new Error("join failed");
    takeAll(session, holder.hello.clientId);
    expect(session.hold(other.hello.clientId, "tomas", "take").ok).toBe(true);
    expect(session.begin().ok).toBe(true);
    clock.advance(120_000);

    expect(session.pick(holder.hello.clientId, "agnes", "examine-body").ok).toBe(true);
    expect(session.pick(other.hello.clientId, "tomas", "examine-body").ok).toBe(false);

    const agnes = session.actorFor(holder.hello.token);
    const tomas = session.actorFor(other.hello.token);
    if (agnes?.role !== "device" || tomas?.role !== "device") throw new Error("missing device");
    const onAgnes = session.deviceView(agnes.device);
    const onTomas = session.deviceView(tomas.device);
    expect(onAgnes.findings.map((item) => item.hunter)).toEqual(["agnes"]);
    expect(onAgnes.findings[0]?.text).toContain("Two bites");
    expect(onAgnes.findings[0]?.stillUrl).toContain("private.agnes");
    expect(onTomas.findings).toEqual([]);
    expect(JSON.stringify(onTomas)).not.toContain("Two bites");

    const dashboard = JSON.stringify(session.dashboardView(dash.token));
    expect(dashboard).not.toContain("Two bites");
    expect(dashboard).not.toContain(".private.");
    expect(
      session.deviceState(holder.hello.clientId).views.find((view) => view.hunter === "agnes")
        ?.privateMoment?.text,
    ).toContain("Two bites");
    expect(isDashboardSafe(session.dashboardState())).toBe(true);
  });

  it("logs the seeded screen-pulse accent and lets the investigate cue override it", () => {
    const { session, clock, log } = start();
    const joined = session.helloDevice("ipad", session.joinCode, undefined);
    if (!joined.ok) throw new Error("join failed");
    takeAll(session, joined.hello.clientId);
    expect(session.begin().ok).toBe(true);

    const delay = accentDelayMs(DEMO_SEED, 0);
    expect(delay).toBeGreaterThanOrEqual(20_000);
    expect(delay).toBeLessThanOrEqual(60_000);
    clock.advance(delay);

    const accent = readEvents(log.db).find((event) => event.type === "ambient_accent");
    if (accent?.type !== "ambient_accent") throw new Error("missing accent");
    expect(accent.payload.accentId).toBe(ACCENT_ID);
    expect(accent.payload.seedDraw).toBe(`${DEMO_SEED}:0`);
    expect(accent.payload.suppressed).toBe(true);
    expect(accent.payload.reason).toBe("scene-cue");
  });

  it("pauses while a hunter has no connected holder and resumes on rejoin", () => {
    const { session, clock } = start();
    const joined = session.helloDevice("ipad", session.joinCode, undefined);
    if (!joined.ok) throw new Error("join failed");
    takeAll(session, joined.hello.clientId);
    expect(session.begin().ok).toBe(true);
    clock.advance(400);
    session.detach(joined.hello.clientId);
    const dash = session.helloDashboard();
    expect(session.dashboardView(dash.token).paused).toBe(true);
    expect(session.dashboardView(dash.token).playback?.speaking).toBe(false);
    clock.advance(30_000);
    expect(session.dashboardView(dash.token).playback?.momentId).toBe("n2-burgomasters-funeral.01");
    expect(session.dashboardView(dash.token).playback?.speaking).toBe(false);

    const back = session.helloDevice("ipad", undefined, joined.hello.token);
    expect(back.ok).toBe(true);
    expect(session.dashboardView(dash.token).paused).toBe(false);
    clock.advance(4_000);
    expect(session.dashboardView(dash.token).playback?.speaking).toBe(true);
  });
});
