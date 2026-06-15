import { useCallback, useEffect, useRef, useState } from "react";
import { AppRenderer } from "@mcp-ui/client";
import type { CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { useMcpClient } from "./mcpClient";
import { useToolEvents } from "./useToolEvents";
import { widgetUrl } from "./serverBase";
import { ChoiceCard } from "./ChoiceCard";
import type { ToolEvent } from "./types";

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
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const htmlCache = useRef<Map<string, string>>(new Map());
  const clientRef = useRef(client);
  clientRef.current = client;

  // Tracks a phone-initiated call so we can ignore its SSE echo (the widget
  // already updated in place via callServerTool's return value).
  const localCall = useRef<{ tool: string; until: number } | null>(null);

  const onEvent = useCallback((evt: ToolEvent) => {
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
        background: "#05140a",
        boxSizing: "border-box",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 10px",
          color: "#7CFC8A",
          fontFamily: "monospace",
          fontSize: 12,
          borderBottom: "1px solid #143a22",
        }}
      >
        <span>REACHY-DM · companion</span>
        <span style={{ opacity: 0.7 }}>{client ? "● live" : "○ connecting…"}</span>
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
              color: "#7CFC8A",
              fontFamily: "monospace",
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
                color: "#7CFC8A",
                fontFamily: "monospace",
              }}
            >
              Loading widget…
            </div>
          ))}
      </main>
    </div>
  );
}
