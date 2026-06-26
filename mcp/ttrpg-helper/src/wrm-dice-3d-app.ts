/**
 * @file Warrior, Rogue & Mage 3D dice roller UI (parchment themed).
 *
 * A "wow"-factor parallel to the 2D CSS tray (./wrm-dice-app.ts). Same lifecycle
 * and the same WrmRollResult contract; the only difference is how the dice are
 * rendered: real rigid-body physics (cannon-es) tumble the d6s into a tray, then
 * each die is *snapped* to the predetermined face the engine already rolled
 * (keptInitial / explosions). The snap guarantees the visible top face matches
 * the rolled value regardless of how the physics settles — the "loaded dice"
 * trick. A hard per-die timeout force-rests any die the physics strands, the 3D
 * analogue of the 2D per-die settle-timer that avoided the Fallout tray desync.
 *
 * The chrome (meta line, summary panel, reroll button, host theming) is ported
 * verbatim from wrm-dice-app.ts so the two widgets read identically.
 */
import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import "./wrm-theme.css";
import "./wrm-dice-3d-app.css";

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

/** A die to render, in left-to-right / throw order. */
interface DieCell {
  value: number;
  /** "initial" = a starting d6; "explode" = an added exploding d6. */
  role: "initial" | "explode";
  /** Under advantage/disadvantage, false marks the dropped initial die. */
  kept: boolean;
}

// ── Tuning ──────────────────────────────────────────────────────────────────
const TRAY_HALF_W = 3; // tray spans x ∈ [-3, 3]
const TRAY_HALF_D = 2; // tray spans z ∈ [-2, 2]
const DIE_HALF = 0.5; // d6 is a unit cube
const THROW_STAGGER_MS = 320; // gap between successive dice entering the tray
const SNAP_MS = 220; // ease duration to the predetermined face
const REST_LIN = 0.14; // linear speed below which a die counts as "still"
const REST_ANG = 0.14; // angular speed below which a die counts as "still"
const REST_FRAMES = 10; // consecutive still frames required to rest
const REST_TIMEOUT_MS = 2500; // hard backstop: force-rest a stranded die
const MAX_DICE = 24; // visual guard mirroring the engine's explosion cap

/**
 * Local face normals for each pip value on our cube. BoxGeometry material order
 * is [+X, -X, +Y, -Y, +Z, -Z]; we paint values [1, 6, 2, 5, 3, 4] onto those
 * faces (opposite faces sum to 7, like a real die). To show value V on top, V's
 * local normal must point world-up.
 */
const FACE_VALUES = [1, 6, 2, 5, 3, 4];
const FACE_NORMAL: Record<number, THREE.Vector3> = {
  1: new THREE.Vector3(1, 0, 0),
  6: new THREE.Vector3(-1, 0, 0),
  2: new THREE.Vector3(0, 1, 0),
  5: new THREE.Vector3(0, -1, 0),
  3: new THREE.Vector3(0, 0, 1),
  4: new THREE.Vector3(0, 0, -1),
};

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
const sceneEl = document.getElementById("scene")!;
const canvas = document.getElementById("dice-canvas") as HTMLCanvasElement;
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

function updateRerollAvailability(): void {
  const enabled = serverToolsAvailable && lastInput !== null;
  rerollBtn.disabled = !enabled;
  rerollBtn.title = serverToolsAvailable
    ? ""
    : "Roll again unavailable — host has not granted serverTools capability.";
}

function setStatus(text: string, rolling = false): void {
  statusEl.textContent = text;
  statusEl.classList.toggle("rolling", rolling);
}

// ── Meta line (ported from wrm-dice-app.ts) ────────────────────────────────
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
  const explodeEnabled = args.explode ?? Boolean(args.skill);
  setMetaField(metaExplode, metaExplodeDot, explodeEnabled ? "6s explode" : null);
  metaEl.hidden = false;
}

