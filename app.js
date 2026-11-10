import { Chess } from './chess.js';
import { COURSE } from './course.js';

/* ---------------- storage ---------------- */
const KEY = 'knightschool.v1';
let save = { stars: {} };
try { save = Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* private mode */ }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };

const LESSONS = COURSE.flatMap(u => u.lessons.map(l => ({ ...l, unit: u })));
const byId = id => LESSONS.find(l => l.id === id);
const starsOf = id => save.stars[id] || 0;
const app = document.getElementById('app');

/* ---------------- pieces (own simple set) ---------------- */
const BASE = '<rect x="10.5" y="35" width="24" height="4.5" rx="1.5"/>';
const SHAPES = {
  p: '<path d="M15 35c0-8 4.5-10 5-15.5h5c.5 5.5 5 7.500 5 15.5z"/><circle cx="22.500" cy="14" r="6"/>' + BASE,
  r: '<path d="M14.500 35l1.500-16h13l1.500 16z"/><path d="M12 19V8.500h4.500V12h3.700V8.500h4.600V12h3.700V8.500H33V19z"/>' + BASE,
  n: '<path d="M14 35C14 29 17 26 20 23L14 25C11 25.500 9.500 23 11 21L17 12L18 6.500L22 10C30 11 34 20 33 35Z"/><circle class="ink" cx="18.500" cy="15.500" r="1.300"/>' + BASE,
  b: '<path d="M15.500 35c0-6 4.500-7 5-12h4c.5 5 5 6 5 12z"/><path d="M22.500 8c5.500 5 7 8.500 7 11a7 7 0 0 1-14 0c0-2.500 1.500-6 7-11z"/><circle cx="22.500" cy="6.500" r="2.200"/><path class="cut" d="M22.500 13.500v7M19.500 17h6"/>' + BASE,
  q: '<path d="M14 35c0-3 1-5 1.500-7.500h14c.5 2.500 1.500 4.500 1.500 7.500z"/><path d="M9.500 13l5.500 15h15l5.500-15-7.500 8-5.500-11.500L17 21z"/><circle cx="9.500" cy="12" r="2.300"/><circle cx="35.500" cy="12" r="2.300"/><circle cx="22.500" cy="8" r="2.300"/>' + BASE,
  k: '<path d="M14.500 35c-5-8-3.500-15.500 8-15.500s13 7.500 8 15.500z"/><path d="M20.800 4.500h3.400v3.600h3.800v3.400h-3.800V20h-3.400v-8.500H17V8.100h3.800z"/>' + BASE
};
const piece = (type, color) =>
  `<svg viewBox="0 0 45 45" class="p${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${SHAPES[type]}</svg>`;

/* ---------------- helpers ---------------- */
const starStr = (n, max = 3) => '★'.repeat(n) + `<span class="off">${'★'.repeat(max - n)}</span>`;
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }

/* ---------------- home ---------------- */
function viewHome() {
  const total = LESSONS.length * 3;
  const got = LESSONS.reduce((s, l) => s + starsOf(l.id), 0);
  const next = LESSONS.find(l => !starsOf(l.id)) || LESSONS.find(l => starsOf(l.id) < 3);
  app.innerHTML = `
    <div class="hero">
      <h1>Knight <span>School</span></h1>
      <p>Openings, tactics and endgames – step by step, on a real board. Free.</p>
      <div class="progress"><i style="width:${Math.round(got / total * 100)}%"></i></div>
      <div class="progress-label"><span>${LESSONS.filter(l => starsOf(l.id)).length} of ${LESSONS.length} lessons done</span><span class="stars">★ ${got} / ${total}</span></div>
    </div>
    ${next ? `<button class="btn col" data-go="#/l/${next.id}"><span>${got ? 'Continue' : 'Start the course'}</span><small>${esc(next.title)}</small></button>`
           : `<div class="btn ghost">All lessons at 3 stars. Go win some games!</div>`}
    ${COURSE.map(u => `
      <section class="unit">
        <div class="unit-head">
          <div class="unit-icon">${piece({ '♟': 'p', '♔': 'k', '♚': 'k', '♛': 'q', '♞': 'n', '♜': 'r' }[u.icon], 'w')}</div>
          <div><h2>${esc(u.title)}</h2><p>${esc(u.sub)}</p></div>
        </div>
        <div class="lessons">
          ${u.lessons.map(l => `
            <button class="lesson ${starsOf(l.id) ? 'done' : ''}" data-go="#/l/${l.id}">
              <span class="num">${starsOf(l.id) ? '✓' : ''}</span>
              <span class="t"><b>${esc(l.title)}</b><span>${esc(l.sub)}</span></span>
              <span class="stars">${starStr(starsOf(l.id))}</span>
            </button>`).join('')}
        </div>
      </section>`).join('')}
    <p class="foot">Progress is saved on this device.<br><button data-reset>Reset progress</button></p>`;
  // lesson numbers (running count across units)
  app.querySelectorAll('.lesson').forEach((el, i) => { const num = el.querySelector('.num'); if (num.textContent.trim() !== '✓') num.textContent = i + 1; });
  window.scrollTo(0, 0);
}

