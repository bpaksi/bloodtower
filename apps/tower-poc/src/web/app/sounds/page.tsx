import type { Metadata } from "next";
import { CapabilityControl } from "@/components/controls/CapabilityControl";
import { SoundCatalog } from "@/components/controls/SoundCatalog";
import { PageHeader } from "@/components/PageHeader";
import { VerifyPanel } from "@/components/verify/VerifyPanel";
import { PAGES } from "@/lib/pages";

export const metadata: Metadata = { title: PAGES.sounds.title };

export default function SoundsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader page={PAGES.sounds} verify />
      <VerifyPanel location="sounds" />
      <CapabilityControl
        capabilityId="sound.play-stateful"
        title="Play with volume"
        description={
          <>
            A sound by its number in the catalog below, with a volume: 0 loud, 1 medium, 2 quiet, 3
            mute, as the library names them. Left empty, the library's default. What each level does
            on the tower is not yet known. There is no loop: the tower did not loop a sound sent
            with it.
          </>
        }
        sendLabel="Play"
        pendingLabel="Playing…"
      />
      <SoundCatalog />
    </div>
  );
}
