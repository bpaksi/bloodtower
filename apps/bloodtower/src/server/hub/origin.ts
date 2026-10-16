/**
 * Whether a `/ws` upgrade may proceed. Same rule as tower-poc D20: a page this
 * process served has an Origin whose host matches the request Host. A request
 * with no Origin is a script or a test, not a page, and is let through. Listed
 * dev origins are an exact extra, for `next dev` on another port.
 */
export const isAllowedOrigin = (
  origin: string | undefined,
  host: string | undefined,
  devOrigins: readonly string[] = [],
) => {
  if (origin === undefined) return true;
  if (devOrigins.includes(origin)) return true;
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
