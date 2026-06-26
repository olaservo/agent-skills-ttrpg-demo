import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/** Mirrors the server's `ToolEvent` (fallout-helper/events.ts), as JSON over SSE. */
export interface ToolEvent {
  type: "tool_result" | "choice_prompt" | "transcript";
  seq: number;
  ts: number;
  toolName: string;
  resourceUri?: string;
  arguments?: Record<string, unknown>;
  structuredContent?: Record<string, unknown>;
  content?: CallToolResult["content"];
  // choice_prompt extras:
  prompt?: string;
  options?: Array<{ id: string; label: string; description?: string }>;
  // transcript extras:
  /** `assistant` = the DM (narration / character voice), `user` = the player. */
  role?: "user" | "assistant";
  /** The spoken/transcribed text. */
  text?: string;
  /** Character voice id for `assistant` lines spoken via `speak_as`. */
  voice?: string;
}
