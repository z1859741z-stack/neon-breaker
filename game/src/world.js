// The game's rules and state, with no drawing and no browser in it: the paddle, the balls,
// the bricks, falling power-ups, laser bolts, particles and floating score text. step()
// advances one fixed step and returns what happened as bit flags, so the caller can react
// without the world knowing about screens or sound. Nothing here allocates after
// createWorld returns, except the brick list a level load builds.

import {
  BALL,
  COMBO,
  FIELD,
  GRID,
  LIVES,
  MAX_LIVES,
  PADDLE,
  PARTICLES,
  POWERUP,
  TIER_POINTS,
} from './config.js';
import { LEVELS, LEVEL_COUNT } from './levels.js';

export const EVENT_BRICK = 1;
export const EVENT_ARMORED = 2;
export const EVENT_HIT = 4;
export const EVENT_OVER = 8;
export const EVENT_CLEAR = 16;
export const EVENT_POWERUP = 32;
export const EVENT_LASER = 64;

const POWERUP_KINDS = ['W', 'W', 'M', 'M', 'L', 'L', 'S', 'T', 'T', '+'];
const MAX_BALLS = BALL.maxBalls;
const MAX_POWERUPS = 8;
const MAX_LASERS = 24;
const MAX_FLOATS = 16;

function ballSpeed(state) {
  const base = BALL.startSpeed + BALL.speedPerLevel * state.level + BALL.speedPerBrick * state.broken;
  const capped = Math.min(BALL.maxSpeed, base);
  return state.timers.slow > 0 ? capped * 0.6 : capped;
}

