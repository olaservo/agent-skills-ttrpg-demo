# Magic

Magic is common in WR&M. **Any character with a Mage attribute of 1 or higher can cast spells.**
The **Thaumaturgy** skill helps but is not required, especially for a few simple spells. The
range of all spells is **line of sight** unless the spell says otherwise.

## Learning and casting spells

- Spells can be **found or bought** (25 / 50 / 75 / 100 SP for 1st / 2nd / 3rd / 4th circle).
  They must first be **transcribed into the caster's personal spell book** before they can be
  used (a leatherbound spell book costs 20 SP; metal-plated 40 SP).
- To cast a spell from the book, make a **roll versus the spell's DL** (Mage attribute, + 2 for
  Thaumaturgy if known). On success, the caster's **mana pool is reduced** by the spell's cost.
- **Mage 0 → no casting at all**, not even the simplest spell.

## Circles, mana cost, and DL

Spells belong to four **circles** of increasing potency:

| Circle | Mana Cost | DL |
|:--:|:--:|:--:|
| 1st | 1 | 5 |
| 2nd | 2 | 7 |
| 3rd | 4 | 9 |
| 4th | 8 | 13 |

**Wearing armor adds the armor's Armor Penalty (AP) to the mana cost of every spell cast.** (The
*Armored Caster* talent reduces AP by 2 per pick; *Warmage Armor* has AP 0.)

## Spell enhancement

A caster may **enhance** a spell for a stronger effect. Each level of enhancement costs **half
the spell's initial mana cost (rounded up)** and **raises the casting DL by 1**. Per-spell
enhancements are listed with each spell below. Spells cast from an implement may also be
enhanced, but the extra mana comes from the caster's personal pool.

## Sustaining spells

Some spells can be held active beyond their normal duration (the description says so). To
**sustain**, the caster must concentrate; **all other actions taken while concentrating suffer a
-1 penalty**. The per-turn/per-minute mana cost to sustain is listed with the spell.

## Mana regeneration

- A **good night's sleep fully refreshes** the mana pool.
- **One hour of meditation** refreshes mana equal to the character's **Mage attribute**.
- Some **magic potions** also restore mana (Mana Potion: 1d6).

## Magic implements

A magic implement (staff, gauntlet, ring, amulet, wand, etc.) stores spells the user can later
cast **without spending personal mana**.

- The implement must be **charged** with mana first; that pool powers spells cast from it.
- While powered, it also grants a **Thaumaturgy bonus equal to its level**.
- It can hold **10 mana per level** of the item.
- **Charging is expensive:** storing 1 mana in the implement costs the caster **2** from their
  personal pool. Implements may be charged across multiple sessions.
- An implement stores spell **circles up to its level**: a level-3 implement can hold one
  3rd-circle spell, **or** one 2nd + one 1st, **or** three 1st-circle spells. A caster can only
  store spells they already know; a stored spell stays until replaced.
- Implement prices (by circle/level): 80 / 160 / 240 / 320 SP. See `equipment.md`.

## Spell list

The following are sample spells - the GM is encouraged to create more.

### First Circle (1 mana, DL 5)

- **Frostburn** - Touch attack causing **1d6-2** damage. Enhancement: +1 damage per level.
- **Healing Hand** - Heals **1d6 HP**; the caster must touch the target. Enhancement: +1 HP
  healed per level.
- **Magic Light** - Creates a magic light on a staff or weapon tip, illuminating a 10-yard
  radius like a torch. Enhancement can add: *ball of light* (a controllable floating ball);
  *colored light*; *light beam* (tight beam reaching 15 yards); *flash* (one round; blinds
  everyone who looks unprotected into the flash for 1d6 rounds). Shines for 1 hour or until
  dispelled; sustain for 1 additional mana per hour.
- **Sense Magic** - Senses the presence of magic in a 3-yard radius. Enhancement: +1 yard
  radius per level. Instantaneous, or sustain for 1 mana per minute.
- **Telekinesis** - Remotely move one item up to 1 kg. Enhancement: +1 kg per level. Lasts 1
  minute; sustain for 1 additional mana per minute.

