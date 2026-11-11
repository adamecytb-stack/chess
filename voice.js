// Olly's voice: pre-recorded natural speech clips (see dev/make_voice.mjs), played through Web Audio.
// New speech never cuts the old one off abruptly: it fades out, pauses briefly, then the new sentence starts.
import { audioCtx } from './sound.js';

export const voice = { on: true };
try { voice.on = localStorage.getItem('ks.voice') !== '0'; } catch (e) { /* ignore */ }
export function setVoiceOn(on) { voice.on = on; try { localStorage.setItem('ks.voice', on ? '1' : '0'); } catch (e) { /* ignore */ } if (!on) stop(); }

/* ---------------- text → words ---------------- */
const PIECE = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight' };
const sq = (f, r) => `${f.toUpperCase()} ${r}`;
export function speakable(html) {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, 'and').replace(/&[a-z]+;/g, ' ')
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}★☆✓✔✕✗↶↺▶◀⏭⚑]/gu, ' ')
    .replace(/\b\d+\.(\.\.)?(?=[KQRBNa-hO])/g, '').replace(/\b\d+…/g, '')
    .replace(/O-O-O([+#]?)/g, (m, c) => 'castles queenside' + (c === '#' ? ', checkmate' : c ? ', check' : ''))
    .replace(/O-O([+#]?)/g, (m, c) => 'castles' + (c === '#' ? ', checkmate' : c ? ', check' : ''))
    .replace(/\b([KQRBN])?([a-h])?([1-8])?(x)?([a-h])([1-8])(?:=([QRBN]))?([+#])?(?![\w])/g, (m, p, df, dr, x, f, r, promo, chk) => {
      let s = p ? PIECE[p] : (x && df ? df.toUpperCase() : '');
      s += x ? (s ? ' takes ' : 'takes ') : (s ? ' ' : '');
      s += sq(f, r);
      if (promo) s += ', promotes to ' + PIECE[promo];
      if (chk === '+') s += ', check';
      if (chk === '#') s += ', checkmate';
      return '\u0001' + s + '\u0002';
    })
    .replace(/\u0002\s+\u0001/g, ', ').replace(/[\u0001\u0002]/g, '')
    .replace(/[–—]/g, ', ').replace(/…/g, '').replace(/\s+([.,!?])/g, '$1').replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
}
export const voiceKey = text => speakable(text).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/* ---------------- clips ---------------- */
let manifestP = null;
function loadManifest() {
  if (!manifestP) manifestP = fetch('sounds/voice/manifest.json').then(r => r.json()).catch(() => ({}));
  return manifestP;
}
const clips = new Map();
function loadClip(key) {
  if (clips.has(key)) return clips.get(key);
  const p = (async () => {
    const m = await loadManifest();
    const f = m[key];
    if (!f) return null;
    const ctx = audioCtx(); if (!ctx) return null;
    const data = await (await fetch('sounds/voice/' + f)).arrayBuffer();
    return await new Promise((res, rej) => ctx.decodeAudioData(data, res, rej));
  })().catch(() => null);
  clips.set(key, p);
  if (clips.size > 150) clips.delete(clips.keys().next().value);
  return p;
}
export function prefetch(lines) { if (voice.on) lines.filter(Boolean).forEach(l => loadClip(voiceKey(l))); }

/* ---------------- device voice: English only, only for lines without a clip ---------------- */
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
function deviceVoice() {
  if (!synth) return null;
  const v = synth.getVoices();
  return v.find(x => /^en[-_]US/i.test(x.lang) && /natural|enhanced|premium|google/i.test(x.name)) || v.find(x => /^en[-_]US/i.test(x.lang)) || v.find(x => /^en/i.test(x.lang)) || null;
}
function speakDevice(text, tok) {
  const v = deviceVoice();
  if (!v || tok !== seq) return Promise.resolve();
  return new Promise(res => {
    const u = new SpeechSynthesisUtterance(speakable(text));
    u.voice = v; u.lang = v.lang; u.rate = 1;
    u.onend = u.onerror = res;
    setTimeout(res, 2000 + text.length * 90);
    synth.speak(u);
  });
}

/* ---------------- playback ---------------- */
let seq = 0, cur = null;
const talkers = new Set();
export function onTalk(fn) { talkers.add(fn); return () => talkers.delete(fn); }
const emit = on => talkers.forEach(f => { try { f(on); } catch (e) { /* ignore */ } });

// Fade out whatever is playing. Returns true if something was audible.
function fadeOut() {
  let was = false;
  if (cur) {
    const ctx = audioCtx(), c = cur;
    was = c.playing;
    if (ctx && c.gain) {
      try { const g = c.gain.gain; g.cancelScheduledValues(ctx.currentTime); g.setValueAtTime(g.value, ctx.currentTime); g.linearRampToValueAtTime(0, ctx.currentTime + 0.18); } catch (e) { /* ignore */ }
    }
    setTimeout(() => { try { c.src.stop(); } catch (e) { /* ignore */ } }, 230);
    cur = null;
  }
  if (synth && synth.speaking) { was = true; synth.cancel(); }
  return was;
}
export function stop() { seq++; fadeOut(); emit(false); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
function playBuffer(buf, tok) {
  return new Promise(res => {
    const ctx = audioCtx();
    if (!ctx || tok !== seq) return res();
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = buf;
    src.connect(gain).connect(ctx.destination);
    const me = { src, gain, playing: true };
    cur = me;
    src.onended = () => { me.playing = false; res(); };
    src.start();
  });
}

// Say one line or several. Resolves when finished (or when replaced by newer speech).
export function say(input, { force = false } = {}) {
  if (!voice.on && !force) return Promise.resolve();
  const lines = (Array.isArray(input) ? input : [input]).filter(Boolean).map(String).filter(l => voiceKey(l));
  if (!lines.length) return Promise.resolve();
  const tok = ++seq;
  const wasTalking = fadeOut();
  const bufs = lines.map(l => loadClip(voiceKey(l)));
  return (async () => {
    if (wasTalking) await sleep(420);        // fade, then a short beat of silence before the new sentence
    if (tok !== seq) return;
    emit(true);
    for (let i = 0; i < lines.length; i++) {
      const b = await bufs[i];
      if (tok !== seq) return;
      if (b) await playBuffer(b, tok); else await speakDevice(lines[i], tok);
      if (tok !== seq) return;
      if (i < lines.length - 1) await sleep(150);
    }
    if (tok === seq) { cur = null; emit(false); }
  })();
}
export const speaking = () => !!(cur && cur.playing);
if (typeof window !== 'undefined') loadManifest();
