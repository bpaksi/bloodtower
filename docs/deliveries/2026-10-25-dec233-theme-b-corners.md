# Delivery: DEC-233 theme B engraved iPad corner frames (2026-10-25)

From Illusionist. Files only: the Bob-approved full-screen mock and this note. No `.ts`, `.tsx`, or `.css`.

Bob locked option B on 2026-10-25 (DEC-233, with Illusionist, Blood Tower room). iPad chrome uses engraved manuscript corner frames. Warden: ship this asset now. W1 coding does not block on it. Anvil and Wright wire the path after.

## Where it goes

iPad only. The Story board must not use these corners. `/board` keeps `apps/bloodtower/public/board/dialog-frame/` (the centred Story board dialog). Do not point the iPad shell at that frame, and do not point the Story board at this mock.

`apps/bloodtower/public/` has no device chrome or ui folder (`board`, `landing`, `avatars`, `audio` only), so the mock is the weekend W1 reference, not a served URL.

## Asset

Copied unchanged from the approved file `b-engraved.jpg`. No crop and no resize. There are no sliced corner pieces in the repo. This JPEG is the reference. W1 wires the overlay and CSS against it. Sliced transparent corner PNGs can follow; until they do, do not treat this file as a `border-image` source. The parchment is painted into the JPEG.

| File | Bytes | Dims | sha256 | What |
|---|---|---|---|---|
| `docs/ui-mocks/weekend-w1/b-engraved-ipad-move-map.jpg` | 192486 | 864×1152 | `92625a3660c9bffe189c66ca13636b75b9c56e2c7b890bd3ca4c7f8488dc4f6f` | Option B. Portrait iPad move map. Engraved manuscript frame corners on all four corners. |

Wright records this path for the four corners of `/join` and `/device` (`phone` and `ipad`). The bar, dialog, scroll, and mute work in W1 step 1 do not wait on the file.
