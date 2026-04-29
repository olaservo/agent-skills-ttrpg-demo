---
name: fallout-rpg
description: Run, GM, or adjudicate Fallout - The Roleplaying Game (Modiphius 2d20 system). Use this skill when the user wants to play, run, or look up rules for Fallout RPG / Fallout TTRPG / the Modiphius Fallout tabletop game. Activates for skill tests (rolling 2d20 against an attribute+skill target number), S.P.E.C.I.A.L. attribute checks, Action Points (AP), Luck points, complications, critical successes, opposed and group tests, combat (initiative, minor/major actions, attacks, hit locations, range, Combat Dice, damage effects, injuries, dying, healing, cover, zones, hazards, traps), and wasteland gameplay rulings. Currently covers the core 2d20 resolution loop and full combat chapter; additional chapters (character creation, perks, gear) are added to references/ over time.
compatibility: Dice rolls are produced by the `fallout-helper` MCP server (TypeScript MCP App) bundled at `mcp/fallout-helper/`. The skill itself works in any text-only context, but skill tests require the MCP server to be connected — do not fall back to inline dice math.
metadata:
  source: "Fallout - The Roleplaying Game (Modiphius Entertainment), quickstart and full rulebook"
  system: "Modiphius 2d20"
  scope: "Growing - add new chapter content as references/<chapter>.md and link from the references map below"
version: 1.0.0
author:
  name: Ola Hungerford
license: CC-BY-4.0
source: https://github.com/olaservo/agent-skills-ttrpg-demo/tree/main/mcp/fallout-helper/skills/fallout-ttrpg/fallout-rpg
license_note: >
  This SKILL.md is the author's original work. It encodes the 2d20 skill-test
  loop, AP, Luck, and combat rules at the level of a player aid. GM ownership
  of the published Fallout: The Roleplaying Game rulebook is assumed; no rules
  text, tables, or stat blocks are reproduced verbatim.
derived_from:
  - title: "Fallout: The Roleplaying Game (Core Rulebook)"
    publisher: Modiphius Entertainment
    year: 2021
    relationship: system
    license: proprietary
    rights_basis: fair_use_reading_aid
    url: https://www.modiphius.net/products/fallout-the-roleplaying-game
---

# Fallout - The Roleplaying Game

This skill teaches an agent to GM or adjudicate *Fallout: The Roleplaying Game*. The body of this file covers the universal resolution loop the GM uses on nearly every uncertain action; chapter-specific material lives in `references/` and loads on demand.

## What this covers today

- **This file**: the skill test loop, gotchas, difficulty calibration, basic Action Points, basic Luck, and the references map.
- **`references/setup.md`**: what the table needs to play (players, dice, tokens).
- **`references/test-variants.md`**: opposed, group, and assisted tests; complication range; success at a cost; difficulty zero.
- **`references/action-points.md`**: full AP economy - group pool, GM pool, buying d20s with or without AP, AP in combat.
- **`references/luck.md`**: the four Luck options, regaining Luck.
- **`references/combat.md`**: Chapter Two — the full combat loop (rounds, initiative, minor/major actions, attacks, hit locations, range, Combat Dice, damage effects, injuries and dying, healing, environment, cover, hazards, traps).
- **`fallout-helper` MCP server** (in this repo at `mcp/fallout-helper/`): provides the `roll_dice` tool (Pip-Boy-themed animated UI) and the `present_player_choice` tool (host-rendered structured picker for story decisions). Replaces the older Python `roll_test.py` script.

More chapters (character creation, perks, gear, adventures) will be added as additional reference files.

## Read this first - gotchas

The Fallout 2d20 system inverts a lot of d20-system intuition. Get these wrong and the rest of the rules stop working.

- **Roll UNDER the target number, not over.** A d20 generates one success when it rolls less than or equal to (attribute + skill). High rolls are bad.
- **A natural 1 is a critical SUCCESS, worth 2 successes.** It is not a fumble.
- **A natural 20 is a COMPLICATION, not a critical hit.** A complication adds a side effect; it does not flip the test to a failure on its own.
- **Target number = attribute + skill, added together** (e.g. CHA 7 + Speech 2 = target 9). Not skill alone, not a modifier.
- **Difficulty is the number of successes needed**, not a number to beat with a single die. Difficulty 3 means "produce 3 or more total successes across the dice pool".
- **Excess successes become Action Points** in a shared group pool that caps at 6.
- **A complication does not cancel a success.** If the player produced enough successes, they pass; the complication is a new wrinkle in the fiction that follows the test.
- **Difficulty 0 means do not roll** by default. The action is automatic with no AP and no risk of complication. The player can opt in to rolling if they want to bank AP.
- **In an opposed test, the opponent's successes BECOME the difficulty** of the active player's test - there is no separately set difficulty.

