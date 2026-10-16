import QRCode from "qrcode";
import { createElement } from "react";

/** A join QR drawn as SVG rects. The markup comes from the code's own modules. */
export function JoinQr({ url }: { url: string }) {
  const qr = QRCode.create(url);
  const size = qr.modules.size;
  const cells = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (qr.modules.get(x, y)) {
        cells.push(createElement("rect", { key: `${x}-${y}`, x, y, width: 1, height: 1 }));
      }
    }
  }
  return createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: `0 0 ${size} ${size}`,
      shapeRendering: "crispEdges",
      role: "img",
      "aria-label": "Join code",
    },
    cells,
  );
}

/** The same QR as a string, for a check that the markup stays free of scripts. */
export const joinQrSvg = (url: string): string => {
  const qr = QRCode.create(url);
  const size = qr.modules.size;
  const cells: string[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (qr.modules.get(x, y)) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="Join code">${cells.join("")}</svg>`;
};