/** Build the ordered list of dice for a fully-resolved result. */
function cellsFor(result: WrmRollResult): DieCell[] {
  const cells: DieCell[] = [];
  if (result.rollMode === "normal") {
    cells.push({ value: result.keptInitial, role: "initial", kept: true });
  } else {
    // Two initial dice; mark which one was kept (highest/lowest). On a tie,
    // keep the first so exactly one die is dropped.
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

// ── Theme tokens ───────────────────────────────────────────────────────────
function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const palette = {
  bg: () => cssVar("--wrm-bg", "#efe2c4"),
  bgDeep: () => cssVar("--wrm-bg-deep", "#e3d2ab"),
  fg: () => cssVar("--wrm-fg", "#3a2a18"),
  fgDim: () => cssVar("--wrm-fg-dim", "#7a6242"),
  accent: () => cssVar("--wrm-accent", "#9a6b1f"),
  accentBright: () => cssVar("--wrm-accent-bright", "#c9952f"),
  rule: () => cssVar("--wrm-rule", "#b69a68"),
};

/** Draw a single die face (parchment square with ink pips) to a CanvasTexture. */
function makePipTexture(value: number, bg: string, fg: string): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);
  // faint inset border for a carved-die look
  ctx.strokeStyle = fg;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, S - 16, S - 16);
  ctx.globalAlpha = 1;

  const r = S * 0.1;
  const a = S * 0.26; // pip offset from center
  const m = S / 2;
  const dot = (x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fg;
    ctx.fill();
  };
  const L = m - a;
  const R = m + a;
  const layouts: Record<number, [number, number][]> = {
    1: [[m, m]],
    2: [[L, L], [R, R]],
    3: [[L, L], [m, m], [R, R]],
    4: [[L, L], [R, L], [L, R], [R, R]],
    5: [[L, L], [R, L], [m, m], [L, R], [R, R]],
    6: [[L, L], [R, L], [L, m], [R, m], [L, R], [R, R]],
  };
  for (const [x, y] of layouts[value]!) dot(x, y);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

// ── Three.js + cannon-es scene ─────────────────────────────────────────────
interface Die {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  value: number;
  role: "initial" | "explode";
  kept: boolean;
  state: "tumbling" | "snapping" | "rested";
  restFrames: number;
  deadline: number;
  snapStart: number;
  snapFrom: THREE.Quaternion;
  snapTo: THREE.Quaternion;
  onRested?: () => void;
}

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let world: CANNON.World;
let dice: Die[] = [];
let pipTextures: { normal: THREE.CanvasTexture[]; gold: THREE.CanvasTexture[] };
let lastFrameTime = 0;

function buildScene(): void {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 7.5, 5.5);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const key = new THREE.DirectionalLight(0xfff2d6, 1.1);
  key.position.set(-4, 9, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(5, 4, -3);
  scene.add(fill);

  // Visible tray floor (matches the parchment scene background).
  const floorMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.bgDeep()),
    roughness: 0.95,
    metalness: 0,
  });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(TRAY_HALF_W * 2, TRAY_HALF_D * 2),
    floorMat,
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  // Physics world + tray walls.
  world = new CANNON.World({ gravity: new CANNON.Vec3(0, -22, 0) });
  world.defaultContactMaterial.friction = 0.4;
  world.defaultContactMaterial.restitution = 0.22;

  const addPlane = (
    pos: [number, number, number],
    axis: [number, number, number],
    angle: number,
  ) => {
    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    body.position.set(...pos);
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(...axis), angle);
    world.addBody(body);
  };
  // Floor: default plane normal +Z → rotate to +Y.
  addPlane([0, 0, 0], [1, 0, 0], -Math.PI / 2);
  // Walls (normals point inward).
  addPlane([-TRAY_HALF_W, 0, 0], [0, 1, 0], Math.PI / 2); // left, +X
  addPlane([TRAY_HALF_W, 0, 0], [0, 1, 0], -Math.PI / 2); // right, -X
  addPlane([0, 0, -TRAY_HALF_D], [0, 1, 0], 0); // back, +Z
  addPlane([0, 0, TRAY_HALF_D], [0, 1, 0], Math.PI); // front, -Z

  // Pip textures for both schemes (computed once from the current theme tokens).
  const mkSet = (bg: string, fg: string) =>
    Array.from({ length: 7 }, (_, v) => (v === 0 ? null : makePipTexture(v, bg, fg))).filter(
      Boolean,
    ) as THREE.CanvasTexture[];
  // index 0..5 correspond to values 1..6
  pipTextures = {
    normal: mkSet(palette.bg(), palette.fg()),
    gold: mkSet(palette.accentBright(), palette.fg()),
  };

  resizeRenderer();
  lastFrameTime = performance.now();
  requestAnimationFrame(loop);
}

