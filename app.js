import { Chess } from './chess.js';
import { COURSE } from './course.js';
import { createBoard, pieceSvg } from './board.js';
import { engine } from './engine.js';
import { sfx, audio, setSound } from './sound.js';
import * as C from './coach.js';

/* ================= storage ================= */
const KEY = 'knightschool.v1';
let save = { stars: {}, games: [] };
try { save = Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* private mode */ }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };

const LESSONS = COURSE.flatMap(u => u.lessons.map(l => ({ ...l, unit: u })));
const byId = id => LESSONS.find(l => l.id === id);
const starsOf = id => save.stars[id] || 0;

/* ================= shell ================= */
const view = document.getElementById('view'), tabs = document.getElementById('tabs');
const $ = s => document.querySelector(s);
let viewTok = 0;
let ACT = {};
function screen(html, tab) {
  viewTok++; ACT = {};
  view.innerHTML = html;
  view.classList.toggle('pad', !!tab);
  tabs.hidden = !tab;
  tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  window.scrollTo(0, 0);
}
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const starStr = (n, max = 3) => '★'.repeat(n) + `<span class="off">${'★'.repeat(max - n)}</span>`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function owl(mood = 'happy') {
  const [px, py] = { happy: [0, 0.5], think: [2.5, -2.5], oops: [0, 1.5], wow: [0, -0.5] }[mood];
  const r = mood === 'oops' ? 2.8 : mood === 'wow' ? 5 : 4;
  const brow = mood === 'oops' ? '<path d="M14 17.5l11 3.5M50 17.5l-11 3.5" stroke="#4a2d17" stroke-width="2.6" stroke-linecap="round"/>'
    : mood === 'think' ? '<path d="M36 16.5l12-2.5" stroke="#4a2d17" stroke-width="2.6" stroke-linecap="round"/>' : '';
  const eye = x => `<circle cx="${x}" cy="28" r="10" fill="#fff"/><circle cx="${x + px}" cy="${28 + py}" r="${r}" fill="#2b2a27"/><circle cx="${x + px + 1.4}" cy="${28 + py - 1.4}" r="1.2" fill="#fff"/>`;
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M11 21L14 5l14 10zM53 21L50 5 36 15z" fill="#7a4a2b"/><ellipse cx="32" cy="37" rx="23" ry="24" fill="#9a653f"/><ellipse cx="32" cy="48" rx="14" ry="12.5" fill="#f2dcb4"/><path d="M9.5 38c-4 6-3.5 14 1 17.5 2-5 3-10 2-15zM54.5 38c4 6 3.5 14-1 17.5-2-5-3-10-2-15z" fill="#7a4a2b"/>${eye(22)}${eye(42)}<path d="M32 33l-4.5 4 4.5 6.5 4.5-6.5z" fill="#f7a833"/>${brow}</svg>`;
}
const coachBox = (mood, html) => `<div class="coach"><div class="owl">${owl(mood)}</div><div class="bubble">${html}</div></div>`;
const kingInCheck = g => { if (!g.inCheck()) return null; for (const row of g.board()) for (const c of row) if (c && c.type === 'k' && c.color === g.turn()) return c.square; return null; };
const moveLabel = g => g.moveNumber() + (g.turn() === 'w' ? '.' : '…');

function boardShell({ back, title, right = '' }) {
  return `<div class="screen">
    <div class="top"><button class="back" data-go="${back}" aria-label="Back">‹</button><span class="ttl" id="ptitle">${esc(title)}</span><span class="right" id="pright">${right}</span></div>
    <div class="above" id="above"></div>
    <div class="board-wrap"><div id="board"></div></div>
    <div class="below" id="below"></div>
    <div class="actions" id="actions"></div>
  </div>`;
}

/* ================= learn: home ================= */
function viewHome() {
  const total = LESSONS.length * 3, got = LESSONS.reduce((s, l) => s + starsOf(l.id), 0);
  const next = LESSONS.find(l => !starsOf(l.id)) || LESSONS.find(l => starsOf(l.id) < 3);
  const hello = !got ? 'Hi, I’m Olly, your coach. We’ll learn the openings step by step – then you play real games and I show you what to do better.'
    : next ? `Welcome back! Next up: <b>${esc(next.title)}</b>. Or play a game and we review it together.`
    : 'Every lesson at three stars! Now play games and let me review them – that is where the rating comes from.';
  let n = 0;
  screen(`
    <div class="home-top"><span class="brand">Knight School</span>
      <span style="display:flex;gap:8px;align-items:center"><span class="pill">★ ${got}<span class="muted" style="font-weight:700">/ ${total}</span></span>
      <button class="icon-btn" data-act="sound" aria-label="Sound">${audio.on ? '🔊' : '🔇'}</button></span></div>
    <div class="home-coach">${coachBox('happy', hello)}</div>
    ${next ? `<button class="btn col" data-go="#/l/${next.id}"><span>${got ? 'Continue learning' : 'Start the first lesson'}</span><small>${esc(next.title)}</small></button>` : `<button class="btn" data-go="#/play">Play a game</button>`}
    ${COURSE.map(u => {
      const done = u.lessons.reduce((s, l) => s + starsOf(l.id), 0), max = u.lessons.length * 3;
      return `<section class="unit">
        <div class="unit-head"><div class="unit-icon">${pieceSvg(u.icon === '♔' ? 'w' : 'b', { '♟': 'p', '♔': 'k', '♚': 'k', '♛': 'q', '♞': 'n', '♜': 'r' }[u.icon])}</div>
          <div><h2>${esc(u.title)}</h2><p>${esc(u.sub)}</p></div></div>
        <div class="unit-bar"><i style="width:${done / max * 100}%"></i></div>
        <div class="lessons">${u.lessons.map(l => { n++; return `
          <button class="lesson ${starsOf(l.id) ? 'done' : ''}" data-go="#/l/${l.id}">
            <span class="num">${starsOf(l.id) ? '✓' : n}</span>
            <span class="t"><b>${esc(l.title)}</b><span>${esc(l.sub)}</span></span>
            <span class="stars">${starStr(starsOf(l.id))}</span>
          </button>`; }).join('')}</div>
      </section>`;
    }).join('')}
    <p class="foot">Progress is saved on this device.<br><button data-act="reset">Reset progress</button> <a href="https://github.com/adamecytb-stack/chess#credits">Credits</a></p>`, 'learn');
  ACT.sound = () => { setSound(!audio.on); viewHome(); };
  ACT.reset = () => { if (confirm('Delete all your stars and saved games?')) { save = { stars: {}, games: [] }; persist(); viewHome(); } };
}

