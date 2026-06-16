import { useEffect, useRef } from "react";
import type { ToolEvent } from "./types";

/**
 * Always-on conversation log: the DM's spoken lines (narration + `speak_as` character
 * voices) and the player's transcribed speech, streamed live from the server's SSE
 * `transcript` events. Sits below the widget area so speech is visible while dice /
 * character / choice widgets come and go. Pip-Boy green-on-dark, auto-scrolls to newest.
 */
export function TranscriptPanel({ lines }: { lines: ToolEvent[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the newest line in view as it streams in.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines.length]);

  return (
    <aside
      style={{
        height: "35%",
        minHeight: 96,
        display: "flex",
        flexDirection: "column",
        borderTop: "1px solid #143a22",
        background: "#040f08",
        color: "#7CFC8A",
        fontFamily: "monospace",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          padding: "4px 10px",
          fontSize: 11,
          letterSpacing: 1,
          opacity: 0.55,
          borderBottom: "1px solid #0d2616",
          flex: "0 0 auto",
        }}
      >
        TRANSCRIPT
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 10px" }}>
        {lines.length === 0 ? (
          <div style={{ opacity: 0.4, fontSize: 12 }}>(listening…)</div>
        ) : (
          lines.map((l) => <TranscriptLine key={l.seq} line={l} />)
        )}
        <div ref={endRef} />
      </div>
    </aside>
  );
}

function TranscriptLine({ line }: { line: ToolEvent }) {
  const isPlayer = line.role === "user";
  // DM lines tag with the character voice when spoken via speak_as, else "DM".
  const tag = isPlayer ? "PLAYER" : (line.voice || "DM").toUpperCase();
  const tagColor = isPlayer ? "#5ad1ff" : "#7CFC8A";

  return (
    <div style={{ marginBottom: 8, lineHeight: 1.4 }}>
      <span style={{ fontSize: 10, opacity: 0.7, color: tagColor, marginRight: 6 }}>
        {tag}
      </span>
      <span style={{ fontSize: 14, color: isPlayer ? "#b8f0c4" : "#dffbe6" }}>
        {line.text}
      </span>
    </div>
  );
}
