/**
 * @file Warrior, Rogue & Mage dice roller UI (parchment themed).
 *
 * WR&M rolls are single-die-additive with exploding 6s — a different system
 * from the Fallout 2d20 tray (see ./dice-app.ts). Lifecycle:
 *  1. App connects to host.
 *  2. Host fires ontoolinput with the roll arguments — we render the meta line
 *     and a skeleton initial die (two under advantage/disadvantage) and stash
 *     the args for re-roll.
 *  3. Host fires ontoolresult with the WrmRollResult — we animate the initial
 *     die(s) tumbling then settling (marking the kept vs dropped die under
 *     advantage/disadvantage), then reveal each exploding 6 as an added die in
 *     a chain, then fade in the total / DL / pass-fail summary.
 *
 * The per-die settle-timer pattern (each die owns its tumble interval, cleared
 * in settleDie before the real face is written) is copied from dice-app.ts to
 * avoid the same settle-timer desync the Fallout tray once had.
 */
import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import "./wrm-theme.css";
import "./wrm-dice-app.css";

type WrmRollMode = "normal" | "advantage" | "disadvantage";

interface WrmRollArgs {
  attribute: number;
  difficulty: number;
  skill?: boolean;
  bonus?: number;
  rollMode?: WrmRollMode;
  explode?: boolean;
  seed?: number;
}

interface WrmRollResult {
  attribute: number;
  skillBonus: number;
  bonus: number;
  difficulty: number;
  rollMode: WrmRollMode;
  explodeEnabled: boolean;
  initialDice: number[];
  keptInitial: number;
  explosions: number[];
  dieTotal: number;
  exploded: boolean;
  total: number;
  passed: boolean;
  margin: number;
}

/** A cell to render in the tray, in left-to-right order. */
interface DieCell {
  value: number;
  /** "initial" = a starting d6; "explode" = an added exploding d6. */
  role: "initial" | "explode";
  /** Under advantage/disadvantage, false marks the dropped initial die. */
  kept: boolean;
}

const TUMBLE_DURATION_MS = 800;
const TUMBLE_STAGGER_MS = 200;

// ── DOM refs ──────────────────────────────────────────────────────────────
const root = document.getElementById("wrm")!;
const statusEl = document.getElementById("status")!;
const metaEl = document.getElementById("meta")!;
const metaAttr = document.getElementById("meta-attr")!;
const metaSkill = document.getElementById("meta-skill")!;
const metaSkillDot = document.getElementById("meta-skill-dot")!;
const metaBonus = document.getElementById("meta-bonus")!;
const metaBonusDot = document.getElementById("meta-bonus-dot")!;
const metaDl = document.getElementById("meta-dl")!;
const metaMode = document.getElementById("meta-mode")!;
const metaModeDot = document.getElementById("meta-mode-dot")!;
const metaExplode = document.getElementById("meta-explode")!;
const metaExplodeDot = document.getElementById("meta-explode-dot")!;
const tray = document.getElementById("dice-tray")!;
const summary = document.getElementById("summary")!;
const dieTotalEl = document.getElementById("die-total")!;
const modsEl = document.getElementById("mods")!;
const totalEl = document.getElementById("total")!;
const dlEl = document.getElementById("dl")!;
const outcomeEl = document.getElementById("outcome")!;
const rerollBtn = document.getElementById("reroll") as HTMLButtonElement;

// ── State ────────────────────────────────────────────────────────────────
let lastInput: WrmRollArgs | null = null;
let serverToolsAvailable = false;
const tumbleTimers: number[] = [];

function updateRerollAvailability(): void {
  const enabled = serverToolsAvailable && lastInput !== null;
  rerollBtn.disabled = !enabled;
  rerollBtn.title = serverToolsAvailable
    ? ""
    : "Roll again unavailable — host has not granted serverTools capability.";
}

function clearTumbleTimers(): void {
  while (tumbleTimers.length > 0) {
    clearInterval(tumbleTimers.pop()!);
  }
}

function setStatus(text: string, rolling = false): void {
  statusEl.textContent = text;
  statusEl.classList.toggle("rolling", rolling);
}

function setMetaField(span: HTMLElement, dot: HTMLElement, text: string | null): void {
  if (text === null) {
    span.hidden = true;
    dot.hidden = true;
  } else {
    span.textContent = text;
    span.hidden = false;
    dot.hidden = false;
  }
}