/* ================= learn: lesson intro ================= */
function viewIntro(lesson) {
  let buttons;
  if (!lesson.parts.length) buttons = `<button class="btn" data-act="read">Got it</button>`;
  else if (lesson.puzzle) buttons = `<button class="btn col" data-go="#/l/${lesson.id}/practice"><span>Solve the puzzles</span><small>${lesson.parts.length} positions</small></button>`;
  else buttons = `<button class="btn col" data-go="#/l/${lesson.id}/learn"><span>Learn it</span><small>I show and explain every move</small></button>
      <button class="btn sec col" data-go="#/l/${lesson.id}/practice"><span>Practice</span><small>Play it from memory</small></button>`;
  screen(`
    <div class="top"><button class="back" data-go="#/" aria-label="Back">‹</button><span class="ttl muted">${esc(lesson.unit.title)}</span><span class="right stars">${starStr(starsOf(lesson.id))}</span></div>
    <div class="page">
      <h1>${esc(lesson.title)}</h1><p class="sub">${esc(lesson.sub)}</p>
      <div style="margin-bottom:18px">${coachBox('happy', lesson.intro.map(p => `<p>${p}</p>`).join(''))}</div>
      <div class="stack">${buttons}</div>
    </div>`, null);
  view.classList.add('pad');
  ACT.read = () => { save.stars[lesson.id] = 3; persist(); go('#/'); };
}

/* ================= learn: lesson player ================= */
let L = null;

function startLesson(lesson, mode) {
  screen(boardShell({ back: `#/l/${lesson.id}`, title: lesson.title }), null);
  L = { lesson, mode: lesson.puzzle ? 'practice' : mode, mistakes: 0, reveals: 0, timer: 0, fb: 0 };
  L.board = createBoard($('#board'), {
    movesFrom(sq) {
      if (!L || !L.exp || L.busy || L.partDone) return [];
      const pc = L.game.get(sq);
      return pc && pc.color === L.part.side ? L.game.moves({ square: sq, verbose: true }).map(m => m.to) : [];
    },
    onMove: lessonMove
  });
  ACT.restart = () => startPart(L.pi);
  ACT.hint = lessonHint;
  ACT.next = lessonNext;
  startPart(0);
}

function startPart(pi) {
  clearTimeout(L.timer);
  const part = L.lesson.parts[pi];
  Object.assign(L, { pi, part, game: part.fen ? new Chess(part.fen) : new Chess(), idx: 0, exp: null, busy: false, partDone: false, tries: 0, lines: [], mood: 'happy', hintLvl: 0 });
  L.fb++;
  L.board.setPosition(L.game.board(), { animate: false, flipped: part.side === 'b' });
  L.board.setMarks({ check: kingInCheck(L.game) });
  if (part.prompt) L.lines.push({ html: esc(part.prompt), cls: 'ask' });
  drawLesson();
  advance();
}

function advance() {
  const { part, game } = L;
  if (L.idx >= part.moves.length) {
    L.partDone = true; L.exp = null; L.mood = 'wow';
    sfx.good();
    L.lines.push({ html: L.pi === L.lesson.parts.length - 1 ? 'That’s it – well done!' : 'Nice. Ready for the next one?', cls: 'ask' });
    return drawLesson();
  }
  const [san, note] = part.moves[L.idx];
  if (game.turn() !== part.side) {
    L.busy = true;
    L.timer = setTimeout(() => {
      const lab = moveLabel(game), m = game.move(san);
      sfx.forMove(m, game.inCheck());
      L.board.setPosition(game.board());
      L.board.setMarks({ last: [m.from, m.to], check: kingInCheck(game) });
      L.lines = L.lines.filter(l => l.cls !== 'ask');
      L.lines.push({ html: `<b>${lab}${m.san}</b> ${note}` });
      L.idx++; L.busy = false;
      advance();
    }, L.idx === 0 ? 500 : 800);
    return;
  }
  const m = game.move(san); game.undo();
  L.exp = { from: m.from, to: m.to, san: m.san, note };
  L.tries = 0; L.hintLvl = 0; L.mood = 'happy';
  if (L.mode === 'learn') {
    L.board.patchMarks({ arrows: [[m.from, m.to, 'hint']] });
    L.lines.push({ html: `Play <b>${m.san}</b>. ${note}`, cls: 'ask' });
  } else if (!L.lines.some(l => l.cls === 'ask')) {
    L.lines.push({ html: L.idx < 2 ? 'Your move. Do you remember how it starts?' : 'Your move.', cls: 'ask' });
  }
  drawLesson();
}

