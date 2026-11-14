// Learn tab: course home, lesson intro, lesson player, result.
import { Chess } from './chess.js';
import { COURSE } from './course.js';
import { createBoard, pieceSvg } from './board.js';
import { engine } from './engine.js';
import { play, moveSound } from './sound.js';
import { say, voice } from './voice.js';
import { S } from './speech.js';
import * as C from './coach.js';
import { confetti } from './fx.js';
import { store, persist, $, esc, sleep, starStr, ACT, screen, go, owl, coachBox, coachSet, boardShell, kingInCheck, moveLabel } from './ui.js';

export const LESSONS = COURSE.flatMap(u => u.lessons.map(l => ({ ...l, unit: u })));
export const byId = id => LESSONS.find(l => l.id === id);
const starsOf = id => store.stars[id] || 0;

/* ---------------- home ---------------- */
export function viewHome() {
  const total = LESSONS.length * 3, got = LESSONS.reduce((s, l) => s + starsOf(l.id), 0);
  const next = LESSONS.find(l => !starsOf(l.id)) || LESSONS.find(l => starsOf(l.id) < 3);
  const hello = !got ? 'Hi, I’m Olly, your coach. We’ll learn the openings step by step – then you play real games and I’ll show you what to do better.'
    : next ? `Welcome back! Next up: <b>${esc(next.title)}</b>. Or play a game and we’ll review it together.`
    : 'Every lesson at three stars! Now play games and let me review them – that’s where the rating comes from.';
  let n = 0;
  screen(`
    <div class="home-top"><span class="brand">Knight School</span>
      <span class="pill">★ ${got}<span class="muted" style="font-weight:700">&nbsp;/ ${total}</span></span></div>
    <div class="home-coach">${coachBox('happy', hello, 'hc')}</div>
    ${store.current ? `<button class="btn col" data-go="#/game" style="margin-bottom:12px"><span>Continue your game</span><small>${store.current.otb ? 'Over the board' : 'vs ' + esc(store.current.levelName || 'bot')}, move ${Math.ceil((store.current.sans.length + 1) / 2)}</small></button>` : ''}
    ${next ? `<button class="btn ${store.current ? 'sec' : ''} col" data-go="#/l/${next.id}"><span>${got ? 'Continue learning' : 'Start the first lesson'}</span><small>${esc(next.title)}</small></button>` : `<button class="btn" data-go="#/play">Play a game</button>`}
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
    <p class="foot">Your progress is saved on this device.</p>`, 'learn');
}

/* ---------------- intro ---------------- */
export function viewIntro(lesson) {
  let buttons;
  if (!lesson.parts.length) buttons = `<button class="btn" data-act="read">Got it</button>`;
  else if (lesson.puzzle) buttons = `<button class="btn col" data-go="#/l/${lesson.id}/practice"><span>Solve the puzzles</span><small>${lesson.parts.length} positions</small></button>`;
  else buttons = `<button class="btn col" data-go="#/l/${lesson.id}/learn"><span>Learn it</span><small>I show and explain every move</small></button>
      <button class="btn sec col" data-go="#/l/${lesson.id}/practice"><span>Practice</span><small>Play it from memory</small></button>`;
  screen(`
    <div class="top"><button class="back" data-go="#/" aria-label="Back">‹</button><span class="ttl muted">${esc(lesson.unit.title)}</span><span class="right stars">${starStr(starsOf(lesson.id))}</span></div>
    <div class="page">
      <h1>${esc(lesson.title)}</h1><p class="sub">${esc(lesson.sub)}</p>
      <div style="margin-bottom:18px">${coachBox('happy', lesson.intro.map(p => `<p>${p}</p>`).join(''), 'ic')}</div>
      <div class="stack">${buttons}</div>
    </div>`, null);
  $('#view').classList.add('pad');
  coachSet($('#ic'), 'happy', $('#ic .bubble').innerHTML, { speak: true, say: lesson.intro });
  ACT.read = () => { store.stars[lesson.id] = 3; persist(); go('#/'); };
}

/* ---------------- lesson player ---------------- */
let L = null;
export function stopLesson() { if (L) { clearTimeout(L.timer); L.dead = true; L = null; } }

export function startLesson(lesson, mode) {
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
  $('#below').innerHTML = coachBox('happy', '', 'lc');
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
  if (part.prompt) L.lines.push({ html: esc(part.prompt), cls: 'ask', say: [part.prompt] });
  drawLesson(true);
  advance();
}

