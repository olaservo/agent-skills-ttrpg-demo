import { useCallback, useState } from "react";
import { SERVER_BASE, withKey } from "./serverBase";

/**
 * Header controls for the companion: a push-to-talk listen toggle and a
 * clear-chat button. Both POST to the Node server, which relays to Reachy over
 * the /events SSE bus. The toggle's visual state is driven by `listening` (kept
 * in sync with `listen_state` SSE frames by App.tsx); in always_on mode the
 * toggle is shown as a passive "always on" badge.
 */
export function ControlBar({
  listening,
  mode,
  onClearTranscript,
}: {
  listening: boolean;
  mode: string;
  onClearTranscript: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const pushToTalk = mode === "push_to_talk";

  const post = useCallback(async (path: string, body?: unknown) => {
    const res = await fetch(withKey(`${SERVER_BASE}${path}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
  }, []);

  const toggleListen = useCallback(async () => {
    if (!pushToTalk || busy) return;
    setBusy(true);
    try {
      await post("/listen-mode", { enabled: !listening, mode: "push_to_talk" });
    } catch {
      /* surfaced by the SSE state staying put; ignore here */
    } finally {
      setBusy(false);
    }
  }, [pushToTalk, busy, listening, post]);

  const clearSession = useCallback(async () => {
    if (busy) return;
    if (!window.confirm("Clear the chat session? Reachy will forget the conversation.")) return;
    setBusy(true);
    try {
      await post("/clear-session");
      onClearTranscript();
    } catch {
      /* ignore; transcript clear is local */
    } finally {
      setBusy(false);
    }
  }, [busy, post, onClearTranscript]);

  const btn: React.CSSProperties = {
    font: "inherit",
    fontSize: 11,
    color: "var(--fg)",
    background: "transparent",
    border: "1px solid var(--border)",
    borderRadius: 4,
    padding: "2px 8px",
    cursor: "pointer",
    opacity: busy ? 0.5 : 1,
  };

  return (
    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {pushToTalk ? (
        <button
          type="button"
          onClick={toggleListen}
          disabled={busy}
          aria-pressed={listening}
          title="Toggle whether Reachy is listening"
          style={{
            ...btn,
            borderColor: listening ? "var(--fg)" : "var(--border)",
            opacity: busy ? 0.5 : listening ? 1 : 0.7,
          }}
        >
          {listening ? "🎙 listening" : "🔇 muted"}
        </button>
      ) : (
        <span style={{ opacity: 0.6, fontSize: 11 }} title="Listening is always on">
          🎙 always on
        </span>
      )}
      <button type="button" onClick={clearSession} disabled={busy} title="Clear the chat session" style={btn}>
        ⟳ clear chat
      </button>
    </span>
  );
}
