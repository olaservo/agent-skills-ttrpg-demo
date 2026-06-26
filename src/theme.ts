/**
 * Game-driven companion theme. The companion frame is no longer hardcoded to one game's
 * aesthetic — the ACTIVE game (inferred from which game-specific tool last fired) selects a
 * palette, applied as CSS custom properties on :root. Fallout keeps its Pip-Boy green; WR&M
 * gets a warm parchment/candlelit look; anything unknown falls back to a neutral dark theme.
 *
 * To add a game: add a Theme entry + map its tools in `gameForTool`. (A fuller version would
 * have the skill DECLARE its theme and the server serve it; this keeps the mapping in one place.)
 */
export type GameId = "fallout" | "wrm" | "default";

export interface Theme {
  bg: string;
  panel: string;
  fg: string;
  border: string;
  borderSoft: string;
  player: string;
  glow: string;
  gradTop: string;
  optBorder: string;
  optBg: string;
  playerText: string;
  dmText: string;
  font: string;
}

export const THEMES: Record<GameId, Theme> = {
  // Fallout — Pip-Boy green-on-dark (the original look).
  fallout: {
    bg: "#05140a", panel: "#040f08", fg: "#7CFC8A", border: "#143a22", borderSoft: "#0d2616",
    player: "#5ad1ff", glow: "#2f8", gradTop: "#0b2a16", optBorder: "#2f8a4a",
    optBg: "rgba(47,138,74,0.08)", playerText: "#b8f0c4", dmText: "#dffbe6", font: "monospace",
  },
  // Warrior, Rogue & Mage — warm parchment / candlelit fantasy.
  wrm: {
    bg: "#1a130c", panel: "#140e08", fg: "#e7cf9b", border: "#4a361d", borderSoft: "#2c2012",
    player: "#9ec5ff", glow: "#d8a23f", gradTop: "#2a1d0e", optBorder: "#7a5a30",
    optBg: "rgba(170,130,70,0.10)", playerText: "#d8c39a", dmText: "#f0e2c2",
    font: "Georgia, 'Times New Roman', serif",
  },
  // Neutral fallback for any unknown / no game yet.
  default: {
    bg: "#0e0e11", panel: "#0a0a0d", fg: "#d6d6db", border: "#2a2a31", borderSoft: "#1c1c22",
    player: "#7fb3ff", glow: "#888", gradTop: "#17171c", optBorder: "#3a3a42",
    optBg: "rgba(160,160,170,0.08)", playerText: "#c7c7cf", dmText: "#e8e8ee",
    font: "system-ui, sans-serif",
  },
};

const VAR: Record<keyof Theme, string> = {
  bg: "--bg", panel: "--panel", fg: "--fg", border: "--border", borderSoft: "--border-soft",
  player: "--player", glow: "--glow", gradTop: "--grad-top", optBorder: "--opt-border",
  optBg: "--opt-bg", playerText: "--player-text", dmText: "--dm-text", font: "--font",
};

/** Which game a tool belongs to, or null for game-agnostic tools (present_player_choice, etc.). */
export function gameForTool(toolName: string | undefined): GameId | null {
  if (!toolName) return null;
  const t = toolName.toLowerCase();
  if (t.includes("wrm")) return "wrm";
  if (t.includes("roll_dice") || t.includes("show_character_sheet")) return "fallout";
  return null;
}

/** Apply a game's palette as CSS variables on :root (idempotent). */
export function applyTheme(game: GameId): void {
  const theme = THEMES[game] ?? THEMES.default;
  const root = document.documentElement;
  for (const key of Object.keys(theme) as (keyof Theme)[]) {
    root.style.setProperty(VAR[key], theme[key]);
  }
}