## The skill test loop

Run this whenever the player attempts something where success is uncertain, failure is interesting, or there is risk.

1. **Pick attribute + skill.** Decide which S.P.E.C.I.A.L. attribute and which skill best fit the action. The player can suggest, the GM has final say. Add them: this is the **target number** for each d20 in the pool.
2. **Set the difficulty (0-5).** See the difficulty table below. Difficulty is the number of successes needed to pass.
3. **Build the dice pool.** Default 2d20. The player may spend Action Points from the group pool to buy up to 3 more d20s, for a maximum pool of 5d20. Bonus d20 costs:

   | Pool | Bonus d20s | AP cost |
   |:---:|:---:|:---:|
   | 2d20 | - | 0 |
   | 3d20 | +1 | 1 |
   | 4d20 | +2 | 3 |
   | 5d20 | +3 | 6 |

4. **Roll the pool**, evaluating each d20 independently:
   - d20 = 1 -> critical success, counts as **2 successes**
   - d20 <= target number -> 1 success
   - d20 > target number -> no success
   - d20 = 20 -> also generates a **complication** (the success/no-success counting still applies)
5. **Compare total successes to difficulty.**
   - successes >= difficulty -> pass
   - successes < difficulty -> fail
6. **Resolve.** On a pass, the player may spend AP to improve the outcome (see basics below). Then apply any complications. On a fail, the GM narrates failure - or offers *success at a cost* (see `references/test-variants.md`).

> Worked example: Nate has CHA 7 + Speech 2, so his target is 9. Difficulty 1 test. He rolls 2d20: a 5 and a 19. The 5 is <= 9, so 1 success. 19 > 9, miss. 1 success >= difficulty 1: pass. No 20 was rolled, no complication.

## Difficulty table

| Difficulty | Example |
|:---:|---|
| 0 | Gathering rumors around a settlement, searching a room in an abandoned building |
| 1 | Shooting a target at close range, picking a simple lock |
| 2 | Breaking down a reinforced door, treating an injury |
| 3 | Identifying an unknown poison, deactivating a robot from behind |
| 4 | Hacking a complex computer, disarming a landmine |
| 5 | Convincing an enemy to stand down, shooting a target at long range on a stormy night |

## Action Points - basics

Action Points (AP) are the currency that lets players push beyond the default 2d20 pool. The full economy is in `references/action-points.md`; what follows is enough for routine play.

- **Generation.** Every success above the difficulty becomes 1 AP. AP go into a **group pool shared by all players**, capped at 6.
- **Three basic spends** outside combat:
  - **Buy d20s** (1/2/3 AP for the 1st/2nd/3rd bonus die) - paid before rolling, after difficulty is set
  - **Obtain information** (1 AP) - ask the GM one question about the situation; the GM answers truthfully but may answer incompletely
  - **Reduce time** (2 AP) - halve the time the test takes (when time matters)
- **GM has their own pool** that starts each session at 1 AP per player and has no cap. The GM's pool funds NPC actions.

For combat AP spends (additional minor/major actions, extra melee damage), opposed-test AP rules, and the "buy d20s without having AP" trade, load `references/action-points.md`.

## Luck - basics

Luck is the player's personal narrative-bending currency. The full mechanics are in `references/luck.md`; what follows is enough to recognize when Luck applies.

- Each player starts each session with Luck points equal to their LCK attribute. Spent Luck refreshes at session milestones or when a new session starts; it does not refresh mid-test.
- Four options - one Luck point each:
  - **Luck of the Draw** - introduce a helpful detail into the scene (subject to GM veto)
  - **Stacked Deck** - swap LCK for the default attribute on a target number, before rolling
  - **Lucky Timing** - in combat, take your turn now (interrupting initiative)
  - **Miss Fortune** - re-roll one d20 (or up to three Combat Dice) - each die can only be re-rolled once, and you keep the new result

Load `references/luck.md` for the full description of each option, including when the GM can charge multiple Luck points.

## References map - load on demand

| Load this file | When |
|---|---|
| `references/test-variants.md` | A test is opposed (PC vs PC, PC vs NPC), one PC is helping another, the whole group is doing one activity together, the test is risky enough to extend the complication range, or the GM is considering "success at a cost" on a failed roll |
| `references/action-points.md` | Players want to spend AP in unusual ways, AP economy questions come up, the GM needs the combat AP spends, or the group pool has run out and a player wants to "fund the GM" to buy d20s |
| `references/luck.md` | A player invokes any Luck option, asks how Luck refreshes, or proposes a scene-altering detail that the GM might charge Luck for |
| `references/combat.md` | Combat begins, or any combat-specific question comes up: initiative, minor/major actions, making an attack, hit locations, range bands, Combat Dice and damage effects, critical hits and injuries, dying and stabilization, healing (in and out of combat), zones, cover, difficult terrain, environmental conditions, hazards, or traps |
| `references/setup.md` | A new group is preparing a session and needs to know what dice, tokens, and prep are required |

