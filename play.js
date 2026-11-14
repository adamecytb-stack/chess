// Play tab: games against bots with a live coach.
import { Chess } from './chess.js';
import { createBoard, pieceSvg } from './board.js';
import { engine } from './engine.js';
import { play, moveSound } from './sound.js';
import { clsIcon } from './icons.js';
import { avatar } from './avatars.js';
import { S } from './speech.js';
import { prefetch } from './voice.js';
import { confetti } from './fx.js';
import { miniBoard } from './editor.js';
import * as C from './coach.js';
import { store, persist, prefs, savePrefs, $, esc, sleep, ACT, screen, go, coachBox, coachSet, clsTag, boardShell, kingInCheck, onLeave } from './ui.js';
export const botFace = l => avatar(l.id, l.color);

export const LEVELS = [
  { id: 'pip', name: 'Pip', elo: 400, blurb: 'Just learned how the pieces move', color: '#5fb39a', depth: 2, multipv: 5, window: 700, random: 0.25 },
  { id: 'mira', name: 'Mira', elo: 800, blurb: 'Plays for fun, leaves pieces hanging', color: '#4b9fe8', depth: 4, multipv: 4, window: 260, random: 0.08 },
  { id: 'bruno', name: 'Bruno', elo: 1200, blurb: 'Knows the basics, misses tactics', color: '#f08a34', depth: 6, multipv: 4, window: 110, random: 0.02 },
  { id: 'ingrid', name: 'Ingrid', elo: 1600, blurb: 'Solid club player', color: '#b06ad6', depth: 9, multipv: 3, window: 45, random: 0 },
  { id: 'viktor', name: 'Viktor', elo: 2000, blurb: 'Tournament player', color: '#c9972a', depth: 12, multipv: 2, window: 15, random: 0 },
  { id: 'max', name: 'Maximus', elo: 2600, blurb: 'Shows no mercy', color: '#e5533d', depth: 17, multipv: 1, window: 0, random: 0 }
];
export const OTB = { id: 'otb', name: 'Over the board', blurb: 'Move both sides yourself – or play a real game with a friend', color: '#5b5852' };
const levelOf = id => id === 'otb' ? OTB : (LEVELS.find(l => l.id === id) || LEVELS[1]);
const otbFace = () => `<span class="otbface">${pieceSvg('w', 'k')}${pieceSvg('b', 'k')}</span>`;
const faceOf = l => l.id === 'otb' ? otbFace() : botFace(l);
const SIDE = c => (c === 'w' ? 'White' : 'Black');
// whose pieces can be moved right now
const myTurn = () => !!G && (G.otb || R.game.turn() === G.me);
const KEY_CLS = ['brilliant', 'great', 'inaccuracy', 'mistake', 'miss', 'blunder'];
const uciOf = m => m.from + m.to + (m.promotion || '');

let G = null;   // saved game state
let R = null;   // screen runtime state
let setup = { level: 'mira', color: 'w', turnBoard: false, start: 'normal', fen: '' };
try { Object.assign(setup, JSON.parse(localStorage.getItem('ks.setup') || '{}')); } catch (e) { /* ignore */ }

function saveCurrent() {
  store.current = G && !G.over ? { id: G.id, levelId: G.levelId, levelName: levelOf(G.levelId).name, me: G.me, tips: G.tips, sans: G.sans, infos: G.infos, hints: G.hints || 0, otb: !!G.otb, turnBoard: !!G.turnBoard, startFen: G.startFen || null } : null;
  persist();
}
const saveSetup = () => { try { localStorage.setItem('ks.setup', JSON.stringify(setup)); } catch (e) { /* ignore */ } };
export const getSetup = () => setup;
export function startGame() {
  if (!G && store.current) G = { ...store.current, over: false };
  if (G && !G.over && G.sans.length > 2 && !confirm('Abandon the game in progress?')) return;
  saveSetup();
  const otb = setup.level === 'otb';
  const me = otb ? 'w' : setup.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : setup.color;
  G = { id: Date.now(), levelId: setup.level, me, tips: prefs.tips, sans: [], infos: [], over: false, hints: 0, otb, turnBoard: otb && setup.turnBoard, startFen: setup.start === 'custom' && setup.fen ? setup.fen : null };
  saveCurrent();
  try { engine().newGame(); } catch (e) { /* ignore */ }
  play('start');
  go('#/game');
}
export function useCustom(fen) { setup.start = 'custom'; setup.fen = fen; saveSetup(); }
// colour and move number of half-move i, for games that may start from any position
function plyOf(i) {
  const st = (G.startFen || 'x w - - 0 1').split(' '), first = st[1], no0 = +st[5] || 1;
  const k = i + (first === 'b' ? 1 : 0);
  return { color: k % 2 === 0 ? 'w' : 'b', no: no0 + Math.floor(k / 2) };
}
export const hasGame = () => !!(G && !G.over) || !!store.current;

