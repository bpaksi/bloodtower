import {
  OPENING_MOMENTS,
  openingActiveIndex,
  openingPromptId,
} from "../../../protocols/opening.ts";
import { AUTO_ADVANCE_MS } from "../../../protocols/v2/views.ts";
import type { LoopDefinition } from "../../loop/types.ts";
import { drawPurse, isPurseAmount } from "../../rules/purse/index.ts";
import {
  type OutcomeClosing,
  type OutcomeStage,
  type OutcomeSummaryCounts,
  resolveOutcomeClosing,
} from "../../views/outcome.ts";
import { tryChapters } from "../chapter/chapters.ts";
import type { ChapterResult } from "../chapter/loop.ts";
import { markerBody, TEST_OUTCOME_LINE } from "../chapter/playState.ts";
import { ensureClock } from "../day/clock.ts";
import { ensureQuests } from "../quest/store.ts";
import { CONTINUE_PROMPT, canContinue, finishGame, recordGame } from "../session/hub.ts";
import {
  pauseGoWithoutPrompt,
  pauseQuitPrompt,
  pauseReconnectPrompt,
} from "../session/reconnect.ts";
import type { ShellScreen } from "../session/screens.ts";
import {
  recordOffer,
  requestCheckpoint,
  requestTowerCommand,
  shellState,
} from "../session/shellRef.ts";
import { type GameEnd, gameEndFrom } from "./end.ts";
import {
  allHeroesHeld,
  bindStoryChoice,
  PURSE_STEP_ID,
  SPIN_ACTION,
  SPIN_PROMPT,
  screenAfterBack,
  screenAfterContinue,
  towerSpins,
} from "./setupFlow.ts";

/** The tower's light chase for the spin (`lighting.sequence`), with the coin sound alongside it. */
const PURSE_SPIN_SEQUENCE = "twinkle";
/** Placeholder library sound for the coin cue, until Bob's sound notes pick one (as CUE-006). */
const PURSE_COIN_SOUND = 1;
/** CUE-003 (LSQ-011 Defeat + SND-096 Tower Gloat 1): plays once with a loss scene (EV-07). */
const DEFEAT_LIGHT_SEQUENCE = "defeat";
const DEFEAT_SOUND_INDEX = 96;

/** Auto-advance wait for one outcome beat, run by the host (EV-06, EV-11, EV-12). */
export type OutcomeWait = { id: string; maxMs: number; lineId: string | null };

export type OutcomeState = {
  stage: OutcomeStage;
  end: GameEnd;
  closing: OutcomeClosing | null;
  summary: OutcomeSummaryCounts;
  /** CUE-003 fired once on a loss; preserved in checkpoints so Continue never replays it (EV-13). */
  cueFired: boolean;
  cues: "CUE-003"[];
  wait: OutcomeWait | null;
  waitDone: boolean;
};

export type GameLocal = {
  phase:
    | "pick-story"
    | "not-playable"
    | "game-settings"
    | "claim-heroes"
    | "setup"
    | "begin"
    | "play"
    | "outcome"
    | "done";
  awaitingPress: boolean;
  playStarted: boolean;
  /** The last chapter whose report this game has read (MEC-032 .42). Absent in an older save: 0. */
  lastChapter?: number;
  /** Set when a chapter report ended the game; the close writes the record from it. */
  end?: GameEnd | null;
  /** The active outcome scene (SCR-018, C3/16) while `phase === "outcome"`. */
  outcome?: OutcomeState | null;
};

export type GameResult = {
  outcome: "quit" | "completed" | "won" | "lost";
  reason?: GameEnd["reason"];
  sceneId?: string;
};

const syncScreen = (local: GameLocal) => {
  const shell = shellState();
  if (local.phase === "play" || local.phase === "outcome") shell.screen = "play";
  else if (local.phase !== "done") shell.screen = local.phase;
};

const outcomeWaitFor = (stage: OutcomeStage, seed: string): OutcomeWait => {
  const line = stage === "scene" ? markerBody(seed, TEST_OUTCOME_LINE, /^[\w.-]*/) : null;
  return { id: `outcome-${stage}`, maxMs: AUTO_ADVANCE_MS, lineId: line || null };
};

