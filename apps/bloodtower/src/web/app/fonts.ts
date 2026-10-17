import localFont from "next/font/local";

/**
 * Illusionist R2 faces (SIL OFL 1.1, google/fonts ofl/).
 * Loaded with next/font/local as docs/art-direction/game-look.md specifies.
 * No Google Fonts CDN: the table runs offline.
 */
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

const imFell = localFont({
  src: "./fonts/IMFeENrm28P.ttf",
  variable: "--font-im-fell",
  display: "swap",
});

const unifraktur = localFont({
  src: "./fonts/UnifrakturMaguntia-Book.ttf",
  variable: "--font-unifraktur",
  display: "swap",
});

export const boardFonts = {
  variables: [
    cormorantGaramond.variable,
    cormorantSc.variable,
    imFellSc.variable,
    imFell.variable,
    unifraktur.variable,
  ].join(" "),
};
