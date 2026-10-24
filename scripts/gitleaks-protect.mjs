// Pre-commit secret scan. Default gitleaks rules; no allowlist until a finding is a
// proven false positive. GITLEAKS_VERSION matches the CI step in .github/workflows/check.yml.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { arch, homedir, platform, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const GITLEAKS_VERSION = "8.30.1";

// sha256 of the official release archives from gitleaks_8.30.1_checksums.txt.
const SHA256 = {
  darwin_arm64: "b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5",
  darwin_x64: "dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709",
  linux_arm64: "e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080",
  linux_x64: "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb",
};

/** Official release archive for one OS and CPU, or undefined when we have no pin. */
export const releaseAsset = (osName, cpu) => {
  const key = `${osName}_${cpu}`;
  const sha256 = SHA256[key];
  if (!sha256) return undefined;
  return { file: `gitleaks_${GITLEAKS_VERSION}_${key}.tar.gz`, sha256 };
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const cachePath = () =>
  join(homedir(), ".cache", "bloodtower", "gitleaks", GITLEAKS_VERSION, "gitleaks");

const versionMatches = (bin) => {
  const result = spawnSync(bin, ["version"], { encoding: "utf8" });
  // A missing binary is the usual case; the pinned download is the recovery.
  if (result.error || result.status !== 0) return false;
  const reported = `${result.stdout}${result.stderr}`.trim();
  return reported === GITLEAKS_VERSION || reported === `v${GITLEAKS_VERSION}`;
};

const installRelease = async (asset, dest) => {
  const url = `https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${asset.file}`;
  console.log(`Downloading gitleaks ${GITLEAKS_VERSION} (${asset.file})`);
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`gitleaks download failed: ${url}`, { cause: error });
  }
  if (!response.ok) {
    throw new Error(`gitleaks download failed (${response.status} ${response.statusText}): ${url}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== asset.sha256) {
    throw new Error(
      `gitleaks checksum mismatch for ${asset.file}: got ${digest}, expected ${asset.sha256}`,
    );
  }

  const work = mkdtempSync(join(tmpdir(), "gitleaks-"));
  try {
    const archivePath = join(work, asset.file);
    const extracted = join(work, "out");
    mkdirSync(extracted);
    writeFileSync(archivePath, bytes);
    const tar = spawnSync("tar", ["-xzf", archivePath, "-C", extracted], { encoding: "utf8" });
    if (tar.error) throw tar.error;
    if (tar.status !== 0) {
      throw new Error(`tar failed to extract ${asset.file}: ${tar.stderr}`);
    }
    const extractedBin = join(extracted, "gitleaks");
    if (!existsSync(extractedBin)) {
      throw new Error(`gitleaks archive ${asset.file} did not contain a gitleaks binary`);
    }
    mkdirSync(dirname(dest), { recursive: true });
    const stage = `${dest}.${process.pid}.tmp`;
    copyFileSync(extractedBin, stage);
    chmodSync(stage, 0o755);
    renameSync(stage, dest);
  } finally {
    try {
      rmSync(work, { recursive: true, force: true });
    } catch (error) {
      console.error(error);
    }
  }
};

const ensureBinary = async () => {
  if (versionMatches("gitleaks")) return "gitleaks";
  const dest = cachePath();
  if (existsSync(dest) && versionMatches(dest)) return dest;
  const asset = releaseAsset(platform(), arch());
  if (!asset) {
    throw new Error(
      `No pinned gitleaks ${GITLEAKS_VERSION} archive for ${platform()} ${arch()}. Install that version and put gitleaks on PATH.`,
    );
  }
  await installRelease(asset, dest);
  if (!versionMatches(dest)) {
    throw new Error(`Installed gitleaks at ${dest} did not report version ${GITLEAKS_VERSION}.`);
  }
  return dest;
};

const run = async () => {
  try {
    const binary = await ensureBinary();
    const result = spawnSync(binary, ["protect", "--staged", "--redact", "--verbose"], {
      cwd: repoRoot,
      stdio: "inherit",
    });
    if (result.error) {
      console.error(result.error);
      process.exit(1);
    }
    if (result.signal) {
      console.error(`gitleaks was killed (${result.signal})`);
      process.exit(1);
    }
    process.exit(result.status ?? 1);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

const isDirectRun =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) await run();
