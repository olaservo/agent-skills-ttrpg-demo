# Test variants

Load this file when the test is anything other than a single PC rolling against a fixed difficulty.

## Difficulty zero

A test that has been reduced to difficulty 0 (by perks, gear, or trivial circumstances) **is not rolled by default**. The action automatically succeeds. No AP is generated, and no complication is possible.

The player may opt to roll anyway at the GM's discretion. Then:
- Every success becomes an AP (since the difficulty is 0, all successes are excess)
- A natural 20 still generates a complication

This is useful when the GM wants to know *how well* the action goes when there is no risk of failure.

## Opposed tests

Use when an active force is trying to prevent the PC from succeeding (a guard noticing them, an opponent grappling them, a rival in a contest). The opponent's roll *is* the difficulty.

**Procedure:**

1. The opposing character spends AP first (if any) and rolls their pool.
2. The number of successes the opponent generates becomes the **difficulty** of the active player's test.
3. The active player may then spend AP to add d20s and rolls.
4. Compare:
   - active player's successes >= opponent's successes -> active player wins; excess successes become AP
   - active player's successes < opponent's successes -> active player fails; the opponent gains 1 AP per success the active player fell short by

**Two PCs opposed:** the group AP pool cannot be tapped to buy d20s on either side. If a PC wants extra d20s, they fund the GM's pool to do it (see `action-points.md`).

**Modifiers in opposed tests** flip side: anything that would have *increased* the active player's difficulty instead *adds successes* to the opponent's total. Anything that would have *decreased* the active player's difficulty *subtracts* from the opponent's successes. So if the opponent is sneaking up in the dark (which would normally raise the active player's PER + Survival difficulty by 1), the opponent simply adds 1 success to their total instead.

> Worked example: Paladin Danse grapples a deathclaw. The GM rolls 2d20 for the deathclaw and gets 3 successes - that is now Danse's difficulty. Danse has target number 8; his player buys 2 extra d20s with AP from the group pool and rolls 4d20: 1, 5, 6, 18. The 1 is a critical (2 successes), 5 and 6 are each successes, 18 misses - 4 successes total. Danse passes by 1 and banks 1 AP.

## Assistance

When one PC helps another on a test the GM has authorized as assistable.

- The helper describes how they are helping, picks an attribute + skill (does **not** have to match the lead character's choice), and rolls **1d20**.
- The helper's d20 does **not count toward** the lead character's 5d20 cap.
- Helpers cannot buy extra d20s - they always roll exactly 1d20.
- The helper's successes only add to the lead character's total **if the lead character generated at least 1 success on their own**. If the lead character whiffed entirely, the help does not stick.
- Critical successes and complications on the helper's d20 work normally.

## Group tests

When the whole party tackles a single activity together (sneaking through an area, traveling through hazardous terrain, lifting something heavy):

- Pick a **leader**. The leader rolls a normal pool (2d20, plus up to 3 bought with AP).
- Every other PC rolls **1d20** using their own attribute + skill.
- If the leader generated at least 1 success, every helper's successes are added to the leader's total.
- Total successes >= difficulty -> the group passes.
- Any complications rolled by anyone in the group apply after the test resolves.

> Worked example: The Sole Survivor, Deacon, and Strong sneak past a synth patrol. Difficulty 4. Deacon leads (best Sneak); his player rolls 3d20 (2 base + 1 bought with AP) and scores 2 successes. Sole Survivor rolls 1d20, gets 1 success. Strong rolls 1d20 and fails. Total = 3 successes vs difficulty 4 - the group fails. The GM narrates Strong giving the group away and the scene becomes combat.

## Complication range

The default complication range is "complication on a 20". The GM can raise the range for tests that are riskier than they are difficult.

| Range | Complications on a... | Description |
|:---:|:---:|---|
| 1 | 20 | Normal |
| 2 | 19-20 | Risky |
| 3 | 18-20 | Perilous |
| 4 | 17-20 | Precarious |
| 5 | 16-20 | Treacherous |

Complication range affects only the complication threshold, never the success threshold (which is always "<= target number"). A single die can be both a success and a complication if its value is at or below the target number AND at or above the complication threshold.

## Success at a cost

When a player fails a test, the GM may offer them success at a cost:

- The player gets the outcome they were going for.
- The player **cannot** spend AP to improve the outcome.
- The GM imposes one or more complications (usually one).
- The player can decline and accept the simple failure if the cost is too high.

This is a discretionary GM tool, not a default - reach for it when failure would stall the story but a clean win would feel unearned.
