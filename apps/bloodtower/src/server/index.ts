import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadConfig } from "./config.ts";
import { startSessionHost } from "./hub/host.ts";
import { parseDevOrigins } from "./hub/origin.ts";
import { towerFromEnv } from "./hub/tower.ts";
import { joinHost, lanUrls } from "./lanUrls.ts";

const config = loadConfig();
const hostName = process.env.HOST || "0.0.0.0";
const webRoot = resolve(process.env.WEB_ROOT || resolve(import.meta.dirname, "../web/out"));

let devOrigins: string[];
try {
  devOrigins = parseDevOrigins(process.env.DEV_ORIGINS);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

mkdirSync(config.dataDir, { recursive: true });
const chosen = towerFromEnv(process.env);

const joinPagePort =
  process.env.DEV_PAGE_PORT === undefined || process.env.DEV_PAGE_PORT === ""
    ? undefined
    : Number(process.env.DEV_PAGE_PORT);

let server: Awaited<ReturnType<typeof startSessionHost>>;
try {
  if (joinPagePort !== undefined && (!Number.isInteger(joinPagePort) || joinPagePort < 0)) {
    console.error("DEV_PAGE_PORT must be a non-negative integer.");
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
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
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
console.log(`${towerLine} This process sends no effects.`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close().finally(() => process.exit(0));
  });
}