/* ---------------- setup ---------------- */
export function viewPlaySetup() {
  if (!G && store.current) G = { ...store.current, over: false };
  const draw = () => {
    screen(`
      <div class="home-top"><span class="brand">Play</span></div>
      <div class="home-coach">${coachBox('happy', 'Play a bot, or move both sides yourself. I’ll watch every move – and after the game we go through it together.')}</div>
      ${G && !G.over ? `<button class="btn col" data-go="#/game" style="margin-bottom:16px"><span>Continue your game</span><small>${G.otb ? 'Over the board' : 'vs ' + esc(levelOf(G.levelId).name)}, move ${Math.ceil((G.sans.length + 1) / 2)}</small></button>` : ''}
      <div class="startfrom">
        <div class="seg">${[['normal', 'Normal start'], ['custom', '♟ Set up a position']].map(([k, t]) => `<button class="${setup.start === k ? 'on' : ''}" data-act="startfrom" data-id="${k}">${t}</button>`).join('')}</div>
        ${setup.start === 'custom' && setup.fen ? `<button class="custompos" data-go="#/setup">${miniBoard(setup.fen)}<div><b>Custom position · ${setup.fen.split(' ')[1] === 'w' ? 'White' : 'Black'} to move</b><span>Tap to edit it</span></div><em>›</em></button>` : ''}
      </div>
      <div class="levels"><button class="level ${setup.level === 'otb' ? 'on' : ''}" data-act="level" data-id="otb">
          <span class="ava big">${otbFace()}</span><div><b>${OTB.name}</b><span>${OTB.blurb}. Olly grades every move for both sides.</span></div><em>2P</em></button></div>
      <p class="field">Bots</p>
      <div class="levels">${LEVELS.map(l => `
        <button class="level ${setup.level === l.id ? 'on' : ''}" data-act="level" data-id="${l.id}">
          <span class="ava big">${botFace(l)}</span>
          <div><b>${l.name}</b><span>${l.blurb}</span></div><em>${l.elo}</em>
        </button>`).join('')}</div>
      ${setup.level === 'otb' ? `<p class="field">Board</p>
      <div class="seg">${[[false, 'White at the bottom'], [true, 'Turn after each move']].map(([k, t]) => `<button class="${setup.turnBoard === k ? 'on' : ''}" data-act="turnboard" data-id="${k}">${t}</button>`).join('')}</div>` : `<p class="field">You play</p>
      <div class="seg">${[['w', 'White'], ['r', 'Random'], ['b', 'Black']].map(([k, t]) => `<button class="${setup.color === k ? 'on' : ''}" data-act="color" data-id="${k}">${t}</button>`).join('')}</div>`}
      <p class="field">Coach</p>
      <button class="switch ${prefs.tips ? 'on' : ''}" data-act="tips"><div><b>Comment on my moves</b><span>Grades every move, warns you about threats, and lets you take back mistakes.</span></div><i></i></button>
      <div style="height:18px"></div>
      <button class="btn" data-act="start">${G && !G.over ? 'Start a new game' : 'Play'}</button>
      <p class="foot">Ratings are rough guides.</p>`, 'play');
    ACT.level = el => { setup.level = el.dataset.id; draw(); };
    ACT.color = el => { setup.color = el.dataset.id; draw(); };
    ACT.turnboard = el => { setup.turnBoard = el.dataset.id === 'true'; draw(); };
    ACT.startfrom = el => { setup.start = el.dataset.id; saveSetup(); if (setup.start === 'custom' && !setup.fen) go('#/setup'); else draw(); };
    ACT.tips = () => { prefs.tips = !prefs.tips; savePrefs(); draw(); };
    ACT.start = startGame;
  };
  draw();
}

