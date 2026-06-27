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
const THROW_STAGGER_MS = 180; // pause between one die resting and the next entering
const FIXED_STEP = 1 / 60; // physics + playback timestep
const REST_LIN = 0.12; // linear speed below which the die counts as still
const REST_ANG = 0.12; // angular speed below which the die counts as still
const REST_FRAMES = 12; // consecutive still steps that end the recording
const MAX_PREDICT_STEPS = 600; // hard cap on the invisible prediction (~10s)
const MAX_DICE = 24; // visual guard mirroring the engine's explosion cap

/**
 * BoxGeometry material order is [+X, -X, +Y, -Y, +Z, -Z]; faces pair up as
 * (0,1) (2,3) (4,5), i.e. opposite face = index ^ 1. We start with the values
 * [1, 6, 2, 5, 3, 4] painted on those faces (opposite faces sum to 7, like a
 * real die), but the *final* value shown up is decided by relabeling whichever
 * face physically lands up — see relabelToLanding — so we never have to flip the
 * die to a predetermined face (a flip of up to 180° is what read as "jank").
 */
const FACE_VALUES = [1, 6, 2, 5, 3, 4];
const LOCAL_FACE_NORMALS = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];
const VALUE_PAIRS = [
  [1, 6],
  [2, 5],
  [3, 4],
];

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
/** One recorded simulation frame: where the die was at fixed step `i`. */
interface Frame {
  p: [number, number, number];
  q: [number, number, number, number];
}

interface Die {
  mesh: THREE.Mesh;
  /** Static collision body left at the final resting pose (obstacle for later dice). */
  body: CANNON.Body;
  value: number;
  role: "initial" | "explode";
  kept: boolean;
  /** Full tumble recorded by the invisible prediction pass, replayed for the visuals. */
  trajectory: Frame[];
  state: "playing" | "rested";
  playStart: number;
  onRested?: () => void;
}

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let world: CANNON.World;
let dice: Die[] = [];
let pipTextures: { normal: THREE.CanvasTexture[]; gold: THREE.CanvasTexture[] };

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
  requestRender();
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

/** Which local face index points most upward for a given orientation. */
function upFaceForQuat(q: THREE.Quaternion): number {
  let iUp = 0;
  let best = -Infinity;
  for (let i = 0; i < 6; i++) {
    const dot = LOCAL_FACE_NORMALS[i]!.clone().applyQuaternion(q).y;
    if (dot > best) {
      best = dot;
      iUp = i;
    }
  }
  return iUp;
}

/**
 * Paint the die so its rolled value sits on local face `iUp`, the opposite face
 * gets 7 − value, and the remaining two axis-pairs get the remaining value-pairs
 * — a valid die (opposite faces sum to 7). Done up-front, before the die is
 * shown, so the top face reads correctly the whole tumble (no end-of-roll swap).
 */
function paintDie(die: Die, iUp: number): void {
  const value = die.value;
  const newValues = new Array<number>(6);
  newValues[iUp] = value;
  newValues[iUp ^ 1] = 7 - value;

  const usedLo = Math.min(value, 7 - value);
  const remainPairs = VALUE_PAIRS.filter((p) => p[0] !== usedLo);
  const remainAxes = [
    [0, 1],
    [2, 3],
    [4, 5],
  ].filter(([a, b]) => a !== iUp && b !== iUp);
  remainAxes.forEach(([a, b], k) => {
    newValues[a!] = remainPairs[k]![0]!;
    newValues[b!] = remainPairs[k]![1]!;
  });

  const set = die.role === "explode" ? pipTextures.gold : pipTextures.normal;
  const mats = die.mesh.material as THREE.MeshStandardMaterial[];
  for (let i = 0; i < 6; i++) {
    mats[i]!.map = set[newValues[i]! - 1]!;
    mats[i]!.needsUpdate = true;
  }
}