async function advance() {
  const me = L;
  const { part, game } = L;
  if (L.idx >= part.moves.length) {
    L.partDone = true; L.exp = null; L.mood = 'wow';
    play('correct');
    const last = L.pi === L.lesson.parts.length - 1;
    L.lines = [{ html: last ? 'That’s it – well done!' : 'Nice. Ready for the next one?', cls: 'ask', say: [last ? S.lesson.done : S.lesson.next] }];
    return drawLesson(true);
  }
  const [san, note] = part.moves[L.idx];
  if (game.turn() !== part.side) {
    L.busy = true; drawLesson(false);
    // let the coach finish the sentence before the opponent replies
    await Promise.race([L.speech || Promise.resolve(), sleep(7000)]);
    await sleep(L.idx === 0 ? 450 : 650);
    if (L !== me || me.dead) return;
    const lab = moveLabel(game), m = game.move(san);
    moveSound(m, game, false);
    L.board.setPosition(game.board());
    L.board.setMarks({ last: [m.from, m.to], check: kingInCheck(game) });
    L.lines = L.lines.filter(l => l.cls !== 'ask');
    L.lines.push({ html: `<b>${lab}${m.san}</b> ${note}`, speak: !!note, say: [note] });
    L.idx++; L.busy = false;
    return advance();
  }
  const m = game.move(san); game.undo();
  L.exp = { from: m.from, to: m.to, san: m.san, note, uci: m.from + m.to + (m.promotion || '') };
  L.tries = 0; L.hintLvl = 0; L.mood = 'happy';
  if (L.mode === 'learn') {
    L.board.patchMarks({ arrows: [[m.from, m.to, 'hint']] });
    L.lines.push({ html: `Play <b>${m.san}</b>. ${note}`, cls: 'ask', say: [`Play ${m.san}.`, note] });
  } else if (!L.lines.some(l => l.cls === 'ask')) {
    L.lines.push({ html: L.idx < 2 && !part.fen ? 'Your move. Do you remember how it starts?' : 'Your move.', cls: 'ask', quiet: true });
  }
  drawLesson(true);
}

function lessonMove(from, to) {
  const { game, exp } = L;
  if (!exp) return;
  if (from === exp.from && to === exp.to) {
    const lab = moveLabel(game), m = game.move(exp.san);
    L.fb++; L.exp = null; L.mood = 'happy';
    moveSound(m, game, true);
    L.board.setPosition(game.board());
    L.board.setMarks({ last: [m.from, m.to], check: kingInCheck(game) });
    L.lines = [{ html: `<b>${lab}${m.san}</b> ${exp.note || (L.mode === 'practice' ? 'Correct!' : '')}`, cls: 'ok', speak: L.mode === 'practice' || !!exp.note, say: [exp.note || S.lesson.correct] }];
    if (L.mode === 'learn') L.lines[0].speak = false; // already explained before the move
    L.idx++;
    drawLesson(true);
    return advance();
  }
  // wrong move
  play('illegal');
  if (navigator.vibrate) navigator.vibrate(50);
  L.board.setPosition(game.board());
  L.board.patchMarks({ wrong: to });
  setTimeout(() => { if (L && L.board) L.board.patchMarks({ wrong: null }); }, 450);
  L.mood = 'oops';
  const tmp = new Chess(game.fen());
  let mv; try { mv = tmp.move({ from, to, promotion: 'q' }); } catch (e) { return; }
  if (L.mode === 'learn') {
    setAsk(`<b>${mv.san}</b> isn’t the move for this lesson. Follow the blue arrow: <b>${exp.san}</b>.`, false, [S.lesson.wrongLearn]);
    return drawLesson(true);
  }
  L.mistakes++; L.tries++;
  setAsk(`<b>${mv.san}</b>? <span class="dotsanim">Let me look</span>`, true);
  drawLesson(false);
  lessonFeedback(mv);
}

function setAsk(html, quiet, sayLines) { L.lines = L.lines.filter(l => l.cls !== 'ask'); L.lines.push({ html, cls: 'ask', quiet, say: sayLines }); }

async function lessonFeedback(mv) {
  const tok = ++L.fb, exp = L.exp, fen = L.game.fen(), side = L.part.side, me = L;
  const uci = mv.from + mv.to + (mv.promotion || '');
  let text = `<b>${mv.san}</b> isn’t it.`, good = false, sayLines = [];
  try {
    const eng = engine();
    const work = (async () => {
      const info = await C.gradeMove(eng, fen, uci, { tag: 'lesson', noVerify: true });
      let expScore = info.bestPv[0] === exp.uci ? info.best : null;
      if (!expScore) {
        const r = await eng.analyse(fen, { depth: C.DEPTH, searchmoves: [exp.uci], tag: 'lesson' });
        expScore = r.lines[0] ? { cp: C.cpOf(r.lines[0]), mate: r.lines[0].mate ?? null } : info.best;
      }
      return { info, expScore };
    })();
    const res = await Promise.race([work, sleep(9000).then(() => null)]);
    if (res) {
      const { info, expScore } = res;
      const wP = C.winFor(side, info.played.cp), wE = C.winFor(side, expScore.cp);
      if (L.part.end === 'mate' && C.winFor(side, info.played.cp) > 99) {
        text = `<b>${mv.san}</b> also wins – but there’s a quicker way.`; good = true; sayLines = [S.lesson.quicker];
      } else if (wP >= wE - 3) {
        text = L.lesson.puzzle ? `<b>${mv.san}</b> is a good move, but there’s something even stronger.` : `<b>${mv.san}</b> is a fine move too – but in this lesson we’re learning a different one.`;
        good = true; sayLines = [L.lesson.puzzle ? S.lesson.stronger : S.lesson.fine];
      } else {
        const ex = C.explain(info, C.persp(true), { hideBest: true });
        text = `<b>${mv.san}</b>: ` + ex.text.replace(/^(Not the most accurate\.|This makes your position worse\.) ?/, '');
        sayLines = ex.say;
      }
    }
  } catch (e) { /* engine not available: keep the short text */ }
  if (!L || L !== me || tok !== L.fb || L.exp !== exp) return;
  let tail = ' Try again.', tailSay = S.lesson.tryAgain;
  if (L.tries >= 3) { L.hintLvl = 3; L.board.patchMarks({ arrows: [[exp.from, exp.to, 'hint']] }); tail = ` The move is <b>${exp.san}</b> – play it on the board.`; tailSay = S.lesson.showMove; }
  else if (L.tries === 2) { L.hintLvl = 2; L.board.patchMarks({ hint: [exp.from] }); tail = ' Hint: move the piece I marked.'; tailSay = S.lesson.marked; }
  L.mood = good ? 'think' : 'oops';
  setAsk(text + tail, false, [...sayLines, tailSay]);
  drawLesson(true);
}

