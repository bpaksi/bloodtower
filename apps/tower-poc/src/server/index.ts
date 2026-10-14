import { resolve } from "node:path";
import { lanUrls } from "./lanUrls.ts";
import packageJson from "./package.json" with { type: "json" };
import { parseDevOrigins, startTowerServer, WS_PATH } from "./server.ts";

const DEFAULT_PORT = 4747;

const parsePort = (value: string | undefined) => {
  if (value === undefined || value === "") return DEFAULT_PORT;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`PORT must be an integer from 0 to 65535, got "${value}".`);
  }
  return port;
};

const host = process.env.HOST || "0.0.0.0";
const webRoot = resolve(process.env.WEB_ROOT || resolve(import.meta.dirname, "../web/out"));

// Set by `pnpm dev` only: the origin of `next dev`, which serves the UI from another port (D20).
const devOrigins = parseDevOrigins(process.env.DEV_ORIGINS);

const server = await startTowerServer({
  port: parsePort(process.env.PORT),
  host,
  webRoot,
  serverVersion: packageJson.version,
  devOrigins,
});

console.log(`Tower service ${packageJson.version} listening (WebSocket at ${WS_PATH}):`);
for (const url of lanUrls(host, server.port)) console.log(`  ${url}`);
console.log(`Serving web UI from ${webRoot}`);
if (devOrigins.length > 0)
  console.log(`Dev mode: also accepting /ws from ${devOrigins.join(", ")}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close().finally(() => process.exit(0));
  });
}
