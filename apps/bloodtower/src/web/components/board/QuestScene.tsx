import type { BoardView } from "bloodtower-protocols";
import { questItemName } from "../../../engine/views/questItems.ts";
import { DialogFrame } from "./DialogFrame";

type Table = NonNullable<BoardView["table"]>;
type Building = NonNullable<Table["building"]>;
type Quest = NonNullable<Building["quest"]>;

type QuestCopy = {
  title: string;
  opening: string[];
  /** The line after the option, by option id (rewards step). */
  outcome: Record<string, string>;
  /** The Ambush only: the toll when the purse was short. */
  outcomeShort?: string;
  endHook: string;
};

/** Copy table, C3/14 (Loremaster 2026-11-12), by quest id. Words in braces are filled in by the app. */
export const QUEST_COPY: Record<string, QuestCopy> = {
  herald: {
    title: "The Herald",
    opening: [
      'Tomas the herald meets you at the well. "They take a cart a week now. Will you go?"',
    ],
    outcome: {
      "take-the-job":
        'Tomas hands you a map of the keep\'s old ways. "My father drew it. Bring it back if you can."',
      "ask-pay-first": "Tomas counts ten gold out of the village box. It doesn't take long.",
    },
    endHook: '"The forest road," Tomas says. "That\'s where they wait."',
  },
  ambush: {
    title: "The Ambush",
    opening: [
      "Felled trees block the forest road. Men step out from behind them, bows drawn.",
      "Their shields have had a crest scratched off.",
    ],
    outcome: {
      "pay-the-toll": '"Ten gold, and you walk." You pay, and they melt back into the trees.',
    },
    outcomeShort: "You don't have ten. They take what you have, and a beating for the rest.",
    endHook: "The road is clear. Past the trees, the old keep stands on its hill.",
  },
};

export const QUEST_SCENE_COPY = {
  corruptionPick: "Who takes the corruption?",
  itemPick: "Who takes the reward?",
  rewardsLine: (reward: string) => `You gain: ${reward}`,
  badgeGold: (n: number) => `+${n}`,
  badgeQuestGold: (n: number) => `quest +${n}`,
  auto: "Moves on by itself.",
  /** Copy table `choice.prompt` (Loremaster): the question over the options. */
  choicePrompt: "Will you help?",
} as const;

/** The quest's words for this step, one line each (SCR-014: every story line shows on the board). */
export function questWords(quest: Quest): string[] {
  const copy = QUEST_COPY[quest.questId];
  switch (quest.phase) {
    case "choose":
      return copy?.opening ?? [];
    case "hero":
      return [
        quest.pending === "corruption"
          ? QUEST_SCENE_COPY.corruptionPick
          : QUEST_SCENE_COPY.itemPick,
      ];
    case "rewards": {
      const short = quest.rewards?.tollShort === true;
      const line = short ? copy?.outcomeShort : copy?.outcome[quest.optionId ?? ""];
      return line ? [line] : [];
    }
    case "end":
      return copy ? [copy.endHook] : [];
  }
}

/** The quest track (UI-025): one dot per step, filled when done. */
function Track({ done, total }: { done: number; total: number }) {
  return (
    <p
      data-quest-track=""
      data-track-done={done}
      data-track-total={total}
      role="img"
      aria-label="Quest track"
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: the dots are positional, in order
          key={index}
          className="bt-quest-step"
          data-step={index < done ? "done" : "todo"}
        >
          {index < done ? "●" : "○"}
        </span>
      ))}
    </p>
  );
}

/**
 * UI-042 on the Story board: the quest's painting, its narration on a Scroll, the track (UI-025),
 * the item Reveal (UI-036) and the rewards (MEC-037 .9). Display only; the options are on the iPad.
 * No quest art exists yet, so the painting is a framed placeholder.
 */
export function QuestScene({ quest }: { quest: Quest }) {
  const copy = QUEST_COPY[quest.questId];
  const rewards = quest.rewards;
  const gains = rewards
    ? [
        ...(rewards.gold > 0 ? [`${rewards.gold} gold`] : []),
        ...rewards.items.map(questItemName),
        ...(rewards.questGold > 0 ? [`${rewards.questGold} gold each`] : []),
      ]
    : [];
  return (
    <section
      className="bt-quest"
      data-quest-scene={quest.questId}
      data-quest-phase={quest.phase}
      data-quest-option={quest.optionId ?? undefined}
    >
      {/* The item Reveal (UI-036): the mockup's card, the item's name over its art placeholder. */}
      {quest.reveal ? (
        <figure className="bt-quest-card" data-reveal-card="">
          <p className="bt-quest-reveal" data-reveal="" data-reveal-item={quest.reveal}>
            {questItemName(quest.reveal)}
          </p>
          <div data-item-placeholder="">PLACEHOLDER: item art: none</div>
        </figure>
      ) : (
        /* No quest art exists yet: the mockup's dashed placeholder stands in the frame. */
        <figure className="bt-quest-painting" data-quest-painting="">
          <figcaption data-quest-placeholder="">
            PLACEHOLDER: quest painting: {copy?.title ?? quest.questId} (no art)
          </figcaption>
          {quest.phase === "choose" ? (
            <p data-quest-prompt="">{QUEST_SCENE_COPY.choicePrompt}</p>
          ) : null}
        </figure>
      )}
      <DialogFrame
        size="compact"
        className="bt-ink-in"
        data-scroll=""
        data-quest-words=""
        role="status"
        style={{ textAlign: "center" }}
      >
        <h2 data-quest-title="" style={{ marginTop: 0 }}>
          {copy?.title ?? quest.questId}
        </h2>
        <Track done={quest.track.done} total={quest.track.total} />
        {questWords(quest).map((line) => (
          <p key={line} data-dialog-line="">
            {line}
          </p>
        ))}
        {rewards && quest.phase === "rewards" && gains.length > 0 ? (
          <div data-quest-rewards="">
            <p data-quest-rewards-line="">{QUEST_SCENE_COPY.rewardsLine(gains.join(", "))}</p>
            {rewards.gold > 0 ? (
              <span className="bt-quest-badge" data-badge="gold">
                {QUEST_SCENE_COPY.badgeGold(rewards.gold)}
              </span>
            ) : null}
            {Array.from({ length: rewards.presentHeroes }, (_, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: one badge per present hero, in order
                key={index}
                className="bt-quest-badge"
                data-badge="quest-gold"
                data-quest-gold={rewards.questGold}
              >
                {QUEST_SCENE_COPY.badgeQuestGold(rewards.questGold)}
              </span>
            ))}
          </div>
        ) : null}
        {quest.phase === "rewards" || quest.phase === "end" ? (
          <p data-quest-tick="">{QUEST_SCENE_COPY.auto}</p>
        ) : null}
      </DialogFrame>
    </section>
  );
}
