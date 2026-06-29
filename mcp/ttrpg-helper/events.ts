/**
 * @file Module-level broadcast bus for tool activity.
 *
 * `main.ts` builds a fresh, stateless `McpServer` per `/mcp` request
 * (`sessionIdGenerator: undefined`), so per-call state can't live on the server
 * instance. This module is the single shared bus: tool handlers call
 * `publishToolEvent(...)`, and every connected SSE subscriber (e.g. the phone
 * companion UI) receives it. One process, one bus, many screens.
 */
import type { Response } from "express";

export interface ToolEvent {
  /**
   * `tool_result` carries a widget payload; `choice_prompt` is a no-widget elicitation
   * surfaced for display; `transcript` is a spoken/heard line for the live conversation log;
   * `listen_state` relays the push-to-talk listening state (companion toggle <-> Reachy);
   * `session_clear` asks Reachy to forget the conversation and start fresh.
   */
  type: "tool_result" | "choice_prompt" | "transcript" | "listen_state" | "session_clear";
  /** Monotonic per-process sequence — the UI uses it as a React key to force a fresh widget per call. */
  seq: number;
  ts: number;
  toolName: string;
  /** `ui://…` resource for the widget to render (tool_result only). */
  resourceUri?: string;
  /** The tool-call arguments (drives e.g. the dice tray skeleton via ontoolinput). */
  arguments?: unknown;
  /** Delivered to the widget iframe as the tool result. */
  structuredContent?: unknown;
  content?: unknown;
  // choice_prompt extras:
  prompt?: string;
  options?: unknown;
  // transcript extras:
  /** Who spoke: `assistant` = the DM (narration or a character voice), `user` = the player. */
  role?: "user" | "assistant";
  /** The spoken/transcribed text. */
  text?: string;
  /** For `assistant` lines spoken via `speak_as`, the character voice id. */
  voice?: string;
  // listen_state extras:
  /** Whether Reachy should be listening (push-to-talk latch on). */
  enabled?: boolean;
  /** Listening mode: "always_on" | "push_to_talk". */
  mode?: string;
}

const subscribers = new Set<Response>();
let seq = 0;

export function addSubscriber(res: Response): void {
  subscribers.add(res);
}

export function removeSubscriber(res: Response): void {
  subscribers.delete(res);
}

/** Broadcast an event to all subscribers. Returns the stamped event. */
export function publishToolEvent(evt: Omit<ToolEvent, "seq" | "ts">): ToolEvent {
  const full: ToolEvent = { ...evt, seq: ++seq, ts: Date.now() };
  const payload = `data: ${JSON.stringify(full)}\n\n`;
  for (const res of subscribers) {
    try {
      res.write(payload);
    } catch {
      subscribers.delete(res);
    }
  }
  return full;
}

export function subscriberCount(): number {
  return subscribers.size;
}

/**
 * Broadcast a spoken/heard line to all subscribers (e.g. the companion transcript panel).
 * `role` is `assistant` for the DM (narration or a `speak_as` character voice) or `user`
 * for the player's transcribed speech; `voice` is the character voice id when present.
 */
export function publishTranscript(
  role: "user" | "assistant",
  text: string,
  voice?: string,
): ToolEvent {
  return publishToolEvent({ type: "transcript", toolName: "transcript", role, text, voice });
}

/**
 * Push-to-talk listening state, shared between the companion UI toggle and Reachy.
 * Held in memory so late/reconnecting subscribers (the freshly loaded UI, and Reachy's
 * SSE listener after a reconnect) can sync via GET /listen-mode.
 */
// Passive default until Reachy reports its actual mode on connect.
const listenState: { enabled: boolean; mode: string } = { enabled: false, mode: "always_on" };

export function getListenState(): { enabled: boolean; mode: string } {
  return { ...listenState };
}

/** Update and broadcast the push-to-talk listening state. */
export function publishListenState(enabled?: boolean, mode?: string): ToolEvent {
  if (typeof enabled === "boolean") listenState.enabled = enabled;
  if (typeof mode === "string" && mode) listenState.mode = mode;
  return publishToolEvent({
    type: "listen_state",
    toolName: "listen_state",
    enabled: listenState.enabled,
    mode: listenState.mode,
  });
}

/** Ask Reachy to forget the current conversation and start a fresh session. */
export function publishSessionClear(): ToolEvent {
  return publishToolEvent({ type: "session_clear", toolName: "session_clear" });
}
