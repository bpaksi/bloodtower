"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { copyText } from "../lib/clipboard.ts";
import {
  buildPrompt,
  MODE_LABEL,
  type PromptMode,
  type PromptScope,
  scopeLines,
} from "../lib/prompt.ts";

const NEW_IDEA: PromptScope = { file: null, section: [], lines: null, ids: [] };
const MODES: PromptMode[] = ["change", "add", "ask"];

function findScope(key: string): PromptScope | null {
  if (key === "new") return NEW_IDEA;
  for (const el of document.querySelectorAll("script[data-prompt-scopes]")) {
    const scopes = JSON.parse(el.textContent ?? "{}") as Record<string, PromptScope>;
    if (scopes[key]) return scopes[key];
  }
  return null;
}

/**
 * The prompt starter: any element with data-prompt="<key>" opens a dialog with that scope filled
 * in. Bob picks a mode, types the idea, and copies a complete prompt to paste into Claude.
 */
export function PromptStarter() {
  const dialog = useRef<HTMLDialogElement>(null);
  const text = useRef<HTMLTextAreaElement>(null);
  const [scope, setScope] = useState<PromptScope>(NEW_IDEA);
  const [mode, setMode] = useState<PromptMode>("change");
  const [idea, setIdea] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const open = (event: MouseEvent) => {
      const el = (event.target as Element | null)?.closest?.("[data-prompt]");
      if (!el) return;
      event.preventDefault();
      event.stopPropagation();
      const found = findScope(el.getAttribute("data-prompt") ?? "");
      if (!found) return;
      setScope(found);
      const asked = el.getAttribute("data-prompt-mode") as PromptMode | null;
      setMode(asked && MODES.includes(asked) ? asked : found.file ? "change" : "add");
      dialog.current?.showModal();
      requestAnimationFrame(() => text.current?.focus());
    };
    document.addEventListener("click", open, true);
    return () => document.removeEventListener("click", open, true);
  }, []);

  const copy = useCallback(() => {
    if (!idea.trim()) {
      text.current?.focus();
      return;
    }
    const prompt = buildPrompt(scope, mode, idea);
    void copyText(prompt).then((ok) => {
      if (ok) {
        setToast("Prompt copied. Paste it into Claude.");
        setIdea("");
        dialog.current?.close();
      } else {
        setToast("Copy failed. Open the preview and copy it by hand.");
      }
    });
    setTimeout(() => setToast(null), 2500);
  }, [idea, mode, scope]);

  return (
    <>
      <dialog ref={dialog} className="prompt-dialog" aria-label="Prompt starter">
        <form
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault();
            copy();
          }}
        >
          <header className="prompt-head">
            <h2>Prompt starter</h2>
            <button type="button" className="btn-ghost" onClick={() => dialog.current?.close()}>
              Close
            </button>
          </header>
          <pre className="prompt-scope">{scopeLines(scope).join("\n")}</pre>
          <fieldset className="segmented">
            <legend className="sr-only">What kind of prompt</legend>
            {MODES.map((m) => (
              <label key={m} className={m === mode ? "on" : undefined}>
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  checked={m === mode}
                  onChange={() => setMode(m)}
                />
                {MODE_LABEL[m]}
              </label>
            ))}
          </fieldset>
          <textarea
            ref={text}
            className="prompt-idea"
            rows={5}
            value={idea}
            placeholder={
              mode === "ask" ? "What do you want to know?" : "Describe the idea in your own words"
            }
            onChange={(e) => setIdea(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                copy();
              }
            }}
          />
          <details className="prompt-preview">
            <summary>Preview full prompt</summary>
            <pre>{buildPrompt(scope, mode, idea || "…")}</pre>
          </details>
          <footer className="prompt-foot">
            <span className="hint">⌘↵ to copy · Esc to close</span>
            <button type="submit" className="btn-primary" disabled={!idea.trim()}>
              Copy prompt
            </button>
          </footer>
        </form>
      </dialog>
      <output className={`toast${toast ? " toast-on" : ""}`} aria-live="polite">
        {toast ?? ""}
      </output>
    </>
  );
}
