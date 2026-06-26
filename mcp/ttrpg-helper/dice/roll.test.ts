import { describe, expect, it } from "vitest";
import { formatHuman, rollTest } from "./roll.ts";

describe("rollTest", () => {
  it("counts a critical (1) as 2 successes and tags 'critical'", () => {
    // Seed chosen so that mulberry32 produces a 1 as the first roll.
    // We brute-force find a small seed that yields rolls including 1.
    let seed = 0;
    while (seed < 10000) {
      const r = rollTest({ target: 5, difficulty: 1, numDice: 2, seed });
      if (r.rolls.includes(1)) {
        const idx = r.rolls.indexOf(1);
        expect(r.annotated[idx]!.tags).toContain("critical");
        expect(r.annotated[idx]!.tags).not.toContain("complication");
        // each critical contributes 2 successes
        expect(r.successes).toBeGreaterThanOrEqual(2);
        expect(r.crits).toBeGreaterThanOrEqual(1);
        return;
      }
      seed++;
    }
    throw new Error("could not find seed producing a 1 within 10000 tries");
  });

  it("tags rolls above target as 'miss'", () => {
    // target 1 means almost every roll > target except a 1
    const r = rollTest({ target: 1, difficulty: 1, numDice: 5, seed: 2 });
    for (const a of r.annotated) {
      if (a.die === 1) {
        expect(a.tags).toContain("critical");
      } else if (a.die <= 1) {
        expect(a.tags).toContain("success");
      } else if (a.die >= 20) {
        // 20s can be both miss and complication
        expect(a.tags).toContain("miss");
        expect(a.tags).toContain("complication");
      } else {
        expect(a.tags).toContain("miss");
      }
    }
  });

  it("tags 20 as complication with default complicationRange=1", () => {
    let seed = 0;
    while (seed < 10000) {
      const r = rollTest({ target: 10, difficulty: 1, numDice: 2, seed });
      if (r.rolls.includes(20)) {
        const idx = r.rolls.indexOf(20);
        expect(r.annotated[idx]!.tags).toContain("complication");
        expect(r.annotated[idx]!.tags).toContain("miss");
        expect(r.complications).toBeGreaterThanOrEqual(1);
        return;
      }
      seed++;
    }
    throw new Error("could not find seed producing a 20 within 10000 tries");
  });

  it("dual-tags a die as both success and complication when target >= complication threshold", () => {
    // target 20, complicationRange 1 => threshold 20. A roll of 20 is success+complication
    // (20 <= 20 succeeds, and 20 >= 20 complicates). Note: roll of 1 stays critical-only,
    // since 1 < 20 so the complication branch doesn't trigger.
    let seed = 0;
    while (seed < 10000) {
      const r = rollTest({ target: 20, difficulty: 1, numDice: 5, complicationRange: 1, seed });
      const idx = r.rolls.findIndex((v) => v === 20);
      if (idx >= 0) {
        const tags = r.annotated[idx]!.tags;
        expect(tags).toContain("success");
        expect(tags).toContain("complication");
        return;
      }
      seed++;
    }
    throw new Error("could not find seed producing a 20 within 10000 tries");
  });

  it("AP is generated only on a pass, equal to excess successes", () => {
    // Force a pass: target 20 (everything succeeds), difficulty 1, 5 dice => 5+ successes
    const r = rollTest({ target: 20, difficulty: 1, numDice: 5, seed: 1 });
    expect(r.passed).toBe(true);
    expect(r.apGenerated).toBe(Math.max(0, r.successes - 1));
  });

  it("AP is 0 on a fail", () => {
    // Force a fail: target 1, difficulty 5, 2 dice => almost surely <5 successes
    let seed = 0;
    while (seed < 200) {
      const r = rollTest({ target: 1, difficulty: 5, numDice: 2, seed });
      if (!r.passed) {
        expect(r.apGenerated).toBe(0);
        return;
      }
      seed++;
    }
    throw new Error("expected at least one failing roll");
  });

  it("difficulty 0: every success is AP", () => {
    const r = rollTest({ target: 20, difficulty: 0, numDice: 5, seed: 7 });
    expect(r.passed).toBe(true);
    expect(r.apGenerated).toBe(r.successes);
  });

  it("supports numDice=1 for assistance / group-helper rolls", () => {
    const r = rollTest({ target: 10, difficulty: 1, numDice: 1, seed: 3 });
    expect(r.rolls).toHaveLength(1);
    expect(r.annotated).toHaveLength(1);
  });

  it("rejects numDice outside [1,5]", () => {
    expect(() => rollTest({ target: 10, difficulty: 1, numDice: 0 })).toThrow(/1-5/);
    expect(() => rollTest({ target: 10, difficulty: 1, numDice: 6 })).toThrow(/1-5/);
  });

  it("rejects complicationRange outside [1,5]", () => {
    expect(() => rollTest({ target: 10, difficulty: 1, complicationRange: 0 })).toThrow(/1-5/);
    expect(() => rollTest({ target: 10, difficulty: 1, complicationRange: 6 })).toThrow(/1-5/);
  });

  it("rejects target < 1 and difficulty < 0", () => {
    expect(() => rollTest({ target: 0, difficulty: 1 })).toThrow(/Target/);
    expect(() => rollTest({ target: 10, difficulty: -1 })).toThrow(/Difficulty/);
  });

  it("is deterministic with a seed", () => {
    const a = rollTest({ target: 10, difficulty: 2, numDice: 5, complicationRange: 2, seed: 42 });
    const b = rollTest({ target: 10, difficulty: 2, numDice: 5, complicationRange: 2, seed: 42 });
    expect(a.rolls).toEqual(b.rolls);
    expect(a).toEqual(b);
  });

  it("each roll is in [1,20]", () => {
    for (let seed = 0; seed < 20; seed++) {
      const r = rollTest({ target: 10, difficulty: 1, numDice: 5, seed });
      for (const v of r.rolls) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(20);
        expect(Number.isInteger(v)).toBe(true);
      }
    }
  });
});

describe("formatHuman", () => {
  it("matches the Python script's text shape", () => {
    const r = rollTest({ target: 9, difficulty: 1, numDice: 2, seed: 42 });
    const text = formatHuman(r);
    expect(text).toContain(`Rolling ${r.numDice}d20 vs target ${r.target}, difficulty ${r.difficulty}`);
    expect(text).toMatch(r.passed ? /PASS/ : /FAIL/);
    for (const a of r.annotated) {
      expect(text).toContain(`d20 = ${String(a.die).padStart(2, " ")}`);
    }
  });

  it("appends AP count to PASS line when apGenerated > 0", () => {
    const r = rollTest({ target: 20, difficulty: 0, numDice: 5, seed: 1 });
    const text = formatHuman(r);
    expect(text).toMatch(/PASS - \d+ AP generated/);
  });
});
