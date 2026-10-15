export interface PageInfo {
  href: string;
  title: string;
  summary: string;
  /** What the page will hold once built (spec §5). */
  planned: readonly string[];
}

export const PAGES = {
  dashboard: {
    href: "/",
    title: "Dashboard",
    summary: "Connect to the tower and see its state at a glance.",
    planned: ["State summary", "Last 20 timeline events"],
  },
  lights: {
    href: "/lights",
    title: "Lights",
    summary: "Doorway, ledge and base lights with effects.",
    planned: [
      "Per-doorway, ledge and base light with effect",
      "All on and all off",
      "Light overrides",
      "Requested vs confirmed state",
    ],
  },
  sounds: {
    href: "/sounds",
    title: "Sounds",
    summary: "The tower's sound catalog.",
    planned: ["Filterable catalog by ID and name", "Play button with a pending lock per command"],
  },
  mechanics: {
    href: "/mechanics",
    title: "Mechanics",
    summary: "Drum rotation. Disabled until the tower is calibrated.",
    planned: [
      "Per-drum target side",
      "Rotate and rotate-with-state",
      "Random rotate, with confirmation",
      "Calibration",
    ],
  },
  state: {
    href: "/state",
    title: "Tower State",
    summary: "Every tracked value with its origin, freshness and timestamp.",
    planned: [
      "Glyphs and drums",
      "Seals: break, mark and restore",
      "Skull count and reset",
      "Battery history",
    ],
  },
  diagnostics: {
    href: "/diagnostics",
    title: "Diagnostics",
    summary: "The timeline of everything sent to and received from the tower.",
    planned: [
      "Virtualized timeline with filters and text search",
      "Pause rendering, clear and copy event",
      "Hex and parsed views",
      "Save session and export JSON",
    ],
  },
  gaps: {
    href: "/gaps",
    title: "Feature Gaps",
    summary: "The register of what the tower or library cannot do yet.",
    planned: [
      "Create, edit, resolve and filter gaps",
      "Import and export",
      "Linked capability and diagnostic session",
    ],
  },
  settings: {
    href: "/settings",
    title: "Settings",
    summary: "Service options and version information.",
    planned: ["Mock mode", "Ring-buffer size and logging", "Clear local data, with confirmation"],
  },
} as const satisfies Record<string, PageInfo>;

export const NAV_PAGES: readonly PageInfo[] = Object.values(PAGES);
