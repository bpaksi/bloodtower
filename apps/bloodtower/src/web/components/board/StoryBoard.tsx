import type { StoryboardState } from "bloodtower-protocols";
import { pauseText } from "../../lib/boardView";
import { JoinQr } from "../../lib/qr";
import { towerStatusLines } from "../../lib/towerStatus";

/**
 * Display only. No buttons, links, or inputs. Holdings do not change here.
 * The fallback asset is named. This page does not start playback.
 */
export function StoryBoard({ state }: { state: StoryboardState }) {
  const tower = towerStatusLines(state.tower);
  const paused = pauseText(state.pause, state.hunters);
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-8 py-10">
      <header className="flex items-end justify-between gap-6">
        <h1 className="text-4xl">Story board</h1>
        <p className="text-right leading-relaxed">
          Tower {tower.connection}. Battery {tower.battery}. Calibration {tower.calibration}.
        </p>
      </header>
      {paused ? (
        <p className="bg-stone-800 px-4 py-3 text-2xl" role="status">
          {paused}
        </p>
      ) : null}
      <section className="flex items-center gap-8">
        {state.join ? (
          <div className="h-40 w-40 bg-stone-100 p-2 text-stone-950">
            <JoinQr url={state.join.url} />
          </div>
        ) : (
          <p>Join code unavailable.</p>
        )}
        <p className="text-5xl tracking-widest">{state.join ? state.join.code : "unavailable"}</p>
      </section>
      <section>
        <h2 className="text-sm uppercase tracking-wide">Hunters</h2>
        {state.hunters.length === 0 ? (
          <p>Hunters unavailable.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-xl">
            {state.hunters.map((hunter) => (
              <li key={hunter.id}>
                {hunter.name}
                {hunter.holders.length === 0 ? " — waiting" : ` — ${hunter.holders.join(", ")}`}
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-5xl leading-tight">{state.prompt ? state.prompt.label : "Waiting."}</p>
      <section className="max-w-3xl text-2xl leading-relaxed">
        {state.moment ? (
          <>
            <p>{state.moment.text ?? "Text unavailable."}</p>
            <p className="mt-2 text-lg" data-fallback={state.moment.fallbackAudio ?? ""}>
              Still {state.moment.still ?? "unavailable"}. Fallback{" "}
              {state.moment.fallbackAudio ?? "unavailable"}.
            </p>
          </>
        ) : (
          <p>Moment unavailable.</p>
        )}
      </section>
    </main>
  );
}
