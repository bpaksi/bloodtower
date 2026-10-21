export type PrototypeInfo = { id: string; name: string; path: string; question: string };

/** Batch 1, in the order of the plan. The pages may 404 until their step is built. */
export const PROTOTYPES: readonly PrototypeInfo[] = [
  {
    id: "P-01",
    name: "Story board layouts",
    path: "/p/board",
    question: "Are the panels readable from the couch, and do they scale to 4K?",
  },
  {
    id: "P-08",
    name: "A day's turn loop",
    path: "/p/turn",
    question: "Does a turn feel right, with enough to do with the moves rolled?",
  },
  {
    id: "P-02",
    name: "Tomb: the dungeon crawl",
    path: "/p/tomb",
    question: 'Does "deeper or leave" make a tense scene?',
  },
  {
    id: "P-03",
    name: "Cave: the hunt",
    path: "/p/cave",
    question: "Is reading signs fun, and is the light meter fair?",
  },
  {
    id: "P-04",
    name: "Encampment: trade",
    path: "/p/camp",
    question: "Does the camp's temper make haggling a real choice?",
  },
  {
    id: "P-05",
    name: "Fortress: the duel ladder",
    path: "/p/fortress",
    question: "Does the duel ladder work as a set piece?",
  },
];
