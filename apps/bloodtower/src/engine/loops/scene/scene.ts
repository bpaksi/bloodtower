/** Plain-scene type (MEC-037) and its one step (MEC-077). Data only plus the lint. */

export type SceneCost =
  | { kind: "gold"; amount: number }
  /** Hit points from each present hero, stopping at 1 (DEC-714). */
  | { kind: "hp"; amount: number }
  /** One corruption to one hero the group picks (DEC-693). */
  | { kind: "corruption" }
  /** The Ambush toll (Q-C3-22): tuning gold, or all gold plus hit points per present hero. */
  | { kind: "toll" };

export type SceneEffect =
  /** Positive gains gold (DEC-642), negative spends it. */
  | { kind: "gold"; amount: number }
  /** A quest item; the group picks the hero who takes it (DEC-653). */
  | { kind: "item"; item: string }
  | { kind: "flag"; flag: string };

export type SceneOption = {
  id: string;
  label: string;
  /** Shown disabled when no present hero holds it (DEC-654). Never spent (DEC-674). */
  needsItem?: string;
  cost?: SceneCost;
  /** One to three, applied in order (DEC-692). */
  effects: SceneEffect[];
  /** Holds a battle: hidden in C3 (Q-C3-02). */
  battle?: boolean;
};

export type PlainScene = {
  id: string;
  options: SceneOption[];
};

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 3;
export const MAX_EFFECTS = 3;

/** Options the group sees: a battle option is hidden, not disabled (Q-C3-02). */
export const visibleOptions = (scene: PlainScene): SceneOption[] =>
  scene.options.filter((option) => !option.battle);

/** Lint problems for one scene; empty when it is sound. */
export const lintScene = (scene: PlainScene): string[] => {
  const issues: string[] = [];
  const total = scene.options.length;
  const hidden = scene.options.filter((o) => o.battle).length;
  // C3 exception to DEC-692: one shown option is fine only when every other option is a hidden battle.
  const c3Exception = total === 2 && hidden === 1 && visibleOptions(scene).length === 1;
  if ((total < MIN_OPTIONS && !c3Exception) || total > MAX_OPTIONS) {
    issues.push(
      `${scene.id}: a scene has ${MIN_OPTIONS} or ${MAX_OPTIONS} options, found ${total}.`,
    );
  } else if (total < MIN_OPTIONS) {
    issues.push(`${scene.id}: a one-option scene needs a hidden battle option beside it.`);
  }
  if (visibleOptions(scene).length === 0) issues.push(`${scene.id}: no option can be shown.`);
  for (const option of scene.options) {
    if (option.effects.length < 1 || option.effects.length > MAX_EFFECTS) {
      issues.push(
        `${scene.id}/${option.id}: 1 to ${MAX_EFFECTS} effects, found ${option.effects.length}.`,
      );
    }
  }
  return issues;
};
