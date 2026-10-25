"use client";

import { GOODBYE_TEARDOWN, goodbyeTowerState } from "../lib/goodbye.ts";

/** Thank-you teardown. No control gates the session (SCR-020, DEC-219). */
export function GoodbyeTeardown({ shows }: { shows: string }) {
  const state = goodbyeTowerState(shows);
  return (
    <>
      <ol className="bt-teardown" data-teardown="">
        {GOODBYE_TEARDOWN.map((item) => (
          <li key={item.id} data-setup-id={item.id}>
            {item.text}
          </li>
        ))}
      </ol>
      <p className="bt-tower-state" data-tower-state="">
        {state}
      </p>
    </>
  );
}
