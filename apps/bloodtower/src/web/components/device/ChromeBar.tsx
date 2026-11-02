"use client";

import { useEffect, useState } from "react";
import {
  gearRows,
  HELP_LINES,
  MENU_VERSION,
  type MenuContext,
  menuContextFromOffers,
} from "./gearMenu.ts";
import { IpadCorners } from "./IpadCorners.tsx";

type Offer = {
  promptId: string;
  actionId: string;
  label: string;
};

/** The iPad bottom bar, its Menu dialog, and the help sheet. Closing the Menu sends nothing. */
export function ChromeBar({
  live,
  back,
  connect,
  quit,
  onAct,
  helpScreen = "join",
  menu,
  initialMenuOpen = false,
}: {
  live: boolean;
  back?: Offer;
  connect?: Offer;
  quit?: Offer;
  onAct?: (promptId: string, actionId: string, args?: Record<string, unknown>) => void;
  helpScreen?: string;
  menu?: MenuContext;
  /** Tests open the dialog without a click. */
  initialMenuOpen?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(initialMenuOpen);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const context = menu ?? menuContextFromOffers(Boolean(quit), Boolean(connect));
  const rows = gearRows(context);

  const closeMenu = () => {
    setMenuOpen(false);
    setConfirmQuit(false);
  };

  useEffect(() => {
    if (!menuOpen && !helpOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (helpOpen) setHelpOpen(false);
      else {
        setMenuOpen(false);
        setConfirmQuit(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, helpOpen]);

  const openItem = (id: string) => {
    setMenuOpen(false);
    setConfirmQuit(false);
    onAct?.("gear", "open", { item: id });
  };

  const group = (name: "Look up" | "Table" | "Leave") => (
    <section key={name} aria-label={name}>
      <h2>{name}</h2>
      {rows
        .filter((item) => item.group === name)
        .map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              item.enabled
                ? "bt-secondary bt-gear-item"
                : "bt-secondary bt-gear-item bt-row--disabled"
            }
            data-gear-item={item.id}
            aria-disabled={item.enabled ? undefined : true}
            disabled={!item.enabled}
            style={item.enabled ? undefined : { opacity: 0.5 }}
            onClick={() => {
              if (!item.enabled) return;
              if (item.id === "save-and-quit") {
                setConfirmQuit(true);
                return;
              }
              if (item.id === "tower" && connect) {
                setMenuOpen(false);
                onAct?.(connect.promptId, connect.actionId);
                return;
              }
              if (item.id === "pause-resume") {
                setMenuOpen(false);
                return;
              }
              if (item.panel) openItem(item.id);
            }}
          >
            <span className="bt-gear-label">{item.label}</span>
            {item.reason ? (
              <span className="bt-gear-reason" data-reason>
                {item.reason}
              </span>
            ) : null}
          </button>
        ))}
      {name === "Table" && connect ? (
        <button
          type="button"
          className="bt-secondary"
          data-prompt-id={connect.promptId}
          data-action-id={connect.actionId}
          data-action={connect.actionId}
          disabled={!live || !onAct}
          onClick={() => {
            setMenuOpen(false);
            onAct?.(connect.promptId, connect.actionId);
          }}
        >
          {connect.label}
        </button>
      ) : null}
      {name === "Leave" && quit ? (
        <button
          type="button"
          className="bt-gear-legacy"
          data-prompt-id={quit.promptId}
          data-action-id={quit.actionId}
          data-action={quit.actionId}
          disabled={!live || !onAct}
          onClick={() => {
            setMenuOpen(false);
            onAct?.(quit.promptId, quit.actionId);
          }}
        >
          Quit story
        </button>
      ) : null}
    </section>
  );

  const helpLine = HELP_LINES[helpScreen] ?? HELP_LINES.play;

  return (
    <>
      <IpadCorners />
      {menuOpen ? (
        <button
          type="button"
          className="bt-menu-scrim"
          data-menu-scrim
          aria-label="Close menu"
          onClick={closeMenu}
        />
      ) : null}
      {menuOpen ? (
        <div className="bt-menu-dialog" role="dialog" aria-label="Menu" data-menu>
          {confirmQuit ? (
            <>
              <h2>Save and quit</h2>
              <p>Are you sure?</p>
              <button
                type="button"
                className="bt-primary bt-menu-close"
                disabled={!live || !quit || !onAct}
                onClick={() => {
                  if (!quit) return;
                  setMenuOpen(false);
                  setConfirmQuit(false);
                  onAct?.(quit.promptId, quit.actionId);
                }}
              >
                Save and quit
              </button>
              <button
                type="button"
                className="bt-secondary bt-menu-close"
                onClick={() => setConfirmQuit(false)}
              >
                Back
              </button>
            </>
          ) : (
            <>
              {group("Look up")}
              {group("Table")}
              {group("Leave")}
              <p data-version>{MENU_VERSION}</p>
              <button type="button" className="bt-secondary bt-menu-close" onClick={closeMenu}>
                Close
              </button>
            </>
          )}
        </div>
      ) : null}
      {helpOpen ? (
        <div
          className="bt-menu-dialog"
          role="dialog"
          aria-label="Help"
          data-help
          data-help-screen={helpScreen}
        >
          <h2>Help</h2>
          <p>{helpLine}</p>
          <button
            type="button"
            className="bt-primary bt-menu-close"
            onClick={() => setHelpOpen(false)}
          >
            Close
          </button>
        </div>
      ) : null}
      <footer className="bt-bottom-bar bt-bar bt-bar--bottom" data-bottom-bar>
        <button
          type="button"
          className="bt-ghost bt-help"
          data-action="help"
          aria-label="Help"
          onClick={() => setHelpOpen(true)}
        >
          ?
        </button>
        <span className="bt-bar-mid">
          {back ? (
            <button
              type="button"
              className="bt-ghost"
              data-prompt-id={back.promptId}
              data-action-id={back.actionId}
              data-action="back"
              disabled={!live || !onAct}
              onClick={() => onAct?.(back.promptId, back.actionId)}
            >
              Back
            </button>
          ) : (
            <button type="button" className="bt-ghost" data-action="back" disabled>
              Back
            </button>
          )}
          <button type="button" className="bt-ghost" data-action="replay" disabled>
            Replay
          </button>
        </span>
        <button
          type="button"
          className="bt-ghost"
          data-action="menu"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => {
            if (menuOpen) closeMenu();
            else setMenuOpen(true);
          }}
        >
          <svg
            aria-hidden="true"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
            <circle cx="12" cy="12" r="6.8" />
          </svg>
        </button>
      </footer>
    </>
  );
}
