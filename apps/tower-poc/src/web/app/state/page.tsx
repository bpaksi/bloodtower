import type { Metadata } from "next";
import { CapabilityControl } from "@/components/controls/CapabilityControl";
import { PageHeader } from "@/components/PageHeader";
import {
  Battery,
  DrumPositions,
  GlyphPositions,
  SealRecord,
  SkullCount,
} from "@/components/state/TowerValues";
import { PAGES } from "@/lib/pages";

export const metadata: Metadata = { title: PAGES.state.title };

export default function TowerStatePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader page={PAGES.state} />
      <p className="text-sm text-muted-foreground">
        Each value says where it came from, whether it is current or stale, and when it was set. A
        value the app does not have is shown as unavailable, never as zero.
      </p>

      <SealRecord />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <CapabilityControl
          capabilityId="seals.break"
          description="Plays the seal sequence and sound on the tower. Once the tower confirms it, the seal is marked broken here. No drum moves."
          confirm={
            <p className="font-medium">
              Break this seal? The tower plays the seal lights and sound at once.
            </p>
          }
          sendLabel="Break seal"
          pendingLabel="Breaking…"
        />
        <CapabilityControl
          capabilityId="seals.mark-broken"
          description="Marks a seal broken in the app's record only. Nothing is sent to the tower, so it works with the tower off."
          sendLabel="Mark broken"
          pendingLabel="Marking…"
        />
        <CapabilityControl
          capabilityId="seals.mark-restored"
          description="Marks a seal whole again in the app's record only. Nothing is sent to the tower."
          sendLabel="Mark restored"
          pendingLabel="Marking…"
        />
        <CapabilityControl
          capabilityId="seals.reset"
          description="Marks every seal whole in the app's record. Nothing is sent to the tower."
          confirm={
            <p className="font-medium">
              Mark every seal whole? The record of broken seals is cleared.
            </p>
          }
          sendLabel="Clear all"
          pendingLabel="Clearing…"
        />
      </div>

      <SkullCount />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <CapabilityControl
          capabilityId="skulls.reset-record"
          description="Starts the app's count again at 0 from now. Nothing is sent to the tower."
          confirm={<p className="font-medium">Reset the skull count to 0?</p>}
          sendLabel="Reset count"
          pendingLabel="Resetting…"
        />
        <CapabilityControl
          capabilityId="skulls.reset-count"
          description="Sends the tower its state with its own skull counter at 0. The library has no way to send the firmware's reset command itself, and whether the tower takes the counter from this is not known (GAP-LIB-012). It does not change the app's count."
          sendLabel="Reset tower counter"
          pendingLabel="Resetting…"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DrumPositions />
        <GlyphPositions />
      </div>
      <Battery />
    </div>
  );
}
