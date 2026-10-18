import { CHANNELS, type Channel, type Levels } from "../../lib/audio/levels.ts";

const LABELS: Record<Channel, string> = {
  music: "Music",
  ambient: "Ambient",
  voice: "Voice",
};

/**
 * The Sound dialog on the Mac, shown after the first click on the landing screen (R3-UI-03).
 * Board-local: it is not a device control. Each slider has a test clip (see BoardAudio.test).
 */
export function SoundDialog({
  levels,
  onLevelChange,
  onTest,
  onContinue,
}: {
  levels: Levels;
  onLevelChange: (channel: Channel, level: number) => void;
  onTest: (channel: Channel) => void;
  onContinue: () => void;
}) {
  return (
    <div className="bt-sound-backdrop">
      <section
        className="bt-sound-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bt-sound-title"
        data-sound-dialog
      >
        <h2 id="bt-sound-title">Sound</h2>
        <p className="bt-sound-note">
          Levels stay on this Mac. Tower volume is set in Connect Tower.
        </p>
        {CHANNELS.map((channel) => (
          <div className="bt-sound-row" key={channel}>
            <label htmlFor={`bt-sound-${channel}`}>{LABELS[channel]}</label>
            <input
              id={`bt-sound-${channel}`}
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(levels[channel] * 100)}
              onChange={(event) => onLevelChange(channel, Number(event.target.value) / 100)}
            />
            <button type="button" onClick={() => onTest(channel)}>
              Test
            </button>
          </div>
        ))}
        <button type="button" className="bt-sound-continue" onClick={onContinue}>
          Continue
        </button>
      </section>
    </div>
  );
}
