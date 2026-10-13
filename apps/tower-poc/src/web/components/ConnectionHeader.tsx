import { AppNav } from "@/components/AppNav";

// Placeholder values. M2 wires these to the service's connection, calibration and battery state.
const STATUS = [
  { label: "Tower", value: "Not connected" },
  { label: "Calibration", value: "Unknown" },
  { label: "Service", value: "Not connected" },
  { label: "Battery", value: "Unknown" },
] as const;

export function ConnectionHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <p className="font-heading text-base font-semibold">Dark Tower</p>
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {STATUS.map((item) => (
            <div key={item.label} className="flex gap-1.5">
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="font-medium">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <AppNav />
    </header>
  );
}