function lessonMove(from, to) {
  const { game, exp } = L;
  if (!exp) return;
  if (from === exp.from && to === exp.to) {
    const lab = moveLabel(game), m = game.move(exp.san);
    L.fb++; L.exp = null; L.mood = 'happy';
    sfx.forMove(m, game.inCheck());
    L.board.setPosition(game.board());
    L.board.setMarks({ last: [m.from, m.to], check: kingInCheck(game) });
    L.lines = [{ html: `<b>${lab}${m.san}</b> ${exp.note || (L.mode === 'practice' ? 'Correct.' : '')}`, cls: 'ok' }];
    L.idx++;
    drawLesson();
    return advance();
  }
  // wrong move
  sfx.wrong();
  if (navigator.vibrate) navigator.vibrate(60);
  L.board.setPosition(game.board());
  L.board.patchMarks({ wrong: to });
  setTimeout(() => { if (L && L.board) L.board.patchMarks({ wrong: null }); }, 450);
  L.mood = 'oops';
  const tmp = new Chess(game.fen());
  let mv; try { mv = tmp.move({ from, to, promotion: 'q' }); } catch (e) { return; }
  if (L.mode === 'learn') {
    setAsk(`<b>${mv.san}</b> is not the move for this lesson. Follow the blue arrow: <b>${exp.san}</b>.`);
    return drawLesson();
  }
  L.mistakes++; L.tries++;
  let tail = ' Try again.';
  if (L.tries >= 3) { L.hintLvl = 2; L.board.patchMarks({ arrows: [[exp.from, exp.to, 'hint']] }); tail = ` The move is <b>${exp.san}</b> – play it on the board.`; }
  else if (L.tries === 2) { L.hintLvl = 1; L.board.patchMarks({ hint: [exp.from] }); tail = ' Hint: move the piece I marked.'; }
  setAsk(`<b>${mv.san}</b>? <span class="dotsanim">Let me look</span>`);
  drawLesson();
  lessonFeedback(mv, tmp.fen(), tail);
}

function setAsk(html) { L.lines = L.lines.filter(l => l.cls !== 'ask'); L.lines.push({ html, cls: 'ask' }); }

async function lessonFeedback(mv, fenAfter, tail) {
  const tok = ++L.fb, exp = L.exp, fen = L.game.fen(), side = L.part.side;
  const uci = mv.from + mv.to + (mv.promotion || '');
  let text = `<b>${mv.san}</b> is not it.`;
  try {
    const gExp = new Chess(fen); const me = gExp.move(exp.san);
    const expUci = me.from + me.to + (me.promotion || '');
    const gAfter = new Chess(fenAfter);
    const work = Promise.all([
      gAfter.isGameOver() ? null : engine().analyse(fenAfter, { depth: 10, movetime: 1500 }),
      gExp.isGameOver() ? null : engine().analyse(gExp.fen(), { depth: 10, movetime: 1500 })
    ]);
    const res = await Promise.race([work, sleep(7000).then(() => null)]);
    if (res) {
      const [a, b] = res;
      const after = a ? { cp: C.cpOf(a.lines[0]), mate: a.lines[0].mate ?? null } : { cp: 0, mate: null };
      const before = b ? { cp: C.cpOf(b.lines[0]), mate: b.lines[0].mate ?? null, best: expUci } : { cp: side === 'w' ? 10000 : -10000, mate: null, best: expUci };
      const { cls } = C.classify(side, before, after, uci, false, false);
      if (!C.BAD.includes(cls)) text = `<b>${mv.san}</b> is a decent move – but it is not the one we are learning here.`;
      else text = `<b>${mv.san}</b>: ` + C.explain({ fen, played: uci, best: expUci, pvBest: [expUci], pvAfter: a ? a.lines[0].pv : [], before, after, cls, hideBest: true }).text
        .replace(/^A (blunder|mistake)\. /, '').replace(/^An inaccuracy\. /, '');
    }
  } catch (e) { /* engine not available: keep the short text */ }
  if (!L || tok !== L.fb || L.exp !== exp) return;
  setAsk(text + tail);
  drawLesson();
}

function lessonHint() {
  if (!L.exp || L.busy) return;
  L.reveals++;
  if (L.hintLvl === 0) { L.hintLvl = 1; L.board.patchMarks({ hint: [L.exp.from] }); setAsk('Move the piece I marked. Where does it belong?'); }
  else { L.hintLvl = 2; L.board.patchMarks({ arrows: [[L.exp.from, L.exp.to, 'hint']] }); setAsk(`The move is <b>${L.exp.san}</b>.`); }
  L.fb++; L.mood = 'think';
  drawLesson();
}

function lessonNext() {
  if (L.pi + 1 < L.lesson.parts.length) return startPart(L.pi + 1);
  const { lesson, mode, mistakes, reveals } = L, slips = mistakes + reveals;
  const stars = mode === 'learn' ? 1 : lesson.puzzle ? (slips === 0 ? 3 : slips <= 2 ? 2 : 1) : (slips === 0 ? 3 : 2);
  save.stars[lesson.id] = Math.max(starsOf(lesson.id), stars); persist();
  viewResult(lesson, mode, stars, slips);
}

function drawLesson() {
  const { lesson, part, pi } = L, n = lesson.parts.length;
  $('#ptitle').textContent = part.title;
  $('#pright').textContent = `You play ${part.side === 'w' ? 'White' : 'Black'}`;
  $('#above').innerHTML = n > 1 ? `<div class="dots">${lesson.parts.map((_, i) => `<i class="${i < pi || (i === pi && L.partDone) ? 'on' : i === pi ? 'now' : ''}"></i>`).join('')}</div>` : '';
  const lines = L.lines.slice(-3);
  $('#below').innerHTML = coachBox(L.mood, lines.map((l, i) => `<p class="${i < lines.length - 1 && l.cls !== 'ask' ? 'old' : ''} ${l.cls || ''}">${l.html}</p>`).join(''));
  $('#below').scrollTop = 1e4;
  $('#actions').innerHTML = L.partDone
    ? `<button class="btn sec fit" data-act="restart" aria-label="Restart">↺</button><button class="btn" data-act="next">${pi + 1 < n ? 'Next' : 'Finish'}</button>`
    : `<button class="btn sec fit" data-act="restart">↺ Restart</button>` + (L.mode === 'practice' ? `<button class="btn sec" data-act="hint">💡 Hint</button>` : '');
}

