import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import {
  discoverSkills,
  registerSkillResources,
  SKILLS_EXTENSION,
} from "@olaservo/ext-skills/server";
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

// Skills live at mcp/fallout-helper/skills/. In dev (server.ts) that's a
// sibling of this file; in prod (dist/server.js) it's one level up.
const SKILLS_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "skills")
  : path.join(import.meta.dirname, "..", "skills");

const DICE_UI_URI = "ui://fallout-helper/dice-roll.html";
const SHEET_UI_URI = "ui://fallout-helper/character-sheet.html";

export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: "Fallout TTRPG Helper",
      version: "0.1.0",
    },
    {
      capabilities: {
        resources: {},
        // SEP-2640 §Capability Declaration
        extensions: { [SKILLS_EXTENSION]: {} },
      },
    },
  );

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

  // ── Tool: present_player_choice ────────────────────────────────────────
  // No UI iframe: elicitation forms are rendered by the *client*. So we
  // register with the plain McpServer API rather than registerAppTool
  // (which mandates a `_meta.ui.resourceUri` pointing at a UI resource).
  server.registerTool(
    "present_player_choice",
    {
      title: "Ask the Player to Choose",
      description:
        "Pause the game and surface a story decision to the human player as a structured " +
        "form. The host renders the options and blocks until the player picks one. Use this " +
        "at meaningful narrative branches (e.g. sneak vs. parley vs. assault) — not for " +
        "mechanical outcomes (those are skill tests via roll_dice), pure flavor beats, or " +
        "fully open 'what do you do?' prompts.",
      inputSchema: {
        prompt: z
          .string()
          .min(1)
          .describe(
            "Narrative framing shown to the player, e.g. 'Pierce and Macey are pinned. How do you approach the bunker?'",
          ),
        options: z
          .array(
            z.object({
              id: z.string().min(1).describe("Stable short id, e.g. 'sneak'."),
              label: z.string().min(1).describe("Human-readable label shown in the picker."),
              description: z
                .string()
                .optional()
                .describe("One-line elaboration of the option's consequences or feel."),
            }),
          )
          .min(2)
          .max(6)
          .describe("2–6 mutually-exclusive options for the player to choose from."),
        allowFreeText: z
          .boolean()
          .default(true)
          .describe(
            "If true, the form includes an optional free-text field so the player can elaborate or propose something off-menu.",
          ),
      },
      outputSchema: {
        action: z.enum(["accept", "decline", "cancel"]),
        chosenId: z.string().optional(),
        chosenLabel: z.string().optional(),
        elaboration: z.string().optional(),
      },
    },
    async (args): Promise<CallToolResult> => {
      const { prompt, options, allowFreeText } = args;

      // Reject duplicate ids early — enum values must be unique.
      const ids = options.map((o) => o.id);
      if (new Set(ids).size !== ids.length) {
        return {
          content: [
            { type: "text", text: "present_player_choice: option ids must be unique." },
          ],
          isError: true,
        };
      }

      const optionsList = options
        .map((o) => `• ${o.label}${o.description ? ` — ${o.description}` : ""}`)
        .join("\n");
      const message = `${prompt}\n\nOptions:\n${optionsList}`;

      const choiceSchema = {
        type: "string" as const,
        title: "Your choice",
        enum: ids,
        enumNames: options.map((o) => o.label),
      };
      const elaborationSchema = {
        type: "string" as const,
        title: "Anything to add? (optional)",
        description: "Free-form elaboration, or propose something off-menu.",
      };

      try {
        const result = await server.server.elicitInput({
          message,
          requestedSchema: {
            type: "object",
            properties: allowFreeText
              ? { choice: choiceSchema, elaboration: elaborationSchema }
              : { choice: choiceSchema },
            required: ["choice"],
          },
        });

        if (result.action === "accept" && result.content) {
          const chosenId = result.content.choice as string;
          const chosenOption = options.find((o) => o.id === chosenId);
          const chosenLabel = chosenOption?.label ?? chosenId;
          const elaboration =
            typeof result.content.elaboration === "string" && result.content.elaboration.length > 0
              ? result.content.elaboration
              : undefined;

          const text = elaboration
            ? `Player chose: ${chosenLabel}\n\nElaboration: ${elaboration}`
            : `Player chose: ${chosenLabel}`;

          return {
            content: [{ type: "text", text }],
            structuredContent: {
              action: "accept",
              chosenId,
              chosenLabel,
              ...(elaboration ? { elaboration } : {}),
            },
          };
        }

        // decline or cancel — no content
        const text =
          result.action === "decline"
            ? "Player declined to commit to one of the options. Don't railroad — narrate a beat that gives them space, then offer a refined choice."
            : "Player dismissed the choice. Don't railroad — revisit the moment with the player.";
        return {
          content: [{ type: "text", text }],
          structuredContent: { action: result.action },
        };
      } catch (error) {
        // Most likely cause: the connected client doesn't advertise the
        // `elicitation` capability. Fall back to inline questioning.
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text:
                `present_player_choice failed (${msg}). The connected client may not support ` +
                `MCP elicitation. Ask the player inline in chat instead, listing the options.`,
            },
          ],
          isError: true,
        };
      }
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

  // ── Resources: Fallout skills (SEP-2640) ───────────────────────────────
  // Serves fallout-rpg, fallout-machine-frequency, fallout-character-sheets
  // from ./skills/ as skill:// resources. Also registers skill://index.json
  // and per-skill resource templates for supporting files.
  const skillMap = discoverSkills(SKILLS_DIR);
  registerSkillResources(server, skillMap, SKILLS_DIR);

  return server;
}