/* ---------------- game screen ---------------- */
export function viewGame() {
  if (!G && store.current) G = { ...store.current, over: false };
  if (!G) return go('#/play');
  const lvl = levelOf(G.levelId);
  screen(boardShell({ back: '#/play', title: G.otb ? 'Over the board' : `You vs ${lvl.name}`, cls: 'scr-game' }), null);
  const game = G.startFen ? new Chess(G.startFen) : new Chess();
  for (const s of G.sans) game.move(s);
  R = { game, tok: 0, busy: false, pending: false, hintLvl: 0, arrow: null, hintSq: [], badge: null, last: [], lastOpening: '', dead: false, P: C.persp(true, 'you', G.otb ? 'your opponent' : lvl.name) };
  const h = game.history({ verbose: true }), lm = h[h.length - 1];
  if (lm) {
    R.last = [lm.from, lm.to];
    const inf = G.infos[h.length - 1];
    if (inf && (G.otb || lm.color === G.me)) R.badge = { sq: lm.to, cls: inf.cls };
  }
  onLeave(() => { if (R) { R.tok++; R.dead = true; } try { engine().cancel('game'); } catch (e) { /* ignore */ } });
  R.board = createBoard($('#board'), {
    movesFrom(sq) {
      if (G.over || R.busy || R.pending || !myTurn()) return [];
      const pc = R.game.get(sq);
      return pc && pc.color === R.game.turn() ? [...new Set(R.game.moves({ square: sq, verbose: true }).map(m => m.to))] : [];
    },
    onMove: gameMove
  });
  R.board.setPosition(game.board(), { animate: false, flipped: bottom(game) === 'b' });
  $('#above').innerHTML = `<div class="strip" id="opp"></div>`;
  $('.screen .top').insertAdjacentHTML('beforeend', `<button class="spk" data-act="gset" aria-label="Board options"><svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="7" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="17" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>`);
  $('.screen').insertAdjacentHTML('beforeend', `<div class="gset" id="gset" hidden>${OPTS.map(([k, t, d]) => `<button class="switch" data-act="gopt" data-id="${k}"><div><b>${t}</b><span>${d}</span></div><i></i></button>`).join('')}<button class="btn sec" data-act="setuppos">♟ Set up a position</button></div>`);
  $('.board-wrap').insertAdjacentHTML('afterbegin', `<div class="vbar" id="gvbar"><i id="gevi"></i><span id="gevt"></span></div>`);
  ACT.gset = () => { const p = $('#gset'); p.hidden = !p.hidden; drawGame(); };
  ACT.gopt = el => { prefs[el.dataset.id] = !prefs[el.dataset.id]; savePrefs(); drawGame(); };
  ACT.setuppos = () => { setup.level = G.levelId; if (!G.otb) setup.color = G.me; go('#/setup'); };
  $('#below').innerHTML = `<div class="strip" id="mine"></div><div class="moves" id="gmoves"></div>${coachBox('happy', '', 'gc')}`;
  ACT.hint = gameHint; ACT.undo = gameUndo;
  ACT.resign = () => { if (!G.over && confirm(G.otb ? `Resign for ${SIDE(R.game.turn())}?` : 'Resign this game?')) endGame('resign'); };
  ACT.takeback = gameTakeback;
  ACT.keep = () => { if (!R.pending) return; R.pending = false; setCoach('happy', R.keepText || 'Okay, let’s play on.', false); if (G.otb) otbNext(); else botTurn(R.tok); };
  ACT.closecard = () => { const c = $('#overcard'); if (c) c.remove(); };
  ACT.newgame = () => { G = null; go('#/play'); };
  ACT.rematch = () => {
    const prev = G;
    G = { id: Date.now(), levelId: prev.levelId, me: prev.otb ? 'w' : prev.me === 'w' ? 'b' : 'w', tips: prev.tips, sans: [], infos: [], over: false, hints: 0, otb: prev.otb, turnBoard: prev.turnBoard, startFen: prev.startFen || null };
    saveCurrent(); play('start'); viewGame();
  };
  ACT.review = () => go('#/review/' + G.id);
  if (G.startFen && !game.history().length) setCoach('happy', `Custom position – ${SIDE(game.turn())} to move. ${G.otb ? 'I’ll grade every move.' : game.turn() === G.me ? 'Your move.' : ''}`, false);
  else if (G.otb) setCoach('happy', game.history().length ? `${SIDE(game.turn())} to move.` : 'Move the pieces for both sides – I’ll grade every move. Playing on a real board? Copy each move here as you play it.', false);
  else if (!game.history().length) setCoach('happy', G.me === 'w' ? 'You have White – your move. Remember: centre, develop, castle.' : `You have Black. ${lvl.name} starts.`, true, [G.me === 'w' ? S.game.white : S.game.black]);
  else { setCoach('happy', game.turn() === G.me ? 'Welcome back – your move.' : `${lvl.name} to move.`, false); R.status = true; }
  prefetch([...Object.values(S.lead).flat(), S.book, S.alert.blunder, S.alert.mistake, S.game.takeback]);
  drawGame();
  if (game.isGameOver()) return endGame();
  if (myTurn()) userTurn(); else botTurn(R.tok);
}

