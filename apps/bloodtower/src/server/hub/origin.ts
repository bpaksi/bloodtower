/** RFC 1918 and link-local IPv4 hostnames for a dev page opened on the LAN. */
export const isPrivateLanHostname = (hostname: string) => {
  const parts = hostname.split(".").map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
};

const isDevLanOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return isPrivateLanHostname(url.hostname);
  } catch {
    return false;
  }
};

/**
 * Whether a `/ws` upgrade may proceed. Same rule as tower-poc D20: a page this
 * process served has an Origin whose host matches the request Host. A request
 * with no Origin is a script or a test, not a page, and is let through. Listed
 * dev origins are an exact extra, for `next dev` on another port. When
 * `allowDevPrivateOrigins` is set, any private-range http(s) origin is allowed
 * so an iPad on the LAN can open `next dev` without listing every address.
 */
export const isAllowedOrigin = (
  origin: string | undefined,
  host: string | undefined,
  devOrigins: readonly string[] = [],
  allowDevPrivateOrigins = false,
) => {
  if (origin === undefined) return true;
  if (devOrigins.includes(origin)) return true;
  if (allowDevPrivateOrigins && isDevLanOrigin(origin)) return true;
  if (!host) return false;
  try {
    const url = new URL(origin);
    return (url.protocol === "http:" || url.protocol === "https:") && url.host === host;
  } catch {
    return false;
  }
};

/**
 * Reads the comma-separated `DEV_ORIGINS` value. Each entry is reduced to
 * scheme, host and port. An entry that is not an http or https origin is an
 * error: `localhost:3000` without a scheme parses as an origin of "null".
 */
export const parseDevOrigins = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "")
    .map((entry) => {
      const url = URL.canParse(entry) ? new URL(entry) : undefined;
      if (
        !url ||
        (url.protocol !== "http:" && url.protocol !== "https:") ||
        url.origin === "null"
      ) {
        throw new Error(
          `DEV_ORIGINS has an entry that is not an http or https origin: "${entry}". Write it like http://localhost:3000.`,
        );
      }
      return url.origin;
    });
