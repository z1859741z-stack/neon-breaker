// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Neon glow, particles, floating scores, the HUD and every panel live here.

import { BALL, FIELD, FONT, GRID, PADDLE, PALETTE } from './config.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, line: 36 };
const STAR_COUNT = 110;

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const stars = [];
  {
    const rnd = createRandom(1337);
    for (let i = 0; i < STAR_COUNT; i += 1) {
      stars.push({ x: rnd() * FIELD.width, y: rnd() * FIELD.height, r: 0.6 + rnd() * 1.6, tw: rnd() * Math.PI * 2, sp: 0.4 + rnd() * 1.2 });
    }
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align = 'left', weight = 600) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function drawStars(t) {
    for (const s of stars) {
      const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.sp + s.tw));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#cfe8ff';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
  }

  function drawBricks(state) {
    for (const b of state.bricks) {
      if (!b.active) continue;
      const c = PALETTE.tiers[b.tier];
      ctx.fillStyle = c.face;
      roundedRect(ctx, b.x, b.y, b.width, b.height, 5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(b.x + 3, b.y + 3, b.width - 6, 5);
      ctx.fillStyle = c.edge;
      ctx.fillRect(b.x + 3, b.y + b.height - 6, b.width - 6, 3);
      if (b.tier === 'X') {
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x + 8, b.y + b.height - 6);
        ctx.lineTo(b.x + b.width - 8, b.y + 6);
        ctx.moveTo(b.x + 8, b.y + 6);
        ctx.lineTo(b.x + b.width - 8, b.y + b.height - 6);
        ctx.stroke();
      } else if (b.maxHp > 1 && b.hp < b.maxHp) {
        // Cracks: one pip per hit point left.
        for (let i = 0; i < b.hp; i += 1) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(b.x + b.width / 2 + (i - (b.hp - 1) / 2) * 14, b.y + b.height / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (Number(b.tier) >= 2) {
        text(String(b.tier), b.x + b.width / 2, b.y + b.height / 2 + 6, 15, 'rgba(0,0,0,0.45)', 'center', 800);
      }
    }
  }

  function drawPaddle(state) {
    const p = state.paddle;
    ctx.save();
    ctx.shadowColor = PALETTE.paddle;
    ctx.shadowBlur = 18;
    const grad = ctx.createLinearGradient(p.x, PADDLE.y, p.x, PADDLE.y + PADDLE.height);
    grad.addColorStop(0, '#bdf3ff');
    grad.addColorStop(0.45, PALETTE.paddle);
    grad.addColorStop(1, '#0b7d99');
    ctx.fillStyle = grad;
    roundedRect(ctx, p.x, PADDLE.y, p.width, PADDLE.height, 8);
    ctx.fill();
    ctx.restore();
    if (state.timers.laser > 0) {
      ctx.fillStyle = PALETTE.laser;
      roundedRect(ctx, p.x + 4, PADDLE.y - 12, 8, 14, 3);
      ctx.fill();
      roundedRect(ctx, p.x + p.width - 12, PADDLE.y - 12, 8, 14, 3);
      ctx.fill();
    }
  }

  function drawBalls(state) {
    for (const b of state.balls) {
      if (!b.active) continue;
      // Motion streak: a fading line back along the velocity.
      if (!b.stuck && (b.vx !== 0 || b.vy !== 0)) {
        const grad = ctx.createLinearGradient(b.x, b.y, b.x - b.vx * 0.045, b.y - b.vy * 0.045);
        grad.addColorStop(0, 'rgba(127,231,255,0.7)');
        grad.addColorStop(1, 'rgba(127,231,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = BALL.radius * 1.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * 0.045, b.y - b.vy * 0.045);
        ctx.stroke();
      }
      ctx.save();
      ctx.shadowColor = PALETTE.ballGlow;
      ctx.shadowBlur = 16;
      ctx.fillStyle = PALETTE.ball;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPowerups(state) {
    for (const p of state.powerups) {
      if (!p.active) continue;
      const color = PALETTE.powerups[p.kind];
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = color;
      roundedRect(ctx, p.x - 15, p.y - 15, 30, 30, 9);
      ctx.fill();
      ctx.restore();
      text(p.kind, p.x, p.y + 7, 19, '#0b1030', 'center', 800);
    }
  }

  function drawLasers(state) {
    ctx.fillStyle = PALETTE.laser;
    for (const l of state.lasers) {
      if (!l.active) continue;
      roundedRect(ctx, l.x - 2, l.y - 12, 4, 12, 2);
      ctx.fill();
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawFloats(state) {
    for (const f of state.floats) {
      if (!f.active) continue;
      ctx.globalAlpha = Math.min(1, f.life / 0.4);
      text(f.text, f.x, f.y, 20, f.color, 'center', 800);
    }
    ctx.globalAlpha = 1;
  }

  function drawHeart(x, y, size, filled) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 16, size / 16);
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-9, -3, -5, -10, 0, -5);
    ctx.bezierCurveTo(5, -10, 9, -3, 0, 5);
    ctx.closePath();
    ctx.fillStyle = filled ? '#ff4d6d' : 'rgba(255,77,109,0.25)';
    ctx.fill();
    ctx.restore();
  }

  function drawHud(state, ui) {
    ctx.fillStyle = PALETTE.hud;
    ctx.fillRect(0, 0, FIELD.width, FIELD.hudHeight);
    ctx.fillStyle = PALETTE.hudLine;
    ctx.fillRect(0, FIELD.hudHeight - 2, FIELD.width, 2);
    text('SCORE', 28, 26, 14, PALETTE.muted, 'left', 700);
    text(String(state.score), 28, 52, 24, PALETTE.text, 'left', 800);
    text('BEST', 190, 26, 14, PALETTE.muted, 'left', 700);
    text(String(Math.max(ui.best, state.score)), 190, 52, 24, PALETTE.text, 'left', 800);
    text(`LEVEL ${state.level + 1}/8`, FIELD.width / 2, 30, 18, state.accent, 'center', 800);
    text(state.levelName.toUpperCase(), FIELD.width / 2, 54, 13, PALETTE.muted, 'center', 700);
    for (let i = 0; i < 5; i += 1) {
      drawHeart(FIELD.width - 40 - i * 30, 32, 22, i < state.lives);
    }
    if (state.combo > 1) {
      const w = 150;
      const frac = state.comboTimer / 4;
      ctx.fillStyle = 'rgba(255,217,77,0.25)';
      roundedRect(ctx, FIELD.width - 210, 48, w, 8, 4);
      ctx.fill();
      ctx.fillStyle = '#ffd94d';
      roundedRect(ctx, FIELD.width - 210, 48, w * frac, 8, 4);
      ctx.fill();
      text(`COMBO x${Math.min(state.combo, 8)}`, FIELD.width - 216, 56, 14, '#ffd94d', 'right', 800);
    }
    // Active power-up timers, as letters with a shrinking bar.
    let px = 330;
    const labels = [
      ['W', state.timers.wide, 12],
      ['S', state.timers.slow, 8],
      ['T', state.timers.sticky, 12],
      ['L', state.timers.laser, 12],
    ];
    for (const [letter, left, total] of labels) {
      if (left <= 0) continue;
      text(letter, px, 52, 18, PALETTE.powerups[letter], 'left', 800);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(px + 16, 44, 44, 6);
      ctx.fillStyle = PALETTE.powerups[letter];
      ctx.fillRect(px + 16, 44, 44 * (left / total), 6);
      px += 78;
    }
    if (ui.muted) text('MUTED (M)', FIELD.width - 40, 26, 13, PALETTE.muted, 'right', 700);
  }

  function drawPanel(title, lines, prompt, accent, blink) {
    const height = 150 + lines.length * PANEL.line + (prompt ? 64 : 20);
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 24;
    ctx.fillStyle = PALETTE.panel;
    roundedRect(ctx, x, y, PANEL.width, height, 16);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    roundedRect(ctx, x, y, PANEL.width, height, 16);
    ctx.stroke();
    text(title, FIELD.width / 2, y + 74, 52, accent, 'center', 800);
    lines.forEach((line, i) => {
      text(line.text, FIELD.width / 2, y + 126 + i * PANEL.line, line.size || 22, line.color || PALETTE.text, 'center', line.weight || 600);
    });
    if (prompt && blink) text(prompt, FIELD.width / 2, y + height - 26, 20, PALETTE.muted, 'center', 700);
  }

  function draw(state, ui) {
    resize();
    const t = ui.time;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);

    const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(1, PALETTE.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    drawStars(t);

    if (ui.screen === SCREEN_TITLE) {
      drawBricks(state);
      drawBalls(state);
      drawPaddle(state);
      ctx.fillStyle = 'rgba(7, 10, 24, 0.55)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      const blink = Math.floor(t * 1.6) % 2 === 0;
      ctx.save();
      ctx.shadowColor = PALETTE.accent;
      ctx.shadowBlur = 30;
      text('NEON BREAKER', FIELD.width / 2, 250, 88, '#ffffff', 'center', 800);
      ctx.restore();
      text('SMASH THE GRID  ·  CATCH THE POWER-UPS  ·  CLEAR ALL 8 LEVELS', FIELD.width / 2, 296, 20, PALETTE.accent, 'center', 700);
      text('Move: mouse or ← →   ·   Launch / fire: Space or click   ·   Pause: P   ·   Mute: M', FIELD.width / 2, 380, 19, PALETTE.text, 'center', 600);
      text('W wide paddle   M multiball   L laser   S slow ball   T sticky   + extra life', FIELD.width / 2, 414, 17, PALETTE.muted, 'center', 600);
      if (blink) text('CLICK OR PRESS SPACE TO START', FIELD.width / 2, 500, 24, '#ffd94d', 'center', 800);
      if (ui.best > 0) text(`BEST  ${ui.best}`, FIELD.width / 2, 552, 20, PALETTE.muted, 'center', 700);
      return;
    }

    drawHud(state, ui);
    drawBricks(state);
    drawPowerups(state);
    drawLasers(state);
    drawPaddle(state);
    drawBalls(state);
    drawParticles(state);
    drawFloats(state);

    const blink = Math.floor(t * 1.6) % 2 === 0;
    if (ui.screen === SCREEN_PLAY && state.serving) {
      if (blink) text('SPACE OR CLICK TO LAUNCH', FIELD.width / 2, 560, 22, '#ffd94d', 'center', 800);
    } else if (ui.screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(7, 10, 24, 0.6)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      drawPanel('PAUSED', [{ text: 'Take a breath. The grid waits.', size: 20, color: PALETTE.muted }], 'PRESS P OR CLICK TO RESUME', state.accent, blink);
    } else if (ui.screen === SCREEN_CLEAR) {
      drawPanel('LEVEL CLEAR!', [
        { text: `${state.levelName} cleared`, size: 24 },
        { text: `Life bonus  +${100 * state.lives}`, size: 22, color: '#ffd94d' },
        { text: `Score  ${state.score}`, size: 22 },
      ], state.level + 1 < 8 ? 'SPACE OR CLICK FOR THE NEXT LEVEL' : 'SPACE OR CLICK TO SEE YOUR RESULT', state.accent, blink);
    } else if (ui.screen === SCREEN_OVER) {
      drawPanel('GAME OVER', [
        { text: `Score  ${state.score}`, size: 26 },
        { text: `Best  ${Math.max(ui.best, state.score)}`, size: 22, color: PALETTE.muted },
        ...(ui.newBest ? [{ text: '★ NEW BEST! ★', size: 24, color: '#ffd94d' }] : []),
      ], 'SPACE OR CLICK TO PLAY AGAIN', '#ff4d6d', blink);
    } else if (ui.screen === SCREEN_WIN) {
      drawPanel('YOU WIN!', [
        { text: 'All 8 levels cleared. The grid is yours.', size: 22 },
        { text: `Final score  ${state.score}`, size: 26 },
        { text: `Best  ${Math.max(ui.best, state.score)}`, size: 22, color: PALETTE.muted },
        ...(ui.newBest ? [{ text: '★ NEW BEST! ★', size: 24, color: '#ffd94d' }] : []),
      ], 'SPACE OR CLICK TO PLAY AGAIN', '#ffd94d', blink);
    }
  }

  return { draw };
}
