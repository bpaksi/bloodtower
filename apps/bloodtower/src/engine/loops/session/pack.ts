/** Story metadata the shell loops use. No I/O; tests pass fixtures. */
export type SetupStep = {
  id: string;
  label: string;
  illustration?: string;
};

export type StorySetting = {
  id: string;
  label: string;
  options: { id: string; label: string }[];
  default: string;
};

export type StoryCard = {
  id: string;
  title: string;
  tagline: string | null;
  playable: boolean;
  /** Null on a metadata-only door: the board must not invent a player count. */
  players: { min: number; max: number } | null;
  /** Served cover URL, or null when the file is not on disk. */
  cover?: string | null;
};

export type ShellStory = {
  card: StoryCard;
  settings: StorySetting[];
  setup: SetupStep[];
  heroes: { id: string; name: string }[];
};

/** DEC-110: every game runs seals and skulls so the tower can drop skulls later (DEC-222). */
export const ENGINE_SETUP_STEPS: readonly SetupStep[] = [
  {
    id: "seals-and-skulls",
    label: "Place the seals on the tower and load the skulls into the chute.",
  },
];

export const mergeSetupSteps = (packSteps: readonly SetupStep[]): SetupStep[] => [
  ...ENGINE_SETUP_STEPS,
  ...packSteps,
];

export const TEST_STORY: ShellStory = {
  card: {
    id: "test",
    title: "Proving Grounds",
    tagline: "AREA-077 day slice",
    playable: true,
    players: { min: 1, max: 4 },
  },
  settings: [
    {
      id: "length",
      label: "Length",
      options: [
        { id: "short", label: "Short" },
        { id: "standard", label: "Standard" },
      ],
      default: "standard",
    },
  ],
  setup: [
    ...ENGINE_SETUP_STEPS,
    { id: "lay-out-board", label: "Lay out the board and orient the kingdoms." },
    { id: "place-heroes", label: "Stand each hero on their start building." },
  ],
  heroes: [
    { id: "hero-a", name: "Hero A" },
    { id: "hero-b", name: "Hero B" },
    { id: "hero-c", name: "Hero C" },
    { id: "hero-d", name: "Hero D" },
  ],
};
