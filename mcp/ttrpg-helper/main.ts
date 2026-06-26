/**
 * Entry point for the Fallout TTRPG Helper MCP server.
 * Run with: npx ttrpg-helper-mcp [--stdio]
 *   or:     node dist/index.js [--stdio]
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createServer } from "./server.js";
import { addSubscriber, removeSubscriber, publishTranscript } from "./events.js";

// Mirror server.ts: works from source (main.ts) and compiled (dist/index.js).
const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

// Widget HTML the companion UI fetches. Allow-list, not blanket static.
const WIDGET_FILES = new Set([
  "dice-roll.html",
  "character-sheet.html",
  "wrm-dice.html",
  "wrm-sheet.html",
]);

export async function startStreamableHTTPServer(
  factory: () => McpServer,
): Promise<void> {
  const port = parseInt(process.env.PORT ?? "3001", 10);

  const app = createMcpExpressApp({ host: "0.0.0.0" });
  // Reflect the requesting origin so the phone companion UI (served from a
  // different port over wifi) can reach both the SSE stream and /mcp.
  app.use(
    cors({
      origin: true,
      exposedHeaders: ["Mcp-Session-Id"],
      allowedHeaders: ["*"],
    }),
  );

  // ── Optional shared-secret gate ─────────────────────────────────────────
  // When COMPANION_SECRET is set, require it on the live feed (/events, /transcript) and the
  // tool endpoint (/mcp), so a public deployment is tied to one session. The key rides in
  // `?key=` (EventSource can't set headers) or `Authorization: Bearer <secret>`. /widgets stays
  // open (static UI shells, no game data). Unset ⇒ no gate (local dev / unguarded). NOTE: interim
  // measure; the principled fix is a per-session room handle (MCP SEP-2567), tracked in the backlog.
  const SECRET = process.env.COMPANION_SECRET?.trim();
  const GATED = new Set(["/events", "/transcript", "/mcp"]);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!SECRET || !GATED.has(req.path)) return next();
    const q = req.query.key;
    const ok =
      (typeof q === "string" && q === SECRET) || req.headers.authorization === `Bearer ${SECRET}`;
    if (!ok) {
      res.status(401).json({ error: "unauthorized: missing or invalid key" });
      return;
    }
    next();
  });

  // ── SSE: live tool-activity stream for companion screens ────────────────
  app.get("/events", (req: Request, res: Response) => {
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    res.flushHeaders?.();
    res.write(": connected\n\n");
    addSubscriber(res);
    const heartbeat = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch {
        /* closed; cleaned up on req close */
      }
    }, 15000);
    req.on("close", () => {
      clearInterval(heartbeat);
      removeSubscriber(res);
    });
  });

  // ── Ingest: spoken/heard lines from the cascade → rebroadcast on /events ──
  // The Reachy cascade fire-and-forgets a POST here per utterance (DM speech +
  // player STT). Non-essential: a bad/empty body is ignored, never throws.
  app.post("/transcript", express.json(), (req: Request, res: Response) => {
    const { role, text, voice } = req.body ?? {};
    const t = typeof text === "string" ? text.trim() : "";
    if (!t || (role !== "user" && role !== "assistant")) {
      res.status(400).json({ ok: false, error: "role ('user'|'assistant') and non-empty text required" });
      return;
    }
    publishTranscript(role, t, typeof voice === "string" ? voice : undefined);
    res.json({ ok: true });
  });

  // ── Static widget HTML (single source of truth; phone fetches these) ────
  app.get("/widgets/:name", (req: Request, res: Response) => {
    const name = req.params.name;
    if (!WIDGET_FILES.has(name)) {
      res.status(404).end();
      return;
    }
    res.sendFile(path.join(DIST_DIR, name));
  });

  // Stateful StreamableHTTP: one transport (and McpServer) per session, reused
  // across requests. This preserves the initialize handshake — including the
  // client's advertised capabilities — so server→client requests like
  // elicitation (present_player_choice) work. Stateless mode (a fresh server per
  // request) loses those capabilities and breaks elicitation.
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const onMcpError = (res: Response, error: unknown) => {
    console.error("MCP error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  };

  // POST — client→server messages (incl. initialize).
  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport = sessionId ? transports.get(sessionId) : undefined;

      if (!transport) {
        // Only a fresh initialize may create a new session.
        if (sessionId || !isInitializeRequest(req.body)) {
          res.status(400).json({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Bad Request: no valid session" },
            id: null,
          });
          return;
        }
        const newTransport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => transports.set(sid, newTransport),
        });
        newTransport.onclose = () => {
          if (newTransport.sessionId) transports.delete(newTransport.sessionId);
        };
        await factory().connect(newTransport);
        transport = newTransport;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      onMcpError(res, error);
    }
  });

  // GET — server→client SSE stream (carries elicitation requests). DELETE — end session.
  const handleSessionRequest = async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }
    try {
      await transport.handleRequest(req, res);
    } catch (error) {
      onMcpError(res, error);
    }
  };
  app.get("/mcp", handleSessionRequest);
  app.delete("/mcp", handleSessionRequest);

  const httpServer = app.listen(port, (err) => {
    if (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
    console.log(`ttrpg-helper-mcp listening on http://localhost:${port}/mcp`);
  });

  const shutdown = () => {
    console.log("\nShutting down...");
    httpServer.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

export async function startStdioServer(factory: () => McpServer): Promise<void> {
  await factory().connect(new StdioServerTransport());
}

async function main() {
  // Always start HTTP so the companion UI has /events + /mcp + /widgets,
  // regardless of how Codex connects. In --stdio mode we ALSO connect a stdio
  // transport for Codex; both share the module-level event bus in events.ts.
  // (Run only ONE process: standalone HTTP *or* a Codex-spawned --stdio one —
  // never both, or they'd collide on the port and split the bus.)
  await startStreamableHTTPServer(createServer);
  if (process.argv.includes("--stdio")) {
    await startStdioServer(createServer);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
