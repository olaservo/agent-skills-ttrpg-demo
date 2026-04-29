/**
 * @file Parses a Fallout pregen character sheet (Markdown) into a typed
 * header object plus the body Markdown for downstream rendering.
 *
 * The header (name, origin, level, S.P.E.C.I.A.L., max HP, luck) goes into
 * a structured Pip-Boy status strip. The remainder (combat, hit-locations,
 * skills, weapons, perks, inventory, biography) is shipped as raw Markdown
 * and rendered by the UI with `marked`.
 */

export interface ParsedCharacter {
  name: string;
  origin: string;
  level: number;
  luckPoints: number;
  maxHP: number;
  special: {
    str: number;
    per: number;
    end: number;
    cha: number;
    int: number;
    agi: number;
    luk: number;
  };
  /** Sheet body starting at `## Combat` — the header is already extracted. */
  markdown: string;
}

function require1(match: RegExpMatchArray | null, label: string): string {
  if (!match || !match[1]) throw new Error(`character-parser: could not find ${label}`);
  return match[1];
}

export function parseCharacterSheet(raw: string): ParsedCharacter {
  const name = require1(raw.match(/^#\s+(.+?)\s*$/m), "name (# heading)");
  const origin = require1(raw.match(/\*\*Origin:\*\*\s*(.+?)\s*$/m), "origin");
  const level = parseInt(require1(raw.match(/\*\*Level:\*\*\s*(\d+)/), "level"), 10);
  const luckPoints = parseInt(
    require1(raw.match(/\*\*Luck Points:\*\*\s*(\d+)/), "luck points"),
    10,
  );
  const maxHP = parseInt(require1(raw.match(/\*\*Maximum HP:\*\*\s*(\d+)/), "maximum HP"), 10);

  // Locate the S.P.E.C.I.A.L. data row: a 7-cell pipe-table row of digits
  // immediately following the `| STR | PER | ... |` header. Whitespace-tolerant.
  const specialMatch = raw.match(
    /\|\s*STR\s*\|[^\n]*\n\|[^\n]*\n\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/,
  );
  if (!specialMatch) throw new Error("character-parser: could not parse S.P.E.C.I.A.L. row");
  const [, s, p, e, c, i, a, l] = specialMatch;
  const special = {
    str: parseInt(s!, 10),
    per: parseInt(p!, 10),
    end: parseInt(e!, 10),
    cha: parseInt(c!, 10),
    int: parseInt(i!, 10),
    agi: parseInt(a!, 10),
    luk: parseInt(l!, 10),
  };

  // Body starts at `## Combat`. The header (H1, origin/level lines, S.P.E.C.I.A.L.
  // table, Luck Points line) is already represented in the typed fields above —
  // dropping it from the markdown avoids rendering it twice.
  const combatIdx = raw.indexOf("\n## Combat");
  if (combatIdx < 0) throw new Error("character-parser: could not locate '## Combat' section");
  const markdown = raw.slice(combatIdx + 1);

  return { name, origin, level, luckPoints, maxHP, special, markdown };
}
