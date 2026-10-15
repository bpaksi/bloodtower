import type { Metadata } from "next";
import { CalibrateControl } from "@/components/controls/CalibrateControl";
import { CapabilityControl } from "@/components/controls/CapabilityControl";
import { PageHeader } from "@/components/PageHeader";
import { DrumPositions } from "@/components/state/TowerValues";
import { VerifyPanel } from "@/components/verify/VerifyPanel";
import { PAGES } from "@/lib/pages";

export const metadata: Metadata = { title: PAGES.mechanics.title };

// The library's numbers for rotateDrumStateful, by name: drums by level, sides in rotation order.
const DRUMS = ["top", "middle", "bottom"] as const;
const SIDES = ["north", "east", "south", "west"] as const;

export default function MechanicsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader page={PAGES.mechanics} verify />
      <VerifyPanel location="mechanics" />
      <p className="text-sm text-muted-foreground">
        A rotation cannot be stopped once it is sent: the tower has no stop command. Each control
        sends one command and waits for it to end before it can be pressed again.
      </p>
      <CalibrateControl />
      <DrumPositions />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <CapabilityControl
          capabilityId="mechanics.rotate-with-state"
          title="Rotate drums"
          description="Turns each drum to face the side you choose, keeping the lights as they are, with a sound if you choose one. A drum already on that side does not move; if none would move, nothing is sent."
          sendLabel="Rotate"
          pendingLabel="Rotating…"
        />
        <CapabilityControl
          capabilityId="mechanics.rotate-drum"
          description="Turns one drum to face a side, keeping the lights. If the drum is already there, nothing is sent."
          choices={{
            drumIndex: { label: "Drum", names: DRUMS },
            position: { label: "Side", names: SIDES },
          }}
          sendLabel="Rotate drum"
          pendingLabel="Rotating…"
        />
      </div>
      <CapabilityControl
        capabilityId="mechanics.random-rotate"
        description={
          <>
            Turns the chosen drums to sides picked at random. It also turns every light off: the
            library sends it the old way, without the lights. A drum may land where it was; if none
            moves, the tower may not answer, and it ends as “Sent, no answer” after 30 seconds.
          </>
        }
        confirm={
          <p className="font-medium">
            Rotate these drums to random sides? They start turning at once and cannot be stopped,
            and every light goes off.
          </p>
        }
        sendLabel="Rotate at random"
        pendingLabel="Rotating…"
      />
    </div>
  );
}
