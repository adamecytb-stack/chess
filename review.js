// Review tab: game list, coach summary, move-by-move walkthrough, best lines and retries.
import { Chess } from './chess.js';
import { createBoard } from './board.js';
import { engine } from './engine.js';
import { play, moveSound } from './sound.js';
import { clsIcon, CLS_COLOR } from './icons.js';
import * as C from './coach.js';
import { S } from './speech.js';
import { store, persist, $, esc, sleep, ACT, screen, go, owl, coachBox, coachSet, clsTag, boardShell, kingInCheck, onLeave } from './ui.js';
import * as UI from './ui.js';

const REV = new Map();
let V = null;   // walkthrough state
const KEYS = ['brilliant', 'great', 'mistake', 'miss', 'blunder'];

function resultFor(rec) {
  if (rec.otb) return ['otb', rec.result === '1/2-1/2' ? '½' : rec.result === '*' ? '?' : rec.result];
  if (rec.result === '1/2-1/2') return ['draw', '½'];
  if (rec.result === '*') return ['draw', '?'];
  return (rec.result === '1-0') === (rec.me === 'w') ? ['win', 'W'] : ['loss', 'L'];
}

/* ---------------- list ---------------- */
export function viewReviewList() {
  const games = store.games;
  screen(`
    <div class="home-top"><span class="brand">Review</span></div>
    <div class="home-coach">${coachBox('happy', games.length ? 'Pick a game. I’ll grade every move and explain the ones that matter.' : 'No games yet. Play one – or paste a game from another site below – and I’ll go through it with you.')}</div>
    <div class="games">${games.map(r => { const [c, t] = resultFor(r); return `
      <button class="game" data-go="#/review/${r.id}"><span class="res ${c}">${t}</span>
        <div><b>${r.otb ? 'Over the board' : `vs ${esc(r.opp)}${r.elo ? ` (${r.elo})` : ''}`}</b><span>${r.date}, ${Math.ceil(r.sans.length / 2)} moves${r.otb ? ', both sides' : `, you were ${r.me === 'w' ? 'White' : 'Black'}`}${r.est && r.est[r.me] && !r.otb ? `, played like ~${r.est[r.me]}` : r.acc && !r.otb ? `, accuracy ${r.acc.toFixed(0)}` : ''}</span></div><em>›</em></button>`; }).join('')}</div>
    ${games.length ? '' : `<button class="btn" data-go="#/play" style="margin-bottom:8px">Play a game</button>`}
    <p class="field">Review a game from another site</p>
    <textarea id="pgn" placeholder="Paste the PGN here (on most chess sites: Share, then PGN)"></textarea>
    <div class="seg" style="margin:10px 0">${[['w', 'I was White'], ['b', 'I was Black']].map(([k, t], i) => `<button class="${i === 0 ? 'on' : ''}" data-act="side" data-id="${k}">${t}</button>`).join('')}</div>
    <button class="btn sec" data-act="import">Review this game</button>
    <p class="foot" id="pgnmsg"></p>`, 'review');
  let side = 'w';
  ACT.side = el => { side = el.dataset.id; el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); };
  ACT.import = () => {
    const g = new Chess();
    try { g.loadPgn($('#pgn').value.trim()); } catch (e) { $('#pgnmsg').textContent = 'I couldn’t read that PGN. Copy the whole game text and try again.'; return; }
    const sans = g.history();
    if (sans.length < 2) { $('#pgnmsg').textContent = 'There are no moves in that PGN.'; return; }
    const h = g.getHeaders ? g.getHeaders() : g.header();
    const rec = { id: Date.now(), date: new Date().toISOString().slice(0, 10), me: side, opp: String((side === 'w' ? h.Black : h.White) || 'your opponent').slice(0, 24), elo: 0, result: h.Result || '*', sans };
    if (h.FEN) rec.fen = h.FEN;
    store.games.unshift(rec); store.games = store.games.slice(0, 20); persist();
    go('#/review/' + rec.id);
  };
}

