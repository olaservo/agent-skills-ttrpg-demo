/**
 * @file Warrior, Rogue & Mage character sheet UI (parchment themed). Receives a
 * parsed character (typed header + body markdown) from the
 * `show_wrm_character_sheet` server tool and renders it: name/race/concept strip
 * + the three attributes (Warrior/Rogue/Mage) + derived stats (HP/Mana/Fate/
 * Defense) + portrait + marked-rendered body (Skills / Talents / Weapons /
 * Spells / Inventory / Biography). The fantasy analogue of character-app.ts.
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
import "./wrm-theme.css";
import "./wrm-character-app.css";

import brannicPortrait from "./portraits/wrm/01-brannic-caldermoor.svg";
import pipPortrait from "./portraits/wrm/02-pip-underbough.svg";
import lyrandelPortrait from "./portraits/wrm/03-lyrandel-mistweaver.svg";
import durgaPortrait from "./portraits/wrm/04-durga-ironhand.svg";
import vashkPortrait from "./portraits/wrm/05-vashk-bloodmane.svg";
import aureliaPortrait from "./portraits/wrm/06-aurelia-vane.svg";

const PORTRAITS: Record<string, string> = {
  "brannic-caldermoor": brannicPortrait,
  "pip-underbough": pipPortrait,
  "lyrandel-mistweaver": lyrandelPortrait,
  "durga-ironhand": durgaPortrait,
  "vashk-bloodmane": vashkPortrait,
  "aurelia-vane": aureliaPortrait,
};

interface ParsedWrmCharacter {
  characterId: string;
  name: string;
  race: string;
  concept: string;
  attributes: {
    warrior: number;
    rogue: number;
    mage: number;
  };
  hp: number;
  mana: number;
  fate: number;
  defenseBase: number;
  defense: number;
  armorPenalty: number;
  skills: string[];
  talents: string[];
  spells: string[];
  markdown: string;
}

// GFM enables pipe-tables; breaks=false keeps the markdown line-wrapping intact.
marked.use({ gfm: true, breaks: false });

// ── DOM refs ──────────────────────────────────────────────────────────────
const root = document.getElementById("wrm")!;
const statusEl = document.getElementById("status")!;
const hudEl = document.getElementById("hud")!;
const bodyEl = document.getElementById("body")!;
const emptyEl = document.getElementById("empty")!;
const nameEl = document.getElementById("char-name")!;
const raceEl = document.getElementById("char-race")!;
const conceptEl = document.getElementById("char-concept")!;
const attrsList = document.getElementById("char-attrs")!;
const hpEl = document.getElementById("char-hp")!;
const manaEl = document.getElementById("char-mana")!;
const fateEl = document.getElementById("char-fate")!;
const defenseEl = document.getElementById("char-defense")!;
const portraitEl = document.getElementById("portrait") as HTMLImageElement;
const sheetMdEl = document.getElementById("sheet-md")!;

function setStatus(text: string): void {
  statusEl.textContent = text;
}

function renderCharacter(c: ParsedWrmCharacter): void {
  nameEl.textContent = c.name;
  raceEl.textContent = c.race;
  conceptEl.textContent = c.concept;

  for (const [attr, value] of Object.entries(c.attributes)) {
    const target = attrsList.querySelector<HTMLElement>(`[data-attr="${attr}"]`);
    if (target) target.textContent = String(value);
  }

  hpEl.textContent = String(c.hp);
  manaEl.textContent = String(c.mana);
  fateEl.textContent = String(c.fate);
  // Show the effective defense; note the base in the title when armor raised it.
  defenseEl.textContent = String(c.defense);
  defenseEl.title =
    c.defense !== c.defenseBase ? `${c.defenseBase} base → ${c.defense} with armor/shield` : "";

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
  setStatus("Ready");
}

function handleHostContextChanged(ctx: McpUiHostContext): void {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
}

const app = new App({ name: "Warrior Rogue & Mage Character Sheet", version: "0.1.0" });

app.onerror = (e) => console.error("[wrm-character-app]", e);

app.ontoolresult = (toolResult) => {
  const sc = (toolResult as CallToolResult).structuredContent as ParsedWrmCharacter | undefined;
  if (!sc) {
    setStatus("Error");
    return;
  }
  try {
    renderCharacter(sc);
  } catch (err) {
    console.error("[wrm-character-app] render failed:", err);
    setStatus("Error");
  }
  reportSize();
};

app.onhostcontextchanged = handleHostContextChanged;

function reportSize(): void {
  requestAnimationFrame(() => {
    const width = root.scrollWidth;
    const height = root.scrollHeight + 32;
    app.sendSizeChanged({ width, height }).catch(() => {});
  });
}

app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) handleHostContextChanged(ctx);
  setStatus("Standby");
  reportSize();
});
