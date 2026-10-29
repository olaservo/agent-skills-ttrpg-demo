import path from "node:path";
import type { Skill } from "@modelcontextprotocol/server/ext/skills";
import { loadSkills } from "@modelcontextprotocol/server/ext/skills/node";
import { afterEach, describe, expect, it, vi } from "vitest";
import { declaredToolNames, validateSkillToolDeclarations } from "./server.ts";

const SKILLS_DIR = path.join(import.meta.dirname, "skills");

// The tools this server actually registers (kept in sync with server.ts).
const REGISTERED = new Set([
  "roll_dice",
  "present_player_choice",
  "show_character_sheet",
  "roll_wrm",
  "show_wrm_character_sheet",
]);

const catalog = await loadSkills(SKILLS_DIR);

describe("skills catalog", () => {
  it("publishes every skill folder under skills/ at its on-disk path", () => {
    expect(catalog.entries.map((skill) => skill.uri)).toEqual([
      "skill://fallout-ttrpg/fallout-character-sheets/SKILL.md",
      "skill://fallout-ttrpg/fallout-rpg/SKILL.md",
      "skill://wrm-ttrpg/warrior-rogue-mage/SKILL.md",
      "skill://wrm-ttrpg/wrm-character-sheets/SKILL.md",
      "skill://wrm-ttrpg/wrm-vaneria-setting/SKILL.md",
    ]);
  });

  it("lists SKILL.md itself with a sha256 digest and size in every entry", () => {
    for (const skill of catalog.entries) {
      expect(Array.isArray(skill.resources)).toBe(true);
      const manifest = (skill.resources as Exclude<Skill["resources"], string>).find(
        (resource) => resource.uri === skill.uri,
      );
      expect(manifest?.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(manifest?.size).toBeGreaterThan(0);
    }
  });
});

describe("validateSkillToolDeclarations", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads one tool name per line of metadata.tools", () => {
    const byName = Object.fromEntries(
      catalog.entries.map((skill) => [skill.frontmatter.name, declaredToolNames(skill)]),
    );
    expect(byName["fallout-rpg"]).toEqual(["roll_dice", "present_player_choice"]);
    expect(byName["wrm-character-sheets"]).toEqual(["show_wrm_character_sheet", "roll_wrm"]);
  });

  it("every tool any skill declares in metadata.tools is actually registered", () => {
    const problems = validateSkillToolDeclarations(catalog.entries, REGISTERED);
    expect(problems).toEqual([]);
  });

  it("flags a declared tool the server does not provide", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // A reduced set missing the WR&M tools should surface the WR&M skills' declarations.
    const problems = validateSkillToolDeclarations(catalog.entries, new Set(["roll_dice"]));
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join("\n")).toMatch(/roll_wrm|show_wrm_character_sheet/);
  });

  it("ignores skills with no metadata.tools declaration", () => {
    // A skill with minimal frontmatter (no metadata.tools) yields no problems.
    const noTools: Skill = {
      uri: "skill://no-tools-fixture/SKILL.md",
      frontmatter: { name: "no-tools-fixture", description: "fixture" },
      resources: "dynamic",
    };
    expect(validateSkillToolDeclarations([noTools], REGISTERED)).toEqual([]);
  });
});
