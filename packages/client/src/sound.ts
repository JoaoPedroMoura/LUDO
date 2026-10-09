const MUTE_KEY = "ludo_muted";

let ctx: AudioContext | undefined;
function audioCtx(): AudioContext {
  ctx ??= new AudioContext();
  return ctx;
}

export function isMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setMuted(muted: boolean): void {
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

function beep(
  freq: number,
  startOffset: number,
  duration: number,
  gain = 0.08,
): void {
  if (isMuted()) return;
  const context = audioCtx();
  const osc = context.createOscillator();
  const vol = context.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  vol.gain.value = gain;
  osc.connect(vol).connect(context.destination);
  const start = context.currentTime + startOffset;
  osc.start(start);
  osc.stop(start + duration);
}

export const sounds = {
  roll: () => beep(320, 0, 0.1),
  move: () => beep(520, 0, 0.07),
  capture: () => {
    beep(440, 0, 0.08);
    beep(220, 0.08, 0.12);
  },
  win: () => {
    [523, 659, 784, 1046].forEach((freq, i) => beep(freq, i * 0.12, 0.18, 0.1));
  },
};
