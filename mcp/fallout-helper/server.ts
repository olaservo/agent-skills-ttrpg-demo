import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { formatHuman, rollTest } from "./dice/roll.js";

// Works both from source (server.ts) and compiled (dist/server.js).
const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

const DICE_UI_URI = "ui://fallout-helper/dice-roll.html";
const SHEET_UI_URI = "ui://fallout-helper/character-sheet.html";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Fallout TTRPG Helper",
    version: "0.1.0",
  });

  // ── Tool: roll_dice ────────────────────────────────────────────────────
  registerAppTool(
    server,
    "roll_dice",
    {
      title: "Roll Fallout Dice",
      description:
        "Roll a Fallout 2d20 skill test (Modiphius system). " +
        "target = attribute + skill, difficulty = successes needed. " +
        "Use numDice=1 for assistance / group-helper rolls.",
      inputSchema: {
        target: z
          .number()
          .int()
          .min(1)
          .max(20)
          .describe("Target number = attribute + skill. Each d20 must roll <= this for a success."),
        difficulty: z
          .number()
          .int()
          .min(0)
          .max(5)
          .describe("Number of successes required to pass (0-5)."),
        numDice: z
          .number()
          .int()
          .min(1)
          .max(5)
          .default(2)
          .describe("Dice pool size. Default 2; up to 5 with bought d20s; 1 for assist/group-helper."),
        complicationRange: z
          .number()
          .int()
          .min(1)
          .max(5)
          .default(1)
          .describe("Complication range. 1 = only on a 20, 5 = on 16-20."),
        seed: z.number().int().optional().describe("Optional RNG seed for reproducible rolls."),
      },
      outputSchema: {
        target: z.number(),
        difficulty: z.number(),
        numDice: z.number(),
        complicationRange: z.number(),
        rolls: z.array(z.number()),
        annotated: z.array(
          z.object({
            die: z.number(),
            tags: z.array(z.string()),
          }),
        ),
        successes: z.number(),
        crits: z.number(),
        complications: z.number(),
        passed: z.boolean(),
        apGenerated: z.number(),
      },
      _meta: { ui: { resourceUri: DICE_UI_URI } },
    },
    async (args): Promise<CallToolResult> => {
      const result = rollTest(args);
      // Per MCP Apps spec (apps.mdx §1697): `content` enters the model's
      // conversation context; `structuredContent` is delivered only to the
      // UI iframe. Anything the agent needs to reason about must be in
      // `content`. The UI consumes `structuredContent` directly to drive
      // the dice animation and per-die tag classes.
      return {
        content: [{ type: "text", text: formatHuman(result) }],
        structuredContent: result as unknown as { [key: string]: unknown },
      };
    },
  );

  // ── Tool: show_character_sheet ─────────────────────────────────────────
  registerAppTool(
    server,
    "show_character_sheet",
    {
      title: "Show Character Sheet",
      description:
        "Display a Fallout RPG character sheet (placeholder; full data model is TODO).",
      inputSchema: {
        characterId: z
          .string()
          .optional()
          .describe("Identifier for the character to display. Currently ignored — placeholder UI."),
      },
      outputSchema: {
        characterId: z.string(),
        todo: z.string(),
      },
      _meta: { ui: { resourceUri: SHEET_UI_URI } },
    },
    async (args): Promise<CallToolResult> => {
      const placeholder = {
        characterId: args.characterId ?? "vault-dweller-001",
        todo: "Character sheet schema not yet implemented.",
      };
      return {
        content: [
          {
            type: "text",
            text: "Character sheet rendering is a placeholder; data model is TODO.",
          },
        ],
        structuredContent: placeholder,
      };
    },
  );

  // ── Resource: dice-roll UI ─────────────────────────────────────────────
  registerAppResource(
    server,
    DICE_UI_URI,
    DICE_UI_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(path.join(DIST_DIR, "dice-roll.html"), "utf-8");
      return {
        contents: [
          {
            uri: DICE_UI_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            // The Pip-Boy UI ships its own CRT chrome — opt out of host border.
            _meta: { ui: { prefersBorder: false } },
          },
        ],
      };
    },
  );

  // ── Resource: character-sheet UI ───────────────────────────────────────
  registerAppResource(
    server,
    SHEET_UI_URI,
    SHEET_UI_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(path.join(DIST_DIR, "character-sheet.html"), "utf-8");
      return {
        contents: [
          {
            uri: SHEET_UI_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: { ui: { prefersBorder: false } },
          },
        ],
      };
    },
  );

  return server;
}