/* ---------------- analysis ---------------- */
export async function viewReview(id, mode) {
  const rec = store.games.find(r => String(r.id) === String(id));
  if (!rec) return go('#/review');
  if (!REV.has(rec.id)) {
    screen(`<div class="top"><button class="back" data-go="#/review" aria-label="Back">‹</button><span class="ttl">Game review</span></div>
      <div class="result" style="padding-top:10vh"><div class="owl">${owl('think')}</div><h1>Looking at your game</h1><p id="rmsg">Starting the engine…</p><div class="bar"><i id="rbar"></i></div>
      <p class="muted" style="margin-top:14px;font-size:14px">Every move is checked by Stockfish. Big moments get a deeper second look.</p></div>`, null);
    const tok = UI.viewTok, total = rec.sans.length;
    const cached = (rec.infos || []).filter(x => x && x.depth > 0).length;
    try {
      const rev = await C.reviewGame(engine(), rec.sans, rec.fen, rec.infos, p => {
        if (tok !== UI.viewTok) return;
        $('#rbar').style.width = p * 100 + '%';
        $('#rmsg').textContent = `Move ${Math.max(1, Math.ceil(p * total / 2))} of ${Math.ceil(total / 2)}`;
      }, () => tok !== UI.viewTok);
      if (!rev || tok !== UI.viewTok) return;
      rec.infos = rev.moves.map(m => ({ ...m, bestPv: (m.bestPv || []).slice(0, 8), playedPv: (m.playedPv || []).slice(0, 8) }));
      const sum = C.summarize(rev, rec.me, rec.result, rec.opp, !!rec.otb);
      rec.acc = sum.stats[rec.me].acc;
      persist();
      REV.set(rec.id, { rev, sum });
    } catch (e) {
      console.error(e);
      if (tok !== UI.viewTok) return;
      $('#rmsg').textContent = 'The engine couldn’t start in this browser. Check your connection and reload the page.';
      return;
    }
  }
  const data = REV.get(rec.id);
  if (!V || V.rec !== rec) V = { rec, ...data, idx: 0, start: 0 };
  if (mode === 'moves') viewStepper(); else viewSummary();
}

function graphSvg() {
  const { rev, rec } = V, n = rev.moves.length + 1, W = 300, H = 84;
  const evals = [rev.moves[0] ? rev.moves[0].best : { cp: 0 }, ...rev.moves.map(m => m.played)];
  const pts = evals.map((p, i) => [(i / Math.max(1, n - 1)) * W, H - C.winFor(rec.me, p.cp) / 100 * H]);
  const dots = rev.moves.map((m, i) => m.mover === rec.me && KEYS.includes(m.cls)
    ? `<circle cx="${pts[i + 1][0].toFixed(1)}" cy="${pts[i + 1][1].toFixed(1)}" r="4" fill="${CLS_COLOR[m.cls]}" stroke="#262522" stroke-width="1.5"/>` : '').join('');
  return `<svg class="graph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" data-act="graph"><path d="M0,${H} ${pts.map(p => 'L' + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')} L${W},${H}Z" fill="#fff"/><path d="M0,${H / 2}H${W}" stroke="#8b8780" stroke-width="1" stroke-dasharray="3 3"/>${dots}</svg>`;
}

function viewSummary() {
  const { rec, sum, rev } = V, me = sum.stats[rec.me], opp = sum.stats[rec.me === 'w' ? 'b' : 'w'];
  const [rc] = resultFor(rec);
  const moments = rev.moves.map((m, i) => ({ m, i })).filter(x => (rec.otb || x.m.mover === rec.me) && KEYS.includes(x.m.cls));
  const foe = rec.me === 'w' ? 'b' : 'w';
  const eMe = C.estimateElo(rev.moves.filter(m => m.mover === rec.me)), eOpp = C.estimateElo(rev.moves.filter(m => m.mover === foe));
  rec.est = { [rec.me]: eMe && eMe.elo, [foe]: eOpp && eOpp.elo }; persist();
  screen(`<div class="top"><button class="back" data-go="#/review" aria-label="Back">‹</button><span class="ttl">Game review</span><span class="right">${rec.otb ? 'White vs Black' : `vs ${esc(rec.opp)}`}</span></div>
    <div class="page">
      ${coachBox(rc === 'win' ? 'wow' : rc === 'loss' ? 'think' : 'happy', sum.text.map(t => `<p>${t}</p>`).join(''), 'sc')}
      <div class="acc"><div class="me"><div class="ring" style="--p:${me.acc.toFixed(1)}"><strong>${me.acc.toFixed(1)}</strong></div><span>${rec.otb ? 'White' : 'Your accuracy'}</span><em class="est">Played like <b>${C.eloText(eMe)}</b></em></div><div><div class="ring" style="--p:${opp.acc.toFixed(1)};--rc:#9aa3b2"><strong>${opp.acc.toFixed(1)}</strong></div><span>${esc(rec.opp)}</span><em class="est">Played like <b>${C.eloText(eOpp)}</b></em></div></div>
      ${eMe && eMe.rough ? '<p class="muted small note">Short game – the rating guess is rough.</p>' : ''}
      <p class="muted small">Your winning chances during the game. Tap to jump there.</p>
      ${graphSvg()}
      <table class="counts"><tr><td>You</td><td></td><td>${esc(rec.opp)}</td></tr>
        ${Object.keys(C.CLASSES).map(k => `<tr><td>${me.n[k]}</td><td>${clsIcon(k, 20)}<span style="color:${CLS_COLOR[k]}">${C.CLASSES[k].label}</span></td><td>${opp.n[k]}</td></tr>`).join('')}</table>
      ${moments.length ? `<p class="field">Key moments</p><div class="moments">${moments.map(x => `<button class="moment" data-act="jump" data-id="${x.i + 1}">${clsIcon(x.m.cls, 22)}<b>${Math.floor(x.i / 2) + 1}${x.m.mover === 'w' ? '.' : '…'}${x.m.san}</b><span>${C.CLASSES[x.m.cls].label}</span><em>›</em></button>`).join('')}</div>` : ''}
      <div style="height:16px"></div>
      <button class="btn" data-act="walk">Go through the game</button>
    </div>`, null);
  $('#view').classList.add('pad');
  const first = rec.result === '*' || rec.otb ? S.review.open : rc === 'win' ? S.review.win : rc === 'loss' ? S.review.loss : S.review.draw;
  coachSet($('#sc'), rc === 'win' ? 'wow' : 'think', $('#sc .bubble').innerHTML, { speak: true, say: [first, moments.length ? S.review.keys : S.review.clean] });
  ACT.walk = () => { V.start = 0; go(`#/review/${rec.id}/moves`); };
  ACT.jump = el => { V.start = +el.dataset.id; go(`#/review/${rec.id}/moves`); };
  ACT.graph = (el, ev) => { const b = el.getBoundingClientRect(); V.start = Math.round((ev.clientX - b.left) / b.width * rev.moves.length); go(`#/review/${rec.id}/moves`); };
}