function viewResult(lesson, mode, stars, slips) {
  L = null;
  const next = LESSONS[LESSONS.findIndex(l => l.id === lesson.id) + 1];
  let head, text, mood = 'happy';
  if (mode === 'learn') { head = 'Lesson learned'; text = 'Now play it from memory to earn all three stars.'; }
  else if (stars === 3) { head = 'Perfect!'; text = 'No mistakes, no hints. This one is yours.'; mood = 'wow'; sfx.win(); }
  else { head = 'Well done'; text = `${slips} slip${slips === 1 ? '' : 's'}. Do it again without mistakes or hints for three stars.`; }
  screen(`<div class="result">
      <div class="owl">${owl(mood)}</div>
      <div class="big">${starStr(stars)}</div>
      <h1>${head}</h1><p>${text}</p>
      <div class="stack">
        ${mode === 'learn' ? `<button class="btn" data-go="#/l/${lesson.id}/practice">Practice it now</button>` : ''}
        ${next ? `<button class="btn ${mode === 'learn' ? 'sec' : ''} col" data-go="#/l/${next.id}"><span>Next lesson</span><small>${esc(next.title)}</small></button>` : ''}
        ${mode !== 'learn' && stars < 3 ? `<button class="btn sec" data-go="#/l/${lesson.id}/practice">Try again</button>` : ''}
        <button class="btn sec" data-go="#/">All lessons</button>
      </div></div>`, null);
  history.replaceState(null, '', `#/l/${lesson.id}/done`);
}

/* ================= play ================= */
const LEVELS = [
  { id: 'pip', name: 'Pip', elo: 500, blurb: 'Just learned the rules', color: '#6fb59a', window: 450, random: 0.3 },
  { id: 'mira', name: 'Mira', elo: 900, blurb: 'Plays for fun, drops pieces', color: '#4b9fe8', window: 200, random: 0.1 },
  { id: 'bruno', name: 'Bruno', elo: 1300, blurb: 'Solid club player', color: '#f08a34', window: 90, random: 0.02 },
  { id: 'ingrid', name: 'Ingrid', elo: 1700, blurb: 'Tournament player', color: '#b06ad6', window: 35, random: 0 },
  { id: 'max', name: 'Maximus', elo: 2300, blurb: 'Shows no mercy', color: '#e5533d', window: 0, random: 0, depth: 14 }
];
let G = null;
let setup = { level: 'mira', color: 'w', tips: true };
try { Object.assign(setup, JSON.parse(localStorage.getItem('ks.setup') || '{}')); } catch (e) { /* ignore */ }

function viewPlaySetup() {
  if (G && !G.over) return go('#/game');
  const draw = () => {
    screen(`
      <div class="home-top"><span class="brand">Play</span></div>
      <div class="home-coach">${coachBox('happy', 'Pick an opponent. I’ll watch your game, and afterwards we go through it move by move.')}</div>
      <div class="levels">${LEVELS.map(l => `
        <button class="level ${setup.level === l.id ? 'on' : ''}" data-act="level" data-id="${l.id}">
          <span class="ava" style="background:${l.color}">${l.name[0]}</span>
          <div><b>${l.name}</b><span>${l.blurb}</span></div><em>${l.elo}</em>
        </button>`).join('')}</div>
      <p class="field">You play</p>
      <div class="seg">${[['w', 'White'], ['r', 'Random'], ['b', 'Black']].map(([k, t]) => `<button class="${setup.color === k ? 'on' : ''}" data-act="color" data-id="${k}">${t}</button>`).join('')}</div>
      <p class="field">Coach</p>
      <button class="switch ${setup.tips ? 'on' : ''}" data-act="tips"><div><b>Comment on my moves</b><span>I tell you right away when a move is a mistake – and let you take it back.</span></div><i></i></button>
      <div style="height:18px"></div>
      <button class="btn" data-act="start">Play</button>`, 'play');
    ACT.level = el => { setup.level = el.dataset.id; draw(); };
    ACT.color = el => { setup.color = el.dataset.id; draw(); };
    ACT.tips = () => { setup.tips = !setup.tips; draw(); };
    ACT.start = () => {
      try { localStorage.setItem('ks.setup', JSON.stringify(setup)); } catch (e) { /* ignore */ }
      const me = setup.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : setup.color;
      G = { id: Date.now(), level: LEVELS.find(l => l.id === setup.level), me, tips: setup.tips, game: new Chess(), over: false, tok: 0, hints: 0, say: null, last: [] };
      go('#/game');
    };
  };
  draw();
}

function viewGame() {
  if (!G) return go('#/play');
  screen(boardShell({ back: '#/', title: `You vs ${G.level.name}` }), null);
  G.board = createBoard($('#board'), {
    movesFrom(sq) {
      if (G.over || G.busy || G.game.turn() !== G.me) return [];
      const pc = G.game.get(sq);
      return pc && pc.color === G.me ? [...new Set(G.game.moves({ square: sq, verbose: true }).map(m => m.to))] : [];
    },
    onMove: gameMove
  });
  G.board.setPosition(G.game.board(), { animate: false, flipped: G.me === 'b' });
  ACT.hint = gameHint; ACT.undo = gameUndo; ACT.resign = () => { if (!G.over && confirm('Resign this game?')) endGame('resign'); };
  ACT.takeback = gameTakeback; ACT.keep = () => { const p = G.pending; G.pending = null; G.say = null; drawGame(); if (p) botMove(p, G.tok); };
  ACT.newgame = () => { G = null; go('#/play'); };
  ACT.review = () => go('#/review/' + G.id);
  G.tok++; G.busy = false; G.pending = null;
  if (!G.say && !G.game.history().length) G.say = { mood: 'happy', html: G.me === 'w' ? 'You have White – your move. Remember: centre, develop, castle.' : `You have Black. ${G.level.name} starts.` };
  drawGame();
  if (G.over) return;
  if (G.game.turn() === G.me) userTurn(); else botTurn();
}

