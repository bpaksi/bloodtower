import { DEV_PAGE_PORT, DEV_SESSION_WS_PORT } from "./session.ts";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1"]);

export type PageLocation = { protocol: string; host: string; hostname: string };

/**
 * The http(s) origin of the session host, for links the page loads over plain http
 * (pack assets). Empty when the page and the host share an origin, so a relative path is right.
 *
 * Under `pnpm dev`, `next dev` serves the page on {@link DEV_PAGE_PORT} while the session host
 * listens on {@link DEV_SESSION_WS_PORT}; asset URLs follow the same rule as {@link sessionUrl}.
 * When `NEXT_PUBLIC_WS_URL` points at loopback but the page is opened from the LAN, the page's
 * hostname replaces loopback and the configured port is kept.
 */
export const serverAssetOrigin = (
  location?: PageLocation,
  configured: string | undefined = process.env.NEXT_PUBLIC_WS_URL,
): string => {
  const raw = configured?.trim();
  if (!raw) {
    if (!location) return "";
    const page = new URL(`${location.protocol}//${location.host}`);
    if (page.port === String(DEV_PAGE_PORT)) {
      return `${page.protocol}//${page.hostname}:${DEV_SESSION_WS_PORT}`;
    }
    return "";
  }
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
