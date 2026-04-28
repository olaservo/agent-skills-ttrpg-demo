# fallout-helper-mcp

MCP App server for *Fallout: The Roleplaying Game* (Modiphius 2d20 system). Provides:

- **`roll_dice`** — server-side 2d20 skill test, with a Pip-Boy-themed animated UI resource.
- **`show_character_sheet`** — placeholder UI resource for a character profile sheet (data model TODO).

This server replaces the Python `scripts/roll_test.py` that the `fallout-rpg` agent skill previously shelled out to.

## Install in an MCP client (stdio)

Local development config:

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
npm test                # vitest dice mechanics
npm run start           # HTTP transport on http://localhost:3001/mcp
npm run start:stdio     # stdio transport
```

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

### `show_character_sheet`

Placeholder. Returns a TODO card. The full character data model is intentionally not implemented yet.

## Layout

```
.
├── server.ts             # createServer() — registers tools and resources
├── main.ts               # entrypoint: stdio or Streamable HTTP
├── dice-roll.html        # Vite input → dist/dice-roll.html
├── character-sheet.html  # Vite input → dist/character-sheet.html
├── dice/
│   ├── roll.ts           # pure dice mechanics (port of roll_test.py)
│   └── roll.test.ts
└── src/
    ├── dice-app.ts       # client-side App for dice UI
    ├── character-app.ts  # client-side App for sheet UI
    ├── pip-boy.css
    ├── dice-app.css
    └── character-app.css
```
