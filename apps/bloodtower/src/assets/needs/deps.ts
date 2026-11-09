// asset-studio, as the adapter uses it: the published job contract and the CLI's own key rules.
// The CLI library has no render or export (those are the `asset-studio` bin, run in steps 4 and 5).
export {
  type AssetKey,
  assetKeys,
  CliError,
  profileKey,
  readIndex,
  resolveWorkFolder,
  type WorkPaths,
  workPaths,
} from "@asset-studio/cli";
export {
  cameraSchema,
  isAssetId,
  type Job,
  type JobCastMember,
  type JobLine,
  type JobMoment,
  type JobPicture,
  type JobSound,
  jobSchema,
} from "@asset-studio/formats";