// estimated playing strength of both sides, from the moves graded so far
function eloLine() {
  const est = c => C.estimateElo(G.infos.filter((x, i) => x && plyOf(i).color === c));
  const w = est('w'), b = est('b');
  if (!w && !b) return '<p class="oc-elo">Too short to estimate ratings.</p>';
  const lvl = levelOf(G.levelId), name = c => G.otb ? SIDE(c) : c === G.me ? 'You' : lvl.name;
  return `<p class="oc-elo">Played like: <b>${name('w')} ${C.eloText(w)}</b> · <b>${name('b')} ${C.eloText(b)}</b></p>`;
}

// which colour sits at the bottom of the board
function bottom(g) { return G.otb ? (G.turnBoard ? g.turn() : 'w') : G.me; }

// over the board: next player's turn (turn the board if asked)
function otbNext() {
  const g = R.game;
  if (G.turnBoard && R.board.flipped !== (g.turn() === 'b')) {
    const tok = R.tok;
    setTimeout(() => { if (!R || R.dead || tok !== R.tok) return; R.board.setPosition(g.board(), { animate: false, flipped: g.turn() === 'b' }); drawGame(); }, 650);
  }
  userTurn();
}

export const OPTS = [
  ['threats', 'Threat arrows', 'Red arrows show what the last move attacks.'],
  ['bestArrow', 'Best move arrow', 'A blue arrow shows Stockfish’s top move for the side to move.'],
  ['evalBar', 'Evaluation bar', 'Shows who is better, next to the board.']
];
const scoreOfLine = l => ({ cp: C.cpOf(l), mate: l.mate ?? null });

function setCoach(mood, html, speak, say) {
  R.say = { mood, html }; R.status = false;
  coachSet($('#gc'), mood, html, { speak, say });
}

function countPieces(g) {
  const n = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
  for (const row of g.board()) for (const c of row) if (c && c.type !== 'k') n[c.color][c.type]++;
  return n;
}
function captured(g) {
  const base = G.startFen ? countPieces(new Chess(G.startFen)) : null;
  const have = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
  const start0 = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  let diff = 0;
  for (const row of g.board()) for (const c of row) if (c && c.type !== 'k') { have[c.color][c.type]++; diff += (c.color === 'w' ? 1 : -1) * C.VAL[c.type]; }
  const lost = color => 'pnbrq'.split('').flatMap(t => Array(Math.max(0, (base ? base[color][t] : start0[t]) - have[color][t])).fill(t));
  return { byWhite: lost('b'), byBlack: lost('w'), diff };
}
const capRow = (types, color) => types.length ? `<span class="caps">${types.map(t => `<i>${pieceSvg(color, t)}</i>`).join('')}</span>` : '';