/* ---------------- lesson intro ---------------- */
function viewIntro(lesson) {
  const s = starsOf(lesson.id);
  let buttons;
  if (!lesson.parts.length) {
    buttons = `<button class="btn" data-read="${lesson.id}">Got it</button>`;
  } else if (lesson.puzzle) {
    buttons = `<button class="btn col" data-go="#/l/${lesson.id}/practice"><span>Solve the puzzles</span><small>${lesson.parts.length} positions</small></button>`;
  } else {
    buttons = `
      <button class="btn col" data-go="#/l/${lesson.id}/learn"><span>Learn</span><small>Every move is shown and explained</small></button>
      <button class="btn ghost col" data-go="#/l/${lesson.id}/practice"><span>Practice</span><small>Play it from memory</small></button>`;
  }
  app.innerHTML = `
    <div class="top"><button class="back" data-go="#/" aria-label="Back">‹</button><span class="ttl muted">${esc(lesson.unit.title)}</span><span class="count stars">${starStr(s)}</span></div>
    <div class="intro">
      <h1>${esc(lesson.title)}</h1>
      <p class="sub">${esc(lesson.sub)}</p>
      <div class="card">${lesson.intro.map(p => `<p>${p}</p>`).join('')}</div>
      <div class="stack">${buttons}</div>
    </div>`;
  window.scrollTo(0, 0);
}

/* ---------------- player ---------------- */
let P = null; // player state

function startLesson(lesson, mode) {
  P = { lesson, mode: lesson.puzzle ? 'practice' : mode, pi: 0, mistakes: 0, reveals: 0, timer: 0 };
  startPart(0);
}

function startPart(pi) {
  clearTimeout(P.timer);
  const part = P.lesson.parts[pi];
  Object.assign(P, {
    pi, part, game: part.fen ? new Chess(part.fen) : new Chess(), idx: 0,
    sel: null, targets: [], last: null, hint: [], wrong: null, busy: false, partDone: false,
    tries: 0, log: [], exp: null
  });
  if (part.prompt) P.log.push({ cls: 'todo', html: esc(part.prompt) });
  renderPlayer();
  advance();
}

const label = g => g.moveNumber() + (g.turn() === 'w' ? '.' : '…');

function advance() {
  const { part, game } = P;
  if (P.idx >= part.moves.length) return finishPart();
  const [san, note] = part.moves[P.idx];
  if (game.turn() !== part.side) {
    P.busy = true;
    P.timer = setTimeout(() => {
      const lab = label(game);
      const m = game.move(san);
      P.last = [m.from, m.to];
      P.log.push({ cls: 'opp', html: `<b class="mv">${lab} ${m.san}</b> ${note}` });
      P.idx++; P.busy = false;
      renderPlayer();
      advance();
    }, P.idx === 0 ? 500 : 750);
    return;
  }
  // learner's turn
  const m = game.move(san); game.undo();
  P.exp = { from: m.from, to: m.to, san: m.san, note };
  P.tries = 0;
  if (P.mode === 'learn') {
    P.hint = [m.from, m.to];
    P.log.push({ cls: 'todo', pending: true, html: `Your move: play <b>${m.san}</b>. ${note}` });
  } else {
    P.hint = [];
    if (!(part.prompt && P.idx <= 1 && P.log.length === 1 && P.log[0].cls === 'todo'))
      P.log.push({ cls: 'todo', pending: true, html: 'Your move.' });
  }
  renderPlayer();
}

function finishPart() {
  P.partDone = true; P.hint = [];
  const lastPart = P.pi === P.lesson.parts.length - 1;
  P.log.push({ cls: 'win', html: lastPart ? '✓ Done!' : '✓ Nice. On to the next one.' });
  renderPlayer();
}

