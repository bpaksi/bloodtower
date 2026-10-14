export interface NetAddress {
  address: string;
  family: string;
  internal: boolean;
}

/**
 * Host a phone on the same Wi-Fi can open.
 * A bind to every interface uses the first non-internal IPv4. A bind to one address uses that address,
 * so an e2e run on 127.0.0.1 stays on 127.0.0.1.
 */
export const advertiseHost = (bindHost: string, interfaces: readonly NetAddress[]): string => {
  if (bindHost !== "0.0.0.0" && bindHost !== "::" && bindHost !== "") return bindHost;
  const found = interfaces.find((item) => item.family === "IPv4" && !item.internal);
  return found?.address ?? "127.0.0.1";
};

export const joinUrl = (host: string, port: number, code: string): string =>
  `http://${host}:${port}/join?code=${code}`;
