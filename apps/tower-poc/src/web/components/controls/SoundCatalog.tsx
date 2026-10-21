"use client";

import { useEffect, useId, useState } from "react";
import { SOUND_CATALOG, SOUND_CATEGORIES, soundName, validateCommand } from "tower-poc-protocols";
import { CommandStatus } from "@/components/controls/CommandStatus";
import { SoundReviewRow } from "@/components/controls/SoundReviewRow";
import { Button } from "@/components/ui/button";
import { describeSound, filterSounds } from "@/lib/soundFilter";
import { feelByIndex, followPlay, hasFeel, type PlayTiming, reviewFilter } from "@/lib/soundReview";
import { loadSoundReviewMode, setSoundReviewMode, useSoundReviewMode } from "@/lib/soundReviewMode";
import { useService } from "@/lib/store";
import { serviceHttpOrigin } from "@/lib/timingView";
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
 *
 * Review feel (M6 step 6.2, spec D25), on per device, adds each sound's saved feel and a row to
 * record it: Stopped times the sound from Bob's Play press and from the tower's answer, and each
 * pick is saved by the service as it is made.
 */
export function SoundCatalog() {
  const headingId = useId();
  const searchId = useId();
  const categoryId = useId();
  const unreviewedId = useId();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>();
  const [refused, setRefused] = useState<string>();
  const [timing, setTiming] = useState<PlayTiming>();
  const [current, setCurrent] = useState<number>();
  const [onlyUnreviewed, setOnlyUnreviewed] = useState(false);
  const command = useCommand(CAPABILITY_ID);
  const state = useControlState(CAPABILITY_ID);
  const latest = useLatestCommand(CAPABILITY_ID, command.commandId);
  const review = useSoundReviewMode((mode) => mode.on);
  const online = useService((view) => view.socket === "online");
  const rows = useService((view) => view.welcome?.soundFeel);
  useEffect(loadSoundReviewMode, []);

  // The tower's answer to the timed play, or its refusal, as this page receives it.
  const { commandId, stages } = command;
  useEffect(() => {
    setTiming((timed) =>
      timed && timed.commandId === commandId ? followPlay(timed, stages, Date.now()) : timed,
    );
  }, [commandId, stages]);

  const feel = feelByIndex(rows);
  const known = online && rows !== undefined;
  const disabled = !state.enabled || command.pending;
  const filtered = filterSounds(SOUND_CATALOG, query, category);
  const sounds = review ? reviewFilter(filtered, feel, onlyUnreviewed, current) : filtered;
  const reviewed = SOUND_CATALOG.filter((sound) => hasFeel(feel.get(sound.index))).length;
  const playing = command.pending ? requestedIndex(command.requested) : undefined;
  const requested = requestedIndex(command.requested);

  const play = (soundIndex: number) => {
    // Bob's press, before anything else happens: the length runs from here.
    const pressedAt = Date.now();
    if (disabled) return;
    // Every button is a catalog index the schema accepts, so this refuses only if the two disagree.
    const validation = validateCommand(CAPABILITY_ID, { soundIndex });
    if (!validation.ok) {
      setRefused(validation.issues[0]?.message ?? "Not accepted.");
      return;
    }
    setRefused(undefined);
    const id = command.send(validation.command.params);
    // Another play ends the timing of the last one, whether or not this one was sent.
    setTiming(id ? { index: soundIndex, commandId: id, pressedAt } : undefined);
    setCurrent(soundIndex);
  };

  // The service serves the export; under `next dev` it is on another port than this page.
  const [exportUrl, setExportUrl] = useState("/api/sound-feel.json");
  useEffect(() => {
    const { protocol, host } = window.location;
    setExportUrl(
      `${serviceHttpOrigin(protocol, host, process.env.NEXT_PUBLIC_WS_URL)}/api/sound-feel.json`,
    );
  }, []);

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
        <Button
          type="button"
          variant={review ? "default" : "outline"}
          className="ml-auto h-11 px-4"
          aria-pressed={review}
          onClick={() => setSoundReviewMode(!review)}
        >
          Review feel
        </Button>
      </div>
      {review && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2">
          <p className="text-sm" aria-live="polite">
            {known ? (
              `${reviewed} of ${SOUND_CATALOG.length} with a feel`
            ) : (
              <span className="text-muted-foreground">
                With a feel: unavailable while the service is out of reach
              </span>
            )}
          </p>
          <label htmlFor={unreviewedId} className="flex min-h-11 items-center gap-2 text-sm">
            <input
              id={unreviewedId}
              type="checkbox"
              className="size-5"
              checked={onlyUnreviewed}
              onChange={(event) => setOnlyUnreviewed(event.target.checked)}
            />
            Only sounds not yet reviewed
          </label>
          <a
            href={exportUrl}
            download="sound-feel.json"
            className="ml-auto inline-flex h-11 items-center rounded-lg border px-4 text-sm font-medium hover:bg-muted"
          >
            Export
          </a>
        </div>
      )}
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
          className={`mt-4 grid grid-cols-1 gap-2 ${review ? "" : "sm:grid-cols-2 xl:grid-cols-3"}`}
        >
          {sounds.map((sound) => (
            <li key={sound.index} className="min-w-0 rounded-lg border px-3 py-2">
              <div className="flex min-w-0 items-center gap-3">
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
              </div>
              {review && (
                <SoundReviewRow
                  index={sound.index}
                  name={sound.name}
                  row={feel.get(sound.index)}
                  known={known}
                  timing={timing?.index === sound.index ? timing : undefined}
                  onStopped={() => setTiming(undefined)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
