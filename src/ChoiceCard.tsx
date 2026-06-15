import type { ToolEvent } from "./types";

/**
 * present_player_choice has no widget — it's an MCP elicitation answered by the
 * DM host (Codex terminal / out loud). The phone DISPLAYS the pending choice
 * for the table; it does not answer it.
 */
export function ChoiceCard({ event }: { event: ToolEvent }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 20,
        boxSizing: "border-box",
        color: "#7CFC8A",
        fontFamily: "'Courier New', monospace",
        background: "radial-gradient(circle at 50% 0%, #0b2a16 0%, #05140a 70%)",
        overflowY: "auto",
      }}
    >
      <div style={{ fontSize: 12, letterSpacing: 2, opacity: 0.7 }}>▸ PLAYER CHOICE</div>
      <div style={{ fontSize: 20, lineHeight: 1.4, textShadow: "0 0 8px #2f8" }}>
        {event.prompt}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        {(event.options ?? []).map((o, i) => (
          <div
            key={o.id}
            style={{
              border: "1px solid #2f8a4a",
              borderRadius: 10,
              padding: "12px 14px",
              background: "rgba(47,138,74,0.08)",
            }}
          >
            <div style={{ fontWeight: 700 }}>
              {i + 1}. {o.label}
            </div>
            {o.description && (
              <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>{o.description}</div>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: "auto", fontSize: 11, opacity: 0.5 }}>
        Tell the DM your choice…
      </div>
    </div>
  );
}
