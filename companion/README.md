# reachy-dm-phone — live MCP-Apps companion screen

A mobile-first web host that renders the **fallout-helper** MCP-Apps widgets
(Pip-Boy dice roller, character sheet) **live** as a DM agent (Codex) calls the
tools. Built for a **GrapheneOS phone** (Vanadium browser) — the "open-source
intelligent phone" demo — but works in any browser.

It uses mcp-ui's `AppRenderer` (`@mcp-ui/client`) to mount the *real* ext-apps
widgets unchanged, driven by a server-sent-events feed of tool activity.

## Architecture

```
fallout-helper server (:3030)                 reachy-dm-phone (Vite/React)
  POST /mcp   ── Codex calls tools             EventSource ← /events  (which widget + data)
  GET  /events ── SSE broadcast ──────────────▶ AppRenderer(key=event.seq)
  GET  /widgets/<name>.html ◀── fetch widget ── ▶   └ sandboxed iframe: dice / sheet
                                                MCP Client → /mcp  (re-roll, etc.)
                                                ChoiceCard (present_player_choice; display)
```

- **`src/useToolEvents.ts`** — subscribes to `/events`; each tool call updates the view.
- **`src/App.tsx`** — mounts the matching widget via `AppRenderer`, keyed by event seq
  (fresh widget per call → the dice animation replays). Echo-suppresses phone-initiated
  re-rolls so they don't double-render.
- **`src/mcpClient.ts`** — browser MCP client over StreamableHTTP; advertising it enables
  widget actions (dice RE-ROLL) to call back to the live server.
- **`src/ChoiceCard.tsx`** — `present_player_choice` has no widget; the card displays the
  options (the player answers in Codex).
- **`public/sandbox_proxy.html`** — the **MCP-Apps** sandbox proxy (must implement
  `ui/notifications/sandbox-proxy-ready` + `sandbox-resource-ready` → `document.write`).
  Do **not** use mcp-ui's legacy `scripts/proxy/index.html` — it errors with
  "missing url or html parameter" under `AppFrame`.

## Run

1. Start the MCP server (from `../agent-skills-ttrpg-demo/mcp/fallout-helper`):
   ```bash
   npm run build        # first time / after widget changes
   PORT=3030 bun main.ts   # or: npm run serve  (defaults to :3001)
   ```
2. Start the phone host:
   ```bash
   npm install
   VITE_MCP_PORT=3030 npm run dev   # omit VITE_MCP_PORT to target :3001
   ```
   Vite prints a LAN URL (e.g. `http://10.0.0.234:5173/`). Open it on the phone
   (same wifi).

### Config
- `VITE_MCP_PORT` — server port to target (default `3001`). The host derives the
  server from `http://<page-host>:<port>`, so the phone auto-targets the laptop.
- `VITE_MCP_BASE` — full override, e.g. `http://10.0.0.234:3030`.

### Windows firewall (phone can't reach the page)
Inbound to Vite/the server is blocked by default for LAN devices (desktop works via
`localhost`; the phone is remote). Allow the dev ports once (elevated PowerShell):
```powershell
New-NetFirewallRule -DisplayName "reachy-dm-dev-LAN" -Direction Inbound -Action Allow `
  -Protocol TCP -LocalPort 3001,3030,5173,5174 -Profile Private
```
Keep dev ports within that set or the phone won't connect. HTTPS (for installing as a
PWA) needs a trusted cert (mkcert/Tailscale); a plain Vanadium tab needs none.
