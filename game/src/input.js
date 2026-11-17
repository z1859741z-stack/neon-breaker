// Keyboard and pointer input. Held keys steer the paddle; the pointer steers it too (the
// paddle follows the pointer's x, smoothed in the world). One-shot presses (launch, restart,
// pause, mute) are queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice.

export const ACTION_LAUNCH = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const LAUNCH = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target, fieldWidth) {
  let left = false;
  let right = false;
  let actions = 0;
  let pointerX = null;
  let pointerSeen = false;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (LAUNCH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_LAUNCH;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyM') {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
  });
  target.addEventListener('pointerdown', (event) => {
    pointerX = (event.clientX / window.innerWidth) * fieldWidth;
    pointerSeen = true;
    actions |= ACTION_LAUNCH;
  });
  target.addEventListener('pointermove', (event) => {
    pointerX = (event.clientX / window.innerWidth) * fieldWidth;
    pointerSeen = true;
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both. */
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** The pointer's x in field coordinates, or null when the pointer never moved. */
    pointer() {
      return pointerSeen ? pointerX : null;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
