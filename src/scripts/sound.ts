/**
 * UI sounds, synthesized with the Web Audio API: no audio files, zero bytes.
 *
 *   import { playSound } from '../scripts/sound';
 *   playSound('ding');                 // or window.__playSound?.('ding')
 *
 * - playSound('startup' | 'ding' | 'error') is a no-op unless
 *   localStorage.sound === 'on'. It reads the setting on every call, so the
 *   tray toggle takes effect immediately.
 * - The AudioContext is created lazily on the first sound. Browsers only let
 *   it start after a user gesture, so call setSound(true) or playSound from a
 *   click or key handler at least once.
 * - setSound(on) stores the choice and dispatches
 *   `new CustomEvent('sound-change', { detail: 'on' | 'off' })` on window.
 */
export type SoundName = 'startup' | 'ding' | 'error';

declare global {
  interface Window {
    __playSound?: (name: SoundName) => void;
  }
}

let ctx: AudioContext | undefined;

export function soundOn(): boolean {
  try {
    return localStorage.getItem('sound') === 'on';
  } catch {
    return false;
  }
}

function audio(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setSound(on: boolean): void {
  try {
    localStorage.setItem('sound', on ? 'on' : 'off');
  } catch {}
  if (on) audio(); // unlock inside the user gesture
  dispatchEvent(new CustomEvent('sound-change', { detail: on ? 'on' : 'off' }));
}

// [wave, volume, filter cutoff Hz, notes as [frequency Hz, start s, length s]]
type Voice = [OscillatorType, number, number, [number, number, number][]];
const SOUNDS: Record<SoundName, Voice> = {
  // Warm A-flat major arpeggio over a low root; the notes ring into a chord.
  startup: ['triangle', 0.13, 1800, [
    [103.83, 0, 2.2], [207.65, 0, 1.9], [261.63, 0.16, 1.8],
    [311.13, 0.32, 1.7], [415.3, 0.48, 1.9],
  ]],
  ding: ['sine', 0.2, 4000, [[1046.5, 0, 0.5], [1568, 0, 0.3]]],
  error: ['square', 0.05, 1200, [[220, 0, 0.14], [164.81, 0.15, 0.3]]],
};

export function playSound(name: SoundName): void {
  if (!soundOn() || !SOUNDS[name]) return;
  try {
    const a = audio();
    const [type, volume, cutoff, notes] = SOUNDS[name];
    const t = a.currentTime + 0.03;
    const out = a.createGain();
    out.gain.value = volume;
    const lp = a.createBiquadFilter();
    lp.frequency.value = cutoff;
    lp.connect(out).connect(a.destination);
    for (const [f, s, d] of notes) {
      // A slightly detuned pair per note warms up the triangle waves.
      for (const detune of type === 'triangle' ? [-5, 5] : [0]) {
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = type;
        o.frequency.value = f;
        o.detune.value = detune;
        g.gain.setValueAtTime(0.0001, t + s);
        g.gain.exponentialRampToValueAtTime(1, t + s + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + s + d);
        o.connect(g).connect(lp);
        o.start(t + s);
        o.stop(t + s + d + 0.05);
      }
    }
  } catch {}
}

window.__playSound = playSound;
