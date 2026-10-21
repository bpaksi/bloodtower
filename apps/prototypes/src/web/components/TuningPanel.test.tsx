import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultValues, type TuningField } from "../lib/tuning.ts";
import { TuningPanel } from "./TuningPanel.tsx";

const fields: TuningField[] = [
  { key: "floor", label: "Move floor", type: "number", default: 1, min: 0, note: "DEC-102" },
  { key: "dice", label: "Dice", type: "text", default: "2d6" },
];

describe("TuningPanel", () => {
  it("renders every field with its value and a copy-as-JSON button", () => {
    const html = renderToStaticMarkup(
      <TuningPanel
        fields={fields}
        values={{ ...defaultValues(fields), floor: 2 }}
        onChange={() => {}}
      />,
    );
    expect(html).toContain("Move floor");
    expect(html).toContain('value="2"');
    expect(html).toContain('value="2d6"');
    expect(html).toContain("DEC-102");
    expect(html).toContain("Copy as JSON");
  });
});
