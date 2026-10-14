import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfig } from "./config.ts";
import { startHost } from "./server.ts";

const config = loadConfig();
const hostName = process.env.HOST || "0.0.0.0";
const webRoot = resolve(process.env.WEB_ROOT || resolve(import.meta.dirname, "../web/out"));

mkdirSync(config.dataDir, { recursive: true });

const server = await startHost({ port: config.port, host: hostName, webRoot });

console.log(`Burgomaster's Funeral POC listening on port ${server.port}`);
console.log(`Serving web UI from ${webRoot}`);
console.log(`Data folder ${config.dataDir}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close().finally(() => process.exit(0));
  });
}
