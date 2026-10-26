"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { FindHit } from "../find.ts";
import {
  applyFindEscape,
  applyOpenPlan,
  findEscape,
  resolveEnter,
  resolveOpen,
} from "../findEnter.ts";
import { PANEL_OPEN_DETAIL } from "./Panels.tsx";

/**
 * The top-bar find box. It asks the server (`endpoint?q=`), so the browser never loads every card.
 * `/` focuses it when no other field has focus, ⌘K / Ctrl+K always; arrows move, Enter opens,
 * Esc closes the list and leaves the box.
 */
export function FindBox({ endpoint = "/api/find" }: { endpoint?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const inputText = useRef("");
  inputText.current = q.trim();
  const [hits, setHits] = useState<FindHit[]>([]);
  const [open, setOpen] = useState(false);
  const [hitsFor, setHitsFor] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      } else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, []);

  useEffect(() => {
    const text = q.trim();
    if (text === "") {
      setHits([]);
      setHitsFor(null);
      setFailed(false);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(text)}`, {
          signal: ctl.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { hits: FindHit[] };
        setHits(body.hits);
        setHitsFor(text);
        setActive(0);
        setFailed(false);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setHits([]);
        setHitsFor(text);
        setFailed(true);
        setOpen(true);
      }
    }, 120);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q, endpoint]);

  const openHit = (hit: FindHit) => {
    setOpen(false);
    input.current?.blur();
    const plan = resolveOpen(hit.href, pathname, window.location.hash);
    applyOpenPlan(plan, hit.href, {
      // Same-hash re-pick: no hashchange fires, so ask LineJump to jump again.
      dispatchHashChange: () => window.dispatchEvent(new HashChangeEvent("hashchange")),
      setHash: (hash) => {
        window.location.hash = hash;
      },
      // A card opens in the graph; below 1200 px that means the detail panel over it.
      openDetail: () => window.dispatchEvent(new Event(PANEL_OPEN_DETAIL)),
      navigate: (href) => router.push(href),
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      applyFindEscape(findEscape(), {
        closeList: () => setOpen(false),
        // Keep Esc from the overlay handler so only the find list closes.
        preventDefault: () => e.preventDefault(),
        blur: () => input.current?.blur(),
      });
    } else if (e.key === "ArrowDown" && hits.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % hits.length);
    } else if (e.key === "ArrowUp" && hits.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      const text = q.trim();
      const act = resolveEnter(text, hitsFor, hits, active);
      if (act.kind === "open") {
        if (open) {
          e.preventDefault();
          openHit(act.hit);
        }
      } else if (act.kind === "fetch") {
        e.preventDefault();
        void fetch(`${endpoint}?q=${encodeURIComponent(text)}`)
          .then((r) => (r.ok ? (r.json() as Promise<{ hits: FindHit[] }>) : null))
          .then((body) => {
            if (inputText.current !== text || !body || !body.hits[0]) return;
            openHit(body.hits[0]);
          })
          .catch(() => {});
      }
    }
  };

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  const showList = open && q.trim() !== "";
  return (
    <div className="find" ref={root}>
      <input
        ref={input}
        className="search"
        type="search"
        placeholder="Find an ID or a word (/)"
        aria-label="Find an ID or a word"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && hits.length > 0 ? `${listId}-${active}` : undefined}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.trim() !== "" && setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <div className="find-list" id={listId} role="listbox" aria-label="Find results">
          {hits.map((h, i) => (
            <div
              key={h.href + h.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              className={`find-hit${i === active ? " active" : ""}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => openHit(h)}
              onKeyDown={() => {}}
            >
              <div className="find-head">
                <span className="mono find-id">{h.id}</span>
                <span className="find-title">{h.title}</span>
              </div>
              <div className="find-snippet">{h.snippet}</div>
            </div>
          ))}
          {hits.length === 0 && (
            <div className="find-empty">{failed ? "Search is unavailable." : "No matches."}</div>
          )}
        </div>
      )}
    </div>
  );
}
