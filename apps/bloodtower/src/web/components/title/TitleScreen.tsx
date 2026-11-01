"use client";

import { useEffect, useRef, useState } from "react";
import type { Channel } from "../../lib/audio/levels.ts";
import { useOpenBoard, useStoryAudio } from "../../lib/audio/storyAudio.tsx";
import { SoundDialog } from "../board/SoundDialog.tsx";
import "../../styles/title-screen.css";
import { BLOOD_TOWER_BANNER_SRC } from "./banner.ts";

/**
 * The Mac landing. A fine pointer with no touch points. Playwright's phone and iPad
 * projects set `hasTouch`, which keeps `(pointer: fine)` and still must not open the board.
 */
const macPointer = () =>
  window.matchMedia("(pointer: fine)").matches && navigator.maxTouchPoints === 0;

const isLinkTarget = (event: Event) => {
  const active = document.activeElement;
  if (active instanceof Element && active.closest("a")) return true;
  return event.target instanceof Element && Boolean(event.target.closest("a"));
};

/**
 * A click on the landing screen opens the Story board on a Mac (a fine pointer).
 * That open stays in this document, so the audio context keeps playing.
 * Links and Sound keep their own job. A key unlocks audio and stays on `/`.
 */
const opensBoard = (event: Event) => {
  if (!event.isTrusted || !macPointer()) return false;
  if (!(event instanceof MouseEvent)) return false;
  if (isLinkTarget(event)) return false;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('[data-action="sound"], [data-sound-dialog], .bt-sound-backdrop')) {
    return false;
  }
  return true;
};

const unlocksAudio = (event: Event) => {
  if (!macPointer()) return false;
  if (event instanceof KeyboardEvent) {
    if (event.key === "Tab" || event.metaKey || event.ctrlKey) return false;
    if (isLinkTarget(event)) return false;
    return true;
  }
  if (event instanceof MouseEvent) {
    if (isLinkTarget(event)) return false;
    return true;
  }
  return false;
};

/** Opening title. The banner box stays open until Illusionist records a lockup path. */
export function TitleScreen() {
  const audio = useStoryAudio();
  const openBoard = useOpenBoard();
  const [soundOpen, setSoundOpen] = useState(false);

  const unlockMac = () => {
    if (!macPointer()) return;
    audio.unlock();
  };
  const unlockRef = useRef(unlockMac);
  unlockRef.current = unlockMac;
  const openRef = useRef(openBoard);
  openRef.current = openBoard;

  useEffect(() => {
    const onClick = (event: Event) => {
      if (unlocksAudio(event)) unlockRef.current();
      if (opensBoard(event)) openRef.current();
    };
    const onKey = (event: Event) => {
      if (unlocksAudio(event)) unlockRef.current();
    };
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const openSound = () => {
    audio.reload();
    setSoundOpen(true);
    unlockMac();
  };

  const onLevelChange = (channel: Channel, level: number) => {
    audio.setLevel(channel, level);
  };

  return (
    <div className="bt-title-page" data-screen="title">
      <div className="bt-title-backdrop" aria-hidden="true" />
      <div className="bt-title-shell bt-ink-in">
        <BloodTowerBanner />
        <img
          className="bt-title-keeper"
          src="/avatars/keeper/portrait.png"
          alt="The Keeper"
          width={176}
          height={176}
        />
        <p className="bt-title-kicker">Return to Dark Tower</p>
        <nav className="bt-title-actions" aria-label="Choose where to play">
          <a
            className="bt-title-action"
            href="/board"
            onClick={(event) => {
              if (!macPointer()) return;
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }
              event.preventDefault();
              unlockMac();
              openBoard();
            }}
          >
            <span className="bt-title-action-label">Story board</span>
            <p className="bt-title-action-hint">
              Mac or TV — show the tale for everyone in the room.
            </p>
          </a>
          <a className="bt-title-action" href="/join">
            <span className="bt-title-action-label">Hunter</span>
            <p className="bt-title-action-hint">iPad. Enter the join code from the board.</p>
          </a>
        </nav>
        <button type="button" className="bt-title-sound" data-action="sound" onClick={openSound}>
          Sound
        </button>
      </div>
      {soundOpen ? (
        <SoundDialog
          levels={audio.levels}
          onLevelChange={onLevelChange}
          onTest={(channel) => {
            if (!macPointer()) return;
            unlockMac();
            audio.test(channel);
          }}
          onContinue={() => setSoundOpen(false)}
        />
      ) : null}
    </div>
  );
}

function BloodTowerBanner() {
  if (BLOOD_TOWER_BANNER_SRC) {
    return (
      <img
        className="bt-title-banner"
        data-banner=""
        data-banner-src={BLOOD_TOWER_BANNER_SRC}
        src={BLOOD_TOWER_BANNER_SRC}
        alt="Blood Tower"
      />
    );
  }
  return (
    <svg
      className="bt-title-banner"
      data-banner=""
      data-banner-src=""
      role="img"
      aria-label="Blood Tower"
      viewBox="0 0 640 160"
      focusable="false"
    />
  );
}