function materialsForDie(role: "initial" | "explode", kept: boolean): THREE.Material[] {
  const set = role === "explode" ? pipTextures.gold : pipTextures.normal;
  return FACE_VALUES.map((value) => {
    const mat = new THREE.MeshStandardMaterial({
      map: set[value - 1],
      roughness: 0.55,
      metalness: role === "explode" ? 0.25 : 0.05,
    });
    if (role === "explode") mat.emissive = new THREE.Color(palette.accent()).multiplyScalar(0.18);
    if (!kept) {
      // Dropped die under advantage/disadvantage: faded and translucent.
      mat.transparent = true;
      mat.opacity = 0.4;
      mat.color = new THREE.Color(palette.fgDim());
    }
    return mat;
  });
}

/** Throw one die into the tray; it will tumble then snap to `cell.value`. */
function spawnDie(cell: DieCell, onRested?: () => void): void {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.Mesh(geo, materialsForDie(cell.role, cell.kept));

  // A gold edge outline cues "this die mattered": exploding dice and kept 6s.
  if (cell.role === "explode" || (cell.kept && cell.value === 6)) {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: new THREE.Color(palette.accentBright()) }),
    );
    mesh.add(edges);
  }
  scene.add(mesh);

  const body = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Box(new CANNON.Vec3(DIE_HALF, DIE_HALF, DIE_HALF)),
  });
  // Drop from above with randomized spin/velocity (visual only — the face is
  // not left to chance; it is snapped to cell.value on rest).
  const rand = (m: number) => (Math.random() * 2 - 1) * m;
  body.position.set(rand(TRAY_HALF_W - 1), 5 + Math.random() * 1.5, rand(TRAY_HALF_D - 1));
  body.velocity.set(rand(2.5), -2, rand(2.5));
  body.angularVelocity.set(rand(9), rand(9), rand(9));
  body.quaternion.setFromEuler(rand(Math.PI), rand(Math.PI), rand(Math.PI));
  world.addBody(body);

  mesh.position.set(body.position.x, body.position.y, body.position.z);
  mesh.quaternion.set(
    body.quaternion.x,
    body.quaternion.y,
    body.quaternion.z,
    body.quaternion.w,
  );

  dice.push({
    mesh,
    body,
    value: cell.value,
    role: cell.role,
    kept: cell.kept,
    state: "tumbling",
    restFrames: 0,
    deadline: performance.now() + REST_TIMEOUT_MS,
    snapStart: 0,
    snapFrom: new THREE.Quaternion(),
    snapTo: new THREE.Quaternion(),
    onRested,
  });
}

function beginSnap(die: Die, now: number): void {
  // Freeze the body so it becomes a static platform for later dice.
  die.body.velocity.setZero();
  die.body.angularVelocity.setZero();
  die.body.type = CANNON.Body.STATIC;
  die.body.updateMassProperties();

  // Minimal-arc rotation that brings the target face's normal to world-up,
  // preserving the settled yaw as much as possible.
  const current = die.mesh.quaternion.clone();
  const worldNormal = FACE_NORMAL[die.value].clone().applyQuaternion(current).normalize();
  const align = new THREE.Quaternion().setFromUnitVectors(
    worldNormal,
    new THREE.Vector3(0, 1, 0),
  );
  die.snapFrom = current;
  die.snapTo = new THREE.Quaternion().multiplyQuaternions(align, current);
  die.snapStart = now;
  die.state = "snapping";
}

