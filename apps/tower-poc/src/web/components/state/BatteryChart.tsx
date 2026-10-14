"use client";

import { useId, useState } from "react";
import type { TowerValue } from "tower-poc-protocols";
import { timeLabel } from "@/lib/labels";
import { batteryPoints, nearestPoint } from "@/lib/towerState";

const WIDTH = 600;
const HEIGHT = 160;
const GRID = [0, 25, 50, 75, 100];

/**
 * The battery over time: one line by percent, 0 to 100, with a crosshair and the nearest reading
 * on hover or touch, and the same readings as a table. One series, so no legend; the heading
 * names it.
 */
export function BatteryChart({ history }: { history: TowerValue<"battery.on-level"> }) {
  const titleId = useId();
  const points = batteryPoints(history, WIDTH, HEIGHT);
  const [hover, setHover] = useState<(typeof points)[number]>();

  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">No readings yet.</p>;
  }

  const track = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    setHover(nearestPoint(points, ((event.clientX - box.left) / box.width) * WIDTH));
  };
  const first = points[0];
  const last = points.at(-1);

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative">
        <svg
          role="img"
          aria-labelledby={titleId}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-40 w-full touch-none overflow-visible"
          onPointerMove={track}
          onPointerDown={track}
          onPointerLeave={() => setHover(undefined)}
        >
          <title id={titleId}>
            Battery from {first ? timeLabel(first.at) : ""} to {last ? timeLabel(last.at) : ""},{" "}
            {points.length} readings
          </title>
          {GRID.map((percent) => (
            <line
              key={percent}
              x1={0}
              x2={WIDTH}
              y1={HEIGHT - (percent / 100) * HEIGHT}
              y2={HEIGHT - (percent / 100) * HEIGHT}
              className="stroke-border"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {points.length > 1 ? (
            <polyline
              points={points.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              className="stroke-foreground"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {hover && (
            <line
              x1={hover.x}
              x2={hover.x}
              y1={0}
              y2={HEIGHT}
              className="stroke-muted-foreground"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {/* Points are drawn in HTML so they stay round when the chart stretches. */}
        {(hover ? [hover] : points.length === 1 ? points : []).map((point) => (
          <span
            key={point.at}
            aria-hidden
            className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground"
            style={{ left: `${(point.x / WIDTH) * 100}%`, top: `${(point.y / HEIGHT) * 100}%` }}
          />
        ))}
        {hover && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 rounded-md border bg-background px-2 py-1 text-xs shadow-sm"
            style={
              hover.x > WIDTH / 2
                ? { right: `${100 - (hover.x / WIDTH) * 100}%`, marginRight: 8 }
                : { left: `${(hover.x / WIDTH) * 100}%`, marginLeft: 8 }
            }
          >
            <p className="font-medium">
              {Math.round(hover.percent)}% ({(hover.millivolts / 1000).toFixed(2)} V)
            </p>
            <p className="text-muted-foreground">{timeLabel(hover.at)}</p>
          </div>
        )}
      </div>
      <figcaption className="flex justify-between text-xs text-muted-foreground">
        <span>{first ? timeLabel(first.at) : ""}</span>
        <span>0 to 100%</span>
        <span>{last ? timeLabel(last.at) : ""}</span>
      </figcaption>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Show as a table</summary>
        <div className="mt-2 max-h-60 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="py-1 font-medium">Time</th>
                <th className="py-1 font-medium">Percent</th>
                <th className="py-1 font-medium">Volts</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((reading) => (
                <tr key={reading.at} className="border-t">
                  <td className="py-1">{timeLabel(reading.at)}</td>
                  <td className="py-1">{Math.round(reading.percent)}%</td>
                  <td className="py-1">{(reading.millivolts / 1000).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
