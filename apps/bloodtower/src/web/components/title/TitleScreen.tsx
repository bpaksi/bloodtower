"use client";

import { useEffect } from "react";
import "../../styles/title-screen.css";

/**
 * A click or keypress on the landing screen opens the Story board on a Mac (R3-UI-03), where the
 * pointer is fine. Links keep their own job, so a press on "Hunter" still goes to join.
 */
const openBoardOnPress = (event: Event) => {
  if (!window.matchMedia("(pointer: fine)").matches) return;
  if (event.target instanceof Element && event.target.closest("a")) return;
  // Tab moves focus between the links; a bare modifier or a shortcut is not a press.
  if (event instanceof KeyboardEvent && (event.key === "Tab" || event.metaKey || event.ctrlKey)) {
    return;
  }
  window.location.assign("/board");
};

/** Opening title: Mac opens the Story board; hunters open join on iPad. */
export function TitleScreen() {
  useEffect(() => {
    window.addEventListener("click", openBoardOnPress);
    window.addEventListener("keydown", openBoardOnPress);
    return () => {
      window.removeEventListener("click", openBoardOnPress);
      window.removeEventListener("keydown", openBoardOnPress);
    };
  }, []);
  return (
    <div className="bt-title-page" data-screen="title">
      <div className="bt-title-backdrop" aria-hidden="true" />
      <div className="bt-title-shell bt-ink-in">
        <img
          className="bt-title-keeper"
          src="/avatars/keeper/portrait.png"
          alt="The Keeper"
          width={176}
          height={176}
        />
        <p className="bt-title-kicker">Return to Dark Tower</p>
        <h1 className="bt-title-heading bt-flicker">Blood Tower</h1>
        <nav className="bt-title-actions" aria-label="Choose where to play">
          <a className="bt-title-action" href="/board">
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
      </div>
    </div>
  );
}
