#!/usr/bin/env bash
# Fetch the free (SIL OFL 1.1) fonts used by tokens.css and the mocks. Run from anywhere.
set -euo pipefail
cd "$(dirname "$0")"
B=https://raw.githubusercontent.com/google/fonts/main/ofl
curl -fsSL -o CormorantGaramond-VF.ttf        "$B/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf"
curl -fsSL -o CormorantGaramond-Italic-VF.ttf "$B/cormorantgaramond/CormorantGaramond-Italic%5Bwght%5D.ttf"
curl -fsSL -o CormorantSC-Bold.ttf            "$B/cormorantsc/CormorantSC-Bold.ttf"
curl -fsSL -o IMFeENrm28P.ttf                 "$B/imfellenglish/IMFeENrm28P.ttf"
curl -fsSL -o IMFeENsc28P.ttf                 "$B/imfellenglishsc/IMFeENsc28P.ttf"
curl -fsSL -o UnifrakturMaguntia-Book.ttf     "$B/unifrakturmaguntia/UnifrakturMaguntia-Book.ttf"
echo "fonts ready"
