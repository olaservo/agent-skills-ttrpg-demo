import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseWrmCharacterSheet } from "./wrm-character-parser.ts";

const REFS_DIR = path.join(
  import.meta.dirname,
  "skills",
  "wrm-ttrpg",
  "wrm-character-sheets",
  "references",
);

async function load(slug: string): Promise<string> {
  return fs.readFile(path.join(REFS_DIR, slug), "utf-8");
}

const ALL_SHEETS = [
  "01-brannic-caldermoor.md",
  "02-pip-underbough.md",
  "03-lyrandel-mistweaver.md",
  "04-durga-ironhand.md",
  "05-vashk-bloodmane.md",
  "06-aurelia-vane.md",
];

describe("parseWrmCharacterSheet", () => {
  it("parses all six pregens without throwing, with rules-legal attributes", async () => {
    for (const slug of ALL_SHEETS) {
      const raw = await load(slug);
      const c = parseWrmCharacterSheet(raw);
      expect(c.name.length, `${slug} name`).toBeGreaterThan(0);
      expect(c.race.length, `${slug} race`).toBeGreaterThan(0);
      expect(c.concept.length, `${slug} concept`).toBeGreaterThan(0);
      const sum = c.attributes.warrior + c.attributes.rogue + c.attributes.mage;
      expect(sum, `${slug} attributes sum to 10`).toBe(10);
      for (const v of Object.values(c.attributes)) {
        expect(v, `${slug} attribute <= 6`).toBeLessThanOrEqual(6);
        expect(v, `${slug} attribute >= 0`).toBeGreaterThanOrEqual(0);
      }
      expect(c.mana, `${slug} Mana = 2 x Mage`).toBe(2 * c.attributes.mage);
      expect(c.skills.length, `${slug} has 3 chosen skills`).toBe(3);
      expect(c.talents.length, `${slug} has at least one talent`).toBeGreaterThanOrEqual(1);
      expect(c.markdown.startsWith("## Skills"), `${slug} body starts with Skills`).toBe(true);
      expect(c.markdown, `${slug} body has Biography`).toContain("## Biography");
    }
  });

  it("extracts Sir Brannic (human knight) headline stats", async () => {
    const c = parseWrmCharacterSheet(await load("01-brannic-caldermoor.md"));
    expect(c.name).toBe("Sir Brannic Caldermoor");
    expect(c.race).toBe("Human");
    expect(c.concept).toContain("Knight");
    expect(c.attributes).toEqual({ warrior: 6, rogue: 4, mage: 0 });
    expect(c.hp).toBe(12); // 6 + Warrior
    expect(c.mana).toBe(0);
    expect(c.fate).toBe(4); // = Rogue
    expect(c.defenseBase).toBe(9);
    expect(c.defense).toBe(15); // with lamellar + large shield
    expect(c.armorPenalty).toBe(7);
    expect(c.skills).toEqual(["Swords", "Riding", "Athletics"]);
    expect(c.talents).toContain("Massive Attack");
    expect(c.spells).toEqual([]);
  });

  it("extracts Lyrandel (elf mage) — caster with spells and racial talents", async () => {
    const c = parseWrmCharacterSheet(await load("03-lyrandel-mistweaver.md"));
    expect(c.race).toBe("Elf");
    expect(c.attributes).toEqual({ warrior: 1, rogue: 3, mage: 6 });
    expect(c.hp).toBe(4); // Weak racial: 3 + Warrior
    expect(c.mana).toBe(12); // 2 x Mage
    expect(c.defenseBase).toBe(6);
    expect(c.defense).toBe(6); // no armor
    expect(c.talents).toContain("Channeller");
    expect(c.talents).toContain("Exceptional Attribute (Mage)");
    expect(c.spells).toEqual(["Frostburn", "Magic Light", "Healing Hand", "Lightning Bolt"]);
  });

  it("extracts Pip (halfling, Weak) — reduced HP and racial talents", async () => {
    const c = parseWrmCharacterSheet(await load("02-pip-underbough.md"));
    expect(c.race).toBe("Halfling");
    expect(c.hp).toBe(5); // Weak: 3 + Warrior(2)
    expect(c.talents).toContain("Exceptional Attribute (Rogue)");
    expect(c.talents).toContain("Weak");
  });

  it("throws on unparseable input", () => {
    expect(() => parseWrmCharacterSheet("not a character sheet")).toThrow(/wrm-character-parser/);
  });
});
