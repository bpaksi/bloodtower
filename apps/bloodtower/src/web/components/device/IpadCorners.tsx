/**
 * DEC-233 theme B engraved manuscript corners for the iPad shell.
 * The JPEG is the full move-map mock. CSS opens a window on each corner.
 * It is not a border-image: the parchment is painted in. The Story board
 * keeps `public/board/dialog-frame/`.
 */
export const IPAD_CORNER_FRAME_URL = "/ipad/b-engraved-ipad-move-map.jpg";

const CORNERS = ["tl", "tr", "bl", "br"] as const;

const cornerStyle = { backgroundImage: `url("${IPAD_CORNER_FRAME_URL}")` };

export function IpadCorners() {
  return (
    <div className="bt-ipad-corners" data-ipad-corners="theme-b" aria-hidden="true">
      {CORNERS.map((corner) => (
        <span
          key={corner}
          className={`bt-ipad-corner bt-ipad-corner-${corner}`}
          data-ipad-corner={corner}
          style={cornerStyle}
        />
      ))}
    </div>
  );
}
