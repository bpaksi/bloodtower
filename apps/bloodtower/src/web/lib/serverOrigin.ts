const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * The http(s) origin of the session host, for links the page loads over plain http
 * (pack assets). Empty when `NEXT_PUBLIC_WS_URL` is unset: the page and the host share
 * an origin, so a relative path is right.
 *
 * `pnpm dev` points `NEXT_PUBLIC_WS_URL` at `127.0.0.1`, which is the iPad itself when a
 * page is opened from the LAN. When the page is not on loopback, the page's hostname
 * replaces the loopback one and the configured port is kept.
 */
export const serverAssetOrigin = (
  location?: { hostname: string },
  configured: string | undefined = process.env.NEXT_PUBLIC_WS_URL,
): string => {
  const raw = configured?.trim();
  if (!raw) return "";
  let url: URL;
  try {
    url = new URL(raw.replace(/^ws/i, "http"));
  } catch {
    return "";
  }
  if (location && LOOPBACK.has(url.hostname) && !LOOPBACK.has(location.hostname)) {
    url.hostname = location.hostname;
  }
  return url.origin;
};

/** `serverAssetOrigin` for the running page. Empty while rendering on the server with no env. */
export const pageServerOrigin = (): string =>
  serverAssetOrigin(typeof window === "undefined" ? undefined : window.location);