function matDiff(g) {
  let d = 0;
  for (const row of g.board()) for (const c of row) if (c) d += (c.color === 'w' ? 1 : -1) * C.VAL[c.type];
  return d;
}

function drawGame() {
  if (!$('#board') || !G) return;
  const g = G.game, d = matDiff(g) * (G.me === 'w' ? 1 : -1);
  G.board.setMarks({ last: G.last, check: kingInCheck(g), arrows: G.arrow ? [G.arrow] : [] });
  const thinking = !G.over && g.turn() !== G.me && !G.pending;
  $('#pright').textContent = G.over ? G.result : `Move ${g.moveNumber()}`;
  $('#above').innerHTML = `<div class="strip"><span class="ava" style="background:${G.level.color}">${G.level.name[0]}</span><b>${G.level.name}</b><span class="elo">${G.level.elo}</span>
    <span class="mat">${thinking ? '<span class="dotsanim">thinking</span>' : d < 0 ? '+' + -d : ''}</span></div>`;
  const say = G.say || { mood: 'happy', html: g.turn() === G.me ? 'Your move.' : '<span class="dotsanim">Thinking</span>' };
  $('#below').innerHTML = `<div class="strip"><span class="ava" style="background:#5b5852">${pieceSvg(G.me, 'p')}</span><b>You</b><span class="mat">${d > 0 ? '+' + d : ''}</span></div>` + coachBox(say.mood, say.html);
  $('#actions').innerHTML = G.over
    ? `<button class="btn sec fit" data-act="newgame">New game</button><button class="btn" data-act="review">Review with coach</button>`
    : `<button class="btn sec" data-act="hint">💡 Hint</button><button class="btn sec" data-act="undo">↶ Undo</button><button class="btn sec fit" data-act="resign" aria-label="Resign">⚑</button>`;
}

function userTurn() {
  G.busy = false;
  const fen = G.game.fen();
  G.preFen = fen;
  G.pre = engine().analyse(fen, { depth: 10, movetime: 2000 }).catch(() => null);
  drawGame();
}

async function botTurn() {
  G.busy = true; drawGame();
  const tok = G.tok, t0 = Date.now();
  const post = await searchFor(G.game.fen());
  if (!G || tok !== G.tok) return;
  await sleep(Math.max(0, 700 - (Date.now() - t0)));
  if (!G || tok !== G.tok) return;
  botMove(post, tok);
}
const searchFor = fen => engine().analyse(fen, { depth: G.level.depth || 10, multipv: G.level.window ? 4 : 1, movetime: 3000 }).catch(() => null);

async function gameMove(from, to) {
  const g = G.game;
  if (G.over || G.busy || g.turn() !== G.me) return;
  let promotion;
  const pc = g.get(from);
  if (pc.type === 'p' && (to[1] === '8' || to[1] === '1')) {
    promotion = await G.board.askPromotion(G.me);
    if (!promotion) return G.board.setPosition(g.board());
  }
  const fenBefore = g.fen();
  let m; try { m = g.move({ from, to, promotion }); } catch (e) { return G.board.setPosition(g.board()); }
  G.busy = true; G.arrow = null; G.say = null; G.last = [m.from, m.to];
  sfx.forMove(m, g.inCheck());
  G.board.setPosition(g.board());
  drawGame();
  if (g.isGameOver()) return endGame();
  const tok = ++G.tok, t0 = Date.now();
  const [pre, post] = await Promise.all([G.preFen === fenBefore ? G.pre : null, searchFor(g.fen())]);
  if (!G || tok !== G.tok) return;
  if (G.tips && pre && post && pre.lines[0] && post.lines[0]) {
    const before = { cp: C.cpOf(pre.lines[0]), mate: pre.lines[0].mate ?? null, best: pre.best };
    const after = { cp: C.cpOf(post.lines[0]), mate: post.lines[0].mate ?? null };
    const uci = m.from + m.to + (m.promotion || '');
    const sans = g.history(), op = C.opening(sans);
    const { cls } = C.classify(G.me, before, after, uci, op.plies >= sans.length, false);
    const ex = C.explain({ fen: fenBefore, played: uci, best: pre.best, pvBest: pre.lines[0].pv, pvAfter: post.lines[0].pv, before, after, cls, opening: op.name });
    const tag = `<span class="tag c-${cls}">${C.CLASSES[cls].label}</span>`;
    if (cls === 'mistake' || cls === 'blunder') {
      sfx.wrong();
      G.pending = post;
      G.say = { mood: 'oops', html: `${tag}<b>${m.san}</b> ${ex.text.replace(/^A (blunder|mistake)\. /, '').replace(/ Better was <b>.*?<\/b>\./, '')}<div class="row"><button class="go" data-act="takeback">Take it back</button><button data-act="keep">Play on</button></div>` };
      return drawGame();
    }
    G.say = { mood: cls === 'inaccuracy' ? 'think' : 'happy', html: `${tag}<b>${m.san}</b> ${ex.text.replace(/^An inaccuracy\. /, '')}` };
    drawGame();
  }
  await sleep(Math.max(0, 650 - (Date.now() - t0)));
  if (!G || tok !== G.tok) return;
  botMove(post, tok);
}

