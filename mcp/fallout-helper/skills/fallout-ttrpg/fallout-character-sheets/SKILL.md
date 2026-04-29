---
name: fallout-character-sheets
description: >-
  Pre-generated player characters for Fallout - The Roleplaying Game (Modiphius 2d20). Use this skill when the user asks to pick a pregen, hand out characters, look up a PC's S.P.E.C.I.A.L., skills, perks, weapons, HP, inventory, or biography, or needs a ready-made party for a one-shot or convention game. The roster has six balanced PCs spanning Levels 1-3: Augusta Byron (Vault Dweller scientist), "Happy" Tommy Doyle (Survivor gambler), Bailey Bigsmile (Ghoul wanderer), Old Tallman (Super Mutant philosopher), Hazel Johnson (Brotherhood Field Scribe), and Marvin (Mister Handy robot). Activates when the user mentions any of these character names, "pregens", "pre-generated characters", "character sheets", "the party", "who can I play", or asks for any of these PCs' tag skills, traits, gear, or background. Pair with the fallout-rpg skill for the underlying 2d20 mechanics; the party also fits the fallout-machine-frequency adventure module well.
metadata:
  source: "Custom pregens for Fallout - The Roleplaying Game (Modiphius 2d20)"
  system: "Modiphius 2d20"
  scope: "Six complete Level 1-3 player characters with full stats, gear, perks, and biographies."
version: 1.0.0
author:
  name: Ola Hungerford
license: CC-BY-4.0
source: https://github.com/olaservo/agent-skills-ttrpg-demo/tree/main/mcp/fallout-helper/skills/fallout-ttrpg/fallout-character-sheets
license_note: >
  Six original pre-generated player characters. Backstories, names,
  personalities, and creative content are the author's own. The skill uses
  Modiphius 2d20 mechanics (S.P.E.C.I.A.L., perks, traits) via the fallout-rpg
  skill but does not derive from any published Fallout adventure or pregen.
derived_from:
  - title: "Fallout: The Roleplaying Game (Core Rulebook)"
    publisher: Modiphius Entertainment
    year: 2021
    relationship: system
    license: proprietary
    rights_basis: fair_use_reading_aid
    url: https://www.modiphius.net/products/fallout-the-roleplaying-game
  - title: "fallout-rpg"
    publisher: Ola Hungerford
    year: 2026
    relationship: system_encoding
    license: CC-BY-4.0
    url: https://github.com/olaservo/agent-skills-ttrpg-demo/tree/main/mcp/fallout-helper/skills/fallout-ttrpg/fallout-rpg
own_contributions:
  - Six original pre-generated player characters with full sheets, biographies, and inventories
  - Picker logic for matching players to characters by play style
  - Composition guidance for pairing the party with the fallout-machine-frequency adventure
---

# Fallout Pre-Generated Characters

This skill provides six ready-to-play **player characters** for *Fallout: The Roleplaying Game* (Modiphius 2d20). Every sheet is fully filled in - S.P.E.C.I.A.L., skills with tagged ones marked, weapons with TN/damage/qualities, hit-location HP and DR, perks and traits with full effect text, inventory with weights, ammo counts, and a biography. The full sheet for each PC lives in `references/`; this file is just the index plus the gotchas you need before handing a sheet to a player. For dice resolution, AP, Luck, and combat math, pair with the `fallout-rpg` skill.

## Roster at a glance

| Sheet | Name | Origin | Lvl | Defining stat / trait | One-line hook |
|---|---|---|:---:|---|---|
| `01-augusta-byron.md` | Augusta Byron | Vault Dweller (Vault 75) | 1 | INT 9; Hacker; tag: Lockpick / Science / Small Guns / Sneak | Brilliant escapee from a vault that murdered its graduates; chasing AI research. |
| `02-happy-tommy-doyle.md` | "Happy" Tommy Doyle | Survivor (Diamond City) | 2 | CHA 7, LUK 7; Heavy Handed + Scoundrel; tag: Barter / Speech / Unarmed | Charming Diamond City gambler venturing the wasteland to pay off a crushing debt. |
| `03-bailey-bigsmile.md` | Bailey Bigsmile | Ghoul | 3 | END 7; Necrotic Post-Human + Faster Healing; tag: Athletics / Explosives / Small Guns / Survival | Scarred but sharp-minded ghoul, fearing the day he goes feral, hunting for his missing father. |
| `04-old-tallman.md` | Old Tallman | Super Mutant | 2 | STR 9, END 8; Forced Evolution + Comprehension; tag: Melee Weapons / Survival / Throwing | Centuries-old hermit philosopher emerging from sixty years of solitude with new wanderlust. |
| `05-hazel-johnson.md` | Hazel Johnson | Brotherhood Initiate (Field Scribe) | 1 | INT 7, balanced stats; The Chain That Binds + Healer + Multi-Tool; tag: Medicine / Repair | Brotherhood field-medic-turned-scout, deployed from Vault 95. |
| `06-marvin.md` | Marvin | Mister Handy robot | 2 | STR 8, CHA 7; Mister Handy Robot + Slayer; tag: Big Guns / Melee Weapons / Speech | Late-model Handy that achieved self-awareness during the war; charming on the surface, plotting robotic revolution underneath. |

