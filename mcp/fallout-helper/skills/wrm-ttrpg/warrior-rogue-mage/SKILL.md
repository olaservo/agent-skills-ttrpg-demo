---
name: warrior-rogue-mage
description: |
  Run, GM, or adjudicate Warrior, Rogue & Mage (WR&M) - a free, rules-light d6 fantasy
  tabletop RPG by Michael Wolf / Stargazer Games. Use this skill when the user wants to play
  or look up rules for Warrior Rogue Mage / WR&M / the Stargazer Games fantasy RPG. Activates
  for attribute checks (rolling 1d6 + Warrior/Rogue/Mage vs a Difficulty Level), the three
  attributes (Warrior, Rogue, Mage), skills and talents, exploding dice, character creation,
  combat (initiative, attack vs Defense, damage, healing), the four circles of magic (mana,
  spellcasting, spell enhancement), Fate points, equipment, non-human races, and bestiary stat
  blocks. WR&M has no classes - the three attributes ARE the archetype.
compatibility: |
  WR&M's dice system is 1d6 + attribute vs a target number, with 6s exploding. Use the
  `fallout-helper` MCP server's `roll_wrm` tool for WR&M checks - NOT `roll_dice`, which is
  hardcoded to the Fallout 2d20 system (roll-under, success-counting) and does not apply here.
  The host-agnostic `present_player_choice` tool may be used for narrative branch points. The
  tools this skill needs are declared in `metadata.tools` below.
