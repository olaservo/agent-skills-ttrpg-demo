import path from "node:path";
import { discoverSkills } from "@olaservo/ext-skills/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateSkillToolDeclarations } from "./server.ts";

const SKILLS_DIR = path.join(import.meta.dirname, "skills");

// The tools this server actually registers (kept in sync with server.ts).
const REGISTERED = new Set([
  "roll_dice",
  "present_player_choice",
  "show_character_sheet",
  "roll_wrm",
  "show_wrm_character_sheet",
]);

describe("validateSkillToolDeclarations", () => {
  afterEach(() => vi.restoreAllMocks());

  it("every tool any skill declares in metadata.tools is actually registered", () => {
    const skillMap = discoverSkills(SKILLS_DIR);
    const problems = validateSkillToolDeclarations(skillMap, REGISTERED);
    expect(problems).toEqual([]);
  });

  it("flags a declared tool the server does not provide", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const skillMap = discoverSkills(SKILLS_DIR);
    // A reduced set missing the WR&M tools should surface the WR&M skills' declarations.
    const problems = validateSkillToolDeclarations(skillMap, new Set(["roll_dice"]));
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join("\n")).toMatch(/roll_wrm|show_wrm_character_sheet/);
  });

  it("ignores skills with no metadata.tools declaration", () => {
    // A skill with minimal frontmatter (no metadata.tools) yields no problems.
    type SkillVal = ReturnType<typeof discoverSkills> extends Map<unknown, infer V> ? V : never;
    const noTools = { name: "no-tools-fixture", frontmatter: {} } as unknown as SkillVal;
    const single = new Map([["x", noTools]]);
    expect(validateSkillToolDeclarations(single, REGISTERED)).toEqual([]);
  });
});
