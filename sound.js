// Sound effects: rendered samples (see dev/make_sounds.py) played through Web Audio for low latency.
let ctx = null;
const buffers = {};
const FILES = {
  move: 'move.wav', move2: 'move2.wav', moveOpp: 'move-opp.wav', capture: 'capture.wav', castle: 'castle.wav',
  check: 'check.wav', illegal: 'illegal.wav', promote: 'promote.wav', start: 'start.mp3', win: 'win.mp3',
  lose: 'lose.mp3', draw: 'draw.mp3', correct: 'correct.mp3', brilliant: 'brilliant.mp3', notify: 'notify.mp3', wrong: 'wrong.mp3'
};
export const audio = { on: true };
try { audio.on = localStorage.getItem('ks.sound') !== '0'; } catch (e) { /* ignore */ }
export function setSound(on) { audio.on = on; try { localStorage.setItem('ks.sound', on ? '1' : '0'); } catch (e) { /* ignore */ } }

export function audioCtx() { return ac(); }
function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    load();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
let loading = null;
function load() {
  if (loading) return loading;
  loading = Promise.all(Object.entries(FILES).map(async ([k, f]) => {
    try {
      const r = await fetch('sounds/' + f);
      const data = await r.arrayBuffer();
      buffers[k] = await new Promise((res, rej) => ctx.decodeAudioData(data, res, rej));
    } catch (e) { /* sound missing: stay silent */ }
  }));
  return loading;
}
// Call from the first tap so iOS lets us play audio later.
export function unlockAudio() { const c = ac(); if (c) { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } }

let flip = false;
export function play(name, vol = 1) {
  if (!audio.on) return;
  const c = ac(); if (!c) return;
  if (name === 'move') { flip = !flip; if (flip && buffers.move2) name = 'move2'; }
  const b = buffers[name];
  if (!b) { load().then(() => { if (buffers[name]) play(name, vol); }); return; }
  const s = c.createBufferSource(), g = c.createGain();
  s.buffer = b; g.gain.value = vol;
  s.connect(g).connect(c.destination);
  s.start();
}

// The right sound for a chess.js move. mine: was it the user's move?
export function moveSound(m, game, mine = true) {
  if (game && game.isCheckmate()) return play('check');
  if (game && game.inCheck()) return play('check');
  if (m.promotion) return play('promote');
  if (m.flags && (m.flags.includes('k') || m.flags.includes('q'))) return play('castle');
  if (m.captured) return play('capture');
  play(mine ? 'move' : 'moveOpp');
}
