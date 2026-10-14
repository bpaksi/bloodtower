import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import {
  type CuePlay,
  cuePlaySchema,
  type DashboardState,
  dashboardStatePayloadSchema,
  deviceStatePayloadSchema,
  HUNTER_IDS,
  type HunterId,
  hunterIdSchema,
  INVESTIGATION_ACTIONS,
  type InvestigationAction,
  isDashboardSafe,
  type LoggedEvent,
  loggedEventSchema,
  type MomentId,
  type MomentTarget,
  momentIdSchema,
  momentTargetSchema,
  SCENE_ID,
  START_NIGHT,
  STARTING_CARRIED_ITEMS,
  utcTimestampSchema,
} from "burgomaster-funeral-poc-protocols";
import {
  type Catalog,
  type CatalogFinding,
  type CatalogLine,
  findingFor,
  requireMoment,
} from "../assets/catalog.ts";
import { ACCENT_ID, accentDelayMs } from "./accent.ts";
import type { Clock } from "./clock.ts";

/** Still, then the line, then a short gap so the ambient pulse is visible between lines. */
const REVEAL_MS = 4_000;
const GAP_MS = 800;
const ACCENT_FLASH_MS = 2_000;

/**
 * Chosen so the first accent falls in the `.03` reveal: an open moment, not speech
 * and not the investigate cue, so the screen pulse is visible before the picks.
 */
export const DEMO_SEED = "funeral-demo-10";
const PACK_VERSION = "n2-burgomasters-funeral-assets";

export const OPENING_MOMENTS: readonly MomentId[] = [
  "n2-burgomasters-funeral.01",
  "n2-burgomasters-funeral.02",
  "n2-burgomasters-funeral.03",
  "n2-burgomasters-funeral.investigate",
].map((id) => momentIdSchema.parse(id));

const INVESTIGATE = momentIdSchema.parse("n2-burgomasters-funeral.investigate");

export const hunterName = (id: HunterId): string => id.slice(0, 1).toUpperCase() + id.slice(1);

