// GlucoDefense — Audio system (Web Audio API oscillators, no audio files)

let audioCtx = null;
let masterGain = null;
let enabled = true;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.15;
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.3) {
  if (!enabled) return;
  const ctx = getCtx();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;

  // Envelope: quick attack, sustain, fade out
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playChord(freqs, duration, type = 'sine', volume = 0.15) {
  for (const freq of freqs) {
    playTone(freq, duration, type, volume);
  }
}

// === Sound effects ===

export function playCastSuccess() {
  // Ascending arpeggio — conversion success
  playTone(523, 0.15, 'sine', 0.2);   // C5
  setTimeout(() => playTone(659, 0.15, 'sine', 0.2), 80);   // E5
  setTimeout(() => playTone(784, 0.2, 'sine', 0.25), 160);  // G5
}

export function playCastFail() {
  // Descending buzz — conversion failed
  playTone(220, 0.12, 'sawtooth', 0.15);
  setTimeout(() => playTone(165, 0.15, 'sawtooth', 0.1), 100);
}

export function playVortex() {
  // Whoosh — kidney vortex
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.6);

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.7);
}

export function playBlackout() {
  // Low rumble — energy depleted
  playTone(55, 1.5, 'sawtooth', 0.2);
  playTone(58, 1.5, 'sawtooth', 0.15);
}

export function playVictory() {
  // Major chord fanfare
  playChord([523, 659, 784], 0.3, 'sine', 0.15);
  setTimeout(() => playChord([587, 740, 880], 0.3, 'sine', 0.15), 300);
  setTimeout(() => playChord([659, 831, 988], 0.5, 'sine', 0.2), 600);
}

export function playDefeat() {
  // Minor chord descent
  playChord([220, 262, 330], 0.4, 'triangle', 0.15);
  setTimeout(() => playChord([196, 233, 294], 0.5, 'triangle', 0.15), 400);
  setTimeout(() => playTone(147, 0.8, 'triangle', 0.2), 800);
}

export function playButtonClick() {
  playTone(660, 0.08, 'square', 0.1);
}

export function playWaveStart() {
  // Ship horn
  playTone(220, 0.4, 'sawtooth', 0.1);
  setTimeout(() => playTone(220, 0.6, 'sawtooth', 0.12), 500);
}

export function playFoodSelect() {
  playTone(880, 0.1, 'sine', 0.15);
  setTimeout(() => playTone(1100, 0.1, 'sine', 0.15), 100);
}

export function playDegradation() {
  // Warning alarm
  playTone(440, 0.15, 'square', 0.15);
  setTimeout(() => playTone(440, 0.15, 'square', 0.15), 250);
  setTimeout(() => playTone(440, 0.15, 'square', 0.15), 500);
}

// === Audio toggle ===

export function toggleAudio() {
  enabled = !enabled;
  return enabled;
}

export function isAudioEnabled() {
  return enabled;
}
