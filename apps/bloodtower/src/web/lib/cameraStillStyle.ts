import { type CameraTrack, frameAtTime, frameToTransform } from "./cameraTrack.ts";

export type CameraStillImageStyle = {
  transform: string;
  transition?: string;
};

/** Image style for the story-board camera still (pure; used by {@link CameraStill}). */
export const cameraStillImageStyle = (
  track: CameraTrack | null,
  seconds: number,
  reducedMotion: boolean,
): CameraStillImageStyle | undefined => {
  if (!track) return undefined;
  const frame = reducedMotion
    ? frameAtTime(track, Number.POSITIVE_INFINITY)
    : frameAtTime(track, seconds);
  return {
    transform: frameToTransform(frame),
  };
};