function showMeta(args: WrmRollArgs): void {
  metaAttr.textContent = `Attribute ${args.attribute}`;
  setMetaField(metaSkill, metaSkillDot, args.skill ? "+2 skill" : null);
  const bonus = args.bonus ?? 0;
  setMetaField(
    metaBonus,
    metaBonusDot,
    bonus !== 0 ? `${bonus >= 0 ? "+" : "−"}${Math.abs(bonus)} bonus` : null,
  );
  metaDl.textContent = `DL ${args.difficulty}`;
  const mode = args.rollMode ?? "normal";
  setMetaField(metaMode, metaModeDot, mode !== "normal" ? mode : null);
  // Exploding is on iff a skill applies, unless explicitly overridden.
  const explodeEnabled = args.explode ?? Boolean(args.skill);
  setMetaField(metaExplode, metaExplodeDot, explodeEnabled ? "6s explode" : null);
  metaEl.hidden = false;
}

/** Build the ordered list of cells for a fully-resolved result. */
function cellsFor(result: WrmRollResult): DieCell[] {
  const cells: DieCell[] = [];
  if (result.rollMode === "normal") {
    cells.push({ value: result.keptInitial, role: "initial", kept: true });
  } else {
    // Two initial dice; mark which one was kept (highest/lowest). On a tie,
    // keep the first so exactly one cell is dropped.
    const [a, b] = result.initialDice;
    const keptIdx =
      result.rollMode === "advantage"
        ? a! >= b!
          ? 0
          : 1
        : a! <= b!
          ? 0
          : 1;
    result.initialDice.forEach((value, i) => {
      cells.push({ value, role: "initial", kept: i === keptIdx });
    });
  }
  for (const value of result.explosions) {
    cells.push({ value, role: "explode", kept: true });
  }
  return cells;
}

function buildDiceTray(cells: DieCell[]): HTMLElement[] {
  clearTumbleTimers();
  tray.innerHTML = "";
  const els: HTMLElement[] = [];
  cells.forEach((c, i) => {
    if (i > 0) {
      const op = document.createElement("span");
      op.className = "die-op";
      op.textContent = "+";
      tray.appendChild(op);
    }
    const cell = document.createElement("div");
    cell.className = `die tumbling ${c.role}`;
    cell.innerHTML = `
      <span class="face">?</span>
      <span class="chip"></span>
    `;
    tray.appendChild(cell);
    els.push(cell);
  });
  return els;
}

/** Build a skeleton (all "?", tumbling) from input args, before the result. */
function buildSkeletonTray(args: WrmRollArgs): HTMLElement[] {
  const mode = args.rollMode ?? "normal";
  const count = mode === "normal" ? 1 : 2;
  const cells: DieCell[] = Array.from({ length: count }, () => ({
    value: 0,
    role: "initial" as const,
    kept: true,
  }));
  const els = buildDiceTray(cells);
  startTumbling(els);
  return els;
}

function startTumbling(cells: HTMLElement[]): void {
  for (const cell of cells) {
    const face = cell.querySelector<HTMLElement>(".face")!;
    const t = window.setInterval(() => {
      face.textContent = String(1 + Math.floor(Math.random() * 6));
    }, 60);
    // Associate the timer with this specific die so settleDie can stop just
    // this die's tumble (otherwise a still-running tick clobbers an already
    // settled face — the desync class the Fallout tray fix addressed).
    cell.dataset.tumbleTimer = String(t);
    tumbleTimers.push(t);
  }
}

function settleDie(cell: HTMLElement, c: DieCell): void {
  const t = Number(cell.dataset.tumbleTimer);
  if (t) {
    clearInterval(t);
    delete cell.dataset.tumbleTimer;
  }
  const face = cell.querySelector<HTMLElement>(".face")!;
  const chip = cell.querySelector<HTMLElement>(".chip")!;
  cell.classList.remove("tumbling");
  face.textContent = String(c.value);

  cell.classList.toggle("dropped", !c.kept);
  let chipText = "";
  if (c.role === "explode") chipText = "EXPLODE";
  else if (!c.kept) chipText = "DROP";
  // A kept die showing 6 with exploding on triggers another die — flag it.
  if (c.value === 6) cell.classList.add("six");
  chip.textContent = chipText;
}

