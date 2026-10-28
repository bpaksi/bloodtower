"use client";

import { SOUND_CATALOG, SOUND_CATEGORIES, soundName, validateCommand } from "@dark-tower/tower";
import { useId, useState } from "react";
import { CommandStatus } from "@/components/controls/CommandStatus";
import { Button } from "@/components/ui/button";
import { describeSound, filterSounds } from "@/lib/soundFilter";
import { useCommand } from "@/lib/useCommand";
import { useControlState, useLatestCommand } from "@/lib/useControl";

const CAPABILITY_ID = "sound.play";

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm";

/** The index a `sound.play` command asked for, or undefined. */
const requestedIndex = (params: unknown) => {
  const index = (params as { soundIndex?: unknown } | undefined)?.soundIndex;
  return typeof index === "number" ? index : undefined;
};

/**
 * The tower's sound catalog with a play button per sound (M3 step 3.3), for `sound.play`. It
 * behaves as `CapabilityControl` does: enabled only when the service would accept the command,
 * and one command at a time from this list, so while a sound's command is under way every play
 * button waits. The lock lasts until the command ends, normally when the tower answers as the
 * sound starts; it does not cover the playback, as the tower does not say when a sound ends
 * (GAP-LIB-007).
 */
export function SoundCatalog() {
  const headingId = useId();
  const searchId = useId();
  const categoryId = useId();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>();
  const [refused, setRefused] = useState<string>();
  const command = useCommand(CAPABILITY_ID);
  const state = useControlState(CAPABILITY_ID);
  const latest = useLatestCommand(CAPABILITY_ID, command.commandId);

  const disabled = !state.enabled || command.pending;
  const sounds = filterSounds(SOUND_CATALOG, query, category);
  const playing = command.pending ? requestedIndex(command.requested) : undefined;
  const requested = requestedIndex(command.requested);

  const play = (soundIndex: number) => {
    if (disabled) return;
    // Every button is a catalog index the schema accepts, so this refuses only if the two disagree.
    const validation = validateCommand(CAPABILITY_ID, { soundIndex });
    if (!validation.ok) {
      setRefused(validation.issues[0]?.message ?? "Not accepted.");
      return;
    }
    setRefused(undefined);
    command.send(validation.command.params);
  };

  return (
    <section aria-labelledby={headingId} className="rounded-lg border p-4 sm:p-6">
      <h2 id={headingId} className="text-sm font-medium">
        Sound catalog
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Every sound the tower holds, from the game data. One plays at a time from this list; the
        buttons unlock once the tower answers, which is when the sound starts, as the tower does not
        say when a sound ends.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-1">
          <label htmlFor={searchId} className="text-sm font-medium">
            Filter by number or name
          </label>
          <input
            id={searchId}
            type="search"
            className={FIELD_CLASS}
            value={query}
            placeholder="12, Letha, dungeon…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={categoryId} className="text-sm font-medium">
            Category
          </label>
          <select
            id={categoryId}
            className={FIELD_CLASS}
            value={category ?? ""}
            onChange={(event) =>
              setCategory(SOUND_CATEGORIES.find((candidate) => candidate === event.target.value))
            }
          >
            <option value="">All categories</option>
            {SOUND_CATEGORIES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {sounds.length === SOUND_CATALOG.length
            ? `${sounds.length} sounds`
            : `${sounds.length} of ${SOUND_CATALOG.length} sounds`}
        </p>
        {!state.enabled && <p className="text-sm text-muted-foreground">{state.reason}</p>}
      </div>
      {refused && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {refused}
        </p>
      )}
      {command.unsent && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Not sent: the service is not reachable.
        </p>
      )}
      {latest.stages?.[0] && (
        <div className="mt-4">
          <CommandStatus
            name="Play a sound"
            stages={latest.stages}
            interrupted={latest.interrupted}
            sender={latest.sender}
            requested={
              latest.own && requested !== undefined
                ? describeSound({ index: requested, name: soundName(requested) })
                : undefined
            }
          />
        </div>
      )}
      {sounds.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No sound matches this filter.</p>
      ) : (
        <ul
          aria-label="Sounds"
          className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"
        >
          {sounds.map((sound) => (
            <li
              key={sound.index}
              className="flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2"
            >
              <span className="w-8 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                {sound.index}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm">{sound.name}</span>
                {sound.category && (
                  <span className="truncate text-xs text-muted-foreground">{sound.category}</span>
                )}
              </span>
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0 px-4"
                aria-label={`Play ${describeSound(sound)}`}
                disabled={disabled}
                onClick={() => play(sound.index)}
              >
                {playing === sound.index ? "Playing…" : "Play"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