const startOutcome = (end: GameEnd): OutcomeState => {
  const shell = shellState();
  const play = shell.play;
  const days = play?.dayNumber ?? 0;
  const questsDone = play ? ensureQuests(play).done.length : 0;
  const skullsOnBoard = play
    ? Object.values(ensureClock(play).skulls).reduce((sum, count) => sum + count, 0)
    : 0;
  const chapters = play ? tryChapters(play) : null;
  const c3Chapter1 = end.chapter === 1 && chapters?.plan.c3EndAfterChapter1 === true;
  const flags = new Set(play ? ensureQuests(play).flags : []);
  const closing = resolveOutcomeClosing(end, { c3Chapter1, flags });
  const lost = end.outcome === "lost";
  const cues: "CUE-003"[] = [];
  if (lost) {
    cues.push("CUE-003");
    if (shell.towerLinked && !shell.towerWithout) {
      requestTowerCommand("lighting.sequence", {
        sequence: DEFEAT_LIGHT_SEQUENCE,
        soundIndex: DEFEAT_SOUND_INDEX,
      });
    }
  }
  // List the outcome in tonight's games at once so a host restart on the outcome scene lands on
  // the session screen with the game listed won or lost, never in progress (EV-14).
  if (shell.activeGameId) {
    recordGame(shell, shell.activeGameId, end.outcome);
    requestCheckpoint(shell.activeGameId, Math.max(1, days));
  }
  return {
    stage: "scene",
    end,
    closing,
    summary: { days, questsDone, skullsOnBoard },
    cueFired: lost,
    cues,
    wait: outcomeWaitFor("scene", shell.seed),
    waitDone: false,
  };
};

/** The outcome state while the game loop is on the outcome scene, else null. */
export const activeOutcome = (
  stack: readonly { loopId: string; local: unknown }[],
): OutcomeState | null => {
  const frame = stack.find((row) => row.loopId === "game");
  const local = frame?.local as GameLocal | undefined;
  return local?.phase === "outcome" && local.outcome ? local.outcome : null;
};

export const isOnOutcome = (stack: readonly { loopId: string; local: unknown }[]): boolean =>
  activeOutcome(stack) !== null;

/** The open auto-advance wait of the outcome scene, or null. The host runs it (EV-06, EV-11). */
export const openOutcomeWait = (
  stack: readonly { loopId: string; local: unknown }[],
): OutcomeWait | null => {
  const outcome = activeOutcome(stack);
  if (!outcome?.wait || outcome.waitDone) return null;
  return outcome.wait;
};

/** Marks the open outcome wait done when `waitId` names it. False means none was open for it. */
export const endOutcomeWait = (
  stack: readonly { loopId: string; local: unknown }[],
  waitId: string,
): boolean => {
  const frame = stack.find((row) => row.loopId === "game");
  const local = frame?.local as GameLocal | undefined;
  const outcome = local?.phase === "outcome" ? local.outcome : null;
  if (!frame || !local || !outcome?.wait || outcome.waitDone) return false;
  if (outcome.wait.id !== waitId) return false;
  frame.local = { ...local, outcome: { ...outcome, waitDone: true } };
  return true;
};