function drawGame() {
  if (!R || R.dead || !$('#board')) return;
  const g = R.game, lvl = levelOf(G.levelId);
  const arrows = [];
  if (prefs.threats && g.history().length && !G.over) for (const [a, b] of C.threatArrows(g.fen())) arrows.push([a, b, 'threat']);
  if (prefs.bestArrow && R.best && R.bestFen === g.fen() && myTurn() && !G.over && !R.pending) arrows.push([R.best.slice(0, 2), R.best.slice(2, 4), 'engine']);
  if (R.arrow) arrows.push(R.arrow);
  R.board.setMarks({ last: R.last, check: kingInCheck(g), arrows, hint: R.hintSq, badge: R.badge });
  document.querySelectorAll('#gset [data-act=gopt]').forEach(b => b.classList.toggle('on', !!prefs[b.dataset.id]));
  $('.screen').classList.toggle('with-bar', !!prefs.evalBar);
  const vb = $('#gvbar');
  if (vb) {
    vb.hidden = !prefs.evalBar; vb.classList.toggle('flip', R.board.flipped);
    if (R.ev) { $('#gevi').style.height = C.winFor('w', R.ev.cp) + '%'; const t = $('#gevt'); t.textContent = C.evalText(R.ev).replace(/^[+−]/, ''); t.className = R.ev.cp >= 0 ? 'w' : 'b'; }
  }
  const cap = captured(g);
  const low = G.otb ? (R.board.flipped ? 'b' : 'w') : G.me, high = low === 'w' ? 'b' : 'w';
  const capBy = c => (c === 'w' ? cap.byWhite : cap.byBlack), adv = c => cap.diff * (c === 'w' ? 1 : -1);
  const thinking = !G.otb && !G.over && g.turn() !== G.me && !R.pending;
  $('#pright').textContent = G.over ? G.result.replace('1/2-1/2', '½-½') : `Move ${g.moveNumber()}`;
  if (G.otb) {
    $('#opp').innerHTML = `<span class="ava you">${pieceSvg(high, 'k')}</span><b>${SIDE(high)}</b>${capRow(capBy(high), low)}<span class="mat">${adv(high) > 0 ? '+' + adv(high) : ''}</span>`;
    $('#opp').className = 'strip' + (!G.over && g.turn() === high && !R.pending ? ' turn' : '');
  } else {
    $('#opp').innerHTML = `<span class="ava">${botFace(lvl)}</span><b>${lvl.name}</b><span class="elo">${lvl.elo}</span>
    ${capRow(capBy(high), low)}<span class="mat">${thinking ? '<span class="dotsanim">thinking</span>' : adv(high) > 0 ? '+' + adv(high) : ''}</span>`;
    $('#opp').className = 'strip' + (thinking ? ' turn' : '');
  }
  $('#mine').className = 'strip' + (!G.over && g.turn() === low && !R.pending ? ' turn' : '');
  $('#mine').innerHTML = `<span class="ava you">${pieceSvg(low, 'k')}</span><b>${G.otb ? SIDE(low) : 'You'}</b>${capRow(capBy(low), high)}<span class="mat">${adv(low) > 0 ? '+' + adv(low) : ''}</span>`;
  const h = g.history();
  $('#gmoves').innerHTML = h.map((s, i) => {
    const pl = plyOf(i), inf = G.infos[i], mineMove = G.otb || pl.color === G.me;
    return `<span class="mv ${i === h.length - 1 ? 'on' : ''}">${pl.color === 'w' ? `<u>${pl.no}.</u>` : i === 0 ? `<u>${pl.no}…</u>` : ''}${s}${inf && mineMove && inf.cls !== 'book' ? clsIcon(inf.cls, 14) : ''}</span>`;
  }).join('');
  const strip = $('#gmoves'); strip.scrollLeft = strip.scrollWidth;
  const hl = ['Hint', 'More help', 'Show me'][Math.min(R.hintLvl, 2)];
  $('#actions').innerHTML = G.over
    ? `<button class="btn sec fit" data-act="rematch">Rematch</button><button class="btn" data-act="review">Game review</button>`
    : `<button class="btn sec" data-act="hint" ${!myTurn() || R.busy || R.pending ? 'disabled' : ''}>💡 ${hl}</button><button class="btn sec" data-act="undo" ${!myTurn() || R.busy || R.pending || g.history().length < (G.otb ? 1 : 2) ? 'disabled' : ''}>↶ Undo</button><button class="btn sec fit" data-act="resign" aria-label="Resign">⚑</button>`;
}

function userTurn() {
  R.busy = false; R.hintLvl = 0; R.arrow = null; R.hintSq = [];
  const fen = R.game.fen();
  R.rootFen = fen;
  R.rootP = engine().analyse(fen, { depth: C.DEPTH, multipv: 2, tag: 'game' }).catch(() => null);
  R.rootP.then(r => {
    if (!R || R.dead || R.game.fen() !== fen || !r || !r.lines[0]) return;
    R.best = r.best; R.bestFen = fen; R.ev = scoreOfLine(r.lines[0]);
    if (prefs.bestArrow || prefs.evalBar) drawGame();
  });
  drawGame();
}

function prevInfo() {
  const h = R.game.history({ verbose: true }), p = h[h.length - 1];
  return { prevTo: p && p.captured ? p.to : null, prevCls: G.infos[h.length - 1] ? G.infos[h.length - 1].cls : null };
}

