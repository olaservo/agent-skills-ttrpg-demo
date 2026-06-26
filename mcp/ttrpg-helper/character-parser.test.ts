import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCharacterSheet } from "./character-parser.ts";

const REFS_DIR = path.join(
  import.meta.dirname,
  "skills",
  "fallout-ttrpg",
  "fallout-character-sheets",
  "references",
);

async function load(slug: string): Promise<string> {
  return fs.readFile(path.join(REFS_DIR, slug), "utf-8");
}

const ALL_SHEETS = [
  "01-augusta-byron.md",
  "02-happy-tommy-doyle.md",
  "03-bailey-bigsmile.md",
  "04-old-tallman.md",
  "05-hazel-johnson.md",
  "06-marvin.md",
];

describe("parseCharacterSheet", () => {
  it("parses all six pregens without throwing", async () => {
    for (const slug of ALL_SHEETS) {
      const raw = await load(slug);
      const c = parseCharacterSheet(raw);
      expect(c.name.length, `${slug} name`).toBeGreaterThan(0);
      expect(c.origin.length, `${slug} origin`).toBeGreaterThan(0);
      expect(c.level, `${slug} level`).toBeGreaterThanOrEqual(1);
      expect(c.special.str, `${slug} STR`).toBeGreaterThanOrEqual(1);
      expect(c.special.luk, `${slug} LUK`).toBeGreaterThanOrEqual(1);
      expect(c.maxHP, `${slug} HP`).toBeGreaterThanOrEqual(1);
      expect(c.markdown.startsWith("## Combat"), `${slug} body starts with Combat`).toBe(true);
      expect(c.markdown, `${slug} body has Biography`).toContain("## Biography");
    }
  });

  it("extracts Augusta's headline stats", async () => {
    const c = parseCharacterSheet(await load("01-augusta-byron.md"));
    expect(c.name).toBe("Augusta Byron");
    expect(c.origin).toBe("Vault Dweller");
    expect(c.level).toBe(1);
    expect(c.luckPoints).toBe(5);
    expect(c.maxHP).toBe(10);
    expect(c.special).toEqual({ str: 4, per: 6, end: 5, cha: 6, int: 9, agi: 5, luk: 5 });
  });

  it("extracts Marvin (robot) — distinct origin and lower HP", async () => {
    const c = parseCharacterSheet(await load("06-marvin.md"));
    expect(c.name).toBe("Marvin");
    expect(c.origin).toBe("Mister Handy");
    expect(c.level).toBe(2);
    expect(c.special.str).toBe(8);
    expect(c.maxHP).toBe(8);
    // Robot hit-location names should still be present in the body markdown.
    expect(c.markdown).toContain("Optics");
    expect(c.markdown).toContain("Thruster");
  });

  it("preserves Tommy's quoted nickname in the H1", async () => {
    const c = parseCharacterSheet(await load("02-happy-tommy-doyle.md"));
    expect(c.name).toBe('"Happy" Tommy Doyle');
  });

  it("throws on unparseable input", () => {
    expect(() => parseCharacterSheet("not a character sheet")).toThrow(/character-parser/);
  });
});