const assetUrl = (relativePath: string, token?: string): string => {
  const path = relativePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const base = `/assets/${path}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
};

export interface SpokenCaption {
  speaker: string;
  text: string;
  audioUrl: string;
  /** How far into this line the clock already is, when a device refreshes mid-line. */
  elapsedMs: number;
}

export interface DashboardView {
  role: "dashboard";
  revision: number;
  stage: "join" | "scene";
  join: { code: string; url: string };
  gate: { canBegin: boolean; unheld: HunterId[] };
  roster: {
    hunter: HunterId;
    name: string;
    portraitUrl: string;
    held: boolean;
    corruption: null;
  }[];
  playback: null | {
    momentId: MomentId;
    stillUrl: string;
    caption: SpokenCaption | null;
    speaking: boolean;
    lineKey: string | null;
    musicUrl: string | null;
    cue: null | { effect: "pulse"; audioUrl: string; key: string };
  };
  ambient: { live: boolean; suppressed: boolean; reason: string | null; accent: boolean };
  choosing: boolean;
  paused: boolean;
  /**
   * The opening line's real file, so the Dashboard can unlock playback on Begin.
   * Null once the scene is going.
   */
  primeAudioUrl: string | null;
  /** Shown where a count is not known yet. Never a zero standing in for unknown. */
  skulls: "unavailable";
}

export interface DeviceView {
  role: "device";
  revision: number;
  held: { hunter: HunterId; name: string; portraitUrl: string; corruption: null }[];
  choosing: boolean;
  cards: {
    action: InvestigationAction;
    text: string;
    imageUrl: string;
    taken: boolean;
  }[];
  findings: {
    hunter: HunterId;
    name: string;
    momentId: MomentId;
    text: string;
    stillUrl: string;
    audioUrl: string;
  }[];
  paused: boolean;
}

interface Device {
  id: string;
  token: string;
  formFactor: "ipad" | "phone";
  connects: number;
  held: HunterId[];
}

type Phase =
  | { kind: "lobby" }
  | { kind: "reveal"; momentIndex: number }
  | { kind: "speech"; momentIndex: number; lineIndex: number }
  | { kind: "gap"; momentIndex: number; next: "line" | "moment" }
  | { kind: "picks" };

export interface SliceError {
  code: "invalid-state" | "invalid-payload";
  message: string;
}

export interface HelloResult {
  clientId: string;
  token: string;
  role: "dashboard" | "device";
  channels: MomentTarget[];
}

interface Deps {
  catalog: Catalog;
  clock: Clock;
  joinUrlFor: (code: string) => string;
  log: (event: LoggedEvent) => void;
  onChange?: () => void;
  /** Defaults to {@link DEMO_SEED}. Tests pass another seed to land an accent in a cue. */
  seed?: string;
}

const fail = (message: string): { ok: false; error: SliceError } => ({
  ok: false,
  error: { code: "invalid-state", message },
});

/**
 * The demo slice: one session, from the join gate through the opening moments to one investigation pick.
 * All four hunters are locked present when the host begins. There is no tower.
 */
export class DemoSession {
  private readonly deps: Deps;
  private readonly code: string;
  private readonly url: string;
  private readonly devices = new Map<string, Device>();
  private readonly dashboardTokens = new Set<string>();
  private readonly picks = new Map<HunterId, InvestigationAction>();
  private phase: Phase = { kind: "lobby" };
  private paused = false;
  private pausedHunters: HunterId[] = [];
  private pauseStartedAt: number | null = null;
  private frozenRemaining = 0;
  private speechStartedAt: number | null = null;
  private frozenElapsed: number | null = null;
  private phaseEndsAt = 0;
  private phaseTimer: { cancel: () => void } | null = null;
  private accentTimer: { cancel: () => void } | null = null;
  private accentIndex = 0;
  private accentUntil = 0;
  private revision = 0;
  private lastCaption: CatalogLine | null = null;
  private cueQueued: CuePlay[] = [];
  private bed: { suppressed: boolean; reason: string | null } | null = null;
  private seq = 0;
  private readonly seed: string;

  constructor(deps: Deps) {
    this.deps = deps;
    this.seed = deps.seed ?? DEMO_SEED;
    this.code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    this.url = deps.joinUrlFor(this.code);
    this.write("session_started", {
      seed: this.seed,
      packVersion: PACK_VERSION,
      towerUsed: false,
    });
  }

  get joinCode(): string {
    return this.code;
  }

  get joinUrl(): string {
    return this.url;
  }

  close() {
    this.phaseTimer?.cancel();
    this.accentTimer?.cancel();
  }

  pullCues(): CuePlay[] {
    const queued = this.cueQueued;
    this.cueQueued = [];
    return queued;
  }

  helloDashboard(): HelloResult {
    const token = randomBytes(24).toString("hex");
    const clientId = `dash${randomBytes(6).toString("hex")}`;
    this.dashboardTokens.add(token);
    return { clientId, token, role: "dashboard", channels: ["dashboard"] };
  }

  helloDevice(
    formFactor: "ipad" | "phone",
    joinCode: string | undefined,
    token: string | undefined,
  ): { ok: true; hello: HelloResult } | { ok: false; error: SliceError } {
    if (token) {
      const device = [...this.devices.values()].find((item) => item.token === token);
      if (!device) return fail("This device needs to join again.");
      this.attach(device);
      this.commit();
      return { ok: true, hello: this.welcome(device) };
    }
    if (!joinCode || !sameCode(joinCode, this.code)) {
      return fail("That join code is not the one on the Dashboard.");
    }
    const device: Device = {
      id: `d${randomBytes(8).toString("hex")}`,
      token: randomBytes(24).toString("hex"),
      formFactor,
      connects: 1,
      held: [],
    };
    this.devices.set(device.id, device);
    this.write("device_joined", {
      deviceId: device.id,
      formFactor,
      heldHunters: [],
    });
    this.commit();
    return { ok: true, hello: this.welcome(device) };
  }

  detach(deviceId: string) {
    const device = this.devices.get(deviceId);
    if (!device) return;
    device.connects -= 1;
    if (device.connects > 0) return;
    device.connects = 0;
    if (this.phase.kind === "lobby") {
      for (const hunter of [...device.held]) this.setHold(device, hunter, "release");
    }
    this.commit();
  }

  hold(
    deviceId: string,
    hunter: HunterId,
    action: "take" | "release",
  ): { ok: true } | { ok: false; error: SliceError } {
    const device = this.devices.get(deviceId);
    if (!device || device.connects <= 0) return fail("This device is not connected.");
    if (action === "take" && device.held.includes(hunter)) return { ok: true };
    if (action === "release" && !device.held.includes(hunter)) return { ok: true };
    this.setHold(device, hunter, action);
    this.commit();
    return { ok: true };
  }

  begin(): { ok: true } | { ok: false; error: SliceError } {
    if (this.phase.kind !== "lobby") return fail("The scene has already started.");
    const unheld = this.unheld();
    if (unheld.length > 0) {
      this.write("start_gate_blocked", { unheld });
      this.commit();
      return fail("Every hunter has to be held before the scene can begin.");
    }
    this.write("presence_locked", {
      sceneId: SCENE_ID,
      present: [...HUNTER_IDS],
      absent: [],
      locations: {
        agnes: "sanctuary",
        tomas: "sanctuary",
        wren: "sanctuary",
        emeric: "sanctuary",
      },
    });
    this.write("holdings_snapshot", {
      agnes: this.holdersOf("agnes"),
      tomas: this.holdersOf("tomas"),
      wren: this.holdersOf("wren"),
      emeric: this.holdersOf("emeric"),
    });
    this.enterReveal(0);
    this.armAccent();
    this.commit();
    return { ok: true };
  }

  pick(
    deviceId: string,
    hunter: HunterId,
    action: InvestigationAction,
  ): { ok: true } | { ok: false; error: SliceError } {
    if (this.phase.kind !== "picks") return fail("It is not time to choose.");
    if (this.paused) return fail("Play is paused.");
    const device = this.devices.get(deviceId);
    if (!device || device.connects <= 0) return fail("This device is not connected.");
    if (!device.held.includes(hunter)) return fail("This device does not hold that hunter.");
    if (this.picks.has(hunter)) return fail("That hunter has already chosen.");
    if ([...this.picks.values()].includes(action)) return fail("That choice is taken.");
    const finding = findingFor(this.deps.catalog, hunter, action);
    this.picks.set(hunter, action);
    this.write("private_delivered", {
      momentId: finding.momentId,
      hunter,
      deviceId: device.id,
    });
    this.commit();
    return { ok: true };
  }

  actorFor(
    token: string | undefined,
  ): { role: "dashboard" } | { role: "device"; device: Device; delivered: string[] } | undefined {
    if (!token) return undefined;
    if (this.dashboardTokens.has(token)) return { role: "dashboard" };
    const device = [...this.devices.values()].find((item) => item.token === token);
    if (!device) return undefined;
    return { role: "device", device, delivered: this.deliveredTo(device) };
  }

  dashboardState(): DashboardState {
    const moment = this.publicMoment();
    return dashboardStatePayloadSchema.parse({
      stage: this.phase.kind === "lobby" ? "join" : "scene",
      night: START_NIGHT,
      hunters: this.party(),
      skullSupply: null,
      skullDropsTonight: null,
      storyFlag: null,
      moment,
      paused: this.paused ? this.pausedHunters.map((hunter) => ({ hunter, pausedMs: null })) : [],
      devices: [...this.devices.values()]
        .map((device) => ({
          deviceId: device.id,
          formFactor: device.formFactor,
          connected: device.connects > 0,
          heldHunters: [...device.held],
        }))
        .sort((a, b) => a.deviceId.localeCompare(b.deviceId)),
      join: { code: this.code, url: this.url },
      battle: null,
      lidChoice: null,
      fightResult: null,
      summary: null,
      gate: {
        canBegin: this.unheld().length === 0 && this.phase.kind === "lobby",
        unheld: this.unheld(),
      },
    });
  }

  deviceState(deviceId: string) {
    const device = this.devices.get(deviceId);
    const held = device ? HUNTER_IDS.filter((hunter) => device.held.includes(hunter)) : [];
    return deviceStatePayloadSchema.parse({
      heldHunters: held,
      views: held.map((hunter) => this.hunterView(hunter)),
    });
  }

  dashboardView(token: string): DashboardView {
    const playback = this.playback(token);
    const ambient = this.bedState();
    const view: DashboardView = {
      role: "dashboard",
      revision: this.revision,
      stage: this.phase.kind === "lobby" ? "join" : "scene",
      join: { code: this.code, url: this.url },
      gate: {
        canBegin: this.unheld().length === 0 && this.phase.kind === "lobby",
        unheld: this.unheld(),
      },
      roster: HUNTER_IDS.map((hunter) => ({
        hunter,
        name: hunterName(hunter),
        portraitUrl: assetUrl(this.deps.catalog.portraits[hunter]),
        held: this.connectedHolders(hunter),
        corruption: null,
      })),
      playback,
      ambient: {
        live: this.phase.kind !== "lobby",
        suppressed: this.phase.kind === "lobby" ? true : ambient.suppressed,
        reason: this.phase.kind === "lobby" ? null : ambient.reason,
        accent: this.deps.clock.now().getTime() < this.accentUntil,
      },
      choosing: this.phase.kind === "picks",
      paused: this.paused,
      primeAudioUrl: this.primeAudio(token),
      skulls: "unavailable",
    };
    if (!isDashboardSafe(view)) throw new Error("Dashboard view carried a private moment.");
    return view;
  }

  deviceView(device: Device): DeviceView {
    const held = HUNTER_IDS.filter((hunter) => device.held.includes(hunter));
    const taken = new Set(this.picks.values());
    return {
      role: "device",
      revision: this.revision,
      held: held.map((hunter) => ({
        hunter,
        name: hunterName(hunter),
        portraitUrl: assetUrl(this.deps.catalog.portraits[hunter]),
        corruption: null,
      })),
      choosing: this.phase.kind === "picks" && !this.paused,
      cards:
        this.phase.kind === "picks"
          ? this.deps.catalog.cards.map((card) => ({
              action: card.action,
              text: card.text,
              imageUrl: assetUrl(card.imagePath, device.token),
              taken: taken.has(card.action),
            }))
          : [],
      findings: held.flatMap((hunter) => {
        const action = this.picks.get(hunter);
        if (!action) return [];
        const finding = findingFor(this.deps.catalog, hunter, action);
        return [this.findingView(device.token, finding)];
      }),
      paused: this.paused,
    };
  }

  private primeAudio(token: string): string | null {
    if (this.phase.kind !== "lobby") return null;
    const opening = OPENING_MOMENTS[0];
    if (!opening) return null;
    const line = requireMoment(this.deps.catalog, opening).lines[0];
    if (!line) return null;
    return assetUrl(line.audioPath, token);
  }

  private findingView(token: string, finding: CatalogFinding) {
    return {
      hunter: finding.hunter,
      name: hunterName(finding.hunter),
      momentId: finding.momentId,
      text: finding.text,
      stillUrl: assetUrl(finding.stillPath, token),
      audioUrl: assetUrl(finding.audioPath, token),
    };
  }

  private welcome(device: Device): HelloResult {
    const channels = device.held.map((hunter) => momentTargetSchema.parse(`ipad:${hunter}`));
    return { clientId: device.id, token: device.token, role: "device", channels };
  }

  private attach(device: Device) {
    const wasDown = device.connects <= 0;
    device.connects += 1;
    if (wasDown) {
      this.write("device_rejoined", {
        deviceId: device.id,
        formFactor: device.formFactor,
        heldHunters: [...device.held],
      });
    }
  }

  private setHold(device: Device, hunter: HunterId, action: "take" | "release") {
    if (action === "take") device.held.push(hunter);
    else device.held = device.held.filter((item) => item !== hunter);
    this.write("holding_changed", {
      deviceId: device.id,
      hunter,
      action,
      by: "device",
      holdersAfter: this.holdersOf(hunter),
    });
  }

  private holdersOf(hunter: HunterId): string[] {
    return [...this.devices.values()]
      .filter((device) => device.held.includes(hunter))
      .map((device) => device.id)
      .sort();
  }

  /** Hunters with no connected holder. The start gate stays shut while this list has anyone. */
  private unheld(): HunterId[] {
    return HUNTER_IDS.filter((hunter) => !this.connectedHolders(hunter));
  }

  private connectedHolders(hunter: HunterId): boolean {
    return [...this.devices.values()].some(
      (device) => device.held.includes(hunter) && device.connects > 0,
    );
  }

  private blockedHunters(): HunterId[] {
    if (this.phase.kind === "lobby") return [];
    return HUNTER_IDS.filter((hunter) => {
      const connected = [...this.devices.values()].filter(
        (device) => device.held.includes(hunter) && device.connects > 0,
      );
      return connected.length === 0;
    });
  }

  private deliveredTo(device: Device): string[] {
    const ids: string[] = [];
    for (const hunter of device.held) {
      const action = this.picks.get(hunter);
      if (!action) continue;
      ids.push(findingFor(this.deps.catalog, hunter, action).momentId);
    }
    return ids;
  }

  private party() {
    const present = this.phase.kind !== "lobby";
    const party = {} as DashboardState["hunters"];
    for (const hunter of HUNTER_IDS) {
      party[hunter] = {
        corruption: null,
        holders: this.holdersOf(hunter),
        location: present ? "sanctuary" : null,
        present: present ? true : null,
        carriedItems: STARTING_CARRIED_ITEMS[hunter],
      };
    }
    return party;
  }

  private publicMoment() {
    if (this.phase.kind === "lobby") return null;
    const id = this.phase.kind === "picks" ? INVESTIGATE : OPENING_MOMENTS[this.phase.momentIndex];
    if (!id) return null;
    return { id, target: "dashboard" as const };
  }

  private playback(token: string): DashboardView["playback"] {
    if (this.phase.kind === "lobby") return null;
    const momentIndex =
      this.phase.kind === "picks" ? OPENING_MOMENTS.length - 1 : this.phase.momentIndex;
    const momentId = OPENING_MOMENTS[momentIndex];
    if (!momentId) return null;
    const moment = requireMoment(this.deps.catalog, momentId);
    const speaking = this.phase.kind === "speech";
    const line =
      this.phase.kind === "speech" ? moment.lines[this.phase.lineIndex] : this.lastCaption;
    const caption = line
      ? {
          speaker: line.speaker,
          text: line.text,
          audioUrl: assetUrl(line.audioPath, token),
          elapsedMs: this.lineElapsed(),
        }
      : null;
    const investigate = momentId === INVESTIGATE && this.phase.kind !== "picks";
    const cue =
      investigate && moment.cue?.audioPath
        ? {
            effect: "pulse" as const,
            audioUrl: assetUrl(moment.cue.audioPath, token),
            key: `${momentId}:${moment.cue.cue}`,
          }
        : null;
    return {
      momentId,
      stillUrl: assetUrl(moment.stillPath, token),
      caption: this.phase.kind === "reveal" ? null : caption,
      speaking,
      lineKey: speaking
        ? `${momentId}:${this.phase.kind === "speech" ? this.phase.lineIndex : 0}`
        : null,
      musicUrl:
        this.phase.kind === "picks" || !moment.musicPath ? null : assetUrl(moment.musicPath, token),
      cue,
    };
  }

  private lineElapsed(): number {
    if (this.speechStartedAt === null) return this.frozenElapsed ?? 0;
    return Math.max(0, this.deps.clock.now().getTime() - this.speechStartedAt);
  }

  private hunterView(hunter: HunterId) {
    const action = this.picks.get(hunter);
    const finding = action ? findingFor(this.deps.catalog, hunter, action) : undefined;
    const remaining = INVESTIGATION_ACTIONS.filter(
      (item) => ![...this.picks.values()].includes(item),
    );
    const choosing = this.phase.kind === "picks" && !this.paused && !action && remaining.length > 0;
    return {
      hunter,
      corruption: null,
      carriedItems: STARTING_CARRIED_ITEMS[hunter],
      statusLine: this.paused ? "Play is paused." : null,
      pendingChoice: choosing ? { kind: "investigation" as const, actions: remaining } : null,
      privateMoment: finding ? { momentId: finding.momentId, text: finding.text } : null,
      endLine: null,
      funRating: null,
    };
  }

  private enterReveal(momentIndex: number) {
    const momentId = OPENING_MOMENTS[momentIndex];
    if (!momentId) throw new Error("The opening has no such moment.");
    this.phase = { kind: "reveal", momentIndex };
    this.lastCaption = null;
    this.speechStartedAt = null;
    this.frozenElapsed = null;
    const moment = requireMoment(this.deps.catalog, momentId);
    this.write("moment_played", {
      momentId,
      target: "dashboard",
      startedAt: this.stamp(),
      skipped: false,
    });
    if (moment.cue) {
      this.write("cue_fired", {
        cue: moment.cue.cue,
        momentId,
        capability: moment.cue.capability,
        status: moment.cue.status,
        result: "fallback",
        reason: "no_tower",
      });
      if (moment.cue.audioPath) {
        this.cueQueued.push(
          cuePlaySchema.parse({
            cue: moment.cue.cue,
            screen: { effect: moment.cue.effect, durationMs: null },
            fallbackAudio: { assetId: moment.cue.assetId },
          }),
        );
      }
    }
    this.armPhase(REVEAL_MS);
  }

  private enterSpeech(momentIndex: number, lineIndex: number) {
    const momentId = OPENING_MOMENTS[momentIndex];
    if (!momentId) throw new Error("The opening has no such moment.");
    const line = requireMoment(this.deps.catalog, momentId).lines[lineIndex];
    if (!line) throw new Error(`${momentId} has no line ${lineIndex}.`);
    this.phase = { kind: "speech", momentIndex, lineIndex };
    this.lastCaption = line;
    this.speechStartedAt = this.deps.clock.now().getTime();
    this.frozenElapsed = null;
    this.armPhase(line.durationMs);
  }

  private enterGap(momentIndex: number, next: "line" | "moment") {
    this.phase = { kind: "gap", momentIndex, next };
    this.speechStartedAt = null;
    this.frozenElapsed = null;
    this.armPhase(GAP_MS);
  }

  private enterPicks() {
    this.phase = { kind: "picks" };
    this.speechStartedAt = null;
    this.phaseTimer?.cancel();
    this.phaseTimer = null;
  }

  private advancePhase() {
    if (this.paused) return;
    const phase = this.phase;
    if (phase.kind === "reveal") {
      this.enterSpeech(phase.momentIndex, 0);
    } else if (phase.kind === "speech") {
      const momentId = OPENING_MOMENTS[phase.momentIndex];
      const lines = momentId ? requireMoment(this.deps.catalog, momentId).lines.length : 0;
      if (phase.lineIndex + 1 < lines) this.enterGap(phase.momentIndex, "line");
      else if (phase.momentIndex + 1 < OPENING_MOMENTS.length)
        this.enterGap(phase.momentIndex, "moment");
      else this.enterPicks();
    } else if (phase.kind === "gap") {
      if (phase.next === "line")
        this.enterSpeech(phase.momentIndex, this.nextLineIndex(phase.momentIndex));
      else this.enterReveal(phase.momentIndex + 1);
    }
    this.commit();
  }

  private nextLineIndex(momentIndex: number): number {
    if (this.phase.kind === "gap" && this.lastCaption) {
      const momentId = OPENING_MOMENTS[momentIndex];
      const lines = momentId ? requireMoment(this.deps.catalog, momentId).lines : [];
      const current = lines.findIndex((line) => line.audioPath === this.lastCaption?.audioPath);
      if (current < 0) throw new Error(`Lost the spoken line during ${momentId ?? "the scene"}.`);
      return current + 1;
    }
    return 0;
  }

  private armPhase(ms: number) {
    this.phaseTimer?.cancel();
    this.phaseEndsAt = this.deps.clock.now().getTime() + ms;
    this.phaseTimer = this.deps.clock.schedule(ms, () => {
      if (!this.paused) this.advancePhase();
    });
  }

  private armAccent() {
    this.accentTimer?.cancel();
    if (this.phase.kind === "lobby" || this.paused) return;
    const delay = accentDelayMs(this.seed, this.accentIndex);
    this.accentTimer = this.deps.clock.schedule(delay, () => this.fireAccent());
  }

  private fireAccent() {
    if (this.paused) return;
    const decision = this.accentDecision();
    this.write("ambient_accent", {
      phase: START_NIGHT,
      accentId: ACCENT_ID,
      seedDraw: `${this.seed}:${this.accentIndex}`,
      startedAt: this.stamp(),
      suppressed: decision.suppressed,
      reason: decision.reason,
    });
    this.accentIndex += 1;
    if (!decision.suppressed) {
      this.accentUntil = this.deps.clock.now().getTime() + ACCENT_FLASH_MS;
    }
    this.armAccent();
    this.revision += 1;
    this.deps.onChange?.();
  }

  private accentDecision(): { suppressed: boolean; reason: string | null } {
    if (this.paused) return { suppressed: true, reason: "pause" };
    if (this.phase.kind === "speech") return { suppressed: true, reason: "speech" };
    if (this.phase.kind === "picks") return { suppressed: true, reason: "choice" };
    if (this.cueMoment()) return { suppressed: true, reason: "scene-cue" };
    return { suppressed: false, reason: null };
  }

  private cueMoment(): boolean {
    if (this.phase.kind === "lobby" || this.phase.kind === "picks") return false;
    return OPENING_MOMENTS[this.phase.momentIndex] === INVESTIGATE;
  }

  private bedState(): { suppressed: boolean; reason: string | null } {
    if (this.paused) return { suppressed: true, reason: "pause" };
    if (this.phase.kind === "picks") return { suppressed: true, reason: "choice" };
    if (this.phase.kind === "speech") return { suppressed: true, reason: "speech" };
    if (this.cueMoment()) return { suppressed: true, reason: "scene-cue" };
    if (this.phase.kind === "lobby") return { suppressed: true, reason: "lobby" };
    return { suppressed: false, reason: null };
  }

  private syncHold() {
    const blocked = this.blockedHunters();
    if (blocked.length > 0 && !this.paused) {
      const now = this.deps.clock.now().getTime();
      this.paused = true;
      this.pausedHunters = blocked;
      this.pauseStartedAt = now;
      this.frozenRemaining = Math.max(0, this.phaseEndsAt - now);
      if (this.speechStartedAt !== null) {
        this.frozenElapsed = now - this.speechStartedAt;
        this.speechStartedAt = null;
      }
      this.phaseTimer?.cancel();
      this.accentTimer?.cancel();
      for (const hunter of blocked) {
        this.write("paused_unheld", { hunter, pausedMs: null });
      }
      return;
    }
    if (blocked.length === 0 && this.paused) {
      const now = this.deps.clock.now().getTime();
      const waited = this.pauseStartedAt === null ? 0 : Math.max(0, now - this.pauseStartedAt);
      const hunters = this.pausedHunters;
      this.paused = false;
      this.pausedHunters = [];
      this.pauseStartedAt = null;
      if (this.phase.kind === "speech" && this.frozenElapsed !== null) {
        this.speechStartedAt = now - this.frozenElapsed;
      }
      this.armPhase(this.frozenRemaining);
      this.armAccent();
      for (const hunter of hunters) {
        this.write("resumed_held", { hunter, pausedMs: waited });
      }
    }
  }

  private syncBed() {
    const next = this.bedState();
    const changed =
      !this.bed || this.bed.suppressed !== next.suppressed || this.bed.reason !== next.reason;
    this.bed = next;
    if (!changed || this.phase.kind === "lobby") return;
    this.write("ambient_bed", {
      phase: START_NIGHT,
      bedId: "dusk-breathe",
      startedAt: this.stamp(),
      suppressed: next.suppressed,
      reason: next.reason,
    });
  }

  private commit() {
    this.syncHold();
    this.syncBed();
    this.revision += 1;
    this.deps.onChange?.();
  }

  private stamp(): string {
    return utcTimestampSchema.parse(this.deps.clock.now().toISOString());
  }

  private write(type: LoggedEvent["type"], payload: unknown) {
    this.seq += 1;
    this.deps.log(
      loggedEventSchema.parse({
        id: `e${this.seq.toString(16).padStart(4, "0")}${randomBytes(4).toString("hex")}`,
        at: this.stamp(),
        type,
        payload,
      }),
    );
  }
}

const sameCode = (given: string, expected: string): boolean => {
  const left = Buffer.from(given);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

/** Hunters the join screen may show before a device has a token. Names and portraits only. */
export const publicHunters = (catalog: Catalog) =>
  HUNTER_IDS.map((hunter) => ({
    hunter: hunterIdSchema.parse(hunter),
    name: hunterName(hunter),
    portraitUrl: assetUrl(catalog.portraits[hunter]),
  }));