/* ---------------- walkthrough ---------------- */
function viewStepper() {
  const { rec, rev } = V;
  screen(boardShell({ back: `#/review/${rec.id}`, title: 'Game review', cls: 'scr-review' }), null);
  V.mode = 'view'; V.lineTok = 0;
  V.board = createBoard($('#board'), {
    movesFrom(sq) {
      if (V.mode !== 'retry' || V.retryBusy) return [];
      const g = new Chess(rev.moves[V.idx - 1].fen), pc = g.get(sq);
      return pc && pc.color === g.turn() ? [...new Set(g.moves({ square: sq, verbose: true }).map(m => m.to))] : [];
    },
    onMove: retryMove
  });
  onLeave(() => { V.lineTok++; try { engine().cancel('review'); } catch (e) { /* ignore */ } });
  $('.board-wrap').insertAdjacentHTML('afterbegin', `<div class="vbar ${rec.me === 'b' ? 'flip' : ''}"><i id="evi"></i><span id="evt"></span></div>`);
  $('#below').innerHTML = `<div class="moves" id="moves">${rev.moves.map((m, i) => `<button class="mv" data-act="ply" data-id="${i + 1}">${m.mover === 'w' ? `<u>${Math.floor(i / 2) + 1}.</u>` : ''}${m.san}${m.cls !== 'book' && m.cls !== 'good' && m.cls !== 'excellent' ? clsIcon(m.cls, 14) : ''}</button>`).join('')}</div>${coachBox('happy', '', 'rc')}`;
  ACT.prev = () => showPly(V.idx - 1);
  ACT.nextply = () => showPly(V.idx + 1);
  ACT.ply = el => showPly(+el.dataset.id);
  ACT.nextkey = () => {
    const k = rev.moves.findIndex((m, i) => i + 1 > V.idx && m.mover === rec.me && KEYS.includes(m.cls));
    if (k > -1) showPly(k + 1);
    else coachSet($('#rc'), 'happy', 'No more big moments from you after this point.', { speak: true, say: [S.review.noMore] });
  };
  ACT.bestline = showBestLine;
  ACT.retry = startRetry;
  ACT.back = () => { const i = V.idx; V.idx = -1; V.mode = 'view'; V.lineTok++; showPly(i, false); };
  ACT.showme = () => { const m = rev.moves[V.idx - 1]; V.board.patchMarks({ arrows: [[m.bestPv[0].slice(0, 2), m.bestPv[0].slice(2, 4), 'best']] }); coachSet($('#rc'), 'happy', `My choice was <b>${C.sanOf(m.fen, m.bestPv[0])}</b>.${row(['back', 'Back to the game'])}`, { speak: true, say: [S.review.mine] }); };
  const start = V.start || 0; V.start = 0; V.idx = -1;
  showPly(start, false);
}