const offerContinueOrBack = (
  local: GameLocal,
  ctx: { offerPrompt: (promptId: string, actionId: string) => void },
) => {
  const shell = shellState();
  const offer = (promptId: string, actionId: string) => {
    ctx.offerPrompt(promptId, actionId);
    recordOffer(promptId, actionId);
  };
  if (shell.screen === "pick-story") {
    // Continue sits above the stories while an autosave exists (DEC-709, DEC-283).
    if (canContinue(shell)) offer(CONTINUE_PROMPT, "continue");
    offer(`continue-pick-story-${shell.focusStoryId}`, "continue");
    local.awaitingPress = true;
    return;
  }
  if (shell.screen === "not-playable") {
    offer("back-not-playable", "back");
    local.awaitingPress = true;
    return;
  }
  if (shell.screen === "game-settings") {
    offer("continue-game-settings", "continue");
    offer("back-game-settings", "back");
    local.awaitingPress = true;
    return;
  }
  if (shell.screen === "claim-heroes") {
    offer("continue-claim-heroes", "continue");
    // Play again skips Game settings, so there is no screen to go back to (DEC-708).
    if (!shell.playAgain) offer("back-claim-heroes", "back");
    local.awaitingPress = true;
    return;
  }
  if (shell.screen === "setup") {
    const step = shell.setupSteps[shell.setupAt];
    if (!step) {
      local.awaitingPress = false;
      return;
    }
    // The starting purse asks for one Spin; Continue comes once the purse is set (UI-045, SCR-016).
    if (step.id === PURSE_STEP_ID && !isPurseAmount(shell.startingPurse)) {
      offer(SPIN_PROMPT, SPIN_ACTION);
    } else {
      offer(`continue-setup-${step.id}`, "continue");
    }
    offer(`back-setup-${step.id}`, "back");
    local.awaitingPress = true;
    return;
  }
  if (shell.screen === "begin") {
    if (!allHeroesHeld(shell)) {
      local.awaitingPress = false;
      return;
    }
    offer("continue-begin", "continue");
    offer("back-begin", "back");
    local.awaitingPress = true;
    return;
  }
  if (shell.screen === "play" && openingActiveIndex(shell.openingIndex)) {
    const momentId = OPENING_MOMENTS[shell.openingIndex];
    if (!momentId) {
      local.awaitingPress = false;
      return;
    }
    offer(openingPromptId(momentId), "continue");
    local.awaitingPress = true;
  }
};