function botMove(post, tok) {
  if (!G || tok !== G.tok || G.over) return;
  const g = G.game, lvl = G.level, legal = g.moves({ verbose: true });
  let uci = null;
  if (post && post.lines.length && Math.random() >= lvl.random) {
    const sign = g.turn() === 'w' ? 1 : -1, top = C.cpOf(post.lines[0]) * sign;
    const ok = post.lines.filter(l => top - C.cpOf(l) * sign <= lvl.window);
    uci = ok[Math.floor(Math.random() * ok.length)].pv[0];
  }
  let m = null;
  if (uci) { try { m = g.move(C.uciObj(uci)); } catch (e) { m = null; } }
  if (!m) { const r = legal[Math.floor(Math.random() * legal.length)]; m = g.move(r.san); }
  G.last = [m.from, m.to]; G.arrow = null;
  sfx.forMove(m, g.inCheck());
  G.board.setPosition(g.board());
  if (g.isGameOver()) return endGame();
  userTurn();
}

function gameTakeback() {
  if (!G.pending) return;
  G.pending = null; G.tok++;
  G.game.undo();
  const h = G.game.history({ verbose: true }), lm = h[h.length - 1];
  G.last = lm ? [lm.from, lm.to] : [];
  G.board.setPosition(G.game.board());
  G.busy = false;
  G.say = { mood: 'think', html: 'OK, the move is back. Look again – what is a safer or stronger idea?' };
  drawGame();
}

async function gameHint() {
  if (G.over || G.busy || G.game.turn() !== G.me) return;
  const fen = G.game.fen();
  G.say = { mood: 'think', html: '<span class="dotsanim">Let me think</span>' }; drawGame();
  const pre = await G.pre;
  if (!G || G.game.fen() !== fen) return;
  if (!pre || !pre.best) { G.say = { mood: 'oops', html: 'My engine is not ready yet – try again in a moment.' }; return drawGame(); }
  G.hints++;
  G.arrow = [pre.best.slice(0, 2), pre.best.slice(2, 4), 'hint'];
  G.say = { mood: 'happy', html: `I would play <b>${C.sanOf(fen, pre.best)}</b> here.` };
  drawGame();
}

function gameUndo() {
  if (G.over || G.busy || G.game.turn() !== G.me) return;
  const n = G.game.history().length;
  if (n < 2) return;
  G.tok++; G.game.undo(); G.game.undo();
  const h = G.game.history({ verbose: true }), lm = h[h.length - 1];
  G.last = lm ? [lm.from, lm.to] : []; G.arrow = null;
  G.board.setPosition(G.game.board());
  G.say = { mood: 'happy', html: 'Took one move back. Your turn again.' };
  userTurn();
}

function endGame(reason) {
  const g = G.game; let result, why, mood = 'happy';
  if (reason === 'resign') { result = G.me === 'w' ? '0-1' : '1-0'; why = 'You resigned.'; mood = 'think'; }
  else if (g.isCheckmate()) {
    const winner = g.turn() === 'w' ? 'b' : 'w';
    result = winner === 'w' ? '1-0' : '0-1';
    why = winner === G.me ? 'Checkmate – you won!' : `Checkmate. ${G.level.name} wins this one.`;
    mood = winner === G.me ? 'wow' : 'oops';
  } else {
    result = '1/2-1/2';
    why = g.isStalemate() ? 'Stalemate – it’s a draw.' : g.isThreefoldRepetition() ? 'Draw by repetition.' : g.isInsufficientMaterial() ? 'Draw – not enough pieces left to mate.' : 'Draw.';
  }
  G.over = true; G.busy = false; G.tok++; G.result = result; G.pending = null;
  const won = (result === '1-0' && G.me === 'w') || (result === '0-1' && G.me === 'b');
  if (won) sfx.win(); else if (result !== '1/2-1/2') sfx.lose();
  save.games.unshift({ id: G.id, date: new Date().toISOString().slice(0, 10), me: G.me, opp: G.level.name, elo: G.level.elo, result, sans: g.history() });
  save.games = save.games.slice(0, 20); persist();
  G.say = { mood, html: `<b>${why}</b> ${g.history().length >= 8 ? 'Want to go through the game together? I’ll show you what you could have done better.' : ''}` };
  drawGame();
}

/* ================= review ================= */
const REV = new Map();
let R = null;

function resultFor(rec) {
  if (rec.result === '1/2-1/2') return ['draw', '½'];
  if (rec.result === '*') return ['draw', '?'];
  return (rec.result === '1-0') === (rec.me === 'w') ? ['win', 'W'] : ['loss', 'L'];
}

function viewReviewList() {
  const games = save.games;
  screen(`
    <div class="home-top"><span class="brand">Review</span></div>
    <div class="home-coach">${coachBox('happy', games.length ? 'Pick a game. I’ll grade every move and explain the important ones.' : 'No games yet. Play one, or paste a game from another site below, and I’ll go through it with you.')}</div>
    <div class="games">${games.map(r => { const [c, t] = resultFor(r); return `
      <button class="game" data-go="#/review/${r.id}"><span class="res ${c}">${t}</span>
        <div><b>vs ${esc(r.opp)}${r.elo ? ` (${r.elo})` : ''}</b><span>${r.date}, ${Math.ceil(r.sans.length / 2)} moves, you were ${r.me === 'w' ? 'White' : 'Black'}</span></div><em>›</em></button>`; }).join('')}</div>
    ${games.length ? '' : `<button class="btn" data-go="#/play" style="margin-bottom:8px">Play a game</button>`}
    <p class="field">Review a game from somewhere else</p>
    <textarea id="pgn" placeholder="Paste the PGN here (on most chess sites: Share, then PGN)"></textarea>
    <div class="seg" style="margin:10px 0">${[['w', 'I was White'], ['b', 'I was Black']].map(([k, t], i) => `<button class="${i === 0 ? 'on' : ''}" data-act="side" data-id="${k}">${t}</button>`).join('')}</div>
    <button class="btn sec" data-act="import">Review this game</button>
    <p class="foot" id="pgnmsg"></p>`, 'review');
  let side = 'w';
  ACT.side = el => { side = el.dataset.id; el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); };
  ACT.import = () => {
    const g = new Chess();
    try { g.loadPgn($('#pgn').value.trim()); } catch (e) { $('#pgnmsg').textContent = 'I could not read that PGN. Copy the whole game text and try again.'; return; }
    const sans = g.history();
    if (sans.length < 2) { $('#pgnmsg').textContent = 'There are no moves in that PGN.'; return; }
    const h = g.getHeaders ? g.getHeaders() : g.header();
    const rec = { id: Date.now(), date: new Date().toISOString().slice(0, 10), me: side, opp: String((side === 'w' ? h.Black : h.White) || 'Opponent').slice(0, 24), elo: 0, result: h.Result || '*', sans };
    if (h.FEN) rec.fen = h.FEN;
    save.games.unshift(rec); save.games = save.games.slice(0, 20); persist();
    go('#/review/' + rec.id);
  };
}