### Second Circle (2 mana, DL 7)

- **Create Food and Water** - Creates one daily ration of food and water for one person.
- **Healing Light** - Heals **1d6 HP** without having to touch the target. Enhancement: +2 HP
  healed per level.
- **Identify** - Identify one magic property of an item. Enhancement: +1 property per level.
- **Levitation** - The caster slowly floats up and down for up to 3 minutes (sustain 1 mana per
  additional minute). No horizontal propulsion on its own.
- **Lightning Bolt** - Missile attack causing **1d6+2** damage. Enhancement: +2 damage per
  level.
- **Magic Armor** - A bubble around the caster absorbs damage. It has **4 HP** (each enhancement
  adds 4 more) until depleted or dispelled. Excess damage is not transferred.

### Third Circle (4 mana, DL 9)

- **Chain Lightning** - As Lightning Bolt, but can also strike multiple enemies within 5 yards
  of each other; same damage. Maximum 3 targets.
- **Air Walk** - The caster walks on air as if it were solid ground for up to 3 minutes; sustain
  1 minute per additional mana spent.
- **Firebolt** - Missile spell causing **3d6** damage in a 3-yard radius. Enhancement: improve
  damage by +2, **or** extend the radius by 2 yards (pay for each enhancement separately; both
  may be applied).
- **Enchant Weapon** - Temporarily enchants a weapon, granting its wielder **+2 to attack rolls
  and damage** for one combat encounter. Enhancement: +1 to both bonuses per level.
- **Stasis** - Touch attack that puts a target into stasis: time stands still for them (they
  cannot move, attack, or be attacked) for **one hour**. Enhancement: +1 hour per level.

### Fourth Circle (8 mana, DL 13)

- **Summon Earth Elemental** - Summons an Earth Elemental under the caster's control. It is
  destroyed when its HP are depleted or when dispelled. (Stat block in `bestiary.md`.)
- **Magic Step** - Teleport up to **10 yards** in any direction. Enhancement: +10 yards per
  level. No line of sight needed, but the caster must hold a clear mental image of the
  destination.
- **Use Moongate** - Open moongates at special places (e.g. stone circles) for instant travel
  over long distances. Moongates start to close after 2 minutes; they cannot be held open, nor
  opened more than once every 6 hours.
- **Return Life** - Revive one fallen character whose body is still intact and warm; the revived
  character is healed to **2 HP**. Enhancement: +2 HP healed per level.
- **Phantom Steed** - Calls a phantom steed that acts as a mount for **24 hours**, needs no rest,
  and can walk on water. Cannot be sustained; re-summon after 24 hours.

## Ritual magic

Higher-circle spells are beyond most casters (high DLs, high mana). With GM approval, a caster
may perform a spell as a **ritual**, taking longer in exchange for a lower DL:

| Circle | Minimum ritual time | Max participants |
|:--:|:--:|:--:|
| 1st | 1 min | 3 |
| 2nd | 5 min | 6 |
| 3rd | 15 min | 9 |
| 4th | 1 hour | 12 |

The mana cost stays the same and enhancement may be used, but the **casting DL is reduced by 1**
when the ritual is performed in the minimum time. If the casters take **double** the listed time,
the DL is reduced by **2**, and so on. When several people perform a ritual, they may **pool
their mana**; participants with **Blood Mage** can convert any participant's HP to mana.

## Blood magic

The **Blood Mage** talent lets a caster pay some or all of a spell's mana cost in **hit points**
instead. (Sacrificing living beings for power exists in the world but is a vile act left to
villains, not heroes.)

## Variant: Warrior, Rogue & Scholar (low-magic)

To run a lower-magic game: replace the **Mage** attribute with **Scholar** (a purely cosmetic
rename; skills that used Mage now use Scholar). To cast at all, a character must buy a new talent
**Spellcaster** (grants 1st-circle spells; restricted to basic spells at first). All other
magic-affecting talents (e.g. Blood Mage) require Spellcaster as a prerequisite. **Advanced
Spellcaster**, taken on advancement, grants access to the remaining circles. Disallowing
Spellcaster entirely lets you play with no magic at all.