export const gameLoop: LoopDefinition<GameLocal, GameResult> = {
  id: "game",
  enter: () => {
    const shell = shellState();
    shell.stage = "lobby";
    // Continue from the session screen opens the saved game straight into play.
    if (shell.screen === "play") {
      return { phase: "play", awaitingPress: false, playStarted: false };
    }
    // Play again starts at the prefilled claims (DEC-708).
    if (shell.screen === "claim-heroes") {
      return { phase: "claim-heroes", awaitingPress: false, playStarted: false };
    }
    return { phase: "pick-story", awaitingPress: false, playStarted: false };
  },
  body: (local, ctx) => {
    const shell = shellState();

    if (
      local.phase === "pick-story" ||
      local.phase === "not-playable" ||
      local.phase === "game-settings" ||
      local.phase === "claim-heroes" ||
      local.phase === "setup" ||
      local.phase === "begin"
    ) {
      syncScreen(local);
      if (!local.awaitingPress) {
        offerContinueOrBack(local, ctx);
      }
      return { local, passComplete: false };
    }

    if (local.phase === "play") {
      syncScreen(local);
      shell.stage = shell.pause ? "paused" : "playing";
      if (shell.pause) {
        const offer = (promptId: string, actionId: string) => {
          ctx.offerPrompt(promptId, actionId);
          recordOffer(promptId, actionId);
        };
        // Reconnect, Go on without, Quit: the order the iPad shows them (DEC-301).
        if (shell.pause.cause === "tower-lost") {
          offer(pauseReconnectPrompt(shell.pauseSerial), "reconnect");
          offer(pauseGoWithoutPrompt(shell.pauseSerial), "go-on-without");
        }
        offer(pauseQuitPrompt(shell.pauseSerial), "quit-story");
        return { local, passComplete: false };
      }
      if (openingActiveIndex(shell.openingIndex)) {
        if (!local.awaitingPress) offerContinueOrBack(local, ctx);
        return { local, passComplete: false };
      }
      if (!local.playStarted && shell.play) {
        const stackHasChapter = shell.loops.stack.some((frame) => frame.loopId === "chapter");
        if (!stackHasChapter) {
          ctx.startChild("chapter");
          return { local: { ...local, playStarted: true }, passComplete: false };
        }
      }
      // MEC-032 .41 to .44: one chapter per pass. A chapter's report is read once; a lost one
      // or the last won one ends the game, any other won one opens the next chapter (DEC-133).
      const report = ctx.getParentResult() as Partial<ChapterResult> | undefined;
      // A loss is read even when it names a chapter already read: a freed skull lost after the
      // next chapter's card names the chapter that closed (C3/15, PT-21, DEC-938).
      if (
        report?.chapterId &&
        report.outcome &&
        ((report.chapter ?? 0) > (local.lastChapter ?? 0) || report.outcome === "lost") &&
        !shell.loops.stack.some((frame) => frame.loopId === "chapter")
      ) {
        const next = gameEndFrom(report);
        const read = { ...local, lastChapter: report.chapter ?? 0 };
        if (next === "next") {
          ctx.startChild("chapter");
          return { local: { ...read, playStarted: true }, passComplete: false };
        }
        if (next) {
          return {
            local: { ...read, phase: "outcome", end: next, outcome: startOutcome(next) },
            passComplete: false,
          };
        }
      }
      return { local, passComplete: false };
    }

    if (local.phase === "outcome") {
      syncScreen(local);
      shell.stage = shell.pause ? "paused" : "playing";
      if (shell.pause) {
        const offer = (promptId: string, actionId: string) => {
          ctx.offerPrompt(promptId, actionId);
          recordOffer(promptId, actionId);
        };
        if (shell.pause.cause === "tower-lost") {
          offer(pauseReconnectPrompt(shell.pauseSerial), "reconnect");
          offer(pauseGoWithoutPrompt(shell.pauseSerial), "go-on-without");
        }
        offer(pauseQuitPrompt(shell.pauseSerial), "quit-story");
        return { local, passComplete: false };
      }
      const outcome = local.outcome;
      if (!outcome) return { local: { ...local, phase: "done" }, passComplete: true };
      if (!outcome.wait) {
        return {
          local: {
            ...local,
            outcome: {
              ...outcome,
              wait: outcomeWaitFor(outcome.stage, shell.seed),
              waitDone: false,
            },
          },
          passComplete: false,
        };
      }
      if (!outcome.waitDone) return { local, passComplete: false };
      const saveBeat = () => {
        if (shell.activeGameId) {
          requestCheckpoint(shell.activeGameId, Math.max(1, outcome.summary.days));
        }
      };
      if (outcome.stage === "scene") {
        const nextStage: OutcomeStage =
          outcome.end.outcome === "won" && outcome.closing ? "closing" : "summary";
        saveBeat();
        return {
          local: {
            ...local,
            outcome: {
              ...outcome,
              stage: nextStage,
              wait: outcomeWaitFor(nextStage, shell.seed),
              waitDone: false,
            },
          },
          passComplete: false,
        };
      }
      if (outcome.stage === "closing") {
        saveBeat();
        return {
          local: {
            ...local,
            outcome: {
              ...outcome,
              stage: "summary",
              wait: outcomeWaitFor("summary", shell.seed),
              waitDone: false,
            },
          },
          passComplete: false,
        };
      }
      return {
        local: { ...local, phase: "done", outcome: { ...outcome, wait: null, waitDone: false } },
        passComplete: true,
      };
    }

    return { local: { ...local, phase: "done" }, passComplete: true };
  },
  exit: (local) => local.phase === "done",
  // MEC-032 close (.43): the record is written once, here, with the autosave cleared (DEC-208).
  close: (local, ctx) => {
    if (local.end) finishGame(shellState(), local.end, ctx.effects);
  },
  resultUp: (local) => {
    const shell = shellState();
    if (local.end) {
      const result: GameResult = { outcome: local.end.outcome, sceneId: local.end.sceneId };
      if (local.end.reason) result.reason = local.end.reason;
      return result;
    }
    return { outcome: shell.stage === "ended" ? "quit" : "completed" };
  },
};

