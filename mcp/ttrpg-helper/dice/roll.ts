/**
 * Fallout 2d20 dice mechanics — TypeScript port of scripts/roll_test.py.
 *
 * Rules (from .claude/skills/fallout-rpg/SKILL.md and references/test-variants.md):
 *  - d20 == 1                      => critical, +2 successes (tagged "critical")
 *  - d20 <= target (and != 1)      => +1 success
 *  - d20 >= 21 - complicationRange => +1 complication (independent of success)
 *  - passed = successes >= difficulty
 *  - apGenerated = passed ? max(0, successes - difficulty) : 0
 */

export interface RollArgs {
  target: number;
  difficulty: number;
  numDice?: number;
  complicationRange?: number;
  seed?: number;
}

export type DieTag = "critical" | "success" | "miss" | "complication";

export interface AnnotatedDie {
  die: number;
  tags: DieTag[];
}

export interface RollResult {
  target: number;
  difficulty: number;
  numDice: number;
  complicationRange: number;
  rolls: number[];
  annotated: AnnotatedDie[];
  successes: number;
  crits: number;
  complications: number;
  passed: boolean;
  apGenerated: number;
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

export function rollTest(args: RollArgs): RollResult {
  const numDice = args.numDice ?? 2;
  const complicationRange = args.complicationRange ?? 1;
  const { target, difficulty, seed } = args;

  if (!Number.isInteger(numDice) || numDice < 1 || numDice > 5) {
    throw new Error(`Dice pool must be 1-5 d20s, got ${numDice}`);
  }
  if (!Number.isInteger(complicationRange) || complicationRange < 1 || complicationRange > 5) {
    throw new Error(`Complication range must be 1-5, got ${complicationRange}`);
  }
  if (!Number.isInteger(target) || target < 1) {
    throw new Error(`Target number must be >= 1, got ${target}`);
  }
  if (!Number.isInteger(difficulty) || difficulty < 0) {
    throw new Error(`Difficulty must be >= 0, got ${difficulty}`);
  }

  const rng = seed !== undefined ? mulberry32(seed) : Math.random;
  const rolls: number[] = [];
  for (let i = 0; i < numDice; i++) {
    rolls.push(1 + Math.floor(rng() * 20));
  }

  const complicationThreshold = 21 - complicationRange;

  let successes = 0;
  let crits = 0;
  let complications = 0;
  const annotated: AnnotatedDie[] = [];

  for (const r of rolls) {
    const tags: DieTag[] = [];
    if (r === 1) {
      successes += 2;
      crits += 1;
      tags.push("critical");
    } else if (r <= target) {
      successes += 1;
      tags.push("success");
    } else {
      tags.push("miss");
    }
    // Complication is independent of success — a die can be both.
    // (Critical on 1 cannot also be a complication: complicationThreshold >= 16,
    //  and 1 < 16, so no double-tag arises in that case.)
    if (r >= complicationThreshold) {
      complications += 1;
      tags.push("complication");
    }
    annotated.push({ die: r, tags });
  }

  const passed = successes >= difficulty;
  const apGenerated = passed ? Math.max(0, successes - difficulty) : 0;

  return {
    target,
    difficulty,
    numDice,
    complicationRange,
    rolls,
    annotated,
    successes,
    crits,
    complications,
    passed,
    apGenerated,
  };
}

export function formatHuman(r: RollResult): string {
  const lines: string[] = [];
  const compNote = r.complicationRange > 1 ? `, complication range ${r.complicationRange}` : "";
  lines.push(
    `Rolling ${r.numDice}d20 vs target ${r.target}, difficulty ${r.difficulty}${compNote}`,
  );
  for (const entry of r.annotated) {
    const tagStr = entry.tags
      .map((t) => (t === "critical" ? "critical (2 successes)" : t === "complication" ? "COMPLICATION" : t))
      .join(", ");
    lines.push(`  d20 = ${String(entry.die).padStart(2, " ")} -> ${tagStr}`);
  }
  lines.push("");
  const critNote = r.crits > 0 ? ` (including ${r.crits} critical)` : "";
  lines.push(`Successes: ${r.successes}${critNote}`);
  if (r.complications > 0) {
    lines.push(`Complications: ${r.complications}`);
  }
  if (r.passed) {
    lines.push(r.apGenerated > 0 ? `PASS - ${r.apGenerated} AP generated` : "PASS");
  } else {
    lines.push(`FAIL - needed ${r.difficulty}, got ${r.successes}`);
  }
  return lines.join("\n");
}
