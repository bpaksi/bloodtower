import { resolve } from "node:path";
import { BluetoothAdapterFactory, BluetoothPlatform } from "ultimatedarktower";
import { createMockTower } from "./adapters/mockTower.ts";
import { lanUrls } from "./lanUrls.ts";
import packageJson from "./package.json" with { type: "json" };
import { parseDevOrigins, startTowerServer, WS_PATH } from "./server.ts";
import { createTowerSession } from "./session.ts";

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

/**
 * The real tower over Bluetooth by default; `MOCK=1` is the mock tower (D8), and any other value
 * stops the service. The library loads noble when it is imported, but nothing uses Bluetooth until
 * Connect is pressed. `pnpm e2e` sets `MOCK=1`.
 */
const parseMock = (value: string | undefined) => {
  if (value === undefined || value === "" || value === "0") return false;
  if (value === "1") return true;
  throw new Error(`MOCK must be 1 or 0, got "${value}".`);
};
// One mock tower for the life of the service, as there is one real one: each connection reaches
// the same tower through a new connection to it.
const mockTower = parseMock(process.env.MOCK) ? createMockTower() : undefined;
const session = createTowerSession({
  createAdapter: () =>
    mockTower ? mockTower.adapter : BluetoothAdapterFactory.create(BluetoothPlatform.NODE),
});

const server = await startTowerServer({
  port: parsePort(process.env.PORT),
  host,
  webRoot,
  serverVersion: packageJson.version,
  session,
  devOrigins,
});

console.log(`Tower service ${packageJson.version} listening (WebSocket at ${WS_PATH}):`);
for (const url of lanUrls(host, server.port)) console.log(`  ${url}`);
console.log(`Serving web UI from ${webRoot}`);
console.log(
  mockTower ? "Tower: mock (MOCK=1)" : "Tower: real, over Bluetooth (MOCK=1 for the mock)",
);
if (devOrigins.length > 0)
  console.log(`Dev mode: also accepting /ws from ${devOrigins.join(", ")}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    // Disconnect the tower first, so it is not left connected to a process that has gone.
    session
      .close()
      .then(() => server.close())
      .finally(() => process.exit(0));
  });
}
