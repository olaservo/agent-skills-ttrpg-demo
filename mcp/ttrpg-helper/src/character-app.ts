/**
 * @file Pip-Boy character sheet UI. Receives a parsed character (typed
 * header + body markdown) from the `show_character_sheet` server tool and
 * renders it: status strip + S.P.E.C.I.A.L. row + portrait + marked-rendered
 * body sections (Combat / Skills / Weapons / Perks / Inventory / Biography).
 */
import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { marked } from "marked";
import "./pip-boy.css";
import "./character-app.css";

import augustaPortrait from "./portraits/01-augusta-byron.svg";
import tommyPortrait from "./portraits/02-happy-tommy-doyle.svg";
import baileyPortrait from "./portraits/03-bailey-bigsmile.svg";
import tallmanPortrait from "./portraits/04-old-tallman.svg";
import hazelPortrait from "./portraits/05-hazel-johnson.svg";
import marvinPortrait from "./portraits/06-marvin.svg";

const PORTRAITS: Record<string, string> = {
  "augusta-byron": augustaPortrait,
  "tommy-doyle": tommyPortrait,
  "bailey-bigsmile": baileyPortrait,
  "old-tallman": tallmanPortrait,
  "hazel-johnson": hazelPortrait,
  marvin: marvinPortrait,
};

interface ParsedCharacter {
  characterId: string;
  name: string;
  origin: string;
  level: number;
  luckPoints: number;
  maxHP: number;
  special: {
    str: number;
    per: number;
    end: number;
    cha: number;
    int: number;
    agi: number;
    luk: number;
  };
  markdown: string;
}

// GFM enables pipe-tables; breaks=false keeps the markdown line-wrapping
// intact (single line breaks are not <br> tags).
marked.use({ gfm: true, breaks: false });

// ── DOM refs ──────────────────────────────────────────────────────────────
const pipboy = document.getElementById("pipboy")!;
const statusEl = document.getElementById("status")!;
const hudEl = document.getElementById("hud")!;
const bodyEl = document.getElementById("body")!;
const emptyEl = document.getElementById("empty")!;
const nameEl = document.getElementById("char-name")!;
const originEl = document.getElementById("char-origin")!;
const levelEl = document.getElementById("char-level")!;
const luckEl = document.getElementById("char-luck")!;
const hpEl = document.getElementById("char-hp")!;
const specialList = document.getElementById("char-special")!;
const portraitEl = document.getElementById("portrait") as HTMLImageElement;
const sheetMdEl = document.getElementById("sheet-md")!;

function setStatus(text: string): void {
  statusEl.textContent = text;
}

function renderCharacter(c: ParsedCharacter): void {
  nameEl.textContent = c.name.toUpperCase();
  originEl.textContent = c.origin.toUpperCase();
  levelEl.textContent = String(c.level);
  luckEl.textContent = String(c.luckPoints);
  hpEl.textContent = String(c.maxHP);

  for (const [stat, value] of Object.entries(c.special)) {
    const target = specialList.querySelector<HTMLElement>(`[data-stat="${stat}"]`);
    if (target) target.textContent = String(value);
  }

  const portraitUrl = PORTRAITS[c.characterId];
  if (portraitUrl) {
    portraitEl.src = portraitUrl;
    portraitEl.alt = `${c.name} portrait`;
    portraitEl.hidden = false;
  } else {
    portraitEl.removeAttribute("src");
    portraitEl.hidden = true;
  }

  // marked is configured sync (no `async: true`), so `.parse` returns a string.
  // Source markdown comes from our own repo files — no untrusted-HTML concern.
  sheetMdEl.innerHTML = marked.parse(c.markdown) as string;

  hudEl.hidden = false;
  bodyEl.hidden = false;
  emptyEl.hidden = true;
  setStatus("READY");
}

function handleHostContextChanged(ctx: McpUiHostContext): void {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
}

const app = new App({ name: "Fallout Character Sheet", version: "0.2.0" });

app.onerror = (e) => console.error("[character-app]", e);

app.ontoolresult = (toolResult) => {
  const sc = (toolResult as CallToolResult).structuredContent as ParsedCharacter | undefined;
  if (!sc) {
    setStatus("ERROR");
    return;
  }
  try {
    renderCharacter(sc);
  } catch (err) {
    console.error("[character-app] render failed:", err);
    setStatus("ERROR");
  }
  reportSize();
};

app.onhostcontextchanged = handleHostContextChanged;

function reportSize(): void {
  requestAnimationFrame(() => {
    const width = pipboy.scrollWidth;
    const height = pipboy.scrollHeight + 32;
    app.sendSizeChanged({ width, height }).catch(() => {});
  });
}

app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) handleHostContextChanged(ctx);
  setStatus("STANDBY");
  reportSize();
});