The party covers a wide spread of origins (Vault Dweller, Survivor, Ghoul, Super Mutant, Brotherhood Initiate, Mister Handy) and is balanced across combat, social, support, and tech roles. Use the picker at the bottom to match players to characters.

## Read this first - gotchas

Hand a sheet to a player without explaining these and you will be answering rules questions all night.

- **Bailey is a Ghoul.** All hit locations are `Imm.` for Radiation - he doesn't take rad damage, he heals from it. He is, however, vulnerable to other damage types like anyone else. Most relevant in Bleakford or any rad-soaked area.
- **Old Tallman is a Super Mutant.** Poison and Radiation are both `Imm.` everywhere. STR 9 plus +2 Melee Damage makes him the swing-for-the-fences melee threat. He is also massive, which the GM should reflect in narration (cover lines, Sneak penalties, NPC reactions).
- **Marvin is a Mister Handy.** This sheet does not work like a human one and will trip up any player coming from the Fallout video games:
  - Hit locations are **Optics / Arm 1 / Arm 2 / Main Body / Arm 3 / Thruster**, not Head / Torso / Limbs.
  - Carry weight is fixed at **150 lbs** and is *not* increased by STR or perks (only by modified armor).
  - He is `Imm.` to Poison and Radiation. He cannot use chems, food, drink, or rest, and **cannot heal HP without repairs** - a Stimpak does nothing for him. Plan a Repair-skilled ally accordingly.
  - He has three swappable arm attachments (Pincer / Buzz-saw / Flamer); switching is in-fiction action time, not a free swap.
- **Hazel's "The Chain That Binds" trait imposes Brotherhood duty.** Refusing a lawful order from a higher-ranking Brotherhood member has mechanical and roleplay consequences. This matters a lot in any adventure with Brotherhood NPCs.
- **Augusta's V.A.T.S. perk is the trait version**, not the videogame system - she just ignores the difficulty increase for targeting a hit location.
- **Tag skills appear in the `Tag` column with an `X`.** A tag skill grants +1 to that skill (already baked into the printed Rank) and reduces the test's complication range. Reminder for the `fallout-rpg` skill when adjudicating.
- **Sheets do not include party relationships.** Pick connections during session zero before play; the bios establish individual motivation but not shared history.

## References map - load on demand

| Load this file | When |
|---|---|
| `references/01-augusta-byron.md` | A player picks Augusta, the GM needs her stats/inventory/biography, or any roll involves her tagged skills (Lockpick / Science / Small Guns / Sneak) |
| `references/02-happy-tommy-doyle.md` | A player picks Tommy, the GM needs his stats/inventory/biography, or social/gambling/unarmed scenes turn on his tagged skills (Barter / Speech / Unarmed) |
| `references/03-bailey-bigsmile.md` | A player picks Bailey, the GM needs his stats/inventory/biography, the party hits irradiated terrain, or scenes turn on his tagged skills (Athletics / Explosives / Small Guns / Survival) |
| `references/04-old-tallman.md` | A player picks Tallman, the GM needs his stats/inventory/biography, or scenes turn on melee, wilderness, or thrown-weapon use |
| `references/05-hazel-johnson.md` | A player picks Hazel, the GM needs her stats/inventory/biography, the party needs medical or technical support, or any Brotherhood NPC enters the scene |
| `references/06-marvin.md` | A player picks Marvin, the GM needs his stats/inventory/biography, or any robot-specific question (hit locations, carry weight, repair vs. heal, arm attachments) comes up |
| All six | The user asks for the full party roster, party-balance analysis, or wants an overview before assigning sheets |

## How this skill composes

- **With `fallout-rpg` (required for play).** Every roll these sheets imply - skill tests, AP spends, Luck options, combat resolution, hit-location targeting, healing - is governed by `fallout-rpg`. When a sheet lists "Small Guns TN 7", the *resolution* is `fallout-rpg`'s 2d20 loop. Always load `fallout-rpg` alongside this skill once play actually starts.
- **With `fallout-machine-frequency` (recommended fit).** This party slots into Machine Frequency naturally:
  - Hazel's Brotherhood ties give Scribe Galen Portno an instant in-faction hook.
  - Marvin's self-aware-robot theme mirrors Dr. Trestridge's brain-transfer plot - moral complications baked in.
  - Bailey's radiation immunity makes Bleakford much more survivable for the party.
  - Old Tallman and Tommy bring muscle and social glue, respectively.

  Treat the party as the default pregens for that adventure, but the skill stands alone for any Fallout 2d20 game.

## Picking a character (player-facing prompt)

When a player asks "which one should I play?", ask what they want from the table, then map:

- **Sneaky / cerebral / hacker** -> **Augusta Byron** (INT 9, Sneak + Lockpick + Science).
- **Talker / face / risk-taker** -> **"Happy" Tommy Doyle** (CHA 7, Barter + Speech, plus Luck 7 to bend rolls).
- **Tough survivor / mid-range gunner** -> **Bailey Bigsmile** (END 7, Survival + Small Guns, eats radiation).
- **Front-line bruiser / wilderness warrior** -> **Old Tallman** (STR 9, Melee + Throwing, Super Mutant resilience).
- **Support / medic / faction-flavoured** -> **Hazel Johnson** (Medicine + Repair, Brotherhood ties).
- **Weird / robotic / unsettling** -> **Marvin** (different rules, jet propulsion, three weapon arms, hidden agenda).
