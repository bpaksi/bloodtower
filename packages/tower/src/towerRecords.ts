// The service's own record of seals and skulls (spec D24), kept in the state store. The library's
// record is not read and not seeded: each connection gets a new library object, whose record
// starts empty, so the service's is the only one that lasts.
import { sealOrder, type TowerValue } from "./protocols/index.ts";
import type { SkullCounter, StateStore } from "./stateStore.ts";

export type Seal = TowerValue<"seals.broken">[number];

export interface TowerRecords extends SkullCounter {
  /** Adds the seal to the broken ones, or takes it out. A seal already so is left as it is. */
  markSeal: (seal: Seal, broken: boolean) => void;
  /** No seal is broken. */
  resetSeals: () => void;
  /** The count starts again at 0 from now. */
  resetSkulls: () => void;
}

export const createTowerRecords = (
  store: StateStore,
  now: () => number = Date.now,
): TowerRecords => ({
  markSeal: (seal, broken) => {
    const others = store
      .record("seals.broken")
      .filter((other) => sealOrder(other) !== sealOrder(seal));
    const next = broken ? [...others, seal].sort((a, b) => sealOrder(a) - sealOrder(b)) : others;
    if (next.length !== store.record("seals.broken").length) store.setRecord("seals.broken", next);
  },
  resetSeals: () => store.setRecord("seals.broken", []),
  resetSkulls: () => store.setRecord("skulls.count", { count: 0, since: now() }),
  addSkullDrops: (count) => {
    const tally = store.record("skulls.count");
    store.setRecord("skulls.count", { ...tally, count: tally.count + count });
  },
});
