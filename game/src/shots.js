// The screenshot scenes behind ?shot=start|play|level|end. Each one plays the real rules
// forward from a fresh world for a fixed time, steered by an autopilot that predicts where
// the ball will meet the paddle, so the frame is what a short game really looks like and
// the same seed always gives the same frame.

import { FIELD, PADDLE, STEP } from './config.js';
import { EVENT_CLEAR, EVENT_OVER } from './world.js';
import { SCREEN_CLEAR, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 22;
const LIMIT_SECONDS = 600;

/** Where the ball will be (x) when it next reaches the paddle's height, walls reflected. */
export function predictBallX(state) {
  let ball = null;
  for (const b of state.balls) {
    if (b.active && !b.stuck) {
      ball = b;
      break;
    }
  }
  if (!ball || ball.vy <= 0) return null;
  let x = ball.x;
  let vx = ball.vx;
  let y = ball.y;
  const targetY = PADDLE.y;
  while (y < targetY) {
    const dt = 1 / 60;
    x += vx * dt;
    y += ball.vy * dt;
    if (x < 8) {
      x = 16 - x;
      vx = Math.abs(vx);
    } else if (x > FIELD.width - 8) {
      x = 2 * (FIELD.width - 8) - x;
      vx = -Math.abs(vx);
    }
    if (y > FIELD.height) return null;
  }
  return Math.max(0, Math.min(FIELD.width, x));
}

/** The autopilot's paddle target: the ball's landing spot, or the nearest falling power-up
 * while the ball is flying away. A slow sway keeps the paddle a little off-centre, so the
 * ball angles across the field instead of bouncing straight up one cleared column. */
export function autopilotTarget(state) {
  const landing = predictBallX(state);
  const sway = 42 * Math.sin(state.elapsed * 0.7);
  if (landing !== null) return landing + sway;
  let best = null;
  for (const p of state.powerups) {
    if (!p.active) continue;
    if (best === null || p.y > best.y) best = p;
  }
  if (best) return best.x;
  return FIELD.width / 2;
}

/** Step the world with the autopilot steering until `until` says stop, or the time runs out. */
function playFor(world, seconds, until) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const events = world.step(STEP, 0, autopilotTarget(world.state));
    if (until && until(events)) return events;
    if (events & EVENT_OVER) return events;
  }
  return 0;
}

/**
 * Set `world` to the named scene (start, play, level or end) and return the screen to draw
 * over it and the best score to show.
 */
export function stageShot(name, world) {
  world.resetGame();
  if (name === 'play') {
    world.launch();
    playFor(world, PLAY_SECONDS);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'level') {
    world.launch();
    const events = playFor(world, LIMIT_SECONDS, (e) => (e & EVENT_CLEAR) !== 0);
    if (events & EVENT_CLEAR) return { screen: SCREEN_CLEAR, best: world.state.score };
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    world.launch();
    // A hopeless pilot: the paddle runs away from the ball, so all three lives go quickly.
    const steps = Math.floor(LIMIT_SECONDS / STEP);
    for (let i = 0; i < steps; i += 1) {
      const landing = predictBallX(world.state);
      const away = landing === null ? FIELD.width / 2 : landing < FIELD.width / 2 ? FIELD.width - 120 : 120;
      const events = world.step(STEP, 0, away);
      if (events & EVENT_OVER) break;
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  // Title: the ball bounces behind the panel while the paddle chases it.
  for (let i = 0; i < START_SECONDS / STEP; i += 1) {
    if (world.state.serving) world.launch();
    const events = world.step(STEP, 0, autopilotTarget(world.state));
    if (events & EVENT_OVER) world.resetGame();
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
