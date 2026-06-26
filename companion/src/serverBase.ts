/**
 * Where the MCP server lives. The phone loaded this app FROM the laptop over
 * wifi, so `window.location.hostname` is already the laptop's LAN IP — we just
 * add the server port. Override entirely with VITE_MCP_BASE for dev (e.g. to
 * hit an alternate port), or just the port with VITE_MCP_PORT.
 */
const PORT = import.meta.env.VITE_MCP_PORT ?? "3001";

export const SERVER_BASE: string =
  import.meta.env.VITE_MCP_BASE ?? `http://${window.location.hostname}:${PORT}`;

/** "ui://fallout-helper/dice-roll.html" -> "<base>/widgets/dice-roll.html" */
export function widgetUrl(resourceUri: string): string {
  const name = resourceUri.split("/").pop() ?? "";
  return `${SERVER_BASE}/widgets/${name}`;
}
