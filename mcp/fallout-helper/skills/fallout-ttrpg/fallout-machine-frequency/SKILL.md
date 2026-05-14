---
name: fallout-machine-frequency
description: Run or GM "Machine Frequency", a three-act Fallout - The Roleplaying Game adventure module. The PCs are recruited by elderly Brotherhood Scribe Galen Portno to rescue survivors of a downed Vertibird, follow the trail through the irradiated ghoul town of Bleakford, and confront an Enclave-remnant scientist (Dr. Akiva Trestridge) who is transferring her consciousness into an assaultron at Joint Base Lewiston. Activates when the user wants to play, prep, run, or look up content from Machine Frequency, the Vertibird crash, Listening Point Echo, Beriday Gulch, Kullen Bridge, Bleakford, Joint Base Lewiston, Scribe Galen, Knight Helen Layton, Knights Pierce/Macey, or Dr. Trestridge. Pair with the fallout-rpg skill for the underlying 2d20 mechanics (skill tests, AP, Luck, complications).

license: CC-BY-NC-SA-4.0
version: 0.2.0
skill_author:
  name: Ola Hungerford
  url: https://github.com/olaservo

depends_on:
  - fallout-rpg

scope: Complete three-act adventure encoding (locations, encounters, NPCs, plot beats) for GMs who own the published module. Pair with fallout-rpg for system rules.

sources:
  - title: fallout-rpg (sibling skill)
    publisher: Ola Hungerford
    url: https://github.com/olaservo/agent-skills-ttrpg-demo/tree/main/mcp/fallout-helper/skills/fallout-ttrpg/fallout-rpg
    relationship: system_encoding
    rights_basis: license_grant
    covers: 2d20 mechanics referenced in stat blocks, skill tests, and combat encounters
    license: CC-BY-4.0

  - title: "Fallout: The Roleplaying Game - Adventure Module Chapter Three: Machine Frequency"
    publisher: Modiphius Entertainment
    ip_holder: Bethesda Softworks
    year: 2022
    relationship: adventure_reading_aid
    rights_basis: fair_use_reading_aid
    covers: adventure structure, location summaries, NPC roles, plot beats, GM gotchas - all in author's own words; no read-aloud text, stat blocks, or maps reproduced verbatim
    notes: GM ownership of the published module is assumed. This skill is a navigational reading aid, not a replacement.

attribution: |
  Structural encoding of the Machine Frequency adventure for Fallout: The
  Roleplaying Game (Modiphius Entertainment), used as a reading aid for GMs
  who own the published module. No read-aloud text, stat blocks, or maps are
  reproduced verbatim. Skill compiled by Ola Hungerford, licensed
  CC-BY-NC-SA-4.0. Fallout is a trademark of Bethesda Softworks LLC;
  Machine Frequency is published by Modiphius Entertainment under license.
  This is an unofficial fan project; GMs should own the published module.

license_note: >
  This SKILL.md is the author's structural encoding of a published adventure
  for table-time reference. GM ownership of the published module is assumed;
  no read-aloud text, stat blocks, or maps are reproduced verbatim. The NC
  clause reflects that distributing this encoding commercially would require
  Modiphius's involvement; the SA clause keeps downstream encodings of
  Modiphius adventures on the same footing.
---

# Machine Frequency

A three-act adventure for *Fallout: The Roleplaying Game* (Modiphius 2d20). This skill is the **adventure content** - locations, encounters, NPCs, read-aloud text, loot. It pairs with the `fallout-rpg` skill, which provides the **system mechanics** (skill tests, AP, Luck, complications). When a scene calls for a roll, lean on `fallout-rpg`; when a scene calls for "what is here / who is here / what happens next", lean on this skill.

## Three-act arc

1. **Act One - Echo in the Gulch.** The PCs meet Scribe Galen at Listening Point Echo, learn that a Brotherhood Vertibird has been downed by an EMP attack over Beriday Gulch, cross treacherous Kullen Bridge, and fight Trestridge's protectrons at the crash site to rescue Knight Helen Layton.
2. **Act Two - Bleakford.** Galen has triangulated a strange broadcast to Bleakford, a small irradiated town crawling with feral ghouls. The PCs explore the town to find and disable Trestridge's signal booster (likely on the Slocum's Joe statue, but possibly the chapel, water tower, or radio antenna).
3. **Act Three - Shooting Skip.** The PCs reach Joint Base Lewiston, a robotics-focused military installation Trestridge has converted into her lair. Knights Pierce and Macey from Bunker 441 are already attacking. Trestridge attempts to transfer her brain into an assaultron mid-battle - the PCs may interrupt her, or fight her in robot form.

