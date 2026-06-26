/**
 * @file Parses a Warrior, Rogue & Mage pregen character sheet (Markdown) into a
 * typed header object plus the body Markdown for downstream rendering.
 *
 * The header (name, race, concept, the three attributes, and the derived stats
 * HP/Mana/Fate/Defense/Armor Penalty, plus skill and talent names) goes into a
 * structured status strip. The remainder (skills, talents, weapons, armor,
 * spells, inventory, biography) is shipped as raw Markdown.
 *
 * This is the WR&M analogue of character-parser.ts (which parses Fallout
 * S.P.E.C.I.A.L. sheets). WR&M sheets are structured differently — three
 * attributes, formula-derived stats, no levels — so they need their own parser.
 */

export interface ParsedWrmCharacter {
  name: string;
  race: string;
  concept: string;
  attributes: {
    warrior: number;
    rogue: number;
    mage: number;
  };
  hp: number;
  mana: number;
  fate: number;
  /** Base Defense before armor/shields. */
  defenseBase: number;
  /** Effective Defense with worn armor/shields (equals base if none listed). */
  defense: number;
  armorPenalty: number;
  skills: string[];
  talents: string[];
  /** Spell names, if the character is a caster; empty otherwise. */
  spells: string[];
  /** Sheet body starting at `## Skills` — the header is already extracted. */
  markdown: string;
}

function require1(match: RegExpMatchArray | null, label: string): string {
  if (!match || match[1] === undefined) {
    throw new Error(`wrm-character-parser: could not find ${label}`);
  }
  return match[1];
}

/** Extract the leading bolded name from each list item in a `## Section` block. */
function boldListNames(raw: string, heading: string): string[] {
  const re = new RegExp(`\\n##\\s+${heading}\\s*\\n([\\s\\S]*?)(?:\\n##\\s|$)`);
  const block = raw.match(re);
  if (!block || !block[1]) return [];
  const names: string[] = [];
  for (const line of block[1].split("\n")) {
    const m = line.match(/^\s*[-*]\s+\*\*(.+?)\*\*/);
    if (m && m[1]) names.push(m[1].trim());
  }
  return names;
}

export function parseWrmCharacterSheet(raw: string): ParsedWrmCharacter {
  const name = require1(raw.match(/^#\s+(.+?)\s*$/m), "name (# heading)");
  // The subtitle line: `**Race:** Human · **Concept:** Knight, ...`
  const race = require1(raw.match(/\*\*Race:\*\*\s*(.+?)\s*(?:·|$)/m), "race").trim();
  const concept = require1(raw.match(/\*\*Concept:\*\*\s*(.+?)\s*$/m), "concept").trim();

  // Attributes table: header `| Warrior | Rogue | Mage |`, then separator, then the data row.
  const attrMatch = raw.match(
    /\|\s*Warrior\s*\|\s*Rogue\s*\|\s*Mage\s*\|[^\n]*\n\|[^\n]*\n\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/,
  );
  if (!attrMatch) throw new Error("wrm-character-parser: could not parse the Warrior/Rogue/Mage attribute row");
  const attributes = {
    warrior: parseInt(attrMatch[1]!, 10),
    rogue: parseInt(attrMatch[2]!, 10),
    mage: parseInt(attrMatch[3]!, 10),
  };

  const hp = parseInt(require1(raw.match(/\*\*Hit Points:\*\*\s*(\d+)/), "hit points"), 10);
  const mana = parseInt(require1(raw.match(/\*\*Mana:\*\*\s*(\d+)/), "mana"), 10);
  const fate = parseInt(require1(raw.match(/\*\*Fate:\*\*\s*(\d+)/), "fate"), 10);
  const armorPenalty = parseInt(
    require1(raw.match(/\*\*Armor Penalty:\*\*\s*(\d+)/), "armor penalty"),
    10,
  );

  // Defense line may be "9 base → **15** with ..." or just "6 (no armor ...)".
  const defenseLine = require1(raw.match(/\*\*Defense:\*\*\s*(.+?)\s*$/m), "defense");
  const defenseBase = parseInt(require1(defenseLine.match(/(\d+)/), "defense base"), 10);
  const effMatch = defenseLine.match(/→\s*\*\*(\d+)\*\*/);
  const defense = effMatch ? parseInt(effMatch[1]!, 10) : defenseBase;

  const skills = boldListNames(raw, "Skills");
  const talents = boldListNames(raw, "Talents");

  // Spells (optional): a "## Spells known ..." section with a table whose first
  // column is the spell name. Pull bolded or plain leading cell text per data row.
  const spells: string[] = [];
  const spellBlock = raw.match(/\n##\s+Spells known[^\n]*\n([\s\S]*?)(?:\n##\s|$)/);
  if (spellBlock && spellBlock[1]) {
    for (const line of spellBlock[1].split("\n")) {
      // Skip header / separator rows of the markdown table.
      if (!line.trim().startsWith("|")) continue;
      if (/\|\s*Spell\s*\|/i.test(line)) continue;
      if (/^\s*\|[\s:|-]+\|/.test(line)) continue;
      const cell = line.split("|")[1];
      if (!cell) continue;
      const spell = cell.replace(/\*\*/g, "").trim();
      if (spell) spells.push(spell);
    }
  }

  // Body for rendering starts at `## Skills` (header fields are already extracted).
  const skillsIdx = raw.indexOf("\n## Skills");
  const markdown = skillsIdx >= 0 ? raw.slice(skillsIdx + 1) : raw;

  return {
    name,
    race,
    concept,
    attributes,
    hp,
    mana,
    fate,
    defenseBase,
    defense,
    armorPenalty,
    skills,
    talents,
    spells,
    markdown,
  };
}
