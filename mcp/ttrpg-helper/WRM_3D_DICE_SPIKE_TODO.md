# TODO — WR&M 3D dice spike (Three.js exploding d6)

**Branch:** `feat/wrm-3d-dice-spike` (off `feat/wrm-companion-widgets`). Created 2026-06-25.
**Status:** spike / exploration. The 2D parchment tray (`wrm-dice.html`) is the shipping default;
this is an optional "wow" upgrade to A/B against it. **Keep the 2D version as the fallback.**

## Idea
Render `roll_wrm` results as physically-tumbling 3D dice instead of the 2D CSS tray. The d6 is the
*easy* 3D die (a cube — unlike Fallout's d20), and exploding 6s map naturally to "another die
clatters into the tray." The phone companion at `:5173` already renders our widgets in an iframe;
the `ext-apps` Three.js example proves WebGL runs fine in that same MCP-App iframe plumbing.

## Reference
`ext-apps/examples/threejs-server` — a working MCP App that runs Three.js (React + `three` +
OrbitControls + bloom postprocessing, streaming preview) inside the App iframe.
- **Useful as proof** that WebGL + the `App`/`sendSizeChanged` plumbing we already use works.
- **Do NOT reuse as-is.** Its `show_threejs_scene` tool takes a `code` string and `eval`s arbitrary
  Three.js — wrong shape for us. We don't want the model authoring physics per roll. Build a
  **purpose-built** widget that consumes our structured roll result and shows dice landing on the
  values we already rolled.

## Design (proposed)
- New widget **`wrm-dice-3d.html`** + `src/wrm-dice-3d-app.ts`, a *parallel* widget to `wrm-dice.html`
  (don't replace it). Consumes the same `roll_wrm` `WrmRollResult` shape
  (`initialDice`, `keptInitial`, `explosions`, `rollMode`, `explodeEnabled`, `total`, `passed`,
  `margin`) — see `dice/wrm-roll.ts`.
- Swap is just a different `resourceUri`: add `WRM_DICE_3D_UI_URI` in `server.ts`, register the
  resource + allow-list in `main.ts` (`WIDGET_FILES`), and point `roll_wrm`'s
  `_meta.ui.resourceUri` (and `publishToolEvent`) at it. Could even feature-flag which one `roll_wrm`
  serves.
- **The hard part — "loaded dice":** dice must tumble realistically *and* settle on a predetermined
  face. Options:
  1. Rigid-body physics (`cannon-es` or `rapier`) for the tumble, then snap orientation to the known
     face at rest; or
  2. bias the initial throw so it lands correct (more fragile).
  A physics-settling desync is nastier than the 2D tumble-timer desync — budget for it.
- **Exploding chain:** drop the initial d6 (2 under advantage/disadvantage; highlight kept, dim
  dropped). On each `explosions[]` value, toss an additional gold-tinted die into the tray.
- **Theme:** reuse `src/wrm-theme.css` tokens (parchment/ink/gold) for chrome + summary; dice
  materials in the same palette.

## Costs / risks
- `three` is ~600 KB; current single-file widgets inline at ~340 KB. Bundle grows but stays viable.
- WebGL on the phone companion — verify perf on the actual device.
- More moving parts than the 2D tray; timebox the spike and bail to 2D if settling is unreliable.

## Verify
Build + serve, install the `wrm` skillbook, point `roll_wrm`'s widget at `wrm-dice-3d.html`, run a
WR&M session: dice tumble and settle on faces that match `keptInitial`/`explosions`; total/DL/
pass/margin match `formatHumanWrm`; exploding 6s and advantage/disadvantage read correctly. A/B
against the 2D tray on the phone (`:5173`).
