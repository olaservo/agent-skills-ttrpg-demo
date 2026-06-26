---
name: wrm-character-sheets
description: >-
  Pre-generated player characters for Warrior, Rogue & Mage (Michael Wolf / Stargazer Games). Use
  this skill when the user asks to pick a pregen, hand out characters, look up a PC's attributes,
  skills, talents, spells, weapons, HP, Mana, Defense, inventory, or biography, or needs a
  ready-made party for a one-shot or convention game. The roster has six balanced, original PCs:
  Sir Brannic Caldermoor (human knight), Pip Underbough (halfling burglar), Lyrandel Mistweaver
  (elf mage), Durga Ironhand (dwarf defender & smith), Vashk Bloodmane (orc berserker), and
  Sister Aurelia Vane (human cleric/spellblade). Activates when the user mentions any of these
  names, "pregens", "pre-generated characters", "character sheets", "the party", or "who can I
  play", or asks for a PC's stats, gear, talents, or background. Pair with the warrior-rogue-mage
  skill for the rules; the party also fits a Fallen Imperium of Vaneria campaign (wrm-vaneria-setting).
license: CC-BY-4.0
metadata:
  version: 0.2.0
  skill_author:
    name: Ola Hungerford
    url: https://github.com/olaservo

  tools:
    - name: show_wrm_character_sheet
      purpose: Load one of the six pregens by slug (brannic-caldermoor, pip-underbough, lyrandel-mistweaver, durga-ironhand, vashk-bloodmane, aurelia-vane) - returns attributes, derived stats, skills, talents, spells, and biography.
    - name: roll_wrm
      purpose: Resolve any check, attack, or save these sheets imply (1d6 + attribute vs DL, exploding 6s). Provided via the warrior-rogue-mage skill.

  depends_on:
    - warrior-rogue-mage

  scope: "Six original, balanced pre-generated player characters with full WR&M stats, talents, spells, gear, and biographies. Pair with warrior-rogue-mage for the system."

  sources:
    - title: warrior-rogue-mage (sibling skill)
      publisher: Ola Hungerford
      url: https://github.com/olaservo/agent-skills-ttrpg-demo/tree/main/mcp/ttrpg-helper/skills/wrm-ttrpg/warrior-rogue-mage
      relationship: system_encoding
      rights_basis: license_grant
      license: CC-BY-4.0
      covers: "WR&M mechanics (attributes, skills, talents, derived stats, combat, magic, equipment, races) that every sheet uses"
    - title: "Warrior, Rogue & Mage - System Reference Document"
      author: Michael Wolf
      publisher: Stargazer Games
      url: https://wrmsrd.opengamingnetwork.com/
      rights_basis: license_grant
      license: CC-BY-3.0
      covers: "The underlying game system the characters are built on, via the sibling skill"

  own_contributions:
    - Six original pre-generated player characters with full sheets, spells, gear, and biographies
    - A picker that matches players to characters by play style and party role

  attribution: |
    This work is based on Warrior, Rogue & Mage (found at http://www.stargazergames.eu/),
    created by Michael Wolf, and licensed for our use under the Creative Commons Attribution
    3.0 Unported license (http://creativecommons.org/licenses/by/3.0/).

    The six pre-generated characters are original creative work by Ola Hungerford, licensed
    CC-BY-4.0, built on the warrior-rogue-mage sibling skill for WR&M mechanics. Unofficial fan
    project, not endorsed by Stargazer Games. WR&M is free - please support the author at
    https://www.stargazergames.eu/. See ../ATTRIBUTION.md for full licensing details.

  license_note: >
    The characters, biographies, and picker logic are the author's own work under CC-BY-4.0. They
    use only WR&M's CC-BY 3.0 mechanics (via the sibling skill); no characters or text from any
    WR&M product are reproduced.
---

# Warrior, Rogue & Mage - Pre-Generated Characters

Six ready-to-play PCs for *Warrior, Rogue & Mage*. Every sheet is built by the rules in the
`warrior-rogue-mage` skill (10 attribute points, three skills, one talent plus any racial
talents, derived stats by formula, 250 SP of gear). Load `warrior-rogue-mage` for the mechanics
those sheets imply.

## The roster

| # | Character | Race | Concept | W / R / M | Key talent |
|:--:|---|---|---|:--:|---|
| 1 | **Sir Brannic Caldermoor** | Human | Knight / melee anchor | 6 / 4 / 0 | Massive Attack |
| 2 | **Pip Underbough** | Halfling | Burglar / scout (ranged) | 2 / 6 / 2 | Lucky Devil |
| 3 | **Lyrandel Mistweaver** | Elf | Arcane mage / blaster | 1 / 3 / 6 | Channeller |
| 4 | **Durga Ironhand** | Dwarf | Defender / smith | 6 / 3 / 1 | Tough As Nails |
| 5 | **Vashk Bloodmane** | Orc | Berserker / striker | 6 / 4 / 0 | Massive Attack |
| 6 | **Sister Aurelia Vane** | Human | Cleric / spellblade (healer) | 3 / 2 / 5 | Blood Mage |

Full sheets:

| Load this file | Character |
|---|---|
| `references/01-brannic-caldermoor.md` | Sir Brannic Caldermoor |
| `references/02-pip-underbough.md` | Pip Underbough |
| `references/03-lyrandel-mistweaver.md` | Lyrandel Mistweaver |
| `references/04-durga-ironhand.md` | Durga Ironhand |
| `references/05-vashk-bloodmane.md` | Vashk Bloodmane |
| `references/06-aurelia-vane.md` | Sister Aurelia Vane |

## Picking a character

- **"I want to hit things and soak hits."** → Sir Brannic (armored, mounted, big melee) or Durga
  (toughest; Tough As Nails halves chip damage).
- **"I want to go all-out and wreck the strongest enemy."** → Vashk (Berserker + Massive Attack;
  glass-fragile when raging, but devastating).
- **"I want stealth, lockpicking, and a bow."** → Pip (Exceptional Attribute in Rogue, Lucky
  Devil rerolls, ranged backup).
- **"I want to cast spells and nuke."** → Lyrandel (Mana 12, Channeller burst, four spells) -
  glass cannon, guard her.
- **"I want to heal and support but still fight."** → Sister Aurelia (healing spells, Herbalism,
  Blood Mage, a sword for the front line).

A satisfying four-PC party: Brannic or Durga (front line) + Vashk (striker) + Pip (scout/ranged) +
Lyrandel or Aurelia (magic). All six together make a sturdy six-player table.

## How this skill composes

- **With `warrior-rogue-mage` (required for play).** Every value on these sheets - attribute
  checks, attack rolls, spellcasting, healing, advancement - is resolved by `warrior-rogue-mage`.
  Load it alongside this skill once play starts.
- **With `wrm-vaneria-setting` (recommended fit).** The party slots into the Fallen Imperium of
  Vaneria: Sir Brannic reads as a knight of Vaikus, Sister Aurelia as a servant of the Imperial
  Faith out of Chaetril, Vashk as an orcish outcast, and Lyrandel as a mage of the Dark Spire.
