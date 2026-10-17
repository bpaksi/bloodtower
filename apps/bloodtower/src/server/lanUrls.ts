import { networkInterfaces } from "node:os";

/** IPv4 addresses on this machine's non-internal interfaces, in the order the OS lists them. */
export const lanAddresses = (): string[] =>
  Object.values(networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);

/** URLs other devices on the LAN can use to reach a server bound to `host`. */
export const lanUrls = (host: string, port: number): string[] => {
  if (host !== "0.0.0.0") return [`http://${host}:${port}`];
  return [
    `http://localhost:${port}`,
    ...lanAddresses().map((address) => `http://${address}:${port}`),
  ];
};

const isLoopback = (host: string) =>
  host.startsWith("127.") || host === "::1" || host === "[::1]" || host === "localhost";

/**
 * The host an iPad can open for the join QR, or undefined when only loopback reaches the server.
 * Bound to every interface, that is the first LAN address. Bound to one address, it is that
 * address unless it is loopback.
 */
export const joinHost = (
  bound: string,
  addresses: readonly string[] = lanAddresses(),
): string | undefined => {
  if (bound === "0.0.0.0" || bound === "::") return addresses[0];
  if (isLoopback(bound)) return undefined;
  return bound;
};
