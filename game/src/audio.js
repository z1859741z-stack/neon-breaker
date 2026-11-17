// Sound, synthesized with WebAudio: no audio files, nothing fetched. The context is created
// on the first user gesture (browsers block audio before one) and stays silent in screenshot
// mode, where no gesture ever happens. M toggles mute.

export function createAudio() {
  let context = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  // A quiet bass line, one note every beat, from A minor.
  const BASS = [55, 0, 55, 0, 65.41, 0, 49, 0, 55, 0, 55, 0, 82.41, 0, 73.42, 0];
  const BEAT = 0.42;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
      musicGain = context.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      startMusic();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!context || muted) return;
    const t0 = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function startMusic() {
    if (musicTimer !== null) return;
    musicTimer = window.setInterval(() => {
      if (muted || !context) return;
      const freq = BASS[musicStep % BASS.length];
      musicStep += 1;
      if (!freq) return;
      const t0 = context.currentTime;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.5, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + BEAT * 0.95);
      osc.connect(gain);
      gain.connect(musicGain);
      osc.start(t0);
      osc.stop(t0 + BEAT);
    }, BEAT * 1000);
  }

  return {
    /** Call from any user gesture; safe to call any number of times. */
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
    paddle() {
      tone(220, 0.07, 'square', 0.25);
    },
    wall() {
      tone(160, 0.05, 'square', 0.12);
    },
    brick(combo) {
      const base = 300 + Math.min(combo, 8) * 45;
      tone(base, 0.09, 'triangle', 0.35);
      tone(base * 1.5, 0.07, 'triangle', 0.2, 0.02);
    },
    armored() {
      tone(140, 0.06, 'square', 0.25);
    },
    powerup() {
      tone(523.25, 0.09, 'sine', 0.3);
      tone(659.25, 0.09, 'sine', 0.3, 0.07);
      tone(783.99, 0.14, 'sine', 0.3, 0.14);
    },
    laser() {
      tone(880, 0.08, 'sawtooth', 0.18, 0, 220);
    },
    loseLife() {
      tone(320, 0.5, 'sawtooth', 0.3, 0, 70);
    },
    levelClear() {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => tone(freq, 0.16, 'triangle', 0.3, i * 0.09));
    },
    victory() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.3, i * 0.12));
    },
  };
}
