# fallout-helper-mcp

MCP App server for *Fallout: The Roleplaying Game* (Modiphius 2d20 system). Provides:

- **`roll_dice`** — server-side 2d20 skill test, with a Pip-Boy-themed animated UI resource.
- **`present_player_choice`** — pauses the game and surfaces a 2-6 option narrative decision to the human player as a structured form (via MCP elicitation).
- **`show_character_sheet`** — renders a Fallout pregen (one of six) in a Pip-Boy character sheet UI: name + origin + S.P.E.C.I.A.L. status strip, pixel-art portrait, and the full sheet body (skills / weapons / perks / hit-locations / inventory / biography) sourced from the `fallout-character-sheets` skill.

This server replaces the Python `scripts/roll_test.py` that the `fallout-rpg` agent skill previously shelled out to.

## Install

### MCPB (one-click, Claude Desktop)

Download `fallout-helper-mcp.mcpb` from a GitHub release and open it in Claude Desktop.

### Build from source

```json
{
  "mcpServers": {
    "fallout-helper": {
      "command": "bash",
      "args": [
        "-c",
        "cd /path/to/agent-skills-ttrpg-demo/mcp/fallout-helper && npm run build >&2 && node dist/index.js --stdio"
      ]
    }
  }
}
```

## Run

```bash
npm install
npm run build           # compile + bundle UI
npm test                # vitest: dice mechanics + character-sheet parser
npm run start           # HTTP transport on http://localhost:3001/mcp
npm run start:stdio     # stdio transport
```

## Packaging

`npm run pack` builds, prunes to production deps, and produces `fallout-helper-mcp.mcpb` at the package root via `@anthropic-ai/mcpb`. The script restores devDependencies after packing.

## Tools

### `roll_dice`

| Arg | Type | Default | Notes |
|---|---|---|---|
| `target` | int 1-20 | required | attribute + skill |
| `difficulty` | int 0-5 | required | successes needed to pass |
| `numDice` | int 1-5 | 2 | 1 for assist/group-helper rolls |
| `complicationRange` | int 1-5 | 1 | width of complication threshold |
| `seed` | int | — | optional reproducibility seed |

Returns `structuredContent` with `rolls`, per-die `annotated` tags, totals, `passed`, `apGenerated`. The linked UI animates the dice and displays the outcome in a Pip-Boy-styled CRT panel.

### `present_player_choice`

| Arg | Type | Default | Notes |
|---|---|---|---|
| `prompt` | string | required | narrative framing shown to the player |
| `options` | array of `{ id, label, description? }`, length 2-6 | required | mutually-exclusive choices; ids must be unique |
| `allowFreeText` | bool | true | adds an optional elaboration text field to the form |

Use at meaningful narrative branches (sneak vs. parley vs. assault), not for mechanical outcomes (those go through `roll_dice`) or pure flavor beats. Issues an MCP `elicitation/create` request — the host renders the form and blocks until the player picks. Returns `structuredContent` with `action: "accept" | "decline" | "cancel"`, plus `chosenId`, `chosenLabel`, and `elaboration` on accept. Falls back with an `isError` result if the connected client doesn't advertise the `elicitation` capability, prompting the agent to ask inline instead.

### `show_character_sheet`

| Arg | Type | Notes |
|---|---|---|
| `characterId` | enum | one of `augusta-byron`, `tommy-doyle`, `bailey-bigsmile`, `old-tallman`, `hazel-johnson`, `marvin` |

Reads the matching pregen Markdown from `skills/fallout-ttrpg/fallout-character-sheets/references/`, parses the headline stats (origin, level, S.P.E.C.I.A.L., max HP, luck points) into typed fields, and ships the rest as the `markdown` field of `structuredContent`. The UI renders the typed header into a Pip-Boy status strip + pixel-art SVG portrait, and renders the body markdown via `marked` with Pip-Boy-styled tables.

## Layout

```
.
├── server.ts                # createServer() — registers tools and resources
├── main.ts                  # entrypoint: stdio or Streamable HTTP
├── character-parser.ts      # parses pregen Markdown → typed header + body
├── character-parser.test.ts
├── dice-roll.html           # Vite input → dist/dice-roll.html
├── character-sheet.html     # Vite input → dist/character-sheet.html
├── dice/
│   ├── roll.ts              # pure dice mechanics (port of roll_test.py)
│   └── roll.test.ts
└── src/
    ├── dice-app.ts          # client-side App for dice UI
    ├── character-app.ts     # client-side App for sheet UI
    ├── pip-boy.css
    ├── dice-app.css
    ├── character-app.css
    ├── env.d.ts             # vite/client types (SVG imports)
    └── portraits/           # 24×24 pixel-art SVG portraits, one per pregen
```