const row = (...btns) => `<div class="row">${btns.map(([act, label, go]) => `<button ${go ? 'class="go"' : ''} data-act="${act}">${label}</button>`).join('')}</div>`;

function evalBar(s) {
  const w = C.winFor('w', s.cp);
  $('#evi').style.height = w + '%';
  const t = $('#evt'); t.textContent = C.evalText(s).replace(/^[+−]/, ''); t.className = s.cp >= 0 ? 'w' : 'b';
}

function actionsView() {
  $('#actions').innerHTML = `<button class="btn sec fit" data-act="prev" aria-label="Previous move">◀</button><button class="btn" data-act="nextply">Next ▶</button><button class="btn sec fit" data-act="nextkey" aria-label="Next key moment">⏭</button>`;
}

function showPly(i, animate = true) {
  const { rec, rev } = V, n = rev.moves.length;
  i = Math.max(0, Math.min(n, i));
  if (i === V.idx && V.mode === 'view') return;
  const fwd = i === V.idx + 1;
  V.idx = i; V.mode = 'view'; V.lineTok++;
  const m = i ? rev.moves[i - 1] : null;
  const g = new Chess(m ? m.fen : rev.fens[0]);
  if (m) g.move(C.uciObj(m.uci));
  V.board.setPosition(g.board(), { animate, flipped: rec.me === 'b' });
  const marks = { check: kingInCheck(g) };
  if (m) {
    marks.last = [m.from, m.to];
    marks.badge = { sq: m.to, cls: m.cls };
    const bu = m.bestPv && m.bestPv[0];
    if (bu && bu !== m.uci && m.cls !== 'book' && !['best', 'great', 'brilliant'].includes(m.cls)) marks.arrows = [[bu.slice(0, 2), bu.slice(2, 4), 'best']];
    if (fwd && animate) { const mv = new Chess(m.fen).move(C.uciObj(m.uci)); moveSound(mv, g, m.mover === rec.me); }
  }
  V.board.setMarks(marks);
  evalBar(m ? m.played : (rev.moves[0] ? rev.moves[0].best : { cp: 0 }));
  $('#pright').textContent = i ? `Move ${Math.ceil(i / 2)} of ${Math.ceil(n / 2)}` : 'Start';
  document.querySelectorAll('#moves .mv').forEach((el, k) => el.classList.toggle('on', k === i - 1));
  const cur = document.querySelector('#moves .mv.on');
  if (cur) cur.scrollIntoView({ inline: 'center', block: 'nearest', behavior: animate ? 'smooth' : 'auto' });
  actionsView();
  let html, mood = 'happy', speak = 'minor', sayLines = [S.review.start];
  if (!m) html = `${rev.opening ? `This was the <b>${rev.opening}</b>. ` : ''}Tap <b>Next</b> to step through. The green arrow shows the move I would have played.`;
  else {
    const mine = rec.otb || m.mover === rec.me;
    const P = mine ? C.persp(true, 'you', rec.otb ? (m.mover === 'w' ? 'Black' : 'White') : rec.opp) : C.persp(false, rec.opp === 'your opponent' ? 'your opponent' : rec.opp);
    let openingName = '';
    if (m.cls === 'book') {
      const a = C.opening(rec.sans.slice(0, i)).name, b = C.opening(rec.sans.slice(0, i - 1)).name;
      if (a && a !== b) openingName = a;
    }
    const ex = C.explain(m, P, { prevInfo: rev.moves[i - 2], openingName });
    const text = ex.text; sayLines = ex.say;
    mood = !C.BAD.includes(m.cls) ? (['brilliant', 'great'].includes(m.cls) ? 'wow' : 'happy') : mine ? 'oops' : 'think';
    const who = rec.otb ? ` <span class="who">${m.mover === 'w' ? 'White' : 'Black'}</span>` : mine ? '' : ` <span class="who">${esc(rec.opp === 'your opponent' ? 'opponent' : rec.opp)}</span>`;
    const btns = [];
    const bu = m.bestPv && m.bestPv[0];
    if (bu && bu !== m.uci && m.cls !== 'book' && m.cls !== 'best') btns.push(['bestline', '▶ Best line']);
    if (mine && C.BAD.includes(m.cls)) btns.push(['retry', '↺ Retry', true]);
    html = `${clsTag(m.cls)}${who} <b>${Math.ceil(i / 2)}${m.mover === 'w' ? '.' : '…'}${m.san}</b> ${text}${i === n && g.isGameOver() && !g.isCheckmate() ? ' <b>Draw.</b>' : ''}${btns.length ? row(...btns) : ''}`;
    if (KEYS.includes(m.cls) || (mine && m.cls === 'inaccuracy')) speak = true;
  }
  coachSet($('#rc'), mood, html, { speak, say: sayLines });
}

