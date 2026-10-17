import {
  absentHuntersOf,
  type Cue,
  type Moment,
  type Pack,
  parseMomentId,
  pickOptionsFor,
} from "bloodtower-protocols";

export interface StoryboardMoment {
  id: string;
  kind: Moment["kind"];
  text: string | null;
  still: string | null;
  fallbackAudio: string | null;
}

/** The choice an iPad pick offers (D23). Options come from the pack's `choices.yaml`. */
export interface BeatPick {
  momentId: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
}

export interface Beat {
  key: string;
  /** Shared moment after present/absent filtering. Private lines are not copied here. */
  storyboard: StoryboardMoment | null;
  privates: ReadonlyMap<string, Moment>;
  /** A pick moment with `target: ipad:all`. Every joined iPad gets its options. */
  pick: BeatPick | null;
  cue: string | null;
  momentSubject: string;
}

const variantCount = (id: string) => parseMomentId(id)?.variants.length ?? 0;

const absenceOnly = (id: string) =>
  (parseMomentId(id)?.variants ?? []).every((variant) => variant.startsWith("no-"));

const matches = (id: string, absent: ReadonlySet<string>) =>
  absenceOnly(id) && absentHuntersOf(id).every((hunter) => absent.has(hunter));

/** Most specific present/absent variant, pack order on a tie. Other variants are not played in R1. */
const select = (moments: readonly Moment[], absent: ReadonlySet<string>): Moment | undefined => {
  const matching = moments.filter((moment) => matches(moment.id, absent));
  const best = matching.reduce((max, moment) => Math.max(max, variantCount(moment.id)), -1);
  return matching.find((moment) => variantCount(moment.id) === best);
};

const textOf = (moment: Moment): string | null => {
  if (moment.lines && moment.lines.length > 0) {
    return moment.lines.map((line) => line.text).join("\n");
  }
  return moment.placeholder ?? null;
};

/** A pick moment must have text and options in the pack, or the beat cannot be played. */
const pickOf = (pack: Pack, moment: Moment): BeatPick => {
  const options = pickOptionsFor(pack.choices, moment.id);
  const prompt = textOf(moment);
  if (options.length === 0) throw new Error(`${moment.id} has no options in choices.yaml.`);
  if (!prompt) throw new Error(`${moment.id} has no prompt text.`);
  return { momentId: moment.id, prompt, options };
};

const cueNamed = (pack: Pack, name: string | undefined): Cue | undefined =>
  name ? pack.cues.find((cue) => cue.name === name) : undefined;

/**
 * Ordered beats for the pack's first night.
 * `~no-<hunter>` replaces the base when that hunter is absent. A missing variant plays the base.
 * A private moment is kept only for a present hunter, unless its scope is global.
 */
export const beatsForNight = (pack: Pack, absent: ReadonlySet<string>): Beat[] => {
  const night = pack.nights[0];
  if (!night) throw new Error("The pack has no night.");
  const allowed = new Set(night.set_pieces.map((piece) => piece.ref));
  const groups = new Map<string, Moment[]>();
  const order: string[] = [];
  for (const moment of pack.moments) {
    const parsed = parseMomentId(moment.id);
    if (!parsed || !allowed.has(parsed.scene)) continue;
    const key = `${parsed.scene}.${parsed.moment}`;
    const list = groups.get(key);
    if (list) list.push(moment);
    else {
      groups.set(key, [moment]);
      order.push(key);
    }
  }

  const beats: Beat[] = [];
  for (const key of order) {
    const moments = groups.get(key) ?? [];
    // Routed by target (D23): a storyboard moment is shared, an ipad:all pick goes to the iPads.
    const shared = select(
      moments.filter(
        (moment) => !parseMomentId(moment.id)?.hunter && moment.target === "storyboard",
      ),
      absent,
    );
    const pickMoment = moments.find(
      (moment) =>
        !parseMomentId(moment.id)?.hunter &&
        moment.target === "ipad:all" &&
        moment.kind === "pick-card",
    );
    const pick = pickMoment ? pickOf(pack, pickMoment) : null;
    const byHunter = new Map<string, Moment[]>();
    for (const moment of moments) {
      const hunter = parseMomentId(moment.id)?.hunter;
      if (!hunter) continue;
      const list = byHunter.get(hunter);
      if (list) list.push(moment);
      else byHunter.set(hunter, [moment]);
    }
    const privates = new Map<string, Moment>();
    for (const [hunter, list] of byHunter) {
      const chosen = select(list, absent);
      if (!chosen) continue;
      if (absent.has(hunter) && chosen.scope !== "global") continue;
      privates.set(hunter, chosen);
    }
    if (!shared && !pick && privates.size === 0) continue;

    const cue = cueNamed(pack, shared?.cues?.[0]?.cue);
    const placeholder = [...privates.values()].map((moment) => moment.placeholder).find(Boolean);
    let storyboard: StoryboardMoment | null = null;
    if (pick) {
      // The board shows the pick's prompt text. The options are for the iPads only.
      storyboard = {
        id: pick.momentId,
        kind: "pick-card",
        text: pick.prompt,
        still: null,
        fallbackAudio: null,
      };
    } else if (shared) {
      storyboard = {
        id: shared.id,
        kind: shared.kind,
        text: textOf(shared),
        still: shared.asset ?? cue?.screen ?? null,
        fallbackAudio: cue?.fallback_sfx ?? null,
      };
    } else if (placeholder) {
      storyboard = {
        id: key,
        kind: "text-card",
        text: placeholder,
        still: null,
        fallbackAudio: null,
      };
    }
    beats.push({
      key,
      storyboard,
      privates,
      pick,
      cue: cue?.name ?? null,
      momentSubject: pick?.momentId ?? shared?.id ?? key,
    });
  }
  return beats;
};

export const privateText = (moment: Moment): string | null => textOf(moment);