function lessonHint() {
  if (!L.exp || L.busy) return;
  L.reveals++; L.fb++; L.mood = 'think';
  const e = L.exp, piece = C.NAME[new Chess(L.game.fen()).get(e.from).type];
  const noteOk = e.note && !e.note.includes(e.san.replace(/[+#]/g, ''));
  const t = new Chess(L.game.fen()).get(e.from).type;
  if (L.hintLvl === 0 && noteOk) { L.hintLvl = 1; setAsk(`Think about this: ${e.note}`, false, [e.note]); }
  else if (L.hintLvl <= 1) { L.hintLvl = 2; L.board.patchMarks({ hint: [e.from] }); setAsk(`Move your ${piece} – I marked it.`, false, [S.lesson.pieceHint(t)]); }
  else { L.hintLvl = 3; L.board.patchMarks({ arrows: [[e.from, e.to, 'hint']] }); setAsk(`The move is <b>${e.san}</b>.`, false, [S.lesson.theMove]); }
  drawLesson(true);
}

function lessonNext() {
  if (L.pi + 1 < L.lesson.parts.length) return startPart(L.pi + 1);
  const { lesson, mode, mistakes, reveals } = L, slips = mistakes + reveals;
  const stars = mode === 'learn' ? 1 : lesson.puzzle ? (slips === 0 ? 3 : slips <= 2 ? 2 : 1) : (slips === 0 ? 3 : 2);
  store.stars[lesson.id] = Math.max(starsOf(lesson.id), stars); persist();
  viewResult(lesson, mode, stars, slips);
}

function drawLesson(speak) {
  const { lesson, part, pi } = L, n = lesson.parts.length;
  $('#ptitle').textContent = part.title;
  $('#pright').textContent = `You play ${part.side === 'w' ? 'White' : 'Black'}`;
  $('#above').innerHTML = n > 1 ? `<div class="dots">${lesson.parts.map((_, i) => `<i class="${i < pi || (i === pi && L.partDone) ? 'on' : i === pi ? 'now' : ''}"></i>`).join('')}</div>` : '';
  const lines = L.lines.slice(-2);
  const html = lines.map((l, i) => `<p class="${i < lines.length - 1 && l.cls !== 'ask' ? 'old' : ''} ${l.cls || ''}">${l.html}</p>`).join('');
  const last = lines[lines.length - 1];
  const doSpeak = speak && last && !last.quiet && last.speak !== false;
  L.speech = coachSet($('#lc'), L.mood, html, { speak: !!doSpeak, say: last && (last.say || [last.html]) });
  $('#actions').innerHTML = L.partDone
    ? `<button class="btn sec fit" data-act="restart" aria-label="Restart">↺</button><button class="btn" data-act="next">${pi + 1 < n ? 'Next' : 'Finish'}</button>`
    : `<button class="btn sec fit" data-act="restart">↺ Restart</button>` + (L.mode === 'practice' ? `<button class="btn sec" data-act="hint">💡 ${L.hintLvl ? 'More help' : 'Hint'}</button>` : '');
}

function viewResult(lesson, mode, stars, slips) {
  L = null;
  const next = LESSONS[LESSONS.findIndex(l => l.id === lesson.id) + 1];
  let head, text, mood = 'happy';
  let line;
  if (mode === 'learn') { head = 'Lesson learned'; text = 'Now play it from memory to earn all three stars.'; line = S.lesson.learned; }
  else if (stars === 3) { head = 'Perfect!'; text = 'No mistakes, no hints. This one is yours.'; mood = 'wow'; play('win'); line = S.lesson.perfect; }
  else { head = 'Well done'; text = `${slips} slip${slips === 1 ? '' : 's'}. Do it again without mistakes or hints for three stars.`; play('correct'); line = S.lesson.wellDone; }
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
  say(line);
  if (stars === 3 && mode !== 'learn') setTimeout(() => confetti($('.result .big')), 200);
  history.replaceState(null, '', `#/l/${lesson.id}/done`);
}
