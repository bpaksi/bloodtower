import localFont from "next/font/local";

/** The game-look faces (docs/art-direction/game-look.md), copied from bloodtower. No CDN. */
const cormorantGaramond = localFont({
  src: [
    { path: "./fonts/CormorantGaramond-VF.ttf", weight: "300 700", style: "normal" },
    { path: "./fonts/CormorantGaramond-Italic-VF.ttf", weight: "300 700", style: "italic" },
  ],
  variable: "--font-cormorant-garamond",
  display: "swap",
});

const cormorantSc = localFont({
  src: "./fonts/CormorantSC-Bold.ttf",
  weight: "700",
  variable: "--font-cormorant-sc",
  display: "swap",
});

const imFellSc = localFont({
  src: "./fonts/IMFeENsc28P.ttf",
  variable: "--font-im-fell-sc",
  display: "swap",
});

export const workbenchFonts = [
  cormorantGaramond.variable,
  cormorantSc.variable,
  imFellSc.variable,
].join(" ");
