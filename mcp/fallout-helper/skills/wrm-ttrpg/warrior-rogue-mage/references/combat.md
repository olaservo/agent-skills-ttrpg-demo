# Combat

Combat in WR&M reuses the standard attribute-check loop. There is no separate "to-dodge" roll:
**the defender's Defense is a static target number** the attacker must meet or beat.

## Initiative

When combat starts, decide which side acts first. **In most cases common sense dictates
initiative** (the ambusher, the quicker party). If the GM is unsure, each side rolls a die; the
**higher result acts first**.

*Optional:* a character with the **Awareness** skill adds +2 to the initiative roll.

## Combat actions

Combat turns are short - a few seconds. A character can perform **a few reasonable actions** per
turn: e.g. running a short distance, drawing a weapon, attacking a foe, or casting a spell.

## Attack roll

An attack works like any other attribute check, but the **DL is always the target's Defense**
(plus any applicable modifiers). Use:

- **Warrior** for melee/close attacks, **Rogue** for ranged attacks (and a Rogue weapon like a
  dagger). Add **+2** if the character knows the relevant weapon skill - and that skill lets the
  **attack roll explode** on a 6.
- **Result ≥ target's Defense → hit.** Then roll damage.

> Example: a thief backstabs a guard with a dagger. The dagger uses the Rogue attribute; the
> thief knows Daggers, so he adds +2 and his attack can explode. He must meet or beat the
> guard's Defense.

**Ranged note:** when the target is farther than **half a weapon's Maximum Range**, the attack
DL is increased by **4**. This modifier does **not** apply to daggers or throwing stars. (See
weapon ranges in `equipment.md`.)

**Circumstantial modifiers:** the GM may raise or lower the DL for cover, lighting, a
master-crafted weapon, lack of tools, etc.

## Damage and healing

After a hit, roll the **weapon's damage** (see `equipment.md`). **Damage rolls are always
subject to the exploding-die rule** - a 6 adds 6 and rolls again. Subtract the damage from the
target's hit points.

- **HP may never drop below 0.** If HP drops **to 0**, the character is **dead or dying**.
- *Optional - serious wounds:* a character reduced to **under half** their maximum HP is
  **seriously wounded** and takes a **-3 modifier on all attribute checks** until healed.

### Healing

- A resting character heals **HP equal to their highest attribute per day of rest.** Only light
  activity is allowed during that time.
- A character who takes part in **combat, a chase, or similar strenuous activity** that day heals
  only **1 HP** that day.
- A character treated by someone with the **Herbalism** skill heals an **extra 2 HP per day of
  rest**.
- Magic can also heal - see *Healing Hand* / *Healing Light* in `magic.md`. A fallen character
  can even be revived with the 4th-circle *Return Life* spell while the body is intact and warm.

## Non-combat damage

Falls, poison, fire, and drowning are handled as hazards - see `game-mastering.md`.

## Magic in combat

Casting a spell is a combat action. Magic attacks (Frostburn, Lightning Bolt, Firebolt, etc.)
follow the spell's description; some are touch attacks (resolve as an attack roll vs Defense),
others are missile spells that simply hit for their listed damage. The **Channeller** talent
adds the caster's Mage level to magic-attack damage once per combat. See `magic.md`.