export function createWorld(random) {
  const paddle = { x: 0, width: PADDLE.width, laserCooldown: 0 };
  const balls = [];
  for (let i = 0; i < MAX_BALLS; i += 1) {
    balls.push({ active: false, stuck: false, x: 0, y: 0, vx: 0, vy: 0 });
  }
  const powerups = [];
  for (let i = 0; i < MAX_POWERUPS; i += 1) {
    powerups.push({ active: false, kind: 'W', x: 0, y: 0 });
  }
  const lasers = [];
  for (let i = 0; i < MAX_LASERS; i += 1) {
    lasers.push({ active: false, x: 0, y: 0 });
  }
  const particles = [];
  for (let i = 0; i < PARTICLES.pool; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: '#fff', size: 3 });
  }
  const floats = [];
  for (let i = 0; i < MAX_FLOATS; i += 1) {
    floats.push({ active: false, x: 0, y: 0, text: '', life: 0, color: '#fff' });
  }
  const timers = { wide: 0, slow: 0, sticky: 0, laser: 0 };
  const state = {
    paddle,
    balls,
    bricks: [],
    powerups,
    lasers,
    particles,
    floats,
    timers,
    score: 0,
    lives: LIVES,
    level: 0,
    levelName: LEVELS[0].name,
    accent: LEVELS[0].accent,
    combo: 0,
    comboTimer: 0,
    broken: 0,
    bricksLeft: 0,
    serving: true,
    laserShots: 0,
    shake: 0,
    elapsed: 0,
  };

  function burst(x, y, color, count, speed) {
    let made = 0;
    for (let i = 0; i < particles.length && made < count; i += 1) {
      const p = particles[i];
      if (p.active) continue;
      const angle = random() * Math.PI * 2;
      const v = speed * (0.3 + random() * 0.7);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * v;
      p.vy = Math.sin(angle) * v - speed * 0.25;
      p.maxLife = 0.4 + random() * 0.5;
      p.life = p.maxLife;
      p.color = color;
      p.size = 2 + random() * 3;
      made += 1;
    }
  }

  function floatText(x, y, text, color) {
    for (let i = 0; i < floats.length; i += 1) {
      const f = floats[i];
      if (f.active) continue;
      f.active = true;
      f.x = x;
      f.y = y;
      f.text = text;
      f.life = 0.9;
      f.color = color;
      return;
    }
  }

  function loadLevel(index) {
    const def = LEVELS[index];
    state.level = index;
    state.levelName = def.name;
    state.accent = def.accent;
    state.bricks = [];
    state.bricksLeft = 0;
    state.broken = 0;
    state.combo = 0;
    state.comboTimer = 0;
    for (let r = 0; r < def.rows.length; r += 1) {
      const row = def.rows[r];
      for (let c = 0; c < row.length; c += 1) {
        const ch = row[c];
        if (ch === '.') continue;
        const tier = ch;
        const hp = ch === 'X' ? Infinity : ch === 'A' ? 3 : Number(ch);
        state.bricks.push({
          active: true,
          x: GRID.x + c * (GRID.brickWidth + GRID.gapX),
          y: GRID.y + r * (GRID.brickHeight + GRID.gapY),
          width: GRID.brickWidth,
          height: GRID.brickHeight,
          tier,
          hp,
          maxHp: hp,
        });
        if (ch !== 'X') state.bricksLeft += 1;
      }
    }
    for (const p of powerups) p.active = false;
    for (const l of lasers) l.active = false;
    paddle.x = (FIELD.width - paddle.width) / 2;
    paddle.width = PADDLE.width;
    timers.wide = 0;
    timers.slow = 0;
    timers.sticky = 0;
    timers.laser = 0;
    state.laserShots = 0;
    serve();
  }

  function serve() {
    for (const b of balls) b.active = false;
    const ball = balls[0];
    ball.active = true;
    ball.stuck = true;
    ball.x = paddle.x + paddle.width / 2;
    ball.y = PADDLE.y - BALL.radius - 1;
    ball.vx = 0;
    ball.vy = 0;
    state.serving = true;
  }

  function launch() {
    if (!state.serving) return false;
    let launched = false;
    for (const b of balls) {
      if (!b.active || !b.stuck) continue;
      const angle = -Math.PI / 2 + (random() - 0.5) * 0.9;
      const speed = ballSpeed(state);
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed;
      b.stuck = false;
      launched = true;
    }
    state.serving = false;
    return launched;
  }

  function tryFire() {
    if (timers.laser <= 0 || state.laserShots <= 0 || paddle.laserCooldown > 0) return false;
    let fired = 0;
    for (const l of lasers) {
      if (fired >= 2) break;
      if (l.active) continue;
      l.active = true;
      l.x = paddle.x + (fired === 0 ? 10 : paddle.width - 10);
      l.y = PADDLE.y - 6;
      fired += 1;
    }
    if (fired > 0) {
      state.laserShots -= fired;
      paddle.laserCooldown = PADDLE.laserCooldown;
      return true;
    }
    return false;
  }

  function dropPowerup(x, y) {
    if (random() >= POWERUP.dropChance) return;
    for (const p of powerups) {
      if (p.active) continue;
      let kind = POWERUP_KINDS[Math.floor(random() * POWERUP_KINDS.length)];
      if (kind === '+' && state.lives >= MAX_LIVES) kind = 'W';
      p.active = true;
      p.kind = kind;
      p.x = x;
      p.y = y;
      return;
    }
  }

  function applyPowerup(kind) {
    if (kind === 'W') timers.wide = POWERUP.durations.wide;
    else if (kind === 'M') {
      let added = 0;
      for (const b of balls) {
        if (!b.active || b.stuck) continue;
        for (const free of balls) {
          if (free.active) continue;
          free.active = true;
          free.stuck = false;
          free.x = b.x;
          free.y = b.y;
          free.vx = -b.vx;
          free.vy = b.vy;
          added += 1;
          break;
        }
        if (added >= 2) break;
      }
    } else if (kind === 'L') {
      timers.laser = POWERUP.durations.laser;
      state.laserShots = POWERUP.laserShots;
    } else if (kind === 'S') timers.slow = POWERUP.durations.slow;
    else if (kind === 'T') timers.sticky = POWERUP.durations.sticky;
    else if (kind === '+') state.lives = Math.min(MAX_LIVES, state.lives + 1);
  }

  function damageBrick(brick) {
    if (brick.tier === 'X') return 0;
    brick.hp -= 1;
    if (brick.hp > 0) return 1;
    brick.active = false;
    state.bricksLeft -= 1;
    state.broken += 1;
    if (state.comboTimer > 0) state.combo += 1;
    else state.combo = 1;
    state.comboTimer = COMBO.window;
    const mult = Math.min(state.combo, COMBO.max);
    const points = TIER_POINTS[brick.tier] * mult;
    state.score += points;
    floatText(
      brick.x + brick.width / 2,
      brick.y,
      mult > 1 ? `+${points} x${mult}` : `+${points}`,
      mult > 1 ? '#ffd94d' : '#eef1f5',
    );
    burst(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.tier === 'A' ? '#c8d2e0' : '#ffffff', PARTICLES.brickBurst, 260);
    dropPowerup(brick.x + brick.width / 2, brick.y + brick.height / 2);
    return 2;
  }

  function circleHitsRect(cx, cy, r, rect) {
    const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
    const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  function stepBall(ball, dt) {
    let events = 0;
    const speed = ballSpeed(state);
    // Move on x, then on y: axis-separated, so each bounce has an obvious side.
    ball.x += ball.vx * dt;
    if (ball.x - BALL.radius < 0) {
      ball.x = BALL.radius;
      ball.vx = Math.abs(ball.vx);
      events |= EVENT_ARMORED;
    } else if (ball.x + BALL.radius > FIELD.width) {
      ball.x = FIELD.width - BALL.radius;
      ball.vx = -Math.abs(ball.vx);
      events |= EVENT_ARMORED;
    }
    if (ball.y - BALL.radius < FIELD.hudHeight) {
      ball.y = FIELD.hudHeight + BALL.radius;
      ball.vy = Math.abs(ball.vy);
      events |= EVENT_ARMORED;
    }
    for (const brick of state.bricks) {
      if (!brick.active) continue;
      if (!circleHitsRect(ball.x, ball.y, BALL.radius, brick)) continue;
      const fromLeft = ball.vx > 0 && ball.x < brick.x;
      const fromRight = ball.vx < 0 && ball.x > brick.x + brick.width;
      if (fromLeft || fromRight) ball.vx = -ball.vx;
      else ball.vy = -ball.vy;
      const hit = damageBrick(brick);
      if (hit === 2) events |= EVENT_BRICK;
      else if (hit === 1) events |= EVENT_ARMORED;
      else state.shake = Math.max(state.shake, 2);
      break;
    }
    ball.y += ball.vy * dt;
    // Paddle: only when the ball is falling onto it.
    if (
      ball.vy > 0 &&
      ball.y + BALL.radius >= PADDLE.y &&
      ball.y + BALL.radius <= PADDLE.y + PADDLE.height + 14 &&
      ball.x >= paddle.x - BALL.radius &&
      ball.x <= paddle.x + paddle.width + BALL.radius
    ) {
      if (timers.sticky > 0) {
        ball.stuck = true;
        ball.x = Math.min(Math.max(ball.x, paddle.x + 6), paddle.x + paddle.width - 6);
        ball.y = PADDLE.y - BALL.radius - 1;
        ball.vx = 0;
        ball.vy = 0;
        state.serving = true;
      } else {
        const offset = Math.max(-1, Math.min(1, (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2)));
        let angle = -Math.PI / 2 + offset * (Math.PI / 3);
        // A dead-centre hit would send the ball straight up and down one column forever:
        // nudge it a little so play always spreads across the field.
        if (Math.abs(offset) < 0.06) angle += (random() - 0.5) * 0.35;
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
        ball.y = PADDLE.y - BALL.radius - 1;
        burst(ball.x, PADDLE.y, '#39d5ff', PARTICLES.hitBurst, 120);
      }
      events |= EVENT_ARMORED;
    }
    // Keep the speed honest after every bounce.
    const mag = Math.hypot(ball.vx, ball.vy);
    if (mag > 0.01) {
      ball.vx = (ball.vx / mag) * speed;
      ball.vy = (ball.vy / mag) * speed;
    }
    if (ball.y - BALL.radius > FIELD.height) {
      ball.active = false;
      events |= EVENT_HIT;
    }
    return events;
  }

  function step(dt, dir, pointerX) {
    let events = 0;
    state.elapsed += dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    for (const key of ['wide', 'slow', 'sticky', 'laser']) {
      if (timers[key] > 0) timers[key] -= dt;
    }
    if (paddle.laserCooldown > 0) paddle.laserCooldown -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);

    paddle.width = timers.wide > 0 ? PADDLE.wideWidth : PADDLE.width;
    if (pointerX !== null && pointerX !== undefined) {
      const target = pointerX - paddle.width / 2;
      const delta = target - paddle.x;
      const maxStep = PADDLE.keyboardSpeed * 2.2 * dt;
      paddle.x += Math.max(-maxStep, Math.min(maxStep, delta));
    } else if (dir !== 0) {
      paddle.x += dir * PADDLE.keyboardSpeed * dt;
    }
    paddle.x = Math.max(0, Math.min(FIELD.width - paddle.width, paddle.x));

    for (const b of balls) {
      if (!b.active) continue;
      if (b.stuck) {
        b.x = paddle.x + paddle.width / 2;
        b.y = PADDLE.y - BALL.radius - 1;
        continue;
      }
      events |= stepBall(b, dt);
    }

    let anyBall = false;
    for (const b of balls) if (b.active) anyBall = true;
    if (!anyBall) {
      state.lives -= 1;
      state.combo = 0;
      state.comboTimer = 0;
      state.shake = 10;
      burst(paddle.x + paddle.width / 2, PADDLE.y, '#ff4d6d', PARTICLES.loseBurst, 320);
      if (state.lives <= 0) {
        events |= EVENT_OVER;
        return events;
      }
      serve();
      return events;
    }

    for (const p of powerups) {
      if (!p.active) continue;
      p.y += POWERUP.fallSpeed * dt;
      if (
        p.y + POWERUP.size / 2 >= PADDLE.y &&
        p.y - POWERUP.size / 2 <= PADDLE.y + PADDLE.height &&
        p.x >= paddle.x - POWERUP.size / 2 &&
        p.x <= paddle.x + paddle.width + POWERUP.size / 2
      ) {
        p.active = false;
        applyPowerup(p.kind);
        burst(p.x, PADDLE.y, '#ffffff', PARTICLES.hitBurst, 160);
        events |= EVENT_POWERUP;
      } else if (p.y - POWERUP.size / 2 > FIELD.height) {
        p.active = false;
      }
    }

    for (const l of lasers) {
      if (!l.active) continue;
      l.y -= 760 * dt;
      if (l.y < FIELD.hudHeight) {
        l.active = false;
        continue;
      }
      for (const brick of state.bricks) {
        if (!brick.active) continue;
        if (l.x < brick.x || l.x > brick.x + brick.width || l.y < brick.y || l.y > brick.y + brick.height) continue;
        const hit = damageBrick(brick);
        if (hit === 2) events |= EVENT_BRICK;
        else if (hit === 1) events |= EVENT_ARMORED;
        l.active = false;
        break;
      }
    }

    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 420 * dt;
    }
    for (const f of floats) {
      if (!f.active) continue;
      f.life -= dt;
      f.y -= 34 * dt;
      if (f.life <= 0) f.active = false;
    }

    if (state.bricksLeft === 0) {
      state.score += 100 * state.lives;
      events |= EVENT_CLEAR;
    }
    return events;
  }

  function resetGame() {
    state.score = 0;
    state.lives = LIVES;
    state.elapsed = 0;
    loadLevel(0);
  }

  loadLevel(0);

  return {
    state,
    resetGame,
    loadLevel,
    serve,
    launch,
    tryFire,
    step,
    levelCount: LEVEL_COUNT,
  };
}
