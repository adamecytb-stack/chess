// Shared UI helpers: storage, screens, the coach character, settings.
import { clsIcon, CLS_COLOR } from './icons.js';
import { CLASSES } from './coach.js';
import { say, stop as stopVoice, onTalk, voice, setVoiceOn } from './voice.js';

/* ---------------- storage ---------------- */
const KEY = 'knightschool.v1';
export let store = { stars: {}, games: [], current: null };
try { store = Object.assign(store, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* private mode */ }
export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); }
  catch (e) {
    // storage full: drop analysis of the oldest games and try again
    for (let i = store.games.length - 1; i >= 3; i--) if (store.games[i].infos) { delete store.games[i].infos; try { localStorage.setItem(KEY, JSON.stringify(store)); return; } catch (e2) { /* keep trimming */ } }
  }
}
export function resetStore() { store = { stars: {}, games: [], current: null }; persist(); }

export const prefs = { theme: 'green', talk: 'all', tips: true, threats: false, bestArrow: false, evalBar: false };
try { Object.assign(prefs, JSON.parse(localStorage.getItem('ks.prefs') || '{}')); } catch (e) { /* ignore */ }
export function savePrefs() { try { localStorage.setItem('ks.prefs', JSON.stringify(prefs)); } catch (e) { /* ignore */ } applyTheme(); }
export function applyTheme() { document.documentElement.dataset.board = prefs.theme; }

/* ---------------- screens ---------------- */
export const $ = s => document.querySelector(s);
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const starStr = (n, max = 3) => '★'.repeat(n) + `<span class="off">${'★'.repeat(max - n)}</span>`;

export let ACT = {};
export let viewTok = 0;
const cleanups = [];
export function onLeave(fn) { cleanups.push(fn); }
export function screen(html, tab) {
  while (cleanups.length) { try { cleanups.pop()(); } catch (e) { /* ignore */ } }
  viewTok++; ACT = {};
  stopVoice();
  const view = $('#view'), tabs = $('#tabs');
  view.innerHTML = html;
  view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter');
  view.classList.toggle('pad', !!tab);
  tabs.hidden = !tab;
  tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  window.scrollTo(0, 0);
}
export function go(hash) {
  if (location.hash === hash) window.dispatchEvent(new Event('hashchange'));
  else location.hash = hash;
}

