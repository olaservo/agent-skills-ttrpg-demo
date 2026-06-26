/**
 * Warrior, Rogue & Mage d6 dice mechanics.
 *
 * Rules (from skills/wrm-ttrpg/warrior-rogue-mage):
 *  - Roll 1d6, add the relevant attribute (Warrior / Rogue / Mage), +2 if a relevant
 *    skill applies. Meet or beat the Difficulty Level (DL): total >= DL => success.
 *  - Exploding 6s apply ONLY on damage rolls and on attribute checks where an applicable
 *    skill is used. On a 6 the die "explodes": add 6 and roll again, repeating on further 6s.
 *  - Exceptional Attribute (racial talent): roll the initial die as 2d6, keep the highest
 *    ("advantage"). No Talent for Magic (racial talent): 2d6 keep lowest ("disadvantage").
 *
 * This is intentionally a different system from the Fallout 2d20 roller in ./roll.ts —
 * WR&M is single-die, additive, meet-or-beat, with exploding 6s. The `roll_wrm` MCP tool
 * wraps this; the `roll_dice` tool wraps ./roll.ts.
 */

export type WrmRollMode = "normal" | "advantage" | "disadvantage";

export interface WrmRollArgs {
  /** Attribute level (Warrior/Rogue/Mage). 0-12 (monsters/veterans can exceed 6). */
  attribute: number;
  /** A relevant skill is known: adds +2 AND enables exploding 6s. Default false. */
  skill?: boolean;
  /** The Difficulty Level (or a target's Defense for an attack) to meet or beat. */
  difficulty: number;
  /** Extra circumstantial modifier (second skill, Champion, charge, racial, etc.). Default 0. */
  bonus?: number;
  /** advantage = Exceptional Attribute (2d6 keep highest); disadvantage = No Talent for Magic (2d6 keep lowest). */
  rollMode?: WrmRollMode;
  /** Override exploding behavior (e.g. force on for a damage roll). Default: explodes iff `skill`. */
  explode?: boolean;
  /** Optional RNG seed for reproducible rolls. */
  seed?: number;
}

export interface WrmRollResult {
  attribute: number;
  /** 0 or 2. */
  skillBonus: number;
  bonus: number;
  difficulty: number;
  rollMode: WrmRollMode;
  /** Whether exploding 6s were enabled for this roll (skill applied, or `explode` override). */
  explodeEnabled: boolean;
  /** The d6(s) rolled for the first die: 2 entries under advantage/disadvantage, else 1. */
  initialDice: number[];
  /** The initial die kept after advantage/disadvantage selection. */
  keptInitial: number;
  /** Additional d6s added by exploding 6s, in order. */
  explosions: number[];
  /** keptInitial + sum(explosions). */
  dieTotal: number;
  exploded: boolean;
  /** dieTotal + attribute + skillBonus + bonus. */
  total: number;
  passed: boolean;
  /** total - difficulty (>= 0 on a pass). */
  margin: number;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rollWrm(args: WrmRollArgs): WrmRollResult {
  const attribute = args.attribute;
  const skillBonus = args.skill ? 2 : 0;
  const bonus = args.bonus ?? 0;
  const { difficulty, seed } = args;
  const rollMode: WrmRollMode = args.rollMode ?? "normal";
  // Exploding applies iff a skill is used, unless explicitly overridden (e.g. damage rolls).
  const explodeEnabled = args.explode ?? Boolean(args.skill);

  if (!Number.isInteger(attribute) || attribute < 0) {
    throw new Error(`Attribute must be an integer >= 0, got ${attribute}`);
  }
  if (!Number.isInteger(difficulty)) {
    throw new Error(`Difficulty (DL) must be an integer, got ${difficulty}`);
  }
  if (!Number.isInteger(bonus)) {
    throw new Error(`Bonus must be an integer, got ${bonus}`);
  }

  const rng = seed !== undefined ? mulberry32(seed) : Math.random;
  const d6 = () => 1 + Math.floor(rng() * 6);

  // Initial die: advantage/disadvantage roll 2d6 and keep highest/lowest.
  const initialDice: number[] = [];
  let keptInitial: number;
  if (rollMode === "advantage" || rollMode === "disadvantage") {
    const a = d6();
    const b = d6();
    initialDice.push(a, b);
    keptInitial = rollMode === "advantage" ? Math.max(a, b) : Math.min(a, b);
  } else {
    keptInitial = d6();
    initialDice.push(keptInitial);
  }

  // Exploding 6s: while the most recent kept/exploded die shows a 6, roll again and add.
  const explosions: number[] = [];
  let dieTotal = keptInitial;
  if (explodeEnabled) {
    let last = keptInitial;
    // Guard against pathological infinite loops with a generous cap.
    while (last === 6 && explosions.length < 100) {
      const next = d6();
      explosions.push(next);
      dieTotal += next;
      last = next;
    }
  }
  const exploded = explosions.length > 0;

  const total = dieTotal + attribute + skillBonus + bonus;
  const passed = total >= difficulty;
  const margin = total - difficulty;

  return {
    attribute,
    skillBonus,
    bonus,
    difficulty,
    rollMode,
    explodeEnabled,
    initialDice,
    keptInitial,
    explosions,
    dieTotal,
    exploded,
    total,
    passed,
    margin,
  };
}

export function formatHumanWrm(r: WrmRollResult): string {
  const lines: string[] = [];
  let head = `Rolling 1d6 + attribute ${r.attribute}`;
  if (r.skillBonus) head += ` + skill ${r.skillBonus}`;
  if (r.bonus) head += ` ${r.bonus >= 0 ? "+" : "-"} ${Math.abs(r.bonus)} bonus`;
  const modeNote =
    r.rollMode === "advantage"
      ? " (advantage: 2d6 keep highest)"
      : r.rollMode === "disadvantage"
        ? " (disadvantage: 2d6 keep lowest)"
        : "";
  const explodeNote = r.explodeEnabled ? " (6s explode)" : "";
  lines.push(`${head} vs DL ${r.difficulty}${modeNote}${explodeNote}`);

  if (r.rollMode !== "normal") {
    lines.push(`  d6 rolled [${r.initialDice.join(", ")}], kept ${r.keptInitial}`);
  } else {
    lines.push(`  d6 = ${r.keptInitial}`);
  }
  if (r.exploded) {
    lines.push(`  explosions: ${r.explosions.join(" + ")} -> die total ${r.dieTotal}`);
  }
  lines.push("");
  lines.push(`Total: ${r.total} vs DL ${r.difficulty}`);
  const sign = r.margin >= 0 ? "+" : "";
  lines.push(r.passed ? `SUCCESS (margin ${sign}${r.margin})` : `FAILURE (margin ${sign}${r.margin})`);
  return lines.join("\n");
}
