/**
 * Where the MCP server lives. The phone loaded this app FROM the laptop over
 * wifi, so `window.location.hostname` is already the laptop's LAN IP — we just
 * add the server port. Override entirely with VITE_MCP_BASE for dev (e.g. to
 * hit an alternate port), or just the port with VITE_MCP_PORT.
 */
const PORT = import.meta.env.VITE_MCP_PORT ?? "3001";

export const SERVER_BASE: string =
  import.meta.env.VITE_MCP_BASE ?? `http://${window.location.hostname}:${PORT}`;

/**
 * Capability key for a secret-gated server (COMPANION_SECRET). Read from the companion URL —
 * `#key=…` (preferred; the fragment isn't sent to the static host) or `?key=…` — else a build-time
 * `VITE_COMPANION_KEY`. Empty ⇒ no gate. Appended to `/events` and sent as the `/mcp` bearer.
 */
export const COMPANION_KEY: string = (() => {
  try {
    const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("key");
    const fromQuery = new URLSearchParams(window.location.search).get("key");
    return fromHash || fromQuery || (import.meta.env.VITE_COMPANION_KEY ?? "");
  } catch {
    return import.meta.env.VITE_COMPANION_KEY ?? "";
  }
})();

/** Append the capability key as `?key=` (EventSource can't send headers). */
export function withKey(url: string): string {
  if (!COMPANION_KEY) return url;
  return url + (url.includes("?") ? "&" : "?") + "key=" + encodeURIComponent(COMPANION_KEY);
}

/** "ui://ttrpg-helper/dice-roll.html" -> "<base>/widgets/dice-roll.html" (widgets are not gated) */
export function widgetUrl(resourceUri: string): string {
  const name = resourceUri.split("/").pop() ?? "";
  return `${SERVER_BASE}/widgets/${name}`;
}