function settleDice(cells: HTMLElement[], descriptors: DieCell[]): Promise<void> {
  return new Promise((resolve) => {
    let settled = 0;
    cells.forEach((cell, i) => {
      window.setTimeout(() => {
        settleDie(cell, descriptors[i]!);
        settled += 1;
        if (settled === cells.length) {
          clearTumbleTimers();
          resolve();
        }
      }, TUMBLE_DURATION_MS + i * TUMBLE_STAGGER_MS);
    });
  });
}

function renderSummary(result: WrmRollResult): void {
  const mods = result.attribute + result.skillBonus + result.bonus;
  dieTotalEl.textContent = String(result.dieTotal);
  modsEl.textContent = `${mods >= 0 ? "+" : "−"}${Math.abs(mods)}`;
  totalEl.textContent = String(result.total);
  dlEl.textContent = String(result.difficulty);

  const sign = result.margin >= 0 ? "+" : "−";
  outcomeEl.classList.remove("pass", "fail");
  if (result.passed) {
    outcomeEl.textContent = `SUCCESS — margin ${sign}${Math.abs(result.margin)}`;
    outcomeEl.classList.add("pass");
  } else {
    outcomeEl.textContent = `FAILURE — margin ${sign}${Math.abs(result.margin)}`;
    outcomeEl.classList.add("fail");
  }

  summary.hidden = false;
  void summary.offsetWidth; // force reflow so the transition fires
  summary.classList.add("visible");
}

async function animateAndRender(result: WrmRollResult): Promise<void> {
  setStatus("Rolling", true);
  summary.classList.remove("visible");
  summary.hidden = true;

  const descriptors = cellsFor(result);
  const cells = buildDiceTray(descriptors);
  startTumbling(cells);
  await settleDice(cells, descriptors);
  renderSummary(result);
  setStatus(result.passed ? "Success" : "Failure", false);
  updateRerollAvailability();
  reportSize();
}

function reportSize(): void {
  requestAnimationFrame(() => {
    const width = root.scrollWidth;
    const height = root.scrollHeight + 32;
    app.sendSizeChanged({ width, height }).catch(() => {});
  });
}

function handleHostContextChanged(ctx: McpUiHostContext): void {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
}

// ── App wiring ────────────────────────────────────────────────────────────
const app = new App({ name: "Warrior Rogue & Mage Dice", version: "0.1.0" });

app.onerror = (e) => console.error("[wrm-dice-app]", e);

app.ontoolinput = (params) => {
  const args = params.arguments as unknown as WrmRollArgs;
  lastInput = args;
  setStatus("Rolling", true);
  showMeta(args);
  buildSkeletonTray(args);
  rerollBtn.disabled = true;
};

app.ontoolresult = (toolResult) => {
  const sc = (toolResult as CallToolResult).structuredContent as WrmRollResult | undefined;
  if (!sc) {
    setStatus("Error", false);
    return;
  }
  // If we never got ontoolinput, synthesize the meta line from the result.
  if (!lastInput) {
    lastInput = {
      attribute: sc.attribute,
      difficulty: sc.difficulty,
      skill: sc.skillBonus > 0,
      bonus: sc.bonus,
      rollMode: sc.rollMode,
      explode: sc.explodeEnabled,
    };
    showMeta(lastInput);
  }
  void animateAndRender(sc);
};

app.ontoolcancelled = (params) => {
  console.info("[wrm-dice-app] tool cancelled:", params.reason);
  setStatus("Cancelled", false);
  updateRerollAvailability();
};

app.onhostcontextchanged = handleHostContextChanged;

rerollBtn.addEventListener("click", async () => {
  if (!lastInput) return;
  rerollBtn.disabled = true;
  setStatus("Rolling", true);
  try {
    const result = await app.callServerTool({
      name: "roll_wrm",
      arguments: lastInput as unknown as Record<string, unknown>,
    });
    const sc = result.structuredContent as WrmRollResult | undefined;
    if (sc) await animateAndRender(sc);
  } catch (e) {
    console.error("[wrm-dice-app] re-roll failed:", e);
    setStatus("Error", false);
    updateRerollAvailability();
  }
});

app.connect().then(() => {
  serverToolsAvailable = app.getHostCapabilities()?.serverTools !== undefined;
  const ctx = app.getHostContext();
  if (ctx) handleHostContextChanged(ctx);
  setStatus("Ready", false);
  updateRerollAvailability();
  reportSize();
});
