import { useCallback, useEffect, useRef, useState } from "react";
import { AppRenderer } from "@mcp-ui/client";
import type { CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { useMcpClient } from "./mcpClient";
import { useToolEvents } from "./useToolEvents";
import { widgetUrl } from "./serverBase";
import { ChoiceCard } from "./ChoiceCard";
import { TranscriptPanel } from "./TranscriptPanel";
import { ControlBar } from "./ControlBar";
import { applyTheme, gameForTool } from "./theme";
import { SERVER_BASE, withKey } from "./serverBase";
import type { ToolEvent } from "./types";

/** Keep the live conversation log from growing without bound. */
const MAX_TRANSCRIPT_LINES = 50;

/**
 * Live companion screen: subscribes to the server's tool-activity SSE and mounts
 * the matching MCP-Apps widget (dice / character sheet) the moment the DM (Codex)
 * calls a tool. Widget actions (e.g. dice RE-ROLL) call back to the live server
 * via the MCP client. present_player_choice has no widget → ChoiceCard.
 */

type View =
  | { kind: "idle" }
  | { kind: "widget"; event: ToolEvent; key: number }
  | { kind: "choice"; event: ToolEvent; key: number };

export function App() {
  const client = useMcpClient();
  const [view, setView] = useState<View>({ kind: "idle" });
  const [transcript, setTranscript] = useState<ToolEvent[]>([]);
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Push-to-talk listening state, kept in sync with `listen_state` SSE frames.
  const [listening, setListening] = useState(false);
  const [listenMode, setListenMode] = useState("always_on");

  const htmlCache = useRef<Map<string, string>>(new Map());
  const clientRef = useRef(client);
  clientRef.current = client;

  // Tracks a phone-initiated call so we can ignore its SSE echo (the widget
  // already updated in place via callServerTool's return value).
  const localCall = useRef<{ tool: string; until: number } | null>(null);

  // Default (neutral) theme until a game-specific tool reveals the active game.
  useEffect(() => {
    applyTheme("default");
  }, []);

  // Seed the listen toggle from the server's current state on load.
  useEffect(() => {
    let active = true;
    fetch(withKey(`${SERVER_BASE}/listen-mode`))
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (!active || !s) return;
        if (typeof s.enabled === "boolean") setListening(s.enabled);
        if (typeof s.mode === "string") setListenMode(s.mode);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const onEvent = useCallback((evt: ToolEvent) => {
    // Game-driven theming: a game-specific tool (roll_wrm, show_character_sheet, …) switches
    // the companion's palette to that game. Game-agnostic tools/transcript leave it unchanged.
    const game = gameForTool(evt.toolName);
    if (game) applyTheme(game);
    if (evt.type === "transcript") {
      // Independent of the widget/choice/idle view machine — just append to the log,
      // so a spoken line never disturbs the widget currently on screen.
      setTranscript((prev) => [...prev, evt].slice(-MAX_TRANSCRIPT_LINES));
      return;
    }
    if (evt.type === "listen_state") {
      if (typeof evt.enabled === "boolean") setListening(evt.enabled);
      if (typeof evt.mode === "string") setListenMode(evt.mode);
      return;
    }
    if (evt.type === "session_clear") {
      // Reachy is forgetting the conversation — clear the local log to match.
      setTranscript([]);
      return;
    }
    if (evt.type === "choice_prompt") {
      setView({ kind: "choice", event: evt, key: evt.seq });
      return;
    }
    // tool_result
    const lc = localCall.current;
    if (lc && lc.tool === evt.toolName && Date.now() < lc.until) {
      localCall.current = null; // consume the echo; widget already animated
      return;
    }
    setView({ kind: "widget", event: evt, key: evt.seq });
  }, []);

  useToolEvents(onEvent);

  // Load (and cache) the widget HTML for the current view.
  useEffect(() => {
    if (view.kind !== "widget" || !view.event.resourceUri) return;
    const uri = view.event.resourceUri;
    const cached = htmlCache.current.get(uri);
    if (cached) {
      setHtml(cached);
      return;
    }
    setHtml(null);
    let active = true;
    fetch(widgetUrl(uri))
      .then((r) => {
        if (!r.ok) throw new Error(`widget ${uri}: ${r.status}`);
        return r.text();
      })
      .then((h) => {
        htmlCache.current.set(uri, h);
        if (active) setHtml(h);
      })
      .catch((e) => active && setErr(String(e)));
    return () => {
      active = false;
    };
  }, [view]);

  const handleCallTool = useCallback(
    async (params: CallToolRequest["params"]): Promise<CallToolResult> => {
      localCall.current = { tool: params.name, until: Date.now() + 2500 };
      const c = clientRef.current;
      if (!c) throw new Error("MCP client not connected");
      return (await c.callTool(params)) as CallToolResult;
    },
    [],
  );

  const sandboxUrl = new URL("/sandbox_proxy.html", window.location.origin);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        boxSizing: "border-box",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 10px",
          color: "var(--fg)",
          fontFamily: "var(--font)",
          fontSize: 12,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span>REACHY-DM · companion</span>
        <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ControlBar
            listening={listening}
            mode={listenMode}
            onClearTranscript={() => setTranscript([])}
          />
          <span style={{ opacity: 0.7 }}>{client ? "● live" : "○ connecting…"}</span>
        </span>
      </header>

      {err && (
        <div style={{ color: "#ff6b6b", fontFamily: "monospace", padding: 12, fontSize: 12 }}>
          {err}
        </div>
      )}

      <main style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {view.kind === "idle" && (
          <div
            style={{
              height: "100%",
              display: "grid",
              placeItems: "center",
              color: "var(--fg)",
              fontFamily: "var(--font)",
              opacity: 0.6,
              textAlign: "center",
              padding: 24,
            }}
          >
            Waiting for the Dungeon Master…
            <br />
            (roll dice, show a character, or present a choice)
          </div>
        )}

        {view.kind === "choice" && <ChoiceCard event={view.event} />}

        {view.kind === "widget" &&
          (html ? (
            <AppRenderer
              key={view.key}
              client={client ?? undefined}
              toolName={view.event.toolName}
              html={html}
              sandbox={{ url: sandboxUrl }}
              toolInput={view.event.arguments}
              toolResult={{
                content: view.event.content ?? [],
                structuredContent: view.event.structuredContent,
              }}
              hostContext={{ theme: "dark" }}
              onCallTool={handleCallTool}
              onError={(e) => setErr(e.message)}
            />
          ) : (
            <div
              style={{
                height: "100%",
                display: "grid",
                placeItems: "center",
                color: "var(--fg)",
                fontFamily: "var(--font)",
              }}
            >
              Loading widget…
            </div>
          ))}
      </main>

      <TranscriptPanel lines={transcript} />
    </div>
  );
}
