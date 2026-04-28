/**
 * @file Character sheet placeholder UI. Renders a static TODO card; the only
 * dynamic piece is the hint line, which echoes the character ID supplied by
 * the agent so it's visible the wiring is correct.
 */
import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import "./pip-boy.css";
import "./character-app.css";

interface CharacterPlaceholder {
  characterId: string;
  todo: string;
}

const pipboy = document.getElementById("pipboy")!;
const hintEl = document.getElementById("hint")!;

function handleHostContextChanged(ctx: McpUiHostContext): void {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
}

const app = new App({ name: "Fallout Character Sheet", version: "0.1.0" });

app.onerror = (e) => console.error("[character-app]", e);

app.ontoolresult = (toolResult) => {
  const sc = (toolResult as CallToolResult).structuredContent as
    | CharacterPlaceholder
    | undefined;
  if (sc?.characterId) {
    hintEl.textContent = `Character ID: ${sc.characterId} — ${sc.todo}`;
  }
  reportSize();
};

app.onhostcontextchanged = handleHostContextChanged;

function reportSize(): void {
  requestAnimationFrame(() => {
    const height = pipboy.scrollHeight + 32;
    app.sendSizeChanged({ height }).catch(() => {});
  });
}

app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) handleHostContextChanged(ctx);
  reportSize();
});
