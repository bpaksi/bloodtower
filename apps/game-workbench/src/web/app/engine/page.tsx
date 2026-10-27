import "./engine.css";
import { loadCards } from "../../lib/cards.ts";
import { citations, liteCards, loadLoops, loopTree, triggers } from "../../lib/engine.ts";
import { EngineView } from "./EngineView.tsx";

export const dynamic = "force-dynamic";

export default function EnginePage() {
  const { cards } = loadCards();
  const { loops, errors } = loadLoops(cards);
  const cited = Object.fromEntries(citations(loops, cards));
  return (
    <>
      <section className="page-head">
        <h1>Engine map</h1>
        <p className="muted">
          The game's loops two ways: as designed, loops inside loops drawn as railroads (DEC-276);
          and as it will be built, one event-sourced reducer,{" "}
          <span className="mono">step(state, event) → state, effects</span> (bloodtower spec D32 to
          D38). Every ID opens its card. Read live from {loops.length} loop cards.
        </p>
      </section>
      {errors.length > 0 && (
        <div className="card-errors" role="alert">
          <b>
            {errors.length} railroad block{errors.length === 1 ? "" : "s"} could not be read
          </b>
          <ul>
            {errors.map((e) => (
              <li key={e} className="mono">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
      <EngineView
        loops={loops}
        tree={loopTree(loops)}
        triggers={triggers(loops)}
        cards={liteCards(cards)}
        cited={cited}
      />
    </>
  );
}
