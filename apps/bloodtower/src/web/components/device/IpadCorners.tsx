/**
 * DEC-233 theme B engraved manuscript corners for the iPad shell (#592).
 * Four drawn corners (ART-080, transparent PNGs) sit on the full parchment page. They are
 * not windows on the move-map mock. The Story board keeps `public/board/dialog-frame/`.
 */
const CORNERS = ["tl", "tr", "bl", "br"] as const;

export function IpadCorners() {
  return (
    <div className="bt-ipad-corners" data-ipad-corners="theme-b" aria-hidden="true">
      {CORNERS.map((corner) => (
        <span
          key={corner}
          className={`bt-ipad-corner bt-ipad-corner-${corner}`}
          data-ipad-corner={corner}
          style={{ backgroundImage: `url("/ipad/corners/corner-${corner}.png")` }}
        />
      ))}
    </div>
  );
}
