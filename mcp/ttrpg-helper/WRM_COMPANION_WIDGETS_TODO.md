# TODO — WR&M companion widgets (dice tray + character sheet)

**Branch:** `feat/wrm-companion-widgets` (off `feat/rename-ttrpg-server`). Created 2026-06-26.

## Problem
WR&M runs (rules via `read_skill`, voices, narration) but shows **no companion UI** at `:5173`.
The Fallout tools render widgets; the WR&M tools don't, and the existing widgets are Fallout-shaped.

Verified in `server.ts`:
- Fallout `roll_dice` / `show_character_sheet` return `_meta: { ui: { resourceUri: DICE_UI_URI } }`
  (`ui://ttrpg-helper/dice-roll.html`) / `SHEET_UI_URI` — that's what makes the companion render a widget.
- **`roll_wrm` and `show_wrm_character_sheet` only `publishToolEvent(...)` and return
  `{ content, structuredContent }` — NO `_meta.ui.resourceUri`.** So the companion gets an event but
  no widget to render.
- The existing widgets are Fallout-shaped anyway: `dice-roll.html` (`src/dice-app.ts`) expects the d20
  `annotated` faces; `character-sheet.html` (`src/character-app.ts`) expects S.P.E.C.I.A.L.
  WR&M is different: exploding **d6** (`rollMode`, `explodeEnabled`, `initialDice`, `keptInitial`,
  `explosions`, `dieTotal`, `total`, `passed`, `margin`) and a **3-attribute** sheet
  (Warrior/Rogue/Mage; HP/Mana/Fate/Defense; skills/talents/spells — no levels, no S.P.E.C.I.A.L.).

## Plan (pick one)
**Option A — dedicated WR&M widgets (cleaner visually):**
- Add `wrm-dice.html` (`src/wrm-dice-app.ts`) — an exploding-d6 tray rendering the `roll_wrm` shape.
- Add `wrm-sheet.html` (`src/wrm-character-app.ts`) — a WR&M sheet card (3 attributes, derived stats).
- Add `WRM_DICE_UI_URI = "ui://ttrpg-helper/wrm-dice.html"` + `WRM_SHEET_UI_URI`, register them as
  app resources (mirror the Fallout `registerAppResource` calls), and add the `INPUT=wrm-dice.html` /
  `INPUT=wrm-sheet.html` vite build steps.
- Attach `_meta: { ui: { resourceUri: WRM_DICE_UI_URI } }` to `roll_wrm` and `WRM_SHEET_UI_URI` to
  `show_wrm_character_sheet` (and include `resourceUri` in their `publishToolEvent`).

**Option B — generalize the existing widgets (less new code):**
- Make `dice-app.ts` / `character-app.ts` branch on the payload shape (Fallout vs WR&M) and render
  accordingly; reuse `DICE_UI_URI` / `SHEET_UI_URI`; just attach `_meta.ui` to the WR&M tools.
- Downside: one widget doing two games; styling stays Pip-Boy unless themed per payload.

Recommend **A** for a distinct WR&M look (the Pip-Boy aesthetic doesn't fit fantasy).

## Companion note
`reachy-dm-companion/phone` derives the widget URL from the URI's last path segment
(`serverBase.ts` `widgetUrl` = `split("/").pop()`), so a new `wrm-dice.html` URI works with no
companion change — it just fetches `/widgets/wrm-dice.html`. (Transcript/event handling already generic.)

## Verify
Build, serve, install the `wrm` skillbook, run a WR&M session: `roll_wrm` shows the d6 tray and
`show_wrm_character_sheet` shows the WR&M card on the companion at `:5173`; faces/values match the
narrated result (watch for the same settle-timer desync class as the Fallout dice fix).