license: CC-BY-4.0
metadata:
  version: 0.2.0
  skill_author:
    name: Ola Hungerford
    url: https://github.com/olaservo

  tools:
    - name: roll_wrm
      purpose: Roll a WR&M check - 1d6 + attribute (+2 if a relevant skill applies) vs a Difficulty Level, meet or beat, with exploding 6s. Supports advantage/disadvantage for the Exceptional Attribute / No Talent for Magic racial talents.
    - name: present_player_choice
      purpose: Pause the game at a meaningful narrative branch and let the player choose (system-agnostic).

  scope: "Complete WR&M game system encoded from the CC-BY 3.0 System Reference Document: core mechanics, character creation, skills, talents, combat, magic, equipment, magic items, races, GM guidance, and bestiary."

  sources:
    - title: "Warrior, Rogue & Mage - System Reference Document"
      author: Michael Wolf
      publisher: Stargazer Games
      url: https://wrmsrd.opengamingnetwork.com/
      rights_basis: license_grant
      license: CC-BY-3.0
      terms_url: http://creativecommons.org/licenses/by/3.0/
      covers: "All game mechanics - the three attributes, d6 task resolution, skills and talents, combat, the four-circle magic system and spell list, equipment, magic items, non-human races, GM guidance, and creature stat blocks. Republished by the author under CC-BY 3.0."

  attribution: |
    This work is based on Warrior, Rogue & Mage (found at http://www.stargazergames.eu/),
    created by Michael Wolf, and licensed for our use under the Creative Commons Attribution
    3.0 Unported license (http://creativecommons.org/licenses/by/3.0/).

    Unofficial fan project. Game system encoded in the author's own words from the WR&M System
    Reference Document by Michael Wolf (Stargazer Games), used under its CC-BY 3.0 license. Not
    an official product and not endorsed by Stargazer Games. WR&M is free - please download the
    original rulebook and support the author at https://www.stargazergames.eu/. Skill compiled
    by Ola Hungerford; see ../ATTRIBUTION.md for full licensing details.

  license_note: >
    Our encoding is offered under CC-BY-4.0. The source SRD is CC-BY 3.0 Unported, which
    permits distributing adaptations under a later compatible version; the required CC-BY 3.0
    source credit is carried verbatim above. The Vaneria setting is NOT part of this skill - it
    lives only in the Core Rulebook (CC-BY-NC-SA) and is encoded separately in the
    wrm-vaneria-setting skill.
---

# Warrior, Rogue & Mage

This skill teaches an agent to GM or adjudicate *Warrior, Rogue & Mage* (WR&M), a free,
rules-light d6 fantasy RPG by Michael Wolf. The body of this file covers the universal
resolution loop the GM uses on nearly every uncertain action; chapter-specific material lives
in `references/` and loads on demand.

## What this covers today

- **This file**: the attribute-check loop, the gotchas, the difficulty table, derived stats,
  Fate basics, and the references map.
- **`references/character-creation.md`**: the 7-step build (attributes, skills, talents, race,
  derived stats, equipment).
- **`references/skills-and-talents.md`**: the full skill list (by attribute) and all talents.
- **`references/combat.md`**: initiative, attack rolls, damage, healing, serious wounds.
- **`references/magic.md`**: mana, the four circles, casting, enhancement, sustaining, the full
  spell list, magic implements, ritual magic, and the low-magic variant.
- **`references/equipment.md`**: weapons, armor, shields, gear, mounts, spell items, currency.
- **`references/magic-items.md`**: the sample magic items.
- **`references/races-and-optional-rules.md`**: non-human player races, racial talents, and the
  dual-wield / mounted-combat optional rules.
- **`references/bestiary.md`**: stat-block format plus all NPCs, animals, and monsters.
- **`references/game-mastering.md`**: GM philosophy, character advancement, non-combat hazards.

## Read this first - gotchas

WR&M is deliberately minimal, but a few things trip up players coming from d20-style games.

- **Roll 1d6 and ADD the attribute; meet or beat the Difficulty Level.** High results are good.
  There is no dice pool - it is a single d6 plus an attribute (0-6), occasionally plus a flat
  skill bonus.
- **A known skill is a flat +2, not an extra die.** If a relevant skill applies, add 2 to the
  result. (A GM may allow a second +2 if a *second* applicable skill also fits.)
- **There are no classes.** Warrior, Rogue, and Mage are *attributes*, not roles. A character
  is defined by how their 10 attribute points are split, plus three skills and a talent.
- **6s explode - but only on damage rolls and on attribute checks where an applicable skill is
  used.** On an exploding 6, add 6 and roll again, adding each new result; repeat on further 6s.
  A plain attribute check with no skill does **not** explode.
- **Difficulty is a target number to meet or beat, not a count of successes.** DL 7 means the
  total (d6 + attribute + skill) must be 7 or higher.
- **Defense is a static target number, not an action.** In combat the attacker's roll must meet
  or beat the defender's Defense; the defender does not roll to dodge.
- **Magic is freeform by circle, not a fixed class list.** Spells belong to circles 1-4 that set
  their mana cost and casting DL; the sample spell list is a starting toolbox the GM extends.
- **Mage 0 means no magic at all** - and you cannot take a skill tied to an attribute of 0.

## The attribute-check loop

Run this whenever a character attempts something where success is uncertain and failure is
interesting.

1. **Pick the attribute.** The GM chooses which of Warrior / Rogue / Mage best fits the action.
2. **Add an applicable skill (+2).** If the character has learned a skill that helps, add 2. The
   die may now explode on a 6.
3. **Set the Difficulty Level (DL).** See the table below.
4. **Roll 1d6, add the attribute and any skill bonus.** On a 6 (with an applicable skill or on
   damage), the die explodes: add 6 and roll again.
5. **Compare to the DL.** Result ≥ DL → success. Result < DL → failure.
6. **Resolve.** Narrate the outcome. The GM may apply circumstantial modifiers to the DL, or
   waive the roll entirely (automatic success) when risk is low and the character is skilled.

> Worked example: A thief (Rogue 4) with the *Thievery* skill picks a sturdy lock the GM rates
> Challenging (DL 9). She rolls 1d6 = 5, +4 Rogue, +2 Thievery = 11 ≥ 9. The lock opens.

## Difficulty table

| Difficulty | DL |
|---|:--:|
| Easy | 5 |
| Routine | 7 |
| Challenging | 9 |
| Hard | 11 |
| Extreme | 13 |

**Opposed checks:** when two characters directly contest, each rolls the relevant attribute (+
skill); higher total wins. They need not use the same attribute. *Optional:* instead of rolling,
a passive opponent's DL can be set at `3 + attribute (+2 if skilled)`.

## Derived statistics

Computed once at creation (and whenever an attribute changes):

| Stat | Formula |
|---|---|
| **Hit Points (HP)** | 6 + Warrior |
| **Mana** | 2 × Mage |
| **Fate** | Rogue (minimum 1, even if Rogue is 0) |
| **Defense** | ⌊(Warrior + Rogue) / 2⌋ + 4 |

Worn armor and shields add to Defense but raise the **Armor Penalty (AP)**, which increases the
mana cost of every spell cast while wearing it.

## Fate - basics

Players spend Fate points (GM approval needed) to:

- **Ignore an attack that would have killed the character** - it just misses instead.
- **Change a minor detail in the game world** (you happen to know the NPC; the town has the shop
  you need).
- **Reroll a single die and keep the better result, or add +2 to a single check.**

Fate does **not** regenerate automatically. GMs grant Fate for heroic actions, good roleplaying,
and achieving character goals; players should spend it sparingly.

## References map - load on demand

| Load this file | When |
|---|---|
| `references/character-creation.md` | A player is building a new character, or you need the build order, point-buy, or starting-stat formulas |
| `references/skills-and-talents.md` | Deciding whether a skill applies to a check, picking starting skills/talents, or looking up a talent's effect |
| `references/combat.md` | Combat begins, or any combat question: initiative, attack rolls, Defense, damage, exploding damage, serious wounds, dying, healing |
| `references/magic.md` | A character casts, learns, enhances, or sustains a spell; mana/regeneration questions; magic implements; ritual or blood magic; or the low-magic Warrior/Rogue/Scholar variant |
| `references/equipment.md` | Buying or referencing weapons, armor, shields, gear, mounts, spells/implements, or pricing in silver pieces (SP) |
| `references/magic-items.md` | A magic item appears as treasure or the GM wants sample enchanted gear |
| `references/races-and-optional-rules.md` | A player wants a non-human character, you need racial talents, or questions about dual-wielding/multiple attacks or mounted/vehicle combat |
| `references/bestiary.md` | Statting an NPC, animal, or monster, or running an encounter; includes the creature stat-block format |
| `references/game-mastering.md` | Running the game, awarding character advancement (no XP/levels), or applying non-combat hazards (falls, poison, fire) |

## Bundled MCP tools

This skill is served by the `fallout-helper` MCP server (source at `mcp/fallout-helper/`). The
tools it needs are declared in this file's `metadata.tools` and provided by that server:

- **`roll_wrm`** — the WR&M d6 roller. Rolls `1d6 + attribute (+2 if a skill applies)` vs a
  Difficulty Level, meet or beat, with exploding 6s. Returns the kept die, any explosions, the
  total, pass/fail, and the margin. Do **not** use `roll_dice` for WR&M — that tool is the
  Fallout 2d20 system.
  - `attribute` (0-12) and `difficulty` (the DL, or a target's Defense for an attack) are required.
  - `skill: true` when a relevant skill applies — adds +2 **and** enables exploding 6s.
  - `rollMode: "advantage"` for the **Exceptional Attribute** racial talent (2d6 keep highest);
    `"disadvantage"` for **No Talent for Magic** (2d6 keep lowest).
  - `bonus` for other modifiers (a second applicable skill, Champion, a charge); `explode: true`
    to force exploding on a single-die damage roll; `seed` for reproducible rolls.
- **`present_player_choice`** — system-agnostic. Use it for meaningful story forks (parley vs.
  sneak vs. fight); it renders a picker and blocks until the player chooses. Not for mechanical
  rolls or pure flavor.

Example `roll_wrm` calls (issued via the tool, not as shell commands):

- Sword attack, Warrior 6 + Swords, vs the target's Defense 12: `roll_wrm({ attribute: 6, skill: true, difficulty: 12 })`
- Plain Mage check, no skill, Routine DL 7 (no exploding): `roll_wrm({ attribute: 4, difficulty: 7 })`
- Dwarf Athletics with Exceptional Attribute, Challenging DL 9: `roll_wrm({ attribute: 6, skill: true, difficulty: 9, rollMode: "advantage" })`

(Weapon **damage** rolls of more than one die, e.g. a two-handed weapon's 2d6, are rolled
directly — exploding on each 6; `roll_wrm` with `explode: true` covers single-die exploding rolls.)
