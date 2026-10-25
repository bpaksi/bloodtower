# iPad corner frame (DEC-233 theme B)

Engraved manuscript corners for the iPad shell (`/join` and `/device`). Bob locked theme B on 2026-10-25. The Story board does not use this frame. `/board` keeps `public/board/dialog-frame/`.

Served at `/ipad/b-engraved-ipad-move-map.jpg`. The file lives in `apps/bloodtower/public/ipad/` and is linked into the Next public folder by `apps/bloodtower/src/web/public/ipad -> ../../../public/ipad`. `serveStatic` also falls back to this folder for `/ipad/`, the same way `/landing/` and `/audio/` do.

The JPEG is the weekend mock, copied unchanged from `docs/ui-mocks/weekend-w1/b-engraved-ipad-move-map.jpg` (864×1152, sha256 `92625a3660c9bffe189c66ca13636b75b9c56e2c7b890bd3ca4c7f8488dc4f6f`). There are no sliced corner pieces. The parchment is painted into the page, so this file is not a `border-image` source. `IpadCorners` shows one window on each corner of the same JPEG.