/* ---------------- coach character ---------------- */
export function owl(mood = 'happy') {
  const P = { happy: [0, 0.6, 3.6], think: [2.2, -2.2, 3.4], oops: [0, 1.4, 2.6], wow: [0, -0.4, 4.4], talk: [0, 0.6, 3.6] }[mood] || [0, 0.6, 3.6];
  const [px, py, r] = P;
  const brow = mood === 'oops' ? '<path d="M15 16.5l9 3.2M49 16.5l-9 3.2" stroke="#4a2c17" stroke-width="2.4" stroke-linecap="round"/>'
    : mood === 'think' ? '<path d="M38 15.5l10-2.2" stroke="#4a2c17" stroke-width="2.4" stroke-linecap="round"/>'
    : mood === 'wow' ? '<path d="M15 13.5q6-3 11 0M38 13.5q6-3 11 0" fill="none" stroke="#4a2c17" stroke-width="2.2" stroke-linecap="round"/>' : '';
  const eye = x => `<circle cx="${x}" cy="27" r="9.6" fill="#fff" stroke="#f0bf55" stroke-width="1.6"/><circle cx="${x + px}" cy="${27 + py}" r="${r}" fill="#26211c"/><circle cx="${x + px + 1.3}" cy="${27 + py - 1.4}" r="1.15" fill="#fff"/>`;
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><defs>
    <linearGradient id="ob" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b98053"/><stop offset="1" stop-color="#7c4b2b"/></linearGradient>
    <radialGradient id="obl" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#fbf0da"/><stop offset="1" stop-color="#ecd3a8"/></radialGradient></defs>
    <path d="M12 22L13 6l12 9zM52 22L51 6 39 15z" fill="#6e4126"/>
    <path d="M32 9C16 9 8 22 8 36c0 15 10 25 24 25s24-10 24-25C56 22 48 9 32 9z" fill="url(#ob)"/>
    <path d="M8.5 34c-3.5 7-2.5 16 2.5 20.5 1.5-6 2.5-11 1.5-17zM55.5 34c3.5 7 2.5 16-2.5 20.5-1.5-6-2.5-11-1.5-17z" fill="#6e4126"/>
    <ellipse cx="32" cy="47" rx="14.5" ry="13" fill="url(#obl)"/>
    <path d="M24 44l2.5 2 2.5-2M30 47l2 2 2-2M35 44l2.5 2 2.5-2M27 51l2 2 2-2M33 51l2 2 2-2" fill="none" stroke="#d6b483" stroke-width="1.2" stroke-linecap="round"/>
    <ellipse cx="22" cy="27" rx="12.5" ry="12" fill="#d9a674"/><ellipse cx="42" cy="27" rx="12.5" ry="12" fill="#d9a674"/>
    ${eye(22)}${eye(42)}
    <g class="lids"><rect x="12" y="16.5" width="20" height="21" rx="10" fill="#c48f5e"/><rect x="32" y="16.5" width="20" height="21" rx="10" fill="#c48f5e"/></g>
    ${brow}
    <path d="M32 33.5l-4.6 3.6 4.6 4.4 4.6-4.4z" fill="#f4a42a"/><path class="jaw" d="M28.6 38.2L32 41.5l3.4-3.3z" fill="#d9831a"/>
    <path d="M25 60.5c1-2 2.5-2 3.5 0M30.5 60.5c1-2 2.5-2 3.5 0M36 60.5c1-2 2.5-2 3.5 0" fill="none" stroke="#f4a42a" stroke-width="2" stroke-linecap="round"/></svg>`;
}
export const clsTag = cls => cls ? `<span class="lab" data-cls="${cls}" style="color:${CLS_COLOR[cls]}">${clsIcon(cls, 20)}${CLASSES[cls].label}</span>` : '';
export const coachBox = (mood, html, id = '') => `<div class="coach"${id ? ` id="${id}"` : ''}><div class="owl">${owl(mood)}</div><div class="bubble">${html}</div></div>`;

// The owl's beak moves while Olly is actually speaking.
let talkEl = null;
onTalk(on => {
  document.querySelectorAll('.coach.talking').forEach(e => e.classList.remove('talking'));
  if (on && talkEl && talkEl.isConnected) talkEl.classList.add('talking');
});
// Update a coach bubble in place and read it aloud.
// opts.speak: true | false | 'minor' (only when "talk on every move" is chosen); opts.say: the spoken lines.
export function coachSet(el, mood, html, opts = {}) {
  if (!el) return Promise.resolve();
  const bubble = el.querySelector('.bubble'), o = el.querySelector('.owl');
  if (bubble.innerHTML !== html) {
    bubble.innerHTML = html;
    bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
  }
  const m = html.match(/class="lab" data-cls="(\w+)"/);
  if (m) bubble.dataset.cls = m[1]; else delete bubble.dataset.cls;
  if (o.dataset.mood !== mood) { o.innerHTML = owl(mood); o.dataset.mood = mood; }
  const speak = opts.speak === undefined ? true : opts.speak;
  if (speak === true || (speak === 'minor' && prefs.talk === 'all')) {
    talkEl = el;
    return say(opts.say || [html.replace(/<div class="row">[\s\S]*$/, '')]);
  }
  return Promise.resolve();
}

/* ---------------- board screens ---------------- */
export function boardShell({ back, title, right = '', cls = '' }) {
  return `<div class="screen ${cls}">
    <div class="top"><button class="back" data-go="${back}" aria-label="Back">‹</button><span class="ttl" id="ptitle">${esc(title)}</span><span class="right" id="pright">${right}</span>${muteBtn()}</div>
    <div class="above" id="above"></div>
    <div class="board-wrap"><div id="board"></div></div>
    <div class="below" id="below"></div>
    <div class="actions" id="actions"></div>
  </div>`;
}
export const kingInCheck = g => {
  if (!g.inCheck()) return null;
  for (const row of g.board()) for (const c of row) if (c && c.type === 'k' && c.color === g.turn()) return c.square;
  return null;
};
export const moveLabel = g => g.moveNumber() + (g.turn() === 'w' ? '.' : '…');

const SPK_ON = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const SPK_OFF = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
export const muteBtn = () => `<button class="spk ${voice.on ? '' : 'off'}" data-global="mute" aria-label="${voice.on ? 'Mute Olly' : 'Unmute Olly'}">${voice.on ? SPK_ON : SPK_OFF}</button>`;
export function toggleMute(btn) {
  setVoiceOn(!voice.on);
  document.querySelectorAll('[data-global="mute"]').forEach(b => { b.outerHTML = muteBtn(); });
}