async function gameMove(from, to) {
  const g = R.game;
  if (G.over || R.busy || R.pending || !myTurn()) return;
  let promotion;
  const pc = g.get(from);
  if (pc.type === 'p' && (to[1] === '8' || to[1] === '1')) {
    promotion = await R.board.askPromotion(pc.color);
    if (!promotion) return R.board.setPosition(g.board());
  }
  const fenBefore = g.fen(), ctx = prevInfo();
  let m; try { m = g.move({ from, to, promotion }); } catch (e) { play('illegal'); return R.board.setPosition(g.board()); }
  R.busy = true; R.arrow = null; R.hintSq = []; R.badge = null; R.last = [m.from, m.to];
  moveSound(m, g, G.otb ? m.color === 'w' : true);
  G.sans.push(m.san); G.infos.push(null); saveCurrent();
  R.board.setPosition(g.board());
  drawGame();
  const tok = ++R.tok, ply = G.sans.length - 1, uci = uciOf(m);
  const tag = G.otb ? `<span class="who">${SIDE(m.color)}</span> ` : '';
  const P = G.otb ? C.persp(true, 'you', SIDE(m.color === 'w' ? 'b' : 'w')) : R.P;
  const op = G.startFen ? { name: '', plies: 0 } : C.opening(G.sans);
  let info = null;
  if (op.plies >= G.sans.length) info = C.bookInfo(fenBefore, uci);
  else {
    const slow = setTimeout(() => { if (tok === R.tok && G.tips) setCoach('think', '<span class="dotsanim">Hmm, let me see</span>', false); }, 450);
    info = await C.gradeMove(engine(), fenBefore, uci, { tag: 'game', ...ctx }).catch(() => null);
    clearTimeout(slow);
  }
  if (!R || tok !== R.tok) return;
  G.infos[ply] = info; saveCurrent();
  if (info && info.played) R.ev = info.played;
  if (info) {
    R.badge = { sq: m.to, cls: info.cls };
    if (info.cls === 'brilliant') play('brilliant'); else if (info.cls === 'great') play('correct');
  }
  if (g.isGameOver()) { drawGame(); return endGame(); }
  if (G.tips && info) {
    const news = info.cls === 'book' && op.name && op.name !== R.lastOpening;
    if (news) R.lastOpening = op.name;
    const prev = G.infos[ply - 1];
    if (['mistake', 'blunder', 'miss'].includes(info.cls)) {
      const hidden = C.explain(info, P, { prevInfo: prev, hideBest: true, prevTo: ctx.prevTo });
      R.keepText = `${clsTag(info.cls)} ${tag}${C.describe(info, P, { prevInfo: prev, prevTo: ctx.prevTo })}`;
      R.pending = true;
      if (!G.otb) { R.botFen = g.fen(); R.botP = botSearch(g.fen()); }
      setCoach('oops', `${clsTag(info.cls)} ${tag}${hidden.text}<div class="row"><button class="go" data-act="takeback">↶ Take it back</button><button data-act="keep">Play on</button></div>`, true, [...hidden.say, S.game.takeback]);
      return drawGame();
    }
    const ex = info.cls === 'book' ? { text: news ? `This is the ${op.name}.` : 'A standard opening move.', say: [S.book, news && S.opening(op.name)] } : C.explain(info, P, { prevInfo: prev, prevTo: ctx.prevTo });
    const mood = info.cls === 'inaccuracy' ? 'think' : (info.cls === 'brilliant' || info.cls === 'great') ? 'wow' : 'happy';
    setCoach(mood, `${clsTag(info.cls)} ${tag}${ex.text}`, KEY_CLS.includes(info.cls) ? true : (info.cls === 'book' && !news) ? false : 'minor', ex.say);
    if (info.cls === 'brilliant') confetti($('#board'));
  }
  drawGame();
  if (G.otb) otbNext(); else botTurn(tok);
}

const botSearch = fen => { const l = levelOf(G.levelId); return engine().analyse(fen, { depth: l.depth, multipv: l.multipv, tag: 'game' }).catch(() => null); };

function chooseBotMove(post, g) {
  const lvl = levelOf(G.levelId), legal = g.moves({ verbose: true });
  if (!post || !post.lines.length || Math.random() < lvl.random) return uciOf(legal[Math.floor(Math.random() * legal.length)]);
  const sign = g.turn() === 'w' ? 1 : -1;
  const sc = post.lines.filter(l => l.pv && l.pv[0]).map(l => ({ u: l.pv[0], s: C.cpOf(l) * sign }));
  const top = sc[0].s, ok = sc.filter(x => top - x.s <= lvl.window);
  const T = Math.max(1, lvl.window / 2.5);
  const w = ok.map(x => Math.exp(-(top - x.s) / T)), sum = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < ok.length; i++) { r -= w[i]; if (r <= 0) return ok[i].u; }
  return ok[0].u;
}

