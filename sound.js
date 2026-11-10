// Small synthesised sound set (no audio files).
let ctx = null;
export const audio = { on: true };
try { audio.on = localStorage.getItem('ks.sound') !== '0'; } catch (e) { /* ignore */ }
export function setSound(on) { audio.on = on; try { localStorage.setItem('ks.sound', on ? '1' : '0'); } catch (e) { /* ignore */ } }

function ac() {
  if (!audio.on) return null;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch (e) { return null; }
}

function knock(freq, vol, at = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.45, t + 0.07);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.1);
  // click transient
  const len = Math.floor(c.sampleRate * 0.02), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const n = c.createBufferSource(), ng = c.createGain(), f = c.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = 1800;
  ng.gain.value = vol * 0.5; n.buffer = buf;
  n.connect(f).connect(ng).connect(c.destination); n.start(t);
}

function tone(freq, dur, vol, at = 0, type = 'sine') {
  const c = ac(); if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  move() { knock(240, 0.5); },
  capture() { knock(170, 0.7); knock(320, 0.35, 0.035); },
  check() { knock(240, 0.5); tone(880, 0.12, 0.12, 0.02); },
  castle() { knock(240, 0.5); knock(200, 0.45, 0.09); },
  wrong() { tone(150, 0.16, 0.16, 0, 'square'); },
  good() { tone(660, 0.1, 0.14); tone(990, 0.16, 0.14, 0.08); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 0.14, i * 0.1)); },
  lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.28, 0.13, i * 0.14)); },
  forMove(m, inCheck) {
    if (inCheck) return sfx.check();
    if (m.isKingsideCastle?.() || m.isQueensideCastle?.() || /[kq]/.test(m.flags || '')) return sfx.castle();
    if (m.captured) return sfx.capture();
    sfx.move();
  }
};