function onSquare(sq) {
  if (!P || P.busy || P.partDone || !P.exp) return;
  const { game, part } = P;
  if (P.sel && P.targets.includes(sq)) return tryMove(P.sel, sq);
  const pc = game.get(sq);
  if (pc && pc.color === part.side && P.sel !== sq) {
    P.sel = sq;
    P.targets = game.moves({ square: sq, verbose: true }).map(m => m.to);
  } else { P.sel = null; P.targets = []; }
  renderBoard();
}

function dropPending() { P.log = P.log.filter(e => !e.pending && e.cls !== 'oops'); }

function tryMove(from, to) {
  const { game, exp } = P;
  P.sel = null; P.targets = [];
  if (from === exp.from && to === exp.to) {
    const lab = label(game);
    const m = game.move(exp.san);
    P.last = [m.from, m.to]; P.hint = []; P.exp = null;
    dropPending();
    // a one-move puzzle prompt has done its job
    P.log.forEach(e => { if (e.cls === 'todo') e.cls = 'opp'; });
    P.log.push({ cls: 'me', html: `<b class="mv">${lab} ${m.san}</b> ${exp.note}` });
    P.idx++;
    renderPlayer();
    advance();
    return;
  }
  // wrong move
  P.wrong = to;
  P.log = P.log.filter(e => e.cls !== 'oops');
  if (P.mode === 'learn') {
    P.log.push({ cls: 'oops', html: 'Not that one – play the move with the blue circles.' });
  } else {
    P.mistakes++; P.tries++;
    if (P.tries >= 3) { P.hint = [exp.from, exp.to]; P.log.push({ cls: 'oops', html: `The move is <b>${exp.san}</b>. Play it on the board.` }); }
    else if (P.tries === 2) { P.hint = [exp.from]; P.log.push({ cls: 'oops', html: 'Not quite. Here is a hint: move the circled piece.' }); }
    else P.log.push({ cls: 'oops', html: 'Not quite – try another move.' });
  }
  renderPlayer();
  setTimeout(() => { if (P && P.wrong === to) { P.wrong = null; renderBoard(); } }, 450);
}

function useHint() {
  if (!P || !P.exp || P.busy) return;
  P.reveals++;
  P.log = P.log.filter(e => e.cls !== 'oops');
  if (P.hint.length === 0) { P.hint = [P.exp.from]; P.log.push({ cls: 'oops', html: 'Hint: move the circled piece.' }); }
  else { P.hint = [P.exp.from, P.exp.to]; P.log.push({ cls: 'oops', html: `The move is <b>${P.exp.san}</b>.` }); }
  renderPlayer();
}

function nextPart() {
  if (P.pi + 1 < P.lesson.parts.length) return startPart(P.pi + 1);
  // lesson finished
  const { lesson, mode, mistakes, reveals } = P;
  const slips = mistakes + reveals;
  let stars;
  if (mode === 'learn') stars = 1;
  else if (lesson.puzzle) stars = slips === 0 ? 3 : slips <= 2 ? 2 : 1;
  else stars = slips === 0 ? 3 : 2;
  save.stars[lesson.id] = Math.max(starsOf(lesson.id), stars);
  persist();
  viewResult(lesson, mode, stars, slips);
}

function renderBoard() {
  const el = document.getElementById('board');
  if (!el || !P) return;
  const { game, part } = P;
  const flip = part.side === 'b';
  const files = 'abcdefgh';
  let checkSq = null;
  if (game.inCheck()) {
    for (const row of game.board()) for (const c of row) if (c && c.type === 'k' && c.color === game.turn()) checkSq = c.square;
  }
  let html = '';
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const file = flip ? 7 - f : f, rank = flip ? r + 1 : 8 - r;
    const sq = files[file] + rank;
    const pc = game.get(sq);
    const cls = ['sq', (file + rank) % 2 ? 'l' : 'd'];
    if (P.last && P.last.includes(sq)) cls.push('last');
    if (P.sel === sq) cls.push('sel');
    if (checkSq === sq) cls.push('check');
    if (P.wrong === sq) cls.push('wrong');
    if (P.targets.includes(sq)) cls.push('dot', pc ? 'occ' : '');
    else if (P.hint.includes(sq)) cls.push('hint');
    html += `<button class="${cls.join(' ')}" data-sq="${sq}" aria-label="${sq}${pc ? ' ' + pc.color + pc.type : ''}">` +
      (f === 0 ? `<em class="r">${rank}</em>` : '') + (r === 7 ? `<em class="f">${files[file]}</em>` : '') +
      (pc ? piece(pc.type, pc.color) : '') + '</button>';
  }
  el.innerHTML = html;
}