async function viewReview(id, stepper) {
  const rec = save.games.find(r => String(r.id) === String(id));
  if (!rec) return go('#/review');
  if (!REV.has(rec.id)) {
    screen(`<div class="top"><button class="back" data-go="#/review" aria-label="Back">‹</button><span class="ttl">Game review</span></div>
      <div class="result" style="padding-top:12vh"><div class="owl">${owl('think')}</div><h1>Looking at your game</h1><p id="rmsg">Starting the engine…</p><div class="bar"><i id="rbar"></i></div></div>`, null);
    const tok = viewTok, total = Math.ceil(rec.sans.length / 2);
    try {
      const rev = await C.reviewGame(engine(), rec.sans, rec.fen, p => {
        if (tok !== viewTok) return;
        $('#rbar').style.width = p * 100 + '%';
        $('#rmsg').textContent = `Move ${Math.max(1, Math.min(total, Math.round(p * total)))} of ${total}`;
      }, () => tok !== viewTok);
      if (!rev || tok !== viewTok) return;
      REV.set(rec.id, { rev, sum: C.summarize(rev, rec.me, rec.result) });
    } catch (e) {
      console.error(e);
      if (tok !== viewTok) return;
      $('#rmsg').textContent = 'The engine could not start in this browser. Check your connection and reload the page.';
      return;
    }
  }
  R = { rec, ...REV.get(rec.id), idx: 0, start: R && R.rec === rec ? R.start : 0 };
  if (stepper) viewStepper(); else viewSummary();
}

const theirs = t => t.replace(/your opponent/gi, '\u0001').replace(/\bYou\b/g, 'Your opponent').replace(/\byou\b/g, 'they')
  .replace(/\bYour\b/g, 'Their').replace(/\byour\b/g, 'their').replace(/\u0001/g, 'you');

function graphSvg() {
  const { rev, rec } = R, n = rev.pos.length, W = 300, H = 84;
  const pts = rev.pos.map((p, i) => [(i / Math.max(1, n - 1)) * W, H - C.winFor(rec.me, p.cp) / 100 * H]);
  const dots = rev.moves.map((m, i) => m.color === rec.me && (m.cls === 'blunder' || m.cls === 'mistake')
    ? `<circle cx="${pts[i + 1][0].toFixed(1)}" cy="${pts[i + 1][1].toFixed(1)}" r="4" fill="var(--c-${m.cls})" stroke="#262522" stroke-width="1.5"/>` : '').join('');
  return `<svg class="graph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" data-act="graph"><path d="M0,${H} ${pts.map(p => 'L' + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')} L${W},${H}Z" fill="#fff"/><path d="M0,${H / 2}H${W}" stroke="#8b8780" stroke-width="1" stroke-dasharray="3 3"/>${dots}</svg>`;
}

function viewSummary() {
  const { rec, sum } = R, me = sum.stats[rec.me], opp = sum.stats[rec.me === 'w' ? 'b' : 'w'];
  const [rc] = resultFor(rec);
  screen(`<div class="top"><button class="back" data-go="#/review" aria-label="Back">‹</button><span class="ttl">Game review</span><span class="right">vs ${esc(rec.opp)}</span></div>
    <div class="page">
      ${coachBox(rc === 'win' ? 'wow' : rc === 'loss' ? 'think' : 'happy', sum.text.map(t => `<p>${t}</p>`).join(''))}
      <div class="acc"><div class="me"><strong>${me.acc.toFixed(1)}</strong><span>Your accuracy</span></div><div><strong>${opp.acc.toFixed(1)}</strong><span>${esc(rec.opp)}</span></div></div>
      <p class="muted" style="font-size:13.5px;margin-bottom:-8px">Your winning chances during the game. Tap to jump there.</p>
      ${graphSvg()}
      <table class="counts"><tr><td>You</td><td></td><td>${esc(rec.opp)}</td></tr>
        ${Object.keys(C.CLASSES).map(k => `<tr><td>${me.n[k]}</td><td><span class="tag c-${k}">${C.CLASSES[k].sym}</span>${C.CLASSES[k].label}</td><td>${opp.n[k]}</td></tr>`).join('')}</table>
      <div style="height:16px"></div>
      <div class="stack"><button class="btn" data-act="walk">Go through the game</button>
      ${sum.keys.length ? `<button class="btn sec" data-act="firstbad">Jump to my first mistake</button>` : ''}</div>
    </div>`, null);
  view.classList.add('pad');
  ACT.walk = () => { R.start = 0; go(`#/review/${rec.id}/moves`); };
  ACT.firstbad = () => { R.start = sum.keys[0] + 1; go(`#/review/${rec.id}/moves`); };
  ACT.graph = (el, ev) => { const b = el.getBoundingClientRect(); R.start = Math.round((ev.clientX - b.left) / b.width * (R.rev.pos.length - 1)); go(`#/review/${rec.id}/moves`); };
}

