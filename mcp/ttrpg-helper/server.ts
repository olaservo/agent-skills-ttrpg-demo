import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import {
  declareSkillsExtension,
  discoverSkills,
  registerSkillResources,
} from "@olaservo/ext-skills/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { parseCharacterSheet } from "./character-parser.js";
import { parseWrmCharacterSheet } from "./wrm-character-parser.js";
import { formatHuman, rollTest } from "./dice/roll.js";
import { formatHumanWrm, rollWrm } from "./dice/wrm-roll.js";
import { publishToolEvent } from "./events.js";

// Works both from source (server.ts) and compiled (dist/server.js).
const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

// Skills live at mcp/ttrpg-helper/skills/. In dev (server.ts) that's a
// sibling of this file; in prod (dist/server.js) it's one level up.
const SKILLS_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "skills")
  : path.join(import.meta.dirname, "..", "skills");

const DICE_UI_URI = "ui://ttrpg-helper/dice-roll.html";
const SHEET_UI_URI = "ui://ttrpg-helper/character-sheet.html";
const WRM_DICE_UI_URI = "ui://ttrpg-helper/wrm-dice.html";
const WRM_DICE_3D_UI_URI = "ui://ttrpg-helper/wrm-dice-3d.html";
const WRM_SHEET_UI_URI = "ui://ttrpg-helper/wrm-sheet.html";

// Which dice widget roll_wrm drives. The 2D parchment tray is the shipping
// default; set WRM_DICE_3D=1 to A/B the experimental Three.js tray. Both
// resources are always registered — only the tool's pointer flips.
const WRM_DICE_ACTIVE_URI = process.env.WRM_DICE_3D ? WRM_DICE_3D_UI_URI : WRM_DICE_UI_URI;

// Slug -> reference filename. Slugs are stable IDs the agent passes to
// `show_character_sheet`; the numeric prefix on disk just orders the roster.
const CHARACTERS = {
  "augusta-byron": "01-augusta-byron.md",
  "tommy-doyle": "02-happy-tommy-doyle.md",
  "bailey-bigsmile": "03-bailey-bigsmile.md",
  "old-tallman": "04-old-tallman.md",
  "hazel-johnson": "05-hazel-johnson.md",
  marvin: "06-marvin.md",
} as const;
type CharacterId = keyof typeof CHARACTERS;
const CHARACTER_IDS = Object.keys(CHARACTERS) as [CharacterId, ...CharacterId[]];
const CHARACTER_SHEETS_DIR = "fallout-ttrpg/fallout-character-sheets/references";

// Warrior, Rogue & Mage pregens — slug -> reference filename. Distinct roster
// from the Fallout one; the numeric prefix on disk orders the party.
const WRM_CHARACTERS = {
  "brannic-caldermoor": "01-brannic-caldermoor.md",
  "pip-underbough": "02-pip-underbough.md",
  "lyrandel-mistweaver": "03-lyrandel-mistweaver.md",
  "durga-ironhand": "04-durga-ironhand.md",
  "vashk-bloodmane": "05-vashk-bloodmane.md",
  "aurelia-vane": "06-aurelia-vane.md",
} as const;
type WrmCharacterId = keyof typeof WRM_CHARACTERS;
const WRM_CHARACTER_IDS = Object.keys(WRM_CHARACTERS) as [WrmCharacterId, ...WrmCharacterId[]];
const WRM_CHARACTER_SHEETS_DIR = "wrm-ttrpg/wrm-character-sheets/references";

/** A tool a skill declares it needs, under `metadata.tools` in its SKILL.md. */
interface SkillToolDeclaration {
  name: string;
  purpose?: string;
  ui_resource?: string;
}

/**
 * Cross-check every skill's `metadata.tools` declaration against the set of
 * tools the server actually registers, logging a warning for any declared tool
 * the server does not provide (typo, renamed/removed tool, wrong server). The
 * declaration itself flows to hosts via `skill://index.json`; this guards drift
 * between what a skillbook asks to load and what this server can supply.
 * Returns the list of problem messages (also used in tests).
 */
