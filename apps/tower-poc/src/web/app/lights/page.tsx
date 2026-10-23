import { HELD_LIGHT_SEQUENCES } from "@dark-tower/tower";
import type { Metadata } from "next";
import { CapabilityControl } from "@/components/controls/CapabilityControl";
import { LightsControl } from "@/components/controls/LightsControl";
import { PageHeader } from "@/components/PageHeader";
import { VerifyPanel } from "@/components/verify/VerifyPanel";
import { PAGES } from "@/lib/pages";

export const metadata: Metadata = { title: PAGES.lights.title };

export default function LightsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader page={PAGES.lights} verify />
      <VerifyPanel location="lights" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <CapabilityControl
          capabilityId="lighting.all-on"
          description="Every light at once, with one effect. Left empty, the effect is on."
          sendLabel="All lights on"
          pendingLabel="Turning on…"
        />
        <CapabilityControl
          capabilityId="lighting.all-off"
          description="Every light off at once."
          sendLabel="All lights off"
          pendingLabel="Turning off…"
        />
      </div>
      <LightsControl />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <CapabilityControl
          capabilityId="lighting.sequence"
          title="Light sequence"
          description={
            <>
              A light override from the tower's catalog, with a sound if you choose one. The four
              rotation sequences need a calibrated tower and no sound; the tower does not answer
              them, so they end as “Sent, no answer”. Rotation drum middle stays off this page until
              the timing test has played it; that page sends it and flags it.
            </>
          }
          sendLabel="Play sequence"
          pendingLabel="Playing…"
          hideSequences={HELD_LIGHT_SEQUENCES}
        />
        <CapabilityControl
          capabilityId="lighting.set-led"
          description="One light by layer and number. Layers: 0 top ring, 1 middle ring, 2 bottom ring, 3 ledge, 4 and 5 base. Lights 0 to 3 in each."
          sendLabel="Set LED"
          pendingLabel="Setting…"
        />
      </div>
    </div>
  );
}