## Cast at a glance

- **Scribe Galen Portno** - elderly Brotherhood scribe, operator of Listening Point Echo. Gregarious, frail, comically over-packed. The PCs' patron.
- **Knight Helen Layton** - sole survivor of the downed Vertibird. Trapped, wounded, defiant.
- **Sam Breckinridge** - dead scavenger at Kullen Bridge. His journal hints at Trestridge's outpost.
- **Knights Pierce and Macey** - hotheaded knights from Bunker 441 already engaging Trestridge when the PCs arrive at Joint Base Lewiston.
- **Dr. Akiva Trestridge** - the antagonist. Enclave remnant, robotics expert, transferring her brain into an assaultron chassis to escape mortality.

## Read this first - GM gotchas

The adventure has a few moving parts that are easy to get wrong on a cold read.

- **The Vertibird crash is not random.** Trestridge's patrolling robots launched the EMP. This is the foreshadowing of Acts Two and Three - the same broadcast frequency keeps coming back. Don't blow it as "bad luck".
- **Bleakford is irradiated everywhere.** It's an `Ongoing Radiation hazard with an interval of 10 minutes` across the whole town, not just specific tiles. PCs without rad protection take ongoing damage even if they don't open anything. The irradiated dump is *additionally* an Occasional Hazard on top of that.
- **Knights Pierce and Macey are already fighting when Act Three opens.** They are pinned in the open in front of the bunker. The PCs walk into a battle in progress, not a setup encounter. Pace the scene accordingly - Trestridge is using cover from the bunker door and her two laser turrets are providing covering fire from turn one.
- **Trestridge's brain transfer is a two-turn window.** After her second activation she retreats inside to use the autodoc; the procedure takes two turns. PCs can hack the terminal (`INT + Science difficulty 3`), destroy the autodoc, or shoot her exposed brain. If they don't, she comes back out as Robot-Trestridge. See `references/stat-blocks.md` for all three target profiles (autodoc, brain, finished robot).
- **Multiple valid resolutions.** Sneaking past the robots into the bunker (`AGL + Sneak difficulty 4`), parleying with Pierce/Macey, surprise attacks, head-on fights - all designed in. Don't railroad toward "everyone fights everything".
- **The Galen-dies branch is supported.** If the PCs decline to help Galen in Act One, he dies on the road and Knight Layton becomes the patron instead (provided she survives the crash-site fight). Keep her alive if you sense the players are leaning that way. See "The Dead Scribe Problem" callout in `references/act-one-echo-in-the-gulch.md`.
- **Loot tables use search-state ratings** ("Mostly Searched", "Untouched", "Partially Searched"). These are Fallout 2d20 scavenging-system inputs. If your table doesn't know that system yet, treat the listings as rough item budgets per area.

## References map - load on demand

| Load this file | When |
|---|---|
| `references/overview.md` | The user wants the high-level synopsis, the campaign hook, or a list of ways to draw the PCs in |
| `references/act-one-echo-in-the-gulch.md` | Players are meeting Scribe Galen, crossing Kullen Bridge, exploring Sam's shanty, or fighting at the Vertibird crash site |
| `references/act-two-bleakford.md` | Players are travelling to, entering, or exploring Bleakford; rolling on the random encounter table; or hunting for the signal booster |
| `references/act-three-shooting-skip.md` | Players are approaching or assaulting Joint Base Lewiston, interacting with Pierce/Macey, confronting Trestridge, interrupting the brain transfer, or wrapping the campaign |
| `references/stat-blocks.md` | Any combat starts; the GM needs HP, weapons, defenses, attacks, or special abilities for protectrons, weakened/normal feral ghouls, putrid or toughened glowing ones, or Trestridge in any form (human, autodoc-vulnerable brain, or finished Robot-Trestridge) |

## How this skill composes with `fallout-rpg`

This skill tells you *what's in the scene*. The `fallout-rpg` skill tells you *how to resolve a roll within it*. When the adventure says "PER + Lockpick test, difficulty 1", that's a `fallout-rpg` skill test - 2d20, target = PER + Lockpick, count successes >= difficulty, etc. When the adventure says a robot has `BODY 5, MELEE 2, TN 7`, that's also `fallout-rpg` resolution math. Load `fallout-rpg` (or its `references/test-variants.md`, `references/action-points.md`, `references/luck.md` as needed) alongside this skill whenever play is actually in motion.
