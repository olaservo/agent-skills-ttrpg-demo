/**
 * @file Pip-Boy themed dice roller UI.
 *
 * Lifecycle:
 *  1. App connects to host.
 *  2. Host fires ontoolinput with the agent's roll arguments — we render the
 *     dice tray skeleton (one cell per d20) and stash the args for re-roll.
 *  3. Host fires ontoolresult with the structured roll result — we animate the
 *     dice "tumbling" for ~900 ms then snap each to its real value with the
 *     appropriate tag classes (success / miss / critical / complication —
 *     non-exclusive, so a die can be e.g. both success and complication).
 *  4. The summary panel fades in. The RE-ROLL button (which calls the same
 *     server tool again with the stashed args) becomes enabled.
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
import "./dice-app.css";

interface RollArgs {
  target: number;
  difficulty: number;
  numDice?: number;
  complicationRange?: number;
  seed?: number;
}

interface AnnotatedDie {
  die: number;
  tags: string[];
}

interface DiceResult {
  target: number;
  difficulty: number;
  numDice: number;
  complicationRange: number;
  rolls: number[];
  annotated: AnnotatedDie[];
  successes: number;
  crits: number;
  complications: number;
  passed: boolean;
  apGenerated: number;
}

const TUMBLE_DURATION_MS = 900;
const TUMBLE_STAGGER_MS = 120;

// ── DOM refs ──────────────────────────────────────────────────────────────
const pipboy = document.getElementById("pipboy")!;
const statusEl = document.getElementById("status")!;
const metaEl = document.getElementById("meta")!;
const metaPool = document.getElementById("meta-pool")!;
const metaTarget = document.getElementById("meta-target")!;
const metaDifficulty = document.getElementById("meta-difficulty")!;
const metaComp = document.getElementById("meta-comp")!;
const metaCompDot = document.getElementById("meta-comp-dot")!;
const tray = document.getElementById("dice-tray")!;
const summary = document.getElementById("summary")!;
const successesEl = document.getElementById("successes")!;
const critsEl = document.getElementById("crits")!;
const complicationsEl = document.getElementById("complications")!;
const outcomeEl = document.getElementById("outcome")!;
const apEl = document.getElementById("ap")!;
const rerollBtn = document.getElementById("reroll") as HTMLButtonElement;

// ── State ────────────────────────────────────────────────────────────────
let lastInput: RollArgs | null = null;
let serverToolsAvailable = false;
const tumbleTimers: number[] = [];

function updateRerollAvailability(): void {
  const enabled = serverToolsAvailable && lastInput !== null;
  rerollBtn.disabled = !enabled;
  rerollBtn.title = serverToolsAvailable
    ? ""
    : "RE-ROLL unavailable — host has not granted serverTools capability.";
}

function clearTumbleTimers() {
  while (tumbleTimers.length > 0) {
    clearInterval(tumbleTimers.pop()!);
  }
}

function setStatus(text: string, rolling = false): void {
  statusEl.textContent = text;
  statusEl.classList.toggle("rolling", rolling);
}

function showMeta(args: RollArgs): void {
  const numDice = args.numDice ?? 2;
  const compRange = args.complicationRange ?? 1;
  metaPool.textContent = `POOL ${numDice}d20`;
  metaTarget.textContent = `TGT ${args.target}`;
  metaDifficulty.textContent = `DIFF ${args.difficulty}`;
  if (compRange > 1) {
    metaComp.textContent = `COMP ON ${21 - compRange}-20`;
    metaComp.hidden = false;
    metaCompDot.hidden = false;
  } else {
    metaComp.hidden = true;
    metaCompDot.hidden = true;
  }
  metaEl.hidden = false;
}

function buildDiceTray(numDice: number): HTMLElement[] {
  clearTumbleTimers();
  tray.innerHTML = "";
  const cells: HTMLElement[] = [];
  for (let i = 0; i < numDice; i++) {
    const cell = document.createElement("div");
    cell.className = "die tumbling";
    cell.innerHTML = `
      <span class="face">--</span>
      <span class="chip"></span>
    `;
    tray.appendChild(cell);
    cells.push(cell);
  }
  return cells;
}

function startTumbling(cells: HTMLElement[]): void {
  for (const cell of cells) {
    const face = cell.querySelector<HTMLElement>(".face")!;
    const t = window.setInterval(() => {
      face.textContent = String(1 + Math.floor(Math.random() * 20));
    }, 50);
    tumbleTimers.push(t);
  }
}

function settleDie(cell: HTMLElement, ann: AnnotatedDie): void {
  const face = cell.querySelector<HTMLElement>(".face")!;
  const chip = cell.querySelector<HTMLElement>(".chip")!;
  cell.classList.remove("tumbling");
  face.textContent = String(ann.die);

  // Reset to a clean state.
  cell.classList.remove("success", "miss", "critical", "complication");
  // Remove any prior comp chip overlay.
  const oldOverlay = cell.querySelector(".chip-comp");
  if (oldOverlay) oldOverlay.remove();

  // Apply non-exclusive tag classes.
  let chipText = "";
  for (const tag of ann.tags) {
    cell.classList.add(tag);
    if (tag === "critical") chipText = "CRIT";
    else if (tag === "success" && !chipText) chipText = "SUCCESS";
    else if (tag === "miss" && !chipText) chipText = "MISS";
  }
  chip.textContent = chipText;

  if (ann.tags.includes("complication")) {
    const overlay = document.createElement("span");
    overlay.className = "chip-comp";
    overlay.textContent = "COMP";
    cell.appendChild(overlay);
  }
}

function settleDice(cells: HTMLElement[], result: DiceResult): Promise<void> {
  return new Promise((resolve) => {
    let settled = 0;
    cells.forEach((cell, i) => {
      window.setTimeout(() => {
        // Stop the tumble for this specific die — but we used shared timers,
        // so instead we just settle and let the timer overwrite be no-op
        // (face will be overwritten by settleDie before next tumble tick).
        settleDie(cell, result.annotated[i]!);
        settled += 1;
        if (settled === cells.length) {
          // Now stop all remaining tumble timers (they're harmless after settle,
          // but we want them gone so re-roll can rebuild cleanly).
          clearTumbleTimers();
          resolve();
        }
      }, TUMBLE_DURATION_MS + i * TUMBLE_STAGGER_MS);
    });
  });
}

function renderSummary(result: DiceResult): void {
  successesEl.textContent = String(result.successes);
  critsEl.textContent = String(result.crits);
  complicationsEl.textContent = String(result.complications);
  apEl.textContent = String(result.apGenerated);

  outcomeEl.classList.remove("pass", "fail");
  if (result.passed) {
    outcomeEl.textContent =
      result.apGenerated > 0
        ? `PASSED — ${result.apGenerated} AP GAINED`
        : "PASSED";
    outcomeEl.classList.add("pass");
  } else {
    outcomeEl.textContent = `FAILED — needed ${result.difficulty}, got ${result.successes}`;
    outcomeEl.classList.add("fail");
  }

  summary.hidden = false;
  // Force reflow so the transition fires.
  void summary.offsetWidth;
  summary.classList.add("visible");
}

async function animateAndRender(result: DiceResult): Promise<void> {
  setStatus("ROLLING", true);
  summary.classList.remove("visible");
  summary.hidden = true;

  const cells = buildDiceTray(result.numDice);
  startTumbling(cells);
  await settleDice(cells, result);
  renderSummary(result);
  setStatus(result.passed ? "PASS" : "FAIL", false);
  updateRerollAvailability();
  reportSize();
}

function reportSize(): void {
  // Defer to next frame so layout has settled.
  requestAnimationFrame(() => {
    const width = pipboy.scrollWidth;
    const height = pipboy.scrollHeight + 32;
    app.sendSizeChanged({ width, height }).catch(() => {});
  });
}

function handleHostContextChanged(ctx: McpUiHostContext): void {
  if (ctx.theme) {
    applyDocumentTheme(ctx.theme);
  }
  if (ctx.styles?.variables) {
    applyHostStyleVariables(ctx.styles.variables);
  }
  if (ctx.styles?.css?.fonts) {
    applyHostFonts(ctx.styles.css.fonts);
  }
}

// ── App wiring ────────────────────────────────────────────────────────────
const app = new App({ name: "Fallout Dice Roller", version: "0.1.0" });

app.onerror = (e) => console.error("[dice-app]", e);

app.ontoolinput = (params) => {
  const args = params.arguments as unknown as RollArgs;
  lastInput = args;
  setStatus("ROLLING", true);
  showMeta(args);
  // Pre-build empty tray so the user sees something while the roll resolves.
  buildDiceTray(args.numDice ?? 2);
  startTumbling(Array.from(tray.querySelectorAll<HTMLElement>(".die")));
  rerollBtn.disabled = true;
};

app.ontoolresult = (toolResult) => {
  const sc = (toolResult as CallToolResult).structuredContent as
    | DiceResult
    | undefined;
  if (!sc) {
    setStatus("ERROR", false);
    return;
  }
  // If we never got ontoolinput (e.g. host called the tool before we connected),
  // synthesize the meta line from the result.
  if (!lastInput) {
    lastInput = {
      target: sc.target,
      difficulty: sc.difficulty,
      numDice: sc.numDice,
      complicationRange: sc.complicationRange,
    };
    showMeta(lastInput);
  }
  void animateAndRender(sc);
};

app.ontoolcancelled = (params) => {
  console.info("[dice-app] tool cancelled:", params.reason);
  setStatus("CANCELLED", false);
  updateRerollAvailability();
};

app.onhostcontextchanged = handleHostContextChanged;

rerollBtn.addEventListener("click", async () => {
  if (!lastInput) return;
  rerollBtn.disabled = true;
  setStatus("ROLLING", true);
  try {
    const result = await app.callServerTool({
      name: "roll_dice",
      arguments: lastInput as unknown as Record<string, unknown>,
    });
    const sc = result.structuredContent as DiceResult | undefined;
    if (sc) await animateAndRender(sc);
  } catch (e) {
    console.error("[dice-app] re-roll failed:", e);
    setStatus("ERROR", false);
    updateRerollAvailability();
  }
});

app.connect().then(() => {
  serverToolsAvailable = app.getHostCapabilities()?.serverTools !== undefined;
  const ctx = app.getHostContext();
  if (ctx) handleHostContextChanged(ctx);
  setStatus("READY", false);
  updateRerollAvailability();
  reportSize();
});
