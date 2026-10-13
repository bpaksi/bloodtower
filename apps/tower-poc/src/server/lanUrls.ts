import { networkInterfaces } from "node:os";

/** URLs other devices on the LAN can use to reach a server bound to `host`. */
export const lanUrls = (host: string, port: number): string[] => {
  if (host !== "0.0.0.0") return [`http://${host}:${port}`];

  const addresses = Object.values(networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
  return [`http://localhost:${port}`, ...addresses.map((address) => `http://${address}:${port}`)];
};