function renderPlayer() {
  const { lesson, part, pi } = P;
  const n = lesson.parts.length;
  if (!document.getElementById('board')) {
    app.innerHTML = `
      <div class="player">
        <div class="top"><button class="back" data-go="#/l/${lesson.id}" aria-label="Back">‹</button><span class="ttl" id="ptitle"></span><span class="count" id="pcount"></span></div>
        <div class="dots" id="dots"></div>
        <div class="board-wrap"><div class="board" id="board"></div></div>
        <div class="coach" id="coach"></div>
        <div class="actions" id="actions"></div>
      </div>`;
    window.scrollTo(0, 0);
  }
  document.getElementById('ptitle').textContent = part.title;
  document.getElementById('pcount').textContent = `You play ${part.side === 'w' ? 'White' : 'Black'}`;
  document.getElementById('dots').innerHTML = n > 1 ? lesson.parts.map((_, i) => `<i class="${i < pi || (i === pi && P.partDone) ? 'on' : i === pi ? 'now' : ''}"></i>`).join('') : '';
  renderBoard();
  const coach = document.getElementById('coach');
  const from = Math.max(0, P.log.length - 12);
  coach.innerHTML = P.log.slice(from).map((e, i, a) => `<div class="msg ${e.cls} ${i < a.length - 2 ? 'old' : ''}">${e.html}</div>`).join('');
  coach.scrollTop = coach.scrollHeight;
  const actions = document.getElementById('actions');
  if (P.partDone) {
    actions.innerHTML = `<button class="btn ghost" data-act="restart">↺</button><button class="btn grow" data-act="next">${pi + 1 < n ? 'Next' : 'Finish'} ›</button>`;
  } else {
    actions.innerHTML = `<button class="btn ghost" data-act="restart">↺ Restart</button>` +
      (P.mode === 'practice' ? `<button class="btn ghost grow" data-act="hint">💡 Hint</button>` : '<span class="grow"></span>');
  }
}

/* ---------------- result ---------------- */
function viewResult(lesson, mode, stars, slips) {
  P = null;
  const i = LESSONS.findIndex(l => l.id === lesson.id);
  const next = LESSONS[i + 1];
  let head, text;
  if (mode === 'learn') { head = 'Lesson learned'; text = 'Now try it from memory to earn all three stars.'; }
  else if (stars === 3) { head = 'Perfect!'; text = 'No mistakes, no hints. This one is yours.'; }
  else { head = 'Well done'; text = `${slips} slip${slips === 1 ? '' : 's'}. Do it again without mistakes or hints for three stars.`; }
  app.innerHTML = `
    <div class="result">
      <div class="big">${starStr(stars)}</div>
      <h1>${head}</h1>
      <p>${text}</p>
      <div class="stack">
        ${mode === 'learn' ? `<button class="btn" data-go="#/l/${lesson.id}/practice">Practice it now</button>` : ''}
        ${next ? `<button class="btn ${mode === 'learn' ? 'ghost' : ''} col" data-go="#/l/${next.id}"><span>Next lesson</span><small>${esc(next.title)}</small></button>` : ''}
        ${mode !== 'learn' && stars < 3 ? `<button class="btn ghost" data-go="#/l/${lesson.id}/practice">Try again</button>` : ''}
        <button class="btn ghost" data-go="#/">All lessons</button>
      </div>
    </div>`;
  history.replaceState(null, '', `#/l/${lesson.id}/done`);
  window.scrollTo(0, 0);
}

/* ---------------- routing + events ---------------- */
function route() {
  if (P) { clearTimeout(P.timer); P = null; }
  const [, kind, id, mode] = location.hash.split('/');
  const lesson = kind === 'l' && byId(id);
  if (!lesson) return viewHome();
  if ((mode === 'learn' || mode === 'practice') && lesson.parts.length) return startLesson(lesson, mode);
  viewIntro(lesson);
}

app.addEventListener('click', e => {
  const sq = e.target.closest('[data-sq]');
  if (sq) return onSquare(sq.dataset.sq);
  const t = e.target.closest('[data-go],[data-act],[data-read],[data-reset]');
  if (!t) return;
  if (t.dataset.go) return go(t.dataset.go);
  if (t.dataset.read) { save.stars[t.dataset.read] = 3; persist(); return go('#/'); }
  if ('reset' in t.dataset) { if (confirm('Delete all your stars and start again?')) { save = { stars: {} }; persist(); viewHome(); } return; }
  if (t.dataset.act === 'restart') return startPart(P.pi);
  if (t.dataset.act === 'hint') return useHint();
  if (t.dataset.act === 'next') return nextPart();
});
window.addEventListener('hashchange', route);
route();