export const handleGamePress = (
  local: GameLocal,
  promptId: string,
  actionId: string,
): GameLocal => {
  const shell = shellState();

  if (actionId === SPIN_ACTION) {
    // The purse is set once (EV-11): a second press, or one with the purse already set, changes nothing.
    if (local.phase !== "setup" || promptId !== SPIN_PROMPT)
      return { ...local, awaitingPress: false };
    if (shell.setupSteps[shell.setupAt]?.id !== PURSE_STEP_ID) return local;
    if (isPurseAmount(shell.startingPurse)) return { ...local, awaitingPress: false };
    shell.startingPurse = drawPurse(shell.seed);
    if (towerSpins(shell)) {
      // Only on the press (EV-08): the tower chases its lights and plays the coin sound (DEC-114).
      requestTowerCommand("lighting.sequence", {
        sequence: PURSE_SPIN_SEQUENCE,
        soundIndex: PURSE_COIN_SOUND,
      });
    } else {
      // No tower (Q7.4): the result is on the board at once and the board plays the coin sound.
      shell.purseCue += 1;
    }
    return { ...local, awaitingPress: false };
  }

  if (actionId === "continue") {
    if (local.phase === "pick-story" && promptId === `continue-pick-story-${shell.focusStoryId}`) {
      const focused = shell.stories.find((story) => story.card.id === shell.focusStoryId);
      if (focused && !focused.card.playable) {
        shell.screen = "not-playable";
        return { phase: "not-playable", awaitingPress: false, playStarted: false };
      }
      if (!bindStoryChoice(shell, shell.focusStoryId)) return { ...local, awaitingPress: false };
      shell.screen = "game-settings";
      return { phase: "game-settings", awaitingPress: false, playStarted: false };
    }
    if (local.phase === "game-settings" && promptId === "continue-game-settings") {
      const next = screenAfterContinue(shell, "game-settings");
      if (!next) return local;
      shell.screen = next;
      return { phase: next as GameLocal["phase"], awaitingPress: false, playStarted: false };
    }
    if (local.phase === "claim-heroes" && promptId === "continue-claim-heroes") {
      if (!allHeroesHeld(shell)) return { ...local, awaitingPress: false };
      const next = screenAfterContinue(shell, "claim-heroes");
      if (!next) return local;
      shell.screen = next;
      if (next === "setup") shell.setupAt = 0;
      return { phase: next as GameLocal["phase"], awaitingPress: false, playStarted: false };
    }
    if (local.phase === "setup") {
      const step = shell.setupSteps[shell.setupAt];
      if (!step || promptId !== `continue-setup-${step.id}`) return local;
      // Continue waits for the spin: a stale press cannot step past an unset purse.
      if (step.id === PURSE_STEP_ID && !isPurseAmount(shell.startingPurse)) {
        return { ...local, awaitingPress: false };
      }
      shell.setupAt += 1;
      const next = screenAfterContinue(shell, "setup");
      if (!next) return local;
      shell.screen = next;
      return { phase: next as GameLocal["phase"], awaitingPress: false, playStarted: false };
    }
    if (local.phase === "begin" && promptId === "continue-begin" && allHeroesHeld(shell)) {
      shell.screen = "play";
      shell.stage = "playing";
      shell.openingIndex = 0;
      if (!shell.activeGameId) shell.activeGameId = `game-${shell.eventSeq}`;
      return { phase: "play", awaitingPress: false, playStarted: false };
    }
    if (
      local.phase === "play" &&
      openingActiveIndex(shell.openingIndex) &&
      promptId === openingPromptId(OPENING_MOMENTS[shell.openingIndex] ?? "")
    ) {
      shell.openingIndex += 1;
      return { ...local, awaitingPress: false, playStarted: false };
    }
  }

  if (actionId === "back") {
    const backScreen = local.phase as ShellScreen;
    const next = screenAfterBack(shell, backScreen);
    if (!next) return { ...local, awaitingPress: false };
    shell.screen = next;
    return {
      phase: next as GameLocal["phase"],
      awaitingPress: false,
      playStarted: local.playStarted,
    };
  }

  // A pause during piece setup is quit from the setup step it paused (DEC-711).
  if (
    (local.phase === "play" || local.phase === "outcome" || shell.pause) &&
    actionId === "quit-story" &&
    (promptId === "menu-quit" || (shell.pause && promptId === `pause-${shell.pauseSerial}-quit`))
  ) {
    shell.stage = "ended";
    shell.pause = null;
    shell.pieceCheck = null;
    shell.screen = "play";
    return { phase: "done", awaitingPress: false, playStarted: local.playStarted };
  }
  return { ...local, awaitingPress: false };
};
