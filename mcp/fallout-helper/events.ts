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
  /** `tool_result` carries a widget payload; `choice_prompt` is a no-widget elicitation surfaced for display. */
  type: "tool_result" | "choice_prompt";
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