async function showBestLine() {
  const { rec, rev } = V, m = rev.moves[V.idx - 1];
  if (!m || !m.bestPv) return;
  const tok = ++V.lineTok; V.mode = 'line';
  const g = new Chess(m.fen);
  V.board.setPosition(g.board(), { animate: true, flipped: rec.me === 'b' });
  V.board.setMarks({});
  const line = C.fmtLine(m.fen, m.bestPv, 6);
  coachSet($('#rc'), 'happy', `The better line: <b>${line}</b>${row(['back', 'Back to the game', true])}`, { speak: true, say: [S.review.line] });
  $('#actions').innerHTML = `<button class="btn sec" data-act="back">Back to the game</button>`;
  await sleep(600);
  for (const u of m.bestPv.slice(0, 6)) {
    if (tok !== V.lineTok) return;
    let mv; try { mv = g.move(C.uciObj(u)); } catch (e) { break; }
    moveSound(mv, g, mv.color === rec.me);
    V.board.setPosition(g.board());
    V.board.setMarks({ last: [mv.from, mv.to], check: kingInCheck(g), arrows: [[mv.from, mv.to, 'best']] });
    await sleep(900);
  }
}

function startRetry() {
  const { rec, rev } = V, m = rev.moves[V.idx - 1];
  V.mode = 'retry'; V.retryBusy = false; V.retryTries = 0; V.lineTok++;
  const g = new Chess(m.fen);
  V.board.setPosition(g.board(), { animate: true, flipped: rec.me === 'b' });
  V.board.setMarks({});
  coachSet($('#rc'), 'think', `In the game you played <b>${m.san}</b>. Find a better move.${row(['back', 'Back'])}`, { speak: true, say: [S.review.retry] });
  $('#actions').innerHTML = `<button class="btn sec" data-act="back">Back to the game</button>`;
}

async function retryMove(from, to) {
  const { rev } = V, m = rev.moves[V.idx - 1];
  const g = new Chess(m.fen);
  let mv; try { mv = g.move({ from, to, promotion: 'q' }); } catch (e) { return; }
  const uci = mv.from + mv.to + (mv.promotion || '');
  moveSound(mv, g, true);
  V.board.setPosition(g.board());
  V.board.setMarks({ last: [mv.from, mv.to], check: kingInCheck(g) });
  if (uci === m.uci) {
    coachSet($('#rc'), 'think', `That’s the move from the game. Try something else.${row(['back', 'Back'])}`, { speak: true, say: [S.review.same] });
    setTimeout(() => { if (V.mode === 'retry') { V.board.setPosition(new Chess(m.fen).board()); V.board.setMarks({}); } }, 900);
    return;
  }
  V.retryBusy = true;
  coachSet($('#rc'), 'think', '<span class="dotsanim">Let me check</span>', { speak: false });
  let info = null;
  try { info = await C.gradeMove(engine(), m.fen, uci, { tag: 'review', noVerify: true }); } catch (e) { /* ignore */ }
  V.retryBusy = false;
  if (V.mode !== 'retry' || rev.moves[V.idx - 1] !== m) return;
  if (!info) { coachSet($('#rc'), 'oops', 'My engine isn’t ready – try again in a moment.', { speak: false }); return; }
  V.board.patchMarks({ badge: { sq: mv.to, cls: info.cls } });
  const ok = ['brilliant', 'great', 'best', 'excellent', 'good', 'book'].includes(info.cls);
  if (ok) {
    play('correct');
    coachSet($('#rc'), 'wow', `${clsTag(info.cls)} Yes! ${C.describe(info, C.persp(true, 'you', V.rec.opp))}${row(['back', 'Back to the game', true])}`, { speak: true, say: [S.review.yes] });
  } else {
    play('wrong');
    V.retryTries++;
    const txt = C.describe(info, C.persp(true, 'you', V.rec.opp), { hideBest: true });
    coachSet($('#rc'), 'oops', `${clsTag(info.cls)} ${txt} Try again.${row(...[V.retryTries >= 2 && ['showme', 'Show me'], ['back', 'Back']].filter(Boolean))}`, { speak: true, say: [S.review.notQuite] });
    setTimeout(() => { if (V.mode === 'retry') { V.board.setPosition(new Chess(m.fen).board()); V.board.setMarks({}); } }, 1300);
  }
}

export function reviewKeys(e) {
  if (!V || !$('#moves') || V.mode !== 'view') return;
  if (e.key === 'ArrowRight') showPly(V.idx + 1);
  if (e.key === 'ArrowLeft') showPly(V.idx - 1);
}
