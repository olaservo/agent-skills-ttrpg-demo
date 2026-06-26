import { describe, expect, it } from "vitest";
import { formatHumanWrm, rollWrm } from "./wrm-roll.ts";

describe("rollWrm", () => {
  it("adds attribute and a +2 skill bonus to the die", () => {
    // With a skill, a non-exploding low die makes the math easy to assert.
    let seed = 0;
    while (seed < 10000) {
      const r = rollWrm({ attribute: 4, skill: true, difficulty: 9, seed });
      if (r.keptInitial !== 6) {
        // no explosion possible
        expect(r.skillBonus).toBe(2);
        expect(r.dieTotal).toBe(r.keptInitial);
        expect(r.total).toBe(r.keptInitial + 4 + 2);
        expect(r.passed).toBe(r.total >= 9);
        return;
      }
      seed++;
    }
    throw new Error("could not find a non-6 initial die");
  });

  it("a known skill is a flat +2, not an extra die", () => {
    const withSkill = rollWrm({ attribute: 3, skill: true, difficulty: 7, seed: 42 });
    const without = rollWrm({ attribute: 3, skill: false, difficulty: 7, seed: 42 });
    expect(withSkill.skillBonus).toBe(2);
    expect(without.skillBonus).toBe(0);
    // same seed -> same initial die; difference is exactly the +2 when no explosion
    if (!withSkill.exploded && !without.exploded) {
      expect(withSkill.total - without.total).toBe(2);
    }
  });

  it("explodes on a 6 only when a skill applies (or override), adding 6 and rolling again", () => {
    let seed = 0;
    while (seed < 10000) {
      const r = rollWrm({ attribute: 0, skill: true, difficulty: 99, seed });
      if (r.keptInitial === 6) {
        expect(r.exploded).toBe(true);
        expect(r.explosions.length).toBeGreaterThanOrEqual(1);
        // dieTotal is keptInitial plus all explosion dice
        expect(r.dieTotal).toBe(6 + r.explosions.reduce((a, b) => a + b, 0));
        // chained explosions: every explosion die except the last must be a 6
        for (let i = 0; i < r.explosions.length - 1; i++) {
          expect(r.explosions[i]).toBe(6);
        }
        expect(r.explosions[r.explosions.length - 1]).not.toBe(6);
        return;
      }
      seed++;
    }
    throw new Error("could not find a seed producing an initial 6");
  });

  it("does NOT explode without a skill even on a 6 (plain attribute check)", () => {
    let seed = 0;
    while (seed < 10000) {
      const r = rollWrm({ attribute: 2, skill: false, difficulty: 5, seed });
      if (r.keptInitial === 6) {
        expect(r.exploded).toBe(false);
        expect(r.explosions).toHaveLength(0);
        expect(r.dieTotal).toBe(6);
        return;
      }
      seed++;
    }
    throw new Error("could not find a seed producing an initial 6");
  });

  it("explode override forces exploding for damage-style rolls", () => {
    let seed = 0;
    while (seed < 10000) {
      const r = rollWrm({ attribute: 0, skill: false, explode: true, difficulty: 99, seed });
      if (r.keptInitial === 6) {
        expect(r.exploded).toBe(true);
        return;
      }
      seed++;
    }
    throw new Error("could not find a seed producing an initial 6");
  });

  it("advantage keeps the highest of two d6 (Exceptional Attribute)", () => {
    const r = rollWrm({ attribute: 0, difficulty: 1, rollMode: "advantage", seed: 5 });
    expect(r.initialDice).toHaveLength(2);
    expect(r.keptInitial).toBe(Math.max(r.initialDice[0]!, r.initialDice[1]!));
  });

  it("disadvantage keeps the lowest of two d6 (No Talent for Magic)", () => {
    const r = rollWrm({ attribute: 0, difficulty: 1, rollMode: "disadvantage", seed: 5 });
    expect(r.initialDice).toHaveLength(2);
    expect(r.keptInitial).toBe(Math.min(r.initialDice[0]!, r.initialDice[1]!));
  });

  it("passes when total meets or beats the DL (meet-or-beat)", () => {
    // attribute 5 + skill 2 = 7 floor; with a 1d6 of at least 2 -> total >= 9
    let seed = 0;
    while (seed < 10000) {
      const r = rollWrm({ attribute: 5, skill: true, difficulty: 9, seed });
      if (!r.exploded) {
        expect(r.passed).toBe(r.keptInitial + 7 >= 9);
        if (r.passed) return;
      }
      seed++;
    }
  });

  it("is deterministic with a seed", () => {
    const a = rollWrm({ attribute: 4, skill: true, difficulty: 9, rollMode: "advantage", seed: 42 });
    const b = rollWrm({ attribute: 4, skill: true, difficulty: 9, rollMode: "advantage", seed: 42 });
    expect(a).toEqual(b);
  });

  it("every rolled d6 is in [1,6]", () => {
    for (let seed = 0; seed < 50; seed++) {
      const r = rollWrm({ attribute: 0, skill: true, difficulty: 1, seed });
      for (const v of [...r.initialDice, ...r.explosions]) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(6);
        expect(Number.isInteger(v)).toBe(true);
      }
    }
  });

  it("reports explodeEnabled: true with a skill, false without, and honors the override", () => {
    expect(rollWrm({ attribute: 3, skill: true, difficulty: 7, seed: 1 }).explodeEnabled).toBe(true);
    expect(rollWrm({ attribute: 3, skill: false, difficulty: 7, seed: 1 }).explodeEnabled).toBe(false);
    expect(rollWrm({ attribute: 3, skill: true, explode: false, difficulty: 7, seed: 1 }).explodeEnabled).toBe(false);
    expect(rollWrm({ attribute: 3, skill: false, explode: true, difficulty: 7, seed: 1 }).explodeEnabled).toBe(true);
  });

  it("rejects a negative attribute and a non-integer DL", () => {
    expect(() => rollWrm({ attribute: -1, difficulty: 5 })).toThrow(/Attribute/);
    expect(() => rollWrm({ attribute: 3, difficulty: 5.5 })).toThrow(/Difficulty/);
  });
});

describe("formatHumanWrm", () => {
  it("renders the breakdown, total, and pass/fail", () => {
    const r = rollWrm({ attribute: 4, skill: true, difficulty: 9, seed: 42 });
    const text = formatHumanWrm(r);
    expect(text).toContain("attribute 4");
    expect(text).toContain("skill 2");
    expect(text).toContain(`vs DL 9`);
    expect(text).toMatch(r.passed ? /SUCCESS/ : /FAILURE/);
  });

  it("notes advantage rolls", () => {
    const r = rollWrm({ attribute: 6, difficulty: 5, rollMode: "advantage", skill: true, seed: 1 });
    const text = formatHumanWrm(r);
    expect(text).toContain("advantage");
  });

  it("renders a negative bonus cleanly (e.g. Outcast -3), not '+ -3'", () => {
    const r = rollWrm({ attribute: 3, skill: true, bonus: -3, difficulty: 7, seed: 1 });
    const text = formatHumanWrm(r);
    expect(text).toContain("- 3 bonus");
    expect(text).not.toContain("+ -3");
  });
});
