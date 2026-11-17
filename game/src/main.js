// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between six screens: title, play, paused, level clear, game over
// and victory.
//
// ?seed=N fixes the random pattern. ?shot=start|play|level|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BRICK, EVENT_CLEAR, EVENT_HIT, EVENT_LASER, EVENT_OVER, EVENT_POWERUP } from './world.js';
import { ACTION_LAUNCH, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { autopilotTarget, stageShot } from './shots.js';
import {
  SCREEN_CLEAR,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createRenderer,
} from './render.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  // A fixed clock, so the blink states in the frame are the same every run.
  const ui = { screen: scene.screen, best: scene.best, newBest: false, muted: false, time: 3 };
  let painted = 0;
  function paint() {
    renderer.draw(world.state, ui);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, 1280);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let newBest = false;
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each loss.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.resetGame();
    newBest = false;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LIVES} lives. Level 1, ${world.state.levelName}.`);
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      newBest = true;
      saveBest(best);
    }
    if (won) {
      audio.victory();
      announce(`You win! Final score ${world.state.score}. Best ${best}.`);
    } else {
      announce(`Game over. Score ${world.state.score}. Best ${best}.`);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_LAUNCH) {
        audio.unlock();
        startGame();
      }
      return;
    }
    if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
      if (actions & ACTION_LAUNCH) startGame();
      return;
    }
    if (screen === SCREEN_CLEAR) {
      if (actions & ACTION_LAUNCH) {
        const next = world.state.level + 1;
        if (next < world.levelCount) {
          world.loadLevel(next);
          screen = SCREEN_PLAY;
          announce(`Level ${next + 1}, ${world.state.levelName}.`);
        } else {
          endGame(true);
        }
      }
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_LAUNCH) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if (actions & ACTION_LAUNCH && screen === SCREEN_PLAY) {
      if (world.state.serving) world.launch();
      else if (world.tryFire()) audio.laser();
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      if (world.state.serving) world.launch();
      const events = world.step(STEP, 0, autopilotTarget(world.state));
      if (events & EVENT_OVER) world.resetGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const events = world.step(STEP, input.direction(), input.pointer());
    if (events & EVENT_BRICK) audio.brick(world.state.combo);
    if (events & EVENT_POWERUP) audio.powerup();
    if (events & EVENT_LASER) audio.laser();
    if (events & EVENT_HIT) {
      audio.loseLife();
      announce(world.state.lives === 1 ? 'Ball lost. 1 life left.' : `Ball lost. ${world.state.lives} lives left.`);
    }
    if (events & EVENT_CLEAR) {
      audio.levelClear();
      if (world.state.level + 1 < world.levelCount) {
        screen = SCREEN_CLEAR;
        announce(`Level clear! Bonus ${100 * world.state.lives}.`);
      } else {
        endGame(true);
      }
    } else if (events & EVENT_OVER) {
      audio.loseLife();
      endGame(false);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, {
      screen,
      best,
      newBest,
      muted: audio.isMuted(),
      time: now / 1000,
    });
  }

  // Leaving the tab pauses a running game rather than letting the ball fall unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Neon Breaker. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
