import { useEffect, useRef } from "react";
import type { ToolEvent } from "./types";

/** How close to the bottom (px) still counts as "following" the newest line. */
const STICK_THRESHOLD = 24;

/**
 * Always-on conversation log: the DM's spoken lines (narration + `speak_as` character
 * voices) and the player's transcribed speech, streamed live from the server's SSE
 * `transcript` events. Sits below the widget area so speech is visible while dice /
 * character / choice widgets come and go. Pip-Boy green-on-dark. As lines stream in it
 * follows the newest only while you're already at the bottom (scrolling its own box, not
 * the page); scroll up to read history and your position is left alone.
 */
export function TranscriptPanel({ lines }: { lines: ToolEvent[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Whether to keep following the newest line. Stays true until the user scrolls up.
  const stickToBottom = useRef(true);

  // Follow the newest line as it streams in — but only by scrolling this panel's own
  // container (never scrollIntoView, which would drag the whole page), and only when the
  // user hasn't scrolled up to read earlier lines.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD;
  };

  return (
    <aside
      style={{
        height: "35%",
        minHeight: 96,
        display: "flex",
        flexDirection: "column",
        borderTop: "1px solid var(--border)",
        background: "var(--panel)",
        color: "var(--fg)",
        fontFamily: "var(--font)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          padding: "4px 10px",
          fontSize: 11,
          letterSpacing: 1,
          opacity: 0.55,
          borderBottom: "1px solid var(--border-soft)",
          flex: "0 0 auto",
        }}
      >
        TRANSCRIPT
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 10px" }}
      >
        {lines.length === 0 ? (
          <div style={{ opacity: 0.4, fontSize: 12 }}>(listening…)</div>
        ) : (
          lines.map((l) => <TranscriptLine key={l.seq} line={l} />)
        )}
      </div>
    </aside>
  );
}

function TranscriptLine({ line }: { line: ToolEvent }) {
  const isPlayer = line.role === "user";
  // DM lines tag with the character voice when spoken via speak_as, else "DM".
  const tag = isPlayer ? "PLAYER" : (line.voice || "DM").toUpperCase();
  const tagColor = isPlayer ? "var(--player)" : "var(--fg)";

  return (
    <div style={{ marginBottom: 8, lineHeight: 1.4 }}>
      <span style={{ fontSize: 10, opacity: 0.7, color: tagColor, marginRight: 6 }}>
        {tag}
      </span>
      <span style={{ fontSize: 14, color: isPlayer ? "var(--player-text)" : "var(--dm-text)" }}>
        {line.text}
      </span>
    </div>
  );
}