async function botTurn(tok) {
  if (!R || R.dead || G.over) return;
  R.busy = true; drawGame();
  const g = R.game, fen = g.fen(), t0 = Date.now();
  const post = await (R.botFen === fen && R.botP ? R.botP : botSearch(fen));
  R.botP = null; R.botFen = null;
  if (!R || tok !== R.tok || R.dead) return;
  await sleep(Math.max(0, 450 + Math.random() * 500 - (Date.now() - t0)));
  if (!R || tok !== R.tok || R.dead) return;
  const ctx = prevInfo();
  const uci = chooseBotMove(post, g);
  let m; try { m = g.move(C.uciObj(uci)); } catch (e) { const l = g.moves({ verbose: true }); m = g.move(l[0]); }
  moveSound(m, g, false);
  G.sans.push(m.san); G.infos.push(null); saveCurrent();
  R.last = [m.from, m.to]; R.badge = null;
  R.board.setPosition(g.board());
  if (g.isGameOver()) { drawGame(); return endGame(); }
  const ply = G.sans.length - 1, fenAfter = g.fen();
  if (R.status) setCoach('happy', 'Your move.', false);
  userTurn();
  // grade the bot's move (for the review, and to tell you when it blundered)
  const bookNow = !G.startFen && C.opening(G.sans).plies >= G.sans.length;
  (bookNow ? Promise.resolve(C.bookInfo(fen, uciOf(m))) : C.gradeMove(engine(), fen, uciOf(m), { tag: 'game', ...ctx, noVerify: !G.tips })).then(info => {
    if (!G || G.sans[ply] !== m.san) return;
    G.infos[ply] = info; saveCurrent();
    if (!R || R.dead || !G.tips || G.over || R.game.fen() !== fenAfter) return;
    const a = C.afterOpponent(info, fenAfter, fen, R.P);
    if (a) { setCoach(a.mood, a.text, true, a.say); if (a.mood === 'wow') play('notify'); }
    drawGame();
  }).catch(() => {});
}

function gameTakeback() {
  if (!R.pending) return;
  R.pending = false; R.tok++;
  try { engine().cancel('game'); } catch (e) { /* ignore */ }
  R.game.undo(); G.sans.pop(); G.infos.pop(); saveCurrent();
  const h = R.game.history({ verbose: true }), lm = h[h.length - 1];
  R.last = lm ? [lm.from, lm.to] : []; R.badge = null;
  R.board.setPosition(R.game.board());
  setCoach('think', 'Okay, the move is back. Look again – what is safer, or stronger? Tap 💡 if you want a hint.', true, [S.game.tookBack]);
  userTurn();
}

async function gameHint() {
  if (G.over || R.busy || R.pending || !myTurn()) return;
  const fen = R.game.fen(), lvl = Math.min(3, R.hintLvl + 1);
  if (lvl === 1) setCoach('think', '<span class="dotsanim">Let me look</span>', false);
  const root = await R.rootP;
  if (!R || R.game.fen() !== fen) return;
  const h = root ? C.hintFor(fen, root, lvl, R.P) : null;
  if (!h) { setCoach('oops', 'My engine isn’t ready yet – try again in a second.', false); return; }
  R.hintLvl = lvl; G.hints = (G.hints || 0) + 1; saveCurrent();
  R.hintSq = h.squares || []; R.arrow = h.arrow ? [h.arrow[0], h.arrow[1], 'hint'] : null;
  setCoach('think', `💡 ${h.text}`, true, h.say);
  drawGame();
}

function gameUndo() {
  const n = G.otb ? 1 : 2;
  if (G.over || R.busy || R.pending || !myTurn() || G.sans.length < n) return;
  R.tok++;
  try { engine().cancel('game'); } catch (e) { /* ignore */ }
  for (let i = 0; i < n; i++) R.game.undo();
  G.sans.splice(-n); G.infos.splice(-n); saveCurrent();
  if (G.otb && G.turnBoard) R.board.setPosition(R.game.board(), { animate: false, flipped: R.game.turn() === 'b' });
  const h = R.game.history({ verbose: true }), lm = h[h.length - 1];
  R.last = lm ? [lm.from, lm.to] : []; R.badge = null;
  R.board.setPosition(R.game.board());
  setCoach('happy', G.otb ? `Took a move back. ${SIDE(R.game.turn())} to move.` : 'Took a move back. Your turn again.', false);
  userTurn();
}

