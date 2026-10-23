import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadConfig } from "./config.ts";
import { startSessionHost } from "./hub/host.ts";
import { parseDevOrigins } from "./hub/origin.ts";
import { towerFromEnv } from "./hub/tower.ts";
import { joinHost, lanUrls } from "./lanUrls.ts";
import { createHostLogger, debugEnabledFromEnv } from "./log/hostLog.ts";

const config = loadConfig();
const hostName = process.env.HOST || "0.0.0.0";
const webRoot = resolve(process.env.WEB_ROOT || resolve(import.meta.dirname, "../web/out"));

const readDevOrigins = (): string[] => {
  try {
    return parseDevOrigins(process.env.DEV_ORIGINS);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

const openLog = () => {
  try {
    mkdirSync(config.dataDir, { recursive: true });
    return createHostLogger({
      dataDir: config.dataDir,
      debug: debugEnabledFromEnv(process.env),
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

const devOrigins = readDevOrigins();
const log = openLog();

const chosen = towerFromEnv(process.env, log);

const joinPagePort =
  process.env.DEV_PAGE_PORT === undefined || process.env.DEV_PAGE_PORT === ""
    ? undefined
    : Number(process.env.DEV_PAGE_PORT);

let server: Awaited<ReturnType<typeof startSessionHost>>;
try {
  if (joinPagePort !== undefined && (!Number.isInteger(joinPagePort) || joinPagePort < 0)) {
    log.error("host-config", "DEV_PAGE_PORT must be a non-negative integer.");
    chosen.tower.close();
    process.exit(1);
  }

  server = await startSessionHost({
    port: config.port,
    host: hostName,
    webRoot,
    packsDir: config.packsDir,
    databasePath: join(config.dataDir, "session.sqlite"),
    tower: chosen.tower,
    devOrigins,
    joinPagePort,
    log,
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  log.error("host-start", message.trim() === "" ? "The host failed to start." : message);
  chosen.tower.close();
  process.exit(1);
}

const towerLine =
  chosen.mode === "sidecar"
    ? `Tower: sidecar ${chosen.url ?? ""}. Nothing connects until a joined device presses connect.`
    : "Tower: mock. Nothing connects until a joined device presses connect.";

// iPads open the join QR's address, so the log shows the LAN address (R2-12).
const lan = joinHost(hostName);
const shownHost = lan ?? "127.0.0.1";
console.log(`Bloodtower listening on port ${server.port}`);
for (const url of lanUrls(hostName, server.port)) console.log(`  ${url}`);
const pagePort = joinPagePort ?? server.port;
console.log(`Story board http://${shownHost}:${pagePort}/board`);
console.log(`Join http://${shownHost}:${pagePort}/join`);
if (lan === undefined) {
  console.warn(
    `iPads can't reach ${shownHost}: only loopback is available. Connect this Mac to Wi-Fi, then restart Bloodtower.`,
  );
}
console.log(`Socket shares port ${server.port} with the page.`);
console.log(`Serving web UI from ${webRoot}`);
console.log(`Data folder ${config.dataDir}`);
console.log(`Packs folder ${config.packsDir}`);
console.log(
  `${towerLine} It plays only the volume test's sound, after a press, and sends no lights.`,
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server
      .close()
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        log.error("host-close", message.trim() === "" ? "The host failed to close." : message);
      })
      .finally(() => {
        process.exit(0);
      });
  });
}