export function validateSkillToolDeclarations(
  skillMap: ReturnType<typeof discoverSkills>,
  registeredToolNames: ReadonlySet<string>,
): string[] {
  const problems: string[] = [];
  for (const skill of skillMap.values()) {
    const metadata = skill.frontmatter.metadata as { tools?: unknown } | undefined;
    const tools = metadata?.tools;
    if (!Array.isArray(tools)) continue;
    for (const entry of tools as Array<string | SkillToolDeclaration>) {
      const name = typeof entry === "string" ? entry : entry?.name;
      if (typeof name !== "string" || !name) continue;
      if (!registeredToolNames.has(name)) {
        const msg =
          `[skills] Skill "${skill.name}" declares tool "${name}" in metadata.tools, but this ` +
          `server registers no such tool. Registered: ${[...registeredToolNames].sort().join(", ")}`;
        console.error(msg);
        problems.push(msg);
      }
    }
  }
  return problems;
}

export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: "Fallout TTRPG Helper",
      version: "0.1.0",
    },
    {
      capabilities: {
        resources: {},
      },
    },
  );

  // SEP-2640 §Capability Declaration. Must run before server.connect().
  // directoryRead: we implement resources/directory/read so skill references +
  // voices.json travel on install (not just SKILL.md). Requires ext-skills >= 0.11.0.
  declareSkillsExtension(server.server, { directoryRead: true });

  // Names of every tool we register, so we can validate each skill's
  // `metadata.tools` declaration against what the server actually provides.
  const registeredToolNames = new Set<string>();

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
      const content = [{ type: "text" as const, text: formatHuman(result) }];
      // Broadcast to companion screens (e.g. the phone UI) so the dice
      // widget renders live the moment the DM rolls.
      publishToolEvent({
        type: "tool_result",
        toolName: "roll_dice",
        resourceUri: DICE_UI_URI,
        arguments: args,
        structuredContent: result,
        content,
      });
      return {
        content,
        structuredContent: result as unknown as { [key: string]: unknown },
      };
    },
  );
  registeredToolNames.add("roll_dice");

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

      // Surface the pending choice on companion screens *before* elicitInput
      // blocks. The phone shows it for the table; the player still answers via
      // the host's elicitation (Codex terminal / out loud), not the phone.
      publishToolEvent({
        type: "choice_prompt",
        toolName: "present_player_choice",
        prompt,
        options,
      });

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
        const result = await server.server.elicitInput(
          {
            message,
            requestedSchema: {
              type: "object",
              properties: allowFreeText
                ? { choice: choiceSchema, elaboration: elaborationSchema }
                : { choice: choiceSchema },
              required: ["choice"],
            },
          },
          {
            // Tabletop players deliberate — give them 10 minutes before the
            // choice times out (SDK default is only 60s) and falls back to inline.
            timeout: 600_000,
          },
        );

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
  registeredToolNames.add("present_player_choice");

  // ── Tool: show_character_sheet ─────────────────────────────────────────
  registerAppTool(
    server,
    "show_character_sheet",
    {
      title: "Show Character Sheet",
      description:
        "Display a Fallout RPG pregen character sheet in the Pip-Boy UI. " +
        "Available characters: augusta-byron (Vault Dweller scientist, L1), " +
        "tommy-doyle ('Happy' Tommy Doyle — Survivor gambler, L2), " +
        "bailey-bigsmile (Ghoul wanderer, L3), " +
        "old-tallman (Super Mutant philosopher, L2), " +
        "hazel-johnson (Brotherhood Field Scribe, L1), " +
        "marvin (Mister Handy robot, L2).",
      inputSchema: {
        characterId: z
          .enum(CHARACTER_IDS)
          .describe("Slug of the pregen to display (one of the six available IDs)."),
      },
      outputSchema: {
        characterId: z.string(),
        name: z.string(),
        origin: z.string(),
        level: z.number().int(),
        luckPoints: z.number().int(),
        maxHP: z.number().int(),
        special: z.object({
          str: z.number().int(),
          per: z.number().int(),
          end: z.number().int(),
          cha: z.number().int(),
          int: z.number().int(),
          agi: z.number().int(),
          luk: z.number().int(),
        }),
        markdown: z.string(),
      },
      _meta: { ui: { resourceUri: SHEET_UI_URI } },
    },
    async (args): Promise<CallToolResult> => {
      const characterId = args.characterId as CharacterId;
      const filename = CHARACTERS[characterId];
      const filePath = path.join(SKILLS_DIR, CHARACTER_SHEETS_DIR, filename);
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = parseCharacterSheet(raw);
      const structuredContent = { characterId, ...parsed };
      const content = [
        {
          type: "text" as const,
          text:
            `Loaded ${parsed.name} (${parsed.origin}, Level ${parsed.level}) into the Pip-Boy. ` +
            `S.P.E.C.I.A.L., skills, weapons, perks, hit-location HP, and inventory are visible to the player.`,
        },
      ];
      publishToolEvent({
        type: "tool_result",
        toolName: "show_character_sheet",
        resourceUri: SHEET_UI_URI,
        arguments: args,
        structuredContent,
        content,
      });
      return {
        content,
        structuredContent,
      };
    },
  );
  registeredToolNames.add("show_character_sheet");

  // ── Tool: roll_wrm ─────────────────────────────────────────────────────
  // Warrior, Rogue & Mage d6 system: 1d6 + attribute (+2 skill) vs a Difficulty
  // Level, with exploding 6s. A different system from roll_dice (Fallout 2d20),
  // so it is its own tool — and its own parchment-themed exploding-d6 widget.
  registerAppTool(
    server,
    "roll_wrm",
    {
      title: "Roll Warrior, Rogue & Mage Dice",
      description:
        "Roll a Warrior, Rogue & Mage check: 1d6 + attribute (+2 if a relevant skill applies) " +
        "vs a Difficulty Level, meet or beat. A 6 explodes (add 6 and roll again) when a skill " +
        "applies or when `explode` is set (e.g. damage rolls). Use rollMode 'advantage' for the " +
        "Exceptional Attribute racial talent (2d6 keep highest) and 'disadvantage' for No Talent " +
        "for Magic (2d6 keep lowest). This is NOT the Fallout 2d20 system — use roll_dice for that.",
      inputSchema: {
        attribute: z
          .number()
          .int()
          .min(0)
          .max(20)
          .describe("Attribute level (Warrior / Rogue / Mage). 0-6 for PCs; up to 20 for monsters/veterans."),
        difficulty: z
          .number()
          .int()
          .describe(
            "Difficulty Level to meet or beat (Easy 5, Routine 7, Challenging 9, Hard 11, Extreme 13), or a target's Defense for an attack.",
          ),
        skill: z
          .boolean()
          .default(false)
          .describe("A relevant skill is known: adds +2 and enables exploding 6s."),
        bonus: z
          .number()
          .int()
          .default(0)
          .describe("Extra circumstantial modifier (second skill, Champion, charge, racial, etc.)."),
        rollMode: z
          .enum(["normal", "advantage", "disadvantage"])
          .default("normal")
          .describe(
            "advantage = Exceptional Attribute racial (2d6 keep highest); disadvantage = No Talent for Magic (2d6 keep lowest).",
          ),
        explode: z
          .boolean()
          .optional()
          .describe("Override exploding (e.g. force on for a damage roll). Default: explodes iff `skill`."),
        seed: z.number().int().optional().describe("Optional RNG seed for reproducible rolls."),
      },
      outputSchema: {
        attribute: z.number(),
        skillBonus: z.number(),
        bonus: z.number(),
        difficulty: z.number(),
        rollMode: z.string(),
        explodeEnabled: z.boolean(),
        initialDice: z.array(z.number()),
        keptInitial: z.number(),
        explosions: z.array(z.number()),
        dieTotal: z.number(),
        exploded: z.boolean(),
        total: z.number(),
        passed: z.boolean(),
        margin: z.number(),
      },
      _meta: { ui: { resourceUri: WRM_DICE_ACTIVE_URI } },
    },
    async (args): Promise<CallToolResult> => {
      const result = rollWrm(args);
      const content = [{ type: "text" as const, text: formatHumanWrm(result) }];
      publishToolEvent({
        type: "tool_result",
        toolName: "roll_wrm",
        resourceUri: WRM_DICE_ACTIVE_URI,
        arguments: args,
        structuredContent: result,
        content,
      });
      return {
        content,
        structuredContent: result as unknown as { [key: string]: unknown },
      };
    },
  );
  registeredToolNames.add("roll_wrm");

  // ── Tool: show_wrm_character_sheet ─────────────────────────────────────
  // Loads a WR&M pregen sheet via its own parser (three attributes, formula
  // derived stats, no levels) — distinct from the Fallout S.P.E.C.I.A.L. sheet,
  // and rendered by its own parchment-themed sheet widget.
  registerAppTool(
    server,
    "show_wrm_character_sheet",
    {
      title: "Show Warrior, Rogue & Mage Character Sheet",
      description:
        "Load a Warrior, Rogue & Mage pregen sheet (attributes, derived stats, skills, talents, " +
        "weapons, spells, inventory, biography). Available: brannic-caldermoor (human knight), " +
        "pip-underbough (halfling burglar), lyrandel-mistweaver (elf mage), durga-ironhand " +
        "(dwarf defender), vashk-bloodmane (orc berserker), aurelia-vane (human cleric/spellblade).",
      inputSchema: {
        characterId: z
          .enum(WRM_CHARACTER_IDS)
          .describe("Slug of the pregen to load (one of the six available IDs)."),
      },
      outputSchema: {
        characterId: z.string(),
        name: z.string(),
        race: z.string(),
        concept: z.string(),
        attributes: z.object({
          warrior: z.number().int(),
          rogue: z.number().int(),
          mage: z.number().int(),
        }),
        hp: z.number().int(),
        mana: z.number().int(),
        fate: z.number().int(),
        defenseBase: z.number().int(),
        defense: z.number().int(),
        armorPenalty: z.number().int(),
        skills: z.array(z.string()),
        talents: z.array(z.string()),
        spells: z.array(z.string()),
        markdown: z.string(),
      },
      _meta: { ui: { resourceUri: WRM_SHEET_UI_URI } },
    },
    async (args): Promise<CallToolResult> => {
      const characterId = args.characterId as WrmCharacterId;
      const filename = WRM_CHARACTERS[characterId];
      const filePath = path.join(SKILLS_DIR, WRM_CHARACTER_SHEETS_DIR, filename);
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = parseWrmCharacterSheet(raw);
      const structuredContent = { characterId, ...parsed };
      const a = parsed.attributes;
      const content = [
        {
          type: "text" as const,
          text:
            `Loaded ${parsed.name} (${parsed.race}, ${parsed.concept}). ` +
            `Warrior ${a.warrior} / Rogue ${a.rogue} / Mage ${a.mage}; ` +
            `HP ${parsed.hp}, Mana ${parsed.mana}, Fate ${parsed.fate}, Defense ${parsed.defense}` +
            `${parsed.spells.length ? `; spells: ${parsed.spells.join(", ")}` : ""}.`,
        },
      ];
      publishToolEvent({
        type: "tool_result",
        toolName: "show_wrm_character_sheet",
        resourceUri: WRM_SHEET_UI_URI,
        arguments: args,
        structuredContent,
        content,
      });
      return { content, structuredContent };
    },
  );
  registeredToolNames.add("show_wrm_character_sheet");

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

  // ── Resource: WR&M dice UI ─────────────────────────────────────────────
  registerAppResource(
    server,
    WRM_DICE_UI_URI,
    WRM_DICE_UI_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(path.join(DIST_DIR, "wrm-dice.html"), "utf-8");
      return {
        contents: [
          {
            uri: WRM_DICE_UI_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            // The widget ships its own parchment chrome — opt out of host border.
            _meta: { ui: { prefersBorder: false } },
          },
        ],
      };
    },
  );

  // ── Resource: WR&M 3D dice UI (experimental Three.js tray) ─────────────
  registerAppResource(
    server,
    WRM_DICE_3D_UI_URI,
    WRM_DICE_3D_UI_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(path.join(DIST_DIR, "wrm-dice-3d.html"), "utf-8");
      return {
        contents: [
          {
            uri: WRM_DICE_3D_UI_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            // The widget ships its own parchment chrome — opt out of host border.
            _meta: { ui: { prefersBorder: false } },
          },
        ],
      };
    },
  );

  // ── Resource: WR&M character-sheet UI ──────────────────────────────────
  registerAppResource(
    server,
    WRM_SHEET_UI_URI,
    WRM_SHEET_UI_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(path.join(DIST_DIR, "wrm-sheet.html"), "utf-8");
      return {
        contents: [
          {
            uri: WRM_SHEET_UI_URI,
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
  registerSkillResources(server, skillMap, SKILLS_DIR, { directoryRead: true });

  // ── Validate skill tool declarations ───────────────────────────────────
  // Each SKILL.md may declare the MCP tools it needs in `metadata.tools` (a
  // list of { name, purpose, ui_resource? }). The full frontmatter is surfaced
  // to hosts via skill://index.json, so a host loading a skillbook knows which
  // tools to expect. Here we cross-check that every declared tool is actually
  // provided by this server and warn on drift (typos, renamed/removed tools).
  validateSkillToolDeclarations(skillMap, registeredToolNames);

  return server;
}