function viewStepper() {
  const { rec, rev } = R;
  screen(boardShell({ back: `#/review/${rec.id}`, title: 'Game review' }), null);
  R.board = createBoard($('#board'), { movesFrom: () => [], onMove() {} });
  $('#above').innerHTML = `<div class="evalbar"><i id="evi"></i><span class="w" id="evw"></span><span class="b" id="evb"></span></div>`;
  $('#below').innerHTML = `<div class="moves" id="moves">${rev.moves.map((m, i) => `<button class="mv" data-act="ply" data-id="${i + 1}"><u>${m.no}${m.color === 'w' ? '.' : '…'}</u>${m.san}<s class="c-${m.cls}"></s></button>`).join('')}</div><div id="rcoach"></div>`;
  $('#actions').innerHTML = `<button class="btn sec fit" data-act="prev" aria-label="Previous move">◀</button><button class="btn" data-act="nextply">Next move ▶</button><button class="btn sec fit" data-act="nextbad">Next mistake</button>`;
  ACT.prev = () => showPly(R.idx - 1);
  ACT.nextply = () => showPly(R.idx + 1);
  ACT.ply = el => showPly(+el.dataset.id);
  ACT.nextbad = () => {
    const k = rev.moves.findIndex((m, i) => i + 1 > R.idx && m.color === rec.me && C.BAD.includes(m.cls));
    if (k > -1) showPly(k + 1); else { $('#rcoach').innerHTML = coachBox('happy', 'No more mistakes from you after this point.'); }
  };
  const start = R.start || 0; R.start = 0; R.idx = -1;
  showPly(start, false);
}

function showPly(i, animate = true) {
  const { rec, rev } = R, n = rev.moves.length;
  i = Math.max(0, Math.min(n, i));
  if (i === R.idx) return;
  const fwd = i === R.idx + 1;
  R.idx = i;
  const g = new Chess(rev.fens[i]), m = i ? rev.moves[i - 1] : null, p = rev.pos[i];
  R.board.setPosition(g.board(), { animate, flipped: rec.me === 'b' });
  const marks = { check: kingInCheck(g) };
  if (m) {
    marks.last = [m.from, m.to];
    marks.badge = { sq: m.to, cls: m.cls, text: C.CLASSES[m.cls].sym };
    if (C.BAD.includes(m.cls) && m.bestUci && m.bestUci !== m.uci) marks.arrows = [[m.bestUci.slice(0, 2), m.bestUci.slice(2, 4), 'best']];
    if (fwd && animate) sfx.forMove({ captured: m.san.includes('x'), flags: m.san.startsWith('O-O') ? 'k' : '' }, g.inCheck());
  }
  R.board.setMarks(marks);
  $('#evi').style.width = C.winFor('w', p.cp) + '%';
  $('#evw').textContent = p.cp >= 0 ? C.evalText(p) : ''; $('#evb').textContent = p.cp < 0 ? C.evalText(p) : '';
  $('#pright').textContent = i ? `Move ${m.no} of ${Math.ceil(n / 2)}` : 'Start';
  document.querySelectorAll('#moves .mv').forEach((el, k) => el.classList.toggle('on', k === i - 1));
  const cur = document.querySelector('#moves .mv.on');
  if (cur) cur.scrollIntoView({ inline: 'center', block: 'nearest', behavior: animate ? 'smooth' : 'auto' });
  let html, mood = 'happy';
  if (!m) html = `${rev.opening ? `This game was a <b>${rev.opening}</b>. ` : ''}Tap <b>Next move</b> to go through it. A green arrow shows the move I would have played.`;
  else {
    const mine = m.color === rec.me;
    mood = !C.BAD.includes(m.cls) ? (m.cls === 'best' && mine ? 'wow' : 'happy') : mine ? 'oops' : 'think';
    html = `<span class="tag c-${m.cls}">${C.CLASSES[m.cls].label}</span><b>${m.no}${m.color === 'w' ? '.' : '…'}${m.san}</b> ${mine ? '' : '<span style="color:#8a857c">(' + esc(rec.opp) + ')</span> '}${mine ? m.text : theirs(m.text)}`;
    if (i === n && g.isGameOver() && !g.isCheckmate()) html += ' <b>Draw.</b>';
  }
  $('#rcoach').innerHTML = coachBox(mood, html);
}

/* ================= routing + events ================= */
function route() {
  if (L) { clearTimeout(L.timer); L = null; }
  const [, kind, id, mode] = location.hash.split('/');
  if (kind === 'play') return viewPlaySetup();
  if (kind === 'game') return viewGame();
  if (kind === 'review') return id ? viewReview(id, mode === 'moves') : viewReviewList();
  const lesson = kind === 'l' && byId(id);
  if (!lesson) return viewHome();
  if ((mode === 'learn' || mode === 'practice') && lesson.parts.length) return startLesson(lesson, mode);
  viewIntro(lesson);
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-go],[data-act]');
  if (!t) return;
  if (t.dataset.go) return go(t.dataset.go);
  const fn = ACT[t.dataset.act];
  if (fn) fn(t, e);
});
document.addEventListener('keydown', e => {
  if (!R || !$('#moves')) return;
  if (e.key === 'ArrowRight') showPly(R.idx + 1);
  if (e.key === 'ArrowLeft') showPly(R.idx - 1);
});
window.addEventListener('hashchange', route);

(async function boot() {
  try { document.getElementById('sprite').innerHTML = await (await fetch('pieces.svg')).text(); } catch (e) { /* pieces stay empty */ }
  route();
  setTimeout(() => { try { engine(); } catch (e) { /* ignore */ } }, 800);
})();
