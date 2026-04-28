#!/usr/bin/env python3
"""Roll a Fallout RPG skill test (Modiphius 2d20 system).

Applies the rules from SKILL.md:
- d20 rolls of 1 are critical successes worth 2 successes
- d20 rolls <= target generate 1 success
- d20 rolls in the complication range generate a complication (default: only 20)
- Successes >= difficulty -> pass; excess successes become AP

Examples:
    python roll_test.py --target 9 --difficulty 1
    python roll_test.py --target 8 --difficulty 3 --dice 4
    python roll_test.py --target 10 --difficulty 2 --complication-range 2
    python roll_test.py --target 9 --difficulty 1 --json
"""

import argparse
import json
import random
import sys


def roll_test(
    target: int,
    difficulty: int,
    num_dice: int = 2,
    complication_range: int = 1,
    seed: int | None = None,
) -> dict:
    """Roll a 2d20 skill test and return a structured result.

    Args:
        target: Target number = attribute + skill. Each d20 must roll <= this
            value to score a success.
        difficulty: Number of successes required to pass (0-5 typically).
        num_dice: Size of the dice pool (2-5).
        complication_range: Width of the complication range. 1 = only 20,
            2 = 19-20, ..., 5 = 16-20.
        seed: Optional RNG seed for reproducible rolls.

    Returns:
        A dict with the rolls, per-die annotations, totals, and outcome.
    """
    if not 2 <= num_dice <= 5:
        raise ValueError(f"Dice pool must be 2-5 d20s, got {num_dice}")
    if not 1 <= complication_range <= 5:
        raise ValueError(
            f"Complication range must be 1-5, got {complication_range}"
        )
    if target < 1:
        raise ValueError(f"Target number must be >= 1, got {target}")
    if difficulty < 0:
        raise ValueError(f"Difficulty must be >= 0, got {difficulty}")

    rng = random.Random(seed) if seed is not None else random
    rolls = [rng.randint(1, 20) for _ in range(num_dice)]
    complication_threshold = 21 - complication_range

    successes = 0
    crits = 0
    complications = 0
    annotated = []

    for r in rolls:
        tags = []
        if r == 1:
            successes += 2
            crits += 1
            tags.append("critical (2 successes)")
        elif r <= target:
            successes += 1
            tags.append("success")
        else:
            tags.append("miss")
        if r >= complication_threshold:
            complications += 1
            tags.append("COMPLICATION")
        annotated.append({"die": r, "tags": tags})

    passed = successes >= difficulty
    ap_generated = max(0, successes - difficulty) if passed else 0

    return {
        "target": target,
        "difficulty": difficulty,
        "num_dice": num_dice,
        "complication_range": complication_range,
        "rolls": rolls,
        "annotated": annotated,
        "successes": successes,
        "crits": crits,
        "complications": complications,
        "passed": passed,
        "ap_generated": ap_generated,
    }


def format_human(result: dict) -> str:
    lines = []
    lines.append(
        f"Rolling {result['num_dice']}d20 vs target {result['target']}, "
        f"difficulty {result['difficulty']}"
        + (
            f", complication range {result['complication_range']}"
            if result["complication_range"] > 1
            else ""
        )
    )
    for entry in result["annotated"]:
        tag_str = ", ".join(entry["tags"])
        lines.append(f"  d20 = {entry['die']:>2} -> {tag_str}")
    lines.append("")
    lines.append(
        f"Successes: {result['successes']}"
        + (
            f" (including {result['crits']} critical)"
            if result["crits"]
            else ""
        )
    )
    if result["complications"]:
        lines.append(f"Complications: {result['complications']}")
    if result["passed"]:
        lines.append(
            f"PASS - {result['ap_generated']} AP generated"
            if result["ap_generated"]
            else "PASS"
        )
    else:
        lines.append(
            f"FAIL - needed {result['difficulty']}, got {result['successes']}"
        )
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Roll a Fallout RPG skill test (Modiphius 2d20).",
    )
    parser.add_argument(
        "--target", type=int, required=True,
        help="Target number = attribute + skill",
    )
    parser.add_argument(
        "--difficulty", type=int, required=True,
        help="Difficulty (number of successes needed to pass, 0-5)",
    )
    parser.add_argument(
        "--dice", type=int, default=2,
        help="Number of d20s to roll (2-5, default 2)",
    )
    parser.add_argument(
        "--complication-range", type=int, default=1,
        help="Complication range (1-5, default 1 = only on a 20)",
    )
    parser.add_argument(
        "--seed", type=int, default=None,
        help="Optional RNG seed for reproducible rolls",
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Emit machine-readable JSON instead of human-readable text",
    )
    args = parser.parse_args(argv)

    try:
        result = roll_test(
            target=args.target,
            difficulty=args.difficulty,
            num_dice=args.dice,
            complication_range=args.complication_range,
            seed=args.seed,
        )
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(format_human(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
