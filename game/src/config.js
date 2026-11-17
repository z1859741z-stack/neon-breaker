// Neon Breaker: every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below depends on
// the screen size.

export const FIELD = { width: 1280, height: 720, hudHeight: 64, groundY: 668 };

export const STEP = 1 / 60;

export const PADDLE = {
  width: 112,
  wideWidth: 168,
  height: 16,
  y: 640,
  keyboardSpeed: 640,
  laserCooldown: 0.28,
};

export const BALL = {
  radius: 8,
  startSpeed: 430,
  speedPerLevel: 26,
  maxSpeed: 820,
  speedPerBrick: 1.5,
  maxBalls: 5,
};

export const LIVES = 3;
export const MAX_LIVES = 5;

/** Brick grid: 12 columns, rows laid out by each level. */
export const GRID = { cols: 12, x: 64, y: 104, brickWidth: 88, brickHeight: 28, gapX: 8, gapY: 8 };

/** Points for breaking a brick of a tier, before the combo multiplier. */
export const TIER_POINTS = { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50, A: 60 };

/** Combo: each break within this window of the last adds one; the multiplier caps here. */
export const COMBO = { window: 4, max: 8 };

export const POWERUP = {
  fallSpeed: 175,
  size: 30,
  dropChance: 0.16,
  durations: { wide: 12, slow: 8, sticky: 12, laser: 12 },
  laserShots: 14,
};

export const PARTICLES = { pool: 320, brickBurst: 12, hitBurst: 5, loseBurst: 36 };

export const PALETTE = {
  backdrop: '#070a18',
  skyTop: '#0b1030',
  skyBottom: '#120a24',
  hud: '#0d1226',
  hudLine: '#232a4a',
  text: '#eef1f5',
  muted: '#8b93a3',
  accent: '#39d5ff',
  accentWarm: '#ffb347',
  panel: 'rgba(13, 18, 38, 0.92)',
  panelEdge: '#39d5ff',
  // Brick tier colours, weakest to strongest.
  tiers: {
    1: { face: '#19b8d8', edge: '#0b7d99', glow: '#19b8d8' },
    2: { face: '#2fd67a', edge: '#178a4c', glow: '#2fd67a' },
    3: { face: '#f2c94c', edge: '#a8871d', glow: '#f2c94c' },
    4: { face: '#ff8a3d', edge: '#b25a17', glow: '#ff8a3d' },
    5: { face: '#ff4d6d', edge: '#b31e3d', glow: '#ff4d6d' },
    A: { face: '#c8d2e0', edge: '#7d8aa0', glow: '#c8d2e0' },
    X: { face: '#3a4260', edge: '#232a4a', glow: '#3a4260' },
  },
  ball: '#ffffff',
  ballGlow: '#7fe7ff',
  paddle: '#39d5ff',
  paddleEdge: '#bdf3ff',
  laser: '#ff5d7a',
  powerups: {
    W: '#39d5ff',
    M: '#ff4d6d',
    L: '#ff5d7a',
    S: '#7dd8ff',
    T: '#b78cff',
    '+': '#2fd67a',
  },
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'neon-breaker.best';
