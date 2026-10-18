import {
  type CameraTrack,
  frameAtTime,
  frameToTransform,
  STILL_ASPECT_DEFAULT,
} from "./cameraTrack.ts";

export type CameraStillImageStyle = {
  transform: string;
  transition?: string;
};

/** Image style for the story-board camera still (pure; used by {@link CameraStill}). */
export const cameraStillImageStyle = (
  track: CameraTrack | null,
  seconds: number,
  reducedMotion: boolean,
  containerAspect: number = STILL_ASPECT_DEFAULT,
  stillAspect: number = STILL_ASPECT_DEFAULT,
): CameraStillImageStyle | undefined => {
  if (!track) return undefined;
  const frame = reducedMotion
    ? frameAtTime(track, Number.POSITIVE_INFINITY)
    : frameAtTime(track, seconds);
  return {
    transform: frameToTransform(frame, containerAspect, stillAspect),
  };
};