function loop(): void {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min((now - lastFrameTime) / 1000, 1 / 30);
  lastFrameTime = now;
  world.step(1 / 60, dt, 3);

  for (const die of dice) {
    if (die.state === "tumbling") {
      die.mesh.position.set(die.body.position.x, die.body.position.y, die.body.position.z);
      die.mesh.quaternion.set(
        die.body.quaternion.x,
        die.body.quaternion.y,
        die.body.quaternion.z,
        die.body.quaternion.w,
      );
      const still =
        die.body.velocity.length() < REST_LIN && die.body.angularVelocity.length() < REST_ANG;
      die.restFrames = still ? die.restFrames + 1 : 0;
      if (die.restFrames >= REST_FRAMES || now >= die.deadline) beginSnap(die, now);
    } else if (die.state === "snapping") {
      const t = Math.min((now - die.snapStart) / SNAP_MS, 1);
      const eased = t * (2 - t); // easeOutQuad
      die.mesh.quaternion.slerpQuaternions(die.snapFrom, die.snapTo, eased);
      die.mesh.position.set(die.body.position.x, die.body.position.y, die.body.position.z);
      if (t >= 1) {
        die.state = "rested";
        const cb = die.onRested;
        die.onRested = undefined;
        cb?.();
      }
    }
  }

  renderer.render(scene, camera);
}

function resizeRenderer(): void {
  const w = sceneEl.clientWidth || 600;
  const h = sceneEl.clientHeight || 320;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function resetScene(): void {
  for (const die of dice) {
    scene.remove(die.mesh);
    die.mesh.geometry.dispose();
    const mats = die.mesh.material as THREE.Material | THREE.Material[];
    (Array.isArray(mats) ? mats : [mats]).forEach((m) => m.dispose());
    world.removeBody(die.body);
  }
  dice = [];
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function animateAndRender(result: WrmRollResult): Promise<void> {
  setStatus("Rolling", true);
  summary.classList.remove("visible");
  summary.hidden = true;
  resetScene();

  const cells = cellsFor(result).slice(0, MAX_DICE);
  let remaining = cells.length;
  let resolveAll!: () => void;
  const allRested = new Promise<void>((resolve) => {
    resolveAll = resolve;
  });
  if (remaining === 0) resolveAll();

  // Throw the dice in one at a time so they clatter into the tray in sequence
  // (the initial die/dice first, then one per exploding 6). Each resolves the
  // shared promise as it comes to rest and snaps to its predetermined face.
  for (let i = 0; i < cells.length; i++) {
    spawnDie(cells[i]!, () => {
      remaining -= 1;
      if (remaining === 0) resolveAll();
    });
    if (i < cells.length - 1) await delay(THROW_STAGGER_MS);
  }
  await allRested;

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
  resizeRenderer();
  reportSize();
}

// ── App wiring (ported from wrm-dice-app.ts) ───────────────────────────────
const app = new App({ name: "Warrior Rogue & Mage 3D Dice", version: "0.1.0" });

app.onerror = (e) => console.error("[wrm-dice-3d-app]", e);

app.ontoolinput = (params) => {
  const args = params.arguments as unknown as WrmRollArgs;
  lastInput = args;
  setStatus("Rolling", true);
  showMeta(args);
  rerollBtn.disabled = true;
};

app.ontoolresult = (toolResult) => {
  const sc = (toolResult as CallToolResult).structuredContent as WrmRollResult | undefined;
  if (!sc) {
    setStatus("Error", false);
    return;
  }
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
  console.info("[wrm-dice-3d-app] tool cancelled:", params.reason);
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
    console.error("[wrm-dice-3d-app] re-roll failed:", e);
    setStatus("Error", false);
    updateRerollAvailability();
  }
});

window.addEventListener("resize", () => {
  if (renderer) {
    resizeRenderer();
    reportSize();
  }
});

buildScene();

app.connect().then(() => {
  serverToolsAvailable = app.getHostCapabilities()?.serverTools !== undefined;
  const ctx = app.getHostContext();
  if (ctx) handleHostContextChanged(ctx);
  setStatus("Ready", false);
  updateRerollAvailability();
  reportSize();
});