function endGame(reason) {
  const g = R.game, lvl = levelOf(G.levelId); let result, why, mood = 'happy';
  let sayEnd;
  const loser = reason === 'resign' ? (G.otb ? g.turn() : G.me) : null;
  if (reason === 'resign') { result = loser === 'w' ? '0-1' : '1-0'; why = G.otb ? `${SIDE(loser)} resigned.` : 'You resigned.'; mood = 'think'; sayEnd = G.otb ? null : S.game.resign; }
  else if (g.isCheckmate()) {
    const winner = g.turn() === 'w' ? 'b' : 'w';
    result = winner === 'w' ? '1-0' : '0-1';
    why = G.otb ? `Checkmate – ${SIDE(winner)} wins!` : winner === G.me ? 'Checkmate – you won!' : `Checkmate. ${lvl.name} wins this one.`;
    mood = G.otb || winner === G.me ? 'wow' : 'oops';
    sayEnd = G.otb ? S.checkmate : winner === G.me ? S.game.win : S.game.lost;
  } else {
    result = '1/2-1/2';
    why = g.isStalemate() ? 'Stalemate – it’s a draw.' : g.isThreefoldRepetition() ? 'Draw by repetition.' : g.isInsufficientMaterial() ? 'Draw – not enough pieces left to checkmate.' : 'Draw by the fifty-move rule.';
    sayEnd = g.isStalemate() ? S.game.stalemate : g.isThreefoldRepetition() ? S.game.repetition : g.isInsufficientMaterial() ? S.game.material : S.game.fifty;
  }
  G.over = true; G.result = result; R.busy = false; R.pending = false; R.tok++;
  const won = G.otb ? result !== '1/2-1/2' : (result === '1-0' && G.me === 'w') || (result === '0-1' && G.me === 'b');
  play(won ? 'win' : result === '1/2-1/2' ? 'draw' : 'lose');
  store.games.unshift({ id: G.id, date: new Date().toISOString().slice(0, 10), me: G.me, opp: G.otb ? 'Black' : lvl.name, elo: G.otb ? 0 : lvl.elo, levelId: G.levelId, otb: !!G.otb, ...(G.startFen ? { fen: G.startFen } : {}), result, sans: G.sans.slice(), infos: G.infos.slice(), hints: G.hints || 0 });
  store.games = store.games.slice(0, 20);
  store.current = null; persist();
  setCoach(mood, `<b>${why}</b> ${G.sans.length >= 6 ? 'Let’s go through the game together – I’ll show you what you could have done better.' : ''}`, true, [sayEnd, G.sans.length >= 6 && S.game.review]);
  drawGame();
  const title = G.otb ? (result === '1-0' ? 'White wins' : result === '0-1' ? 'Black wins' : 'Draw') : won ? 'You won!' : result === '1/2-1/2' ? 'Draw' : `${lvl.name} won`;
  const sub = reason === 'resign' ? 'by resignation' : g.isCheckmate() ? 'by checkmate' : why.replace(/^Draw[ –]*/, '').replace(/^by /, 'by ');
  const card = document.createElement('div');
  card.id = 'overcard'; card.className = 'overcard ' + (won ? 'won' : result === '1/2-1/2' ? 'drawn' : 'lost');
  card.innerHTML = `<div class="oc-in"><button class="oc-x" data-act="closecard" aria-label="Close">×</button>
    <div class="oc-icon">${won ? '🏆' : result === '1/2-1/2' ? '🤝' : '♟'}</div><h2>${title}</h2><p>${sub}</p>
    <div class="oc-faces"><span class="ava big you">${pieceSvg(G.otb ? 'w' : G.me, 'k')}</span><b>${result.replace('1/2-1/2', '½-½')}</b><span class="ava big ${G.otb ? 'you' : ''}">${G.otb ? pieceSvg('b', 'k') : botFace(lvl)}</span></div>
    ${eloLine()}
    <button class="btn" data-act="review">Game review</button>
    <div class="oc-row"><button class="btn sec" data-act="rematch">${G.otb ? 'New game' : 'Rematch'}</button><button class="btn sec" data-act="newgame">${G.otb ? 'Play a bot' : 'New bot'}</button></div></div>`;
  $('.board-wrap').appendChild(card);
  if (won) confetti($('#board'), 140);
}