/**
 * Throw one die: simulate its whole tumble *invisibly* to learn which face lands
 * up, paint the rolled value onto that face before showing anything, then leave
 * the recorded trajectory to be replayed by the render loop. The body is frozen
 * static at its final pose so later dice in the chain collide with it.
 */
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
  // Drop from above with randomized spin/velocity (visual variety only — which
  // face lands up doesn't matter; we paint the rolled value onto it).
  const rand = (m: number) => (Math.random() * 2 - 1) * m;
  body.position.set(rand(TRAY_HALF_W - 1), 5 + Math.random() * 1.5, rand(TRAY_HALF_D - 1));
  body.velocity.set(rand(2.5), -2, rand(2.5));
  body.angularVelocity.set(rand(9), rand(9), rand(9));
  body.quaternion.setFromEuler(rand(Math.PI), rand(Math.PI), rand(Math.PI));
  world.addBody(body);

  // Invisible prediction pass: step the (single dynamic body) world to rest,
  // recording every frame. Earlier dice are already static, so this is the exact
  // tumble we will replay.
  const trajectory: Frame[] = [];
  let restFrames = 0;
  for (let i = 0; i < MAX_PREDICT_STEPS; i++) {
    world.step(FIXED_STEP);
    trajectory.push({
      p: [body.position.x, body.position.y, body.position.z],
      q: [body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w],
    });
    const still =
      body.velocity.length() < REST_LIN && body.angularVelocity.length() < REST_ANG;
    restFrames = still ? restFrames + 1 : 0;
    if (restFrames >= REST_FRAMES) break;
  }

  // Freeze the body at its final pose as a static obstacle for later dice.
  body.velocity.setZero();
  body.angularVelocity.setZero();
  body.type = CANNON.Body.STATIC;
  body.updateMassProperties();

  const last = trajectory[trajectory.length - 1]!;
  const iUp = upFaceForQuat(new THREE.Quaternion(last.q[0], last.q[1], last.q[2], last.q[3]));

  const first = trajectory[0]!;
  mesh.position.set(first.p[0], first.p[1], first.p[2]);
  mesh.quaternion.set(first.q[0], first.q[1], first.q[2], first.q[3]);

  const die: Die = {
    mesh,
    body,
    value: cell.value,
    role: cell.role,
    kept: cell.kept,
    trajectory,
    state: "playing",
    playStart: performance.now(),
    onRested,
  };
  paintDie(die, iUp);
  dice.push(die);
  requestRender();
}

// The render loop is *demand-driven*: it renders only while a die is animating
// (or for one-shot redraws — spawn, reset, resize, theme). On the phone target a
// free-running rAF means continuous WebGL draw + battery drain at idle, so the
// loop stops itself once every die has rested and restarts via requestRender().
let rafId = 0;
function requestRender(): void {
  if (rafId === 0) rafId = requestAnimationFrame(loop);
}

function loop(): void {
  rafId = 0;
  const now = performance.now();

  let anyPlaying = false;
  for (const die of dice) {
    if (die.state !== "playing") continue;
    anyPlaying = true;
    const last = die.trajectory.length - 1;
    const idx = Math.min(Math.floor((now - die.playStart) / 1000 / FIXED_STEP), last);
    const f = die.trajectory[idx]!;
    die.mesh.position.set(f.p[0], f.p[1], f.p[2]);
    die.mesh.quaternion.set(f.q[0], f.q[1], f.q[2], f.q[3]);
    if (idx >= last) {
      die.state = "rested";
      const cb = die.onRested;
      die.onRested = undefined;
      cb?.();
    }
  }

  renderer.render(scene, camera);
  if (anyPlaying) requestRender();
}

function resizeRenderer(): void {
  const w = sceneEl.clientWidth || 600;
  const h = sceneEl.clientHeight || 320;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  requestRender();
}

function resetScene(): void {
  for (const die of dice) {
    scene.remove(die.mesh);
    // Dispose the die mesh *and* any child decorations (the gold edge outline on
    // explosions / kept 6s) — the child's EdgesGeometry + LineBasicMaterial are
    // otherwise leaked in the GPU on every reroll.
    die.mesh.traverse((obj) => {
      const m = obj as Partial<THREE.Mesh>;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
    });
    world.removeBody(die.body);
  }
  dice = [];
  requestRender();
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function animateAndRender(result: WrmRollResult): Promise<void> {
  setStatus("Rolling", true);
  summary.classList.remove("visible");
  summary.hidden = true;
  resetScene();

  const cells = cellsFor(result).slice(0, MAX_DICE);

  // Throw the dice one at a time, each fully landing before the next enters, so
  // every prediction sees a fully-static tray (the initial die/dice first, then
  // one gold die per exploding 6).
  for (let i = 0; i < cells.length; i++) {
    await new Promise<void>((resolve) => spawnDie(cells[i]!, resolve));
    if (i < cells.length - 1) await delay(THROW_STAGGER_MS);
  }

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