## Bundled MCP tools

The `fallout-helper` MCP server (source at `mcp/fallout-helper/`) exposes a `roll_dice` tool that rolls a skill test with the rules above applied correctly. Call it whenever the agent needs an actual random outcome rather than an illustrative one — do **not** fall back to inline dice math.

`roll_dice` arguments:

| Arg | Type | Default | Meaning |
|---|---|---|---|
| `target` | int 1-20 | required | Target number = attribute + skill |
| `difficulty` | int 0-5 | required | Number of successes needed to pass |
| `numDice` | int 1-5 | 2 | Pool size. **1** for an assistance/group-helper roll; up to 5 once AP is spent on bonus d20s |
| `complicationRange` | int 1-5 | 1 | Width of complication range. 1 = only on a 20, 2 = 19-20, … 5 = 16-20 |
| `seed` | int | — | Optional, for reproducible rolls |

Example calls (the agent issues these via the tool, not as shell commands):

- Default 2d20 test: `roll_dice({ target: 9, difficulty: 1 })`
- 4d20 pool after spending AP: `roll_dice({ target: 8, difficulty: 3, numDice: 4 })`
- Risky test with widened complication range: `roll_dice({ target: 10, difficulty: 2, complicationRange: 2 })`
- Assistance roll: `roll_dice({ target: 7, difficulty: 0, numDice: 1 })` (helper rolls 1d20)

The tool returns each d20 result with per-die tags (`success`, `miss`, `critical`, `complication` — non-exclusive), totals successes, declares pass/fail, and reports AP generated (raw excess; the agent enforces the group pool cap of 6). It also drives a linked Pip-Boy UI resource so the host can render the rolling animation. The tool does not consult the GM about which attribute + skill applies — that judgment stays with the human.

The companion `show_character_sheet` tool renders a placeholder character sheet UI; the full character data model is intentionally TODO and will land in a follow-up.

### Asking the player to commit to a choice — `present_player_choice`

When the adventure reaches a *meaningful* narrative branch — multiple distinct paths, none of them mechanically forced — call `present_player_choice` with the curated options. The host renders a structured picker and **blocks until the player answers**, then returns their choice as structured data the agent can branch on.

`present_player_choice` arguments:

| Arg | Type | Default | Meaning |
|---|---|---|---|
| `prompt` | string | required | Narrative framing shown to the player (e.g. "Pierce and Macey are pinned. How do you approach the bunker?") |
| `options` | array of `{id, label, description?}` | required | 2–6 mutually-exclusive options; `id` is a stable short key, `label` is what the player sees |
| `allowFreeText` | boolean | `true` | Adds an optional free-text field so the player can elaborate or propose something off-menu |

The tool returns `{ action, chosenId?, chosenLabel?, elaboration? }`:
- `action: "accept"` — player picked an option; branch on `chosenId`. If `elaboration` is set, weave it into the narration.
- `action: "decline"` or `"cancel"` — don't railroad. Narrate a beat that gives the player space (questions, breathing room), then offer a refined choice.

**Use it for:** story branch points where the agent should *not* pick for the player — sneak vs. parley vs. assault; trust an NPC vs. interrogate vs. walk away; which signal source to investigate first; whether to interrupt Trestridge's brain transfer or wait. Aim for 2–4 options with one-line descriptions of the consequence or feel.

**Don't use it for:** mechanical outcomes (those are skill tests via `roll_dice`), pure flavor beats (just narrate), or fully open prompts like "what do you do?" (ask inline; the player has unlimited solution space, and a structured form would just shrink it).

Example call:

```
present_player_choice({
  prompt: "Pierce and Macey are pinned in front of the bunker. How do you approach?",
  options: [
    { id: "sneak",   label: "Sneak past the robots", description: "AGL + Sneak difficulty 4. Get inside before they engage." },
    { id: "parley",  label: "Hail Pierce and Macey", description: "Coordinate with the Brotherhood knights first." },
    { id: "assault", label: "Charge in",             description: "Pick a target and open fire — the knights will follow your lead." },
  ],
})
```

If the connected client doesn't support MCP elicitation, the tool returns `isError: true` with a message saying so — fall back to asking the player inline in chat.

If the `fallout-helper` MCP server is not connected, ask the user to start it (see `mcp/fallout-helper/README.md` for client config) — do not invent rolls.
