# dt1981 asset NOTES (measured + synthesis)

Reference recordings under `/workspace/research/dark-tower-1981/sounds/` were analyzed with
20 ms autocorrelation windows (numpy), then pitches quantized to nearest MIDI note.
All shipped audio is **synthesized from scratch** as 50% duty square waves (1-bit style),
44.1 kHz mono PCM + Vorbis OGG. Optional `.warm` variants add lowpass + short aecho.
Normalized to ~-16 LUFS, peak ≤ -1 dBFS.

## Measured sequences (reference → recreation)

### cold-open (from wos_intro.wav, ~4.81 s)
Measured: A3(.46) E3(.44) A3(.14) E3(.16) A3(.18) C4(.42) A3(.34) C4(.12) A3(.12) C4(.16) E4(.42) E3(.36) A3(.16) E3(.18) A3(.16) C#4(.96)
Shipped: same sequence; square wave with ~12 ms off-gaps between notes. Dur ≈ 4.93 s (dry), 5.54 s (warm).

### win (from wos_darktower.wav victory/assault theme, ~2.78 s; extended with rising A3→E4→A4 finish to feel like clear/victory, ≤5 s)
Measured base: A3(.16) rest(.04) B3(.20) C#4(.16) B3(.20) A3(.20) B3(.16) rest(.04) C#4(.12) rest(.22) A3(.42+) …
Shipped: A3(.16) r(.04) B3(.20) C#4(.16) B3(.20) A3(.20) B3(.16) r(.04) C#4(.12) r(.22) A3(.42) E4(.20) A4(.90). Dur ≈ 3.17 s.

### loss~lost (from wos_lost.wav, ~1.93 s)
Measured descending: F#5(.10) C#5(.10) A4(.16) F4(.18) D#4(.22) C4(.22) A#3(.30) G#3(.30) G3(.32)
Shipped: same, last G3 held .50 s. Dur ≈ 2.23 s.

### loss~plague (from wos_plague.wav, ~2.8 s)
Measured: G#3(.52+.6) B3(.22) A#3(.44) G#3(.26+.26) G3(.24) G#3(.24)
Shipped: G#3(.50) r(.06) G#3(.56) B3(.22) A#3(.44) G#3(.26) r(.04) G#3(.26) G3(.24) G#3(.70). Dur ≈ 3.43 s.

## Slides
Procedural SVG (wobbly polyline ink, hatching, parchment noise) → PNG 1920×1080 and 2048×1536.
Homages only: brigands / dragon / wizard / warriors / keys / tower / victory / lost / cursed.
Ink-in animation: `video/cold-open-ink-in.mp4` (~8 s, 24 fps, 1280×720 h264) fades through the six cold-open slides.

## Honest quality caveats
- Audio cannot be auditioned here; square-wave recreations will lack the original's speaker/cabinet resonance and any firmware-level timing quirks. Autocorrelation can mis-split sustained notes.
- Win tune adds an original rising cadence (not in the short darktower recording) so it reads as "victory/clear."
- Procedural ink art is schematic AD&D-ish linework: figures are silhouette-like, hatching is regular, no hand-shaded values. Not museum quality; fine as bookend placeholders.
- Warm variants use ffmpeg aecho (not a real room IR); may sound metallic on some DACs.
