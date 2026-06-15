import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/** Mirrors the server's `ToolEvent` (fallout-helper/events.ts), as JSON over SSE. */
export interface ToolEvent {
  type: "tool_result" | "choice_prompt";
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
}
