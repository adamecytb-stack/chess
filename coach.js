// The coach's brain: grades moves from engine evaluations and explains them in plain words.
import { Chess } from './chess.js';
import { COURSE } from './course.js';

export const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
export const CLASSES = {
  book: { label: 'Book', sym: '📖' },
  best: { label: 'Best', sym: '★' },
  excellent: { label: 'Excellent', sym: '!' },
  good: { label: 'Good', sym: '✓' },
  inaccuracy: { label: 'Inaccuracy', sym: '?!' },
  mistake: { label: 'Mistake', sym: '?' },
  blunder: { label: 'Blunder', sym: '??' }
};
export const BAD = ['inaccuracy', 'mistake', 'blunder'];

export const uciObj = u => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
export const cpOf = l => l.mate != null ? Math.sign(l.mate || 1) * (10000 - Math.min(Math.abs(l.mate), 50) * 10) : Math.max(-9000, Math.min(9000, l.cp || 0));
const winW = cp => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);        // White's winning chances in %
export const winFor = (color, cp) => color === 'w' ? winW(cp) : 100 - winW(cp);
export function evalText(p) {
  if (p.mate != null) return (p.mate > 0 ? '+' : '−') + 'M' + Math.abs(p.mate);
  if (p.terminal) return p.cp > 0 ? '1-0' : p.cp < 0 ? '0-1' : '½';
  const v = p.cp / 100;
  return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1);
}

/* ---------------- grading ---------------- */
export function classify(color, before, after, uci, isBook, deliveredMate) {
  const drop = Math.max(0, winFor(color, before.cp) - winFor(color, after.cp));
  const acc = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1669));
  let cls;
  if (deliveredMate) cls = 'best';
  else if (isBook && drop < 10) cls = 'book';
  else if (uci === before.best || drop < 0.3) cls = 'best';
  else if (drop < 2) cls = 'excellent';
  else if (drop < 5) cls = 'good';
  else if (drop < 10) cls = 'inaccuracy';
  else if (drop < 20) cls = 'mistake';
  else cls = 'blunder';
  return { cls, acc: cls === 'book' || cls === 'best' ? 100 : acc, drop };
}

/* ---------------- small board helpers ---------------- */
function counts(g) {
  const c = { w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } };
  for (const row of g.board()) for (const s of row) if (s) c[s.color][s.type]++;
  return c;
}
const total = (c, color) => 'pnbrq'.split('').reduce((s, t) => s + c[color][t] * VAL[t], 0);
const balance = (c, color) => total(c, color) - total(c, color === 'w' ? 'b' : 'w');
function lostPieces(c0, c1, color) {
  const out = [];
  for (const t of 'qrbnp') { let d = c0[color][t] - c1[color][t]; while (d-- > 0) out.push(t); }
  return out;
}
function phrase(list) {
  if (!list.length) return '';
  const n = {}; list.forEach(t => { n[t] = (n[t] || 0) + 1; });
  const parts = Object.keys(n).sort((a, b) => VAL[b] - VAL[a]).slice(0, 2)
    .map(t => n[t] > 1 ? `${['', '', 'two', 'three', 'four'][n[t]] || n[t]} ${NAME[t]}s` : (t === 'q' ? 'the ' : 'a ') + NAME[t]);
  return parts.join(' and ');
}
// what `color` gives up between two piece counts, e.g. "a rook for a bishop"
function swingPhrase(c0, c1, color) {
  const mine = lostPieces(c0, c1, color), theirs = lostPieces(c0, c1, color === 'w' ? 'b' : 'w');
  if (!mine.length) return 'material';
  return theirs.length ? `${phrase(mine)} for ${phrase(theirs)}` : phrase(mine);
}

// Follow an engine line until the captures are over; return material change for `color`.
function follow(fen, ucis, color) {
  const g = new Chess(fen);
  const c0 = counts(g);
  let cEnd = c0, seenCapture = false, first = null, sans = [];
  for (let i = 0; i < Math.min(ucis.length, 9); i++) {
    let m;
    try { m = g.move(uciObj(ucis[i])); } catch (e) { break; }
    if (!first) first = m;
    if (m.captured || m.promotion) { seenCapture = true; }
    else if (seenCapture && !g.inCheck()) break;
    else if (!seenCapture && i >= 4) break;
    sans.push(m.san);
    cEnd = counts(g);
  }
  return { swing: seenCapture ? balance(cEnd, color) - balance(c0, color) : 0, c0, cEnd, first };
}

export function fmtLine(fen, ucis, max = 4) {
  const g = new Chess(fen); const out = [];
  for (const u of (ucis || []).slice(0, max)) {
    const num = g.moveNumber(), turn = g.turn(); let m;
    try { m = g.move(uciObj(u)); } catch (e) { break; }
    out.push((turn === 'w' ? num + '.' : out.length ? '' : num + '…') + m.san);
  }
  return out.join(' ');
}
export function sanOf(fen, uci) {
  try { return new Chess(fen).move(uciObj(uci)).san; } catch (e) { return ''; }
}

function forkTargets(g, sq) {
  const pc = g.get(sq); if (!pc) return [];
  const foe = pc.color === 'w' ? 'b' : 'w', out = [];
  for (const row of g.board()) for (const s of row) {
    if (!s || s.color !== foe) continue;
    if (!g.attackers(s.square, pc.color).includes(sq)) continue;
    if (s.type === 'k' || VAL[s.type] > VAL[pc.type] || g.attackers(s.square, foe).length === 0) out.push(s.type);
  }
  return out.sort((a, b) => (b === 'k') - (a === 'k') || VAL[b] - VAL[a]);
}

function nature(m, g0) {
  const home = m.color === 'w' ? '1' : '8';
  if (m.san.includes('#')) return 'mate';
  if (m.san.startsWith('O-O')) return 'castle';
  if (m.captured) return 'capture';
  if (m.san.includes('+')) return 'check';
  if ((m.piece === 'n' || m.piece === 'b') && m.from[1] === home && g0.moveNumber() <= 14) return 'develop';
  if (m.piece === 'p' && 'de'.includes(m.to[0]) && '45'.includes(m.to[1]) && g0.moveNumber() <= 12) return 'centre';
  if (m.piece === 'r') {
    let open = true;
    for (let r = 2; r <= 7; r++) { const s = g0.get(m.to[0] + r); if (s && s.type === 'p' && s.color === m.color) open = false; }
    if (open && m.from[0] !== m.to[0]) return 'rookfile';
  }
  return 'other';
}

/* ---------------- explanations ---------------- */
// ctx: { fen, played, best, pvBest, pvAfter, before:{cp,mate}, after:{cp,mate,terminal}, cls, opening, hideBest }
export function explain(ctx) {
  const g0 = new Chess(ctx.fen);
  const me = g0.turn(), foe = me === 'w' ? 'b' : 'w', sign = me === 'w' ? 1 : -1;
  const g1 = new Chess(ctx.fen);
  const m = g1.move(uciObj(ctx.played));
  const fenAfter = g1.fen();
  const bestSan = ctx.best ? sanOf(ctx.fen, ctx.best) : '';
  const better = ctx.hideBest || !bestSan || ctx.best === ctx.played ? '' : ` Better was <b>${bestSan}</b>.`;
  const out = (text, kind) => ({ text, bestSan, kind });
  const piece = NAME[m.piece];

  if (g1.isCheckmate()) return out('Checkmate! Nicely finished.', 'good');

  /* ----- good moves ----- */
  if (!BAD.includes(ctx.cls)) {
    if (ctx.cls === 'book') return out(`Book move${ctx.opening ? ` – this is the ${ctx.opening}` : ''}.`, 'good');
    const nat = nature(m, g0);
    if (ctx.cls === 'best') {
      const f = follow(fenAfter, ctx.pvAfter || [], me);
      const c1 = counts(g1), gained = balance(c1, me) - balance(counts(g0), me);
      if (nat === 'capture' && gained + f.swing >= 1) return out(`Best move – you win ${phrase(lostPieces(counts(g0), f.cEnd, foe)) || 'material'}.`, 'good');
      if (nat === 'castle') return out('Best move. Your king is safe and the rook joins the game.', 'good');
      if (nat === 'develop') return out('Best move – a new piece enters the game.', 'good');
      if (nat === 'centre') return out('Best move. You take space in the centre.', 'good');
      if (nat === 'check') return out('Best move, and with check.', 'good');
      if (nat === 'rookfile') return out('Best move – the rook takes the open file.', 'good');
      const t = forkTargets(g1, m.to);
      if (t.length >= 2 && !g1.attackers(m.to, foe).length) return out(`Best move – it attacks the ${NAME[t[0]]} and the ${NAME[t[1]]} at once.`, 'good');
      return out('Best move. Exactly what I would play.', 'good');
    }
    if (ctx.cls === 'excellent') return out(bestSan && !ctx.hideBest ? `Excellent move – about as strong as my top choice <b>${bestSan}</b>.` : 'Excellent move.', 'good');
    return out(bestSan && !ctx.hideBest ? `A good move. <b>${bestSan}</b> was a little more precise.` : 'A good, solid move.', 'good');
  }

  /* ----- bad moves ----- */
  const word = { inaccuracy: 'An inaccuracy.', mistake: 'A mistake.', blunder: 'A blunder.' }[ctx.cls];

  // allows mate
  if (ctx.after.mate != null && ctx.after.mate * sign < 0) {
    const n = Math.abs(ctx.after.mate);
    return out(`${word} This allows checkmate${n > 1 ? ' in ' + n : ''}: ${fmtLine(fenAfter, ctx.pvAfter, 5)}.${better}`, 'allowedMate');
  }
  // had mate
  if (ctx.before.mate != null && ctx.before.mate * sign > 0 && !(ctx.after.mate != null && ctx.after.mate * sign > 0)) {
    const n = Math.abs(ctx.before.mate);
    return out(ctx.hideBest ? 'There is a forced checkmate here. Look for checks!' :
      `You missed checkmate in ${n}: ${fmtLine(ctx.fen, ctx.pvBest, 5)}.`, 'missedMate');
  }

  const played = follow(fenAfter, ctx.pvAfter || [], me);
  const c0 = counts(g0), cNow = counts(g1);
  const swingPlayed = balance(cNow, me) - balance(c0, me) + played.swing;
  const bestF = follow(ctx.fen, ctx.pvBest && ctx.pvBest.length ? ctx.pvBest : (ctx.best ? [ctx.best] : []), me);
  const swingBest = bestF.swing;

  // loses material
  if (swingPlayed <= -1 && swingBest - swingPlayed >= 1) {
    const r = played.first;
    const loss = swingPhrase(c0, played.cEnd, me);
    const line = fmtLine(fenAfter, ctx.pvAfter, 3);
    if (r && r.captured) {
      const defended = g1.attackers(r.to, me).length > 0;
      if (r.to === m.to) {
        return out(defended
          ? `${word} Your ${piece} can be captured on ${m.to}: after ${line} you lose ${loss}.${better}`
          : `${word} You put your ${piece} on ${m.to} where nothing protects it – <b>${r.san}</b> just takes it.${better}`, 'hung');
      }
      return out(defended
        ? `${word} This lets <b>${r.san}</b> win material: after ${line} you lose ${loss}.${better}`
        : `${word} This leaves your ${NAME[r.captured]} on ${r.to} unprotected – <b>${r.san}</b> takes it for free.${better}`, 'hung');
    }
    if (r) {
      const gR = new Chess(fenAfter); gR.move(r.san);
      const t = forkTargets(gR, r.to);
      if (t.length >= 2) return out(`${word} Now <b>${r.san}</b> attacks your ${NAME[t[0]]} and your ${NAME[t[1]]} at the same time – you lose ${loss}.${better}`, 'tactic');
      return out(`${word} After <b>${r.san}</b> you cannot hold everything: ${line} and you lose ${loss}.${better}`, 'tactic');
    }
  }

  // missed a win of material
  if (swingBest >= 1 && swingBest - swingPlayed >= 1) {
    if (ctx.hideBest) return out('There is a tactic here that wins material. Look at checks and captures first.', 'missedTactic');
    const b = bestF.first;
    const gain = phrase(lostPieces(bestF.c0, bestF.cEnd, foe)) || 'material';
    if (b && b.captured && g0.attackers(b.to, foe).length === 0)
      return out(`You missed a free piece: the ${NAME[b.captured]} on ${b.to} was not protected. <b>${b.san}</b> simply takes it.`, 'missedTactic');
    if (b) {
      const gB = new Chess(ctx.fen); gB.move(b.san);
      const t = forkTargets(gB, b.to);
      if (t.length >= 2) return out(`You missed <b>${b.san}</b> – a fork that attacks the ${NAME[t[0]]} and the ${NAME[t[1]]} at once and wins ${gain}.`, 'missedTactic');
    }
    return out(`You missed a tactic: ${fmtLine(ctx.fen, ctx.pvBest, 5)} wins ${gain}.`, 'missedTactic');
  }

  // positional reasons
  const home = me === 'w' ? '1' : '8';
  const moveNo = g0.moveNumber();
  const minorsHome = g0.board().flat().filter(s => s && s.color === me && (s.type === 'n' || s.type === 'b') && s.square[1] === home).length;
  let why = '';
  if (moveNo <= 8 && m.piece === 'q' && minorsHome >= 2) why = 'The queen comes out too early – your opponent will develop pieces by chasing her.';
  else if (moveNo <= 12 && (m.piece === 'n' || m.piece === 'b') && m.from[1] !== home && !m.captured && minorsHome >= 1) why = 'You moved the same piece again while other pieces are still waiting at home.';
  else if (m.piece === 'k' && !m.san.startsWith('O-O') && g0.getCastlingRights(me) && (g0.getCastlingRights(me).k || g0.getCastlingRights(me).q) && !g0.inCheck()) why = 'Moving the king gives up the right to castle.';
  else if (moveNo <= 10 && m.piece === 'p' && 'ah'.includes(m.from[0]) && minorsHome >= 2) why = 'This pawn move does nothing for the centre or for your development.';
  else why = { inaccuracy: 'It gives away a little of your position.', mistake: 'It hands the advantage to your opponent.', blunder: 'It throws away a big part of your position.' }[ctx.cls];

  let tip = '';
  if (!ctx.hideBest && bestSan && bestF.first) {
    const nat = nature(bestF.first, g0);
    tip = {
      castle: ` <b>${bestSan}</b> would have brought your king to safety.`,
      develop: ` <b>${bestSan}</b> develops a new piece.`,
      centre: ` <b>${bestSan}</b> fights for the centre.`,
      capture: ` <b>${bestSan}</b> was the right capture.`,
      check: ` <b>${bestSan}</b> with check was stronger.`,
      rookfile: ` <b>${bestSan}</b> puts the rook on the open file.`,
      mate: ` <b>${bestSan}</b> was mate.`
    }[nat] || ` Stronger was <b>${bestSan}</b>.`;
    const reply = played.first ? ` Now ${fmtLine(fenAfter, ctx.pvAfter, 1)} is strong.` : '';
    if (ctx.cls !== 'inaccuracy') tip += reply;
  }
  return out(`${word} ${why}${tip}`, moveNo <= 10 ? 'opening' : 'positional');
}

/* ---------------- openings ---------------- */
const OPENINGS = [
  ['e4 e5', 'Open Game'], ['e4 e5 Nf3 Nc6', 'King’s Knight Opening'],
  ['e4 e5 Nf3 Nc6 Bc4', 'Italian Game'], ['e4 e5 Nf3 Nc6 Bc4 Bc5', 'Italian Game: Giuoco Piano'],
  ['e4 e5 Nf3 Nc6 Bc4 Bc5 c3', 'Giuoco Piano'], ['e4 e5 Nf3 Nc6 Bc4 Nf6', 'Two Knights Defence'],
  ['e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7', 'Fried Liver Attack'], ['e4 e5 Nf3 Nc6 Bc4 Bc5 b4', 'Evans Gambit'],
  ['e4 e5 Nf3 Nc6 Bb5', 'Ruy Lopez'], ['e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7', 'Ruy Lopez: Closed'],
  ['e4 e5 Nf3 Nc6 Bb5 Nf6', 'Ruy Lopez: Berlin Defence'], ['e4 e5 Nf3 Nc6 Bb5 a6 Bxc6', 'Ruy Lopez: Exchange'],
  ['e4 e5 Nf3 Nc6 d4', 'Scotch Game'], ['e4 e5 Nf3 Nc6 d4 exd4 Nxd4', 'Scotch Game'],
  ['e4 e5 Nf3 Nc6 Nc3', 'Three Knights Opening'], ['e4 e5 Nf3 Nc6 Nc3 Nf6', 'Four Knights Game'],
  ['e4 e5 Nf3 Nf6', 'Petrov’s Defence'], ['e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4', 'Petrov’s Defence'],
  ['e4 e5 Nf3 d6', 'Philidor Defence'], ['e4 e5 f4', 'King’s Gambit'], ['e4 e5 f4 exf4', 'King’s Gambit Accepted'],
  ['e4 e5 Nc3', 'Vienna Game'], ['e4 e5 Bc4', 'Bishop’s Opening'], ['e4 e5 Qh5', 'Wayward Queen Attack'], ['e4 e5 d4 exd4', 'Centre Game'],
  ['e4 c5', 'Sicilian Defence'], ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3', 'Sicilian: Open'],
  ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', 'Sicilian: Najdorf'], ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6', 'Sicilian: Dragon'],
  ['e4 c5 Nf3 Nc6 d4 cxd4 Nxd4', 'Sicilian: Open'], ['e4 c5 Nf3 e6 d4 cxd4 Nxd4', 'Sicilian: Open'],
  ['e4 c5 c3', 'Sicilian: Alapin'], ['e4 c5 Nc3', 'Sicilian: Closed'], ['e4 c5 d4 cxd4 c3', 'Smith-Morra Gambit'],
  ['e4 e6', 'French Defence'], ['e4 e6 d4 d5 exd5', 'French: Exchange'], ['e4 e6 d4 d5 e5', 'French: Advance'],
  ['e4 e6 d4 d5 Nc3', 'French Defence'], ['e4 e6 d4 d5 Nd2', 'French: Tarrasch'],
  ['e4 c6', 'Caro-Kann Defence'], ['e4 c6 d4 d5 exd5 cxd5', 'Caro-Kann: Exchange'], ['e4 c6 d4 d5 e5', 'Caro-Kann: Advance'],
  ['e4 c6 d4 d5 Nc3 dxe4 Nxe4', 'Caro-Kann: Classical'],
  ['e4 d5', 'Scandinavian Defence'], ['e4 d5 exd5 Qxd5 Nc3 Qa5', 'Scandinavian Defence'], ['e4 d5 exd5 Nf6', 'Scandinavian: Modern'],
  ['e4 d6', 'Pirc Defence'], ['e4 d6 d4 Nf6 Nc3 g6', 'Pirc Defence'], ['e4 g6', 'Modern Defence'], ['e4 Nf6', 'Alekhine’s Defence'],
  ['e4 b6', 'Owen’s Defence'], ['e4 Nc6', 'Nimzowitsch Defence'],
  ['d4 d5', 'Queen’s Pawn Game'], ['d4 d5 c4', 'Queen’s Gambit'], ['d4 d5 c4 e6', 'Queen’s Gambit Declined'],
  ['d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7', 'Queen’s Gambit Declined'], ['d4 d5 c4 dxc4', 'Queen’s Gambit Accepted'],
  ['d4 d5 c4 c6', 'Slav Defence'], ['d4 d5 c4 c6 Nf3 Nf6 Nc3 e6', 'Semi-Slav Defence'],
  ['d4 d5 Bf4', 'London System'], ['d4 Nf6 Bf4', 'London System'], ['d4 d5 Nf3 Nf6 Bf4', 'London System'],
  ['d4 Nf6 c4 g6', 'King’s Indian Defence'], ['d4 Nf6 c4 g6 Nc3 Bg7 e4 d6', 'King’s Indian Defence'],
  ['d4 Nf6 c4 g6 Nc3 d5', 'Grünfeld Defence'], ['d4 Nf6 c4 e6 Nc3 Bb4', 'Nimzo-Indian Defence'],
  ['d4 Nf6 c4 e6 Nf3 b6', 'Queen’s Indian Defence'], ['d4 Nf6 c4 e6', 'Indian Defence'], ['d4 Nf6 c4 c5', 'Benoni Defence'],
  ['d4 Nf6', 'Indian Defence'], ['d4 f5', 'Dutch Defence'], ['d4 e5', 'Englund Gambit'], ['d4 d5 e4', 'Blackmar-Diemer Gambit'],
  ['c4', 'English Opening'], ['c4 e5', 'English Opening'], ['Nf3', 'Réti Opening'], ['Nf3 d5 c4', 'Réti Opening'],
  ['f4', 'Bird’s Opening'], ['b3', 'Nimzo-Larsen Attack'], ['g3', 'King’s Fianchetto Opening'], ['e4', 'King’s Pawn Opening'], ['d4', 'Queen’s Pawn Opening']
];
const nameAt = new Map(), bookSet = new Set();
const addBook = (sans) => { for (let i = 1; i <= sans.length; i++) bookSet.add(sans.slice(0, i).join(' ')); };
for (const [line, name] of OPENINGS) { nameAt.set(line, name); addBook(line.split(' ')); }
for (const u of COURSE) for (const l of u.lessons) for (const p of l.parts) if (!p.fen) addBook(p.moves.map(m => m[0].replace(/[+#]/g, '')));

// -> { name, plies } : opening name and how many half-moves were still theory
export function opening(sans) {
  const clean = sans.map(s => s.replace(/[+#]/g, ''));
  let name = '', plies = 0;
  for (let i = 1; i <= clean.length && i <= 30; i++) {
    const key = clean.slice(0, i).join(' ');
    if (!bookSet.has(key)) break;
    plies = i;
    if (nameAt.has(key)) name = nameAt.get(key);
  }
  return { name, plies };
}

/* ---------------- full game review ---------------- */
function terminal(g) {
  if (g.isCheckmate()) return { cp: g.turn() === 'w' ? -10000 : 10000, mate: null, terminal: true, pv: [], best: null };
  return { cp: 0, mate: null, terminal: true, pv: [], best: null };
}

export async function reviewGame(eng, sans, startFen, onProgress, cancelled) {
  const g = startFen ? new Chess(startFen) : new Chess();
  const fens = [g.fen()], mvs = [];
  for (const s of sans) { mvs.push(g.move(s)); fens.push(g.fen()); }
  const pos = [];
  for (let i = 0; i < fens.length; i++) {
    const t = new Chess(fens[i]);
    if (t.isGameOver()) pos.push(terminal(t));
    else {
      const r = await eng.analyse(fens[i], { depth: 11, movetime: 1200 });
      const l = r.lines[0] || { cp: 0, pv: [] };
      pos.push({ cp: cpOf(l), mate: l.mate ?? null, best: r.best, pv: l.pv || [] });
    }
    if (cancelled && cancelled()) return null;
    onProgress && onProgress((i + 1) / fens.length);
  }
  const op = startFen ? { name: '', plies: 0 } : opening(sans);
  const moves = mvs.map((m, i) => {
    const before = pos[i], after = pos[i + 1];
    const uci = m.from + m.to + (m.promotion || '');
    const mated = !!after.terminal && Math.abs(after.cp) === 10000;
    const { cls, acc, drop } = classify(m.color, before, after, uci, i < op.plies, mated);
    const ex = explain({ fen: fens[i], played: uci, best: before.best, pvBest: before.pv, pvAfter: after.pv, before, after, cls, opening: op.name });
    return { san: m.san, uci, from: m.from, to: m.to, color: m.color, cls, acc, drop, text: ex.text, kind: ex.kind, bestSan: ex.bestSan, bestUci: before.best, no: Math.floor(i / 2) + 1 };
  });
  return { fens, pos, moves, opening: op.name };
}

export function summarize(rev, me, result) {
  const stat = c => {
    const ms = rev.moves.filter(m => m.color === c);
    const n = {}; Object.keys(CLASSES).forEach(k => { n[k] = ms.filter(m => m.cls === k).length; });
    return { acc: ms.length ? ms.reduce((s, m) => s + m.acc, 0) / ms.length : 0, n };
  };
  const s = { w: stat('w'), b: stat('b') };
  const mine = rev.moves.map((m, i) => ({ ...m, i })).filter(m => m.color === me);
  const bad = mine.filter(m => m.cls === 'blunder' || m.cls === 'mistake');
  const worst = [...bad].sort((a, b) => b.drop - a.drop)[0];
  const text = [];
  const you = me === 'w' ? '1-0' : '0-1';
  text.push(result === you ? 'Well played – that is a win!' : result === '1/2-1/2' ? 'A draw. Let’s see where either side could have done more.' : result === '*' ? 'Let’s look at what happened.' : 'A tough one – but losses teach the most.');
  if (rev.opening) {
    const early = mine.filter(m => m.no <= 10 && BAD.includes(m.cls));
    text.push(`The opening was the <b>${rev.opening}</b>. ` + (early.length ? `It started to go wrong early, on move ${early[0].no}.` : 'You came out of it in good shape.'));
  }
  if (worst) text.push(`The key moment was move ${worst.no}, <b>${worst.san}</b>. ${worst.text.replace(/^A (blunder|mistake)\. /, '')}`);
  else text.push('No big mistakes from you in this game – very clean.');
  const kinds = {}; bad.concat(mine.filter(m => m.cls === 'inaccuracy')).forEach(m => { kinds[m.kind] = (kinds[m.kind] || 0) + 1; });
  const top = Object.keys(kinds).sort((a, b) => kinds[b] - kinds[a])[0];
  const tips = {
    hung: 'Your homework: before you let go of a piece, ask “is this square safe, and is everything still protected?”',
    tactic: 'Your homework: after every opponent move ask “what does it attack?” – forks and double attacks need one look ahead.',
    allowedMate: 'Your homework: check your king. Every move, look at the checks your opponent has.',
    missedMate: 'Your homework: when the enemy king is exposed, look at every check first.',
    missedTactic: 'Your homework: checks, captures, threats – look at all three before every move. The tactics unit will help.',
    opening: 'Your homework: stick to the golden rules in the first ten moves – centre, develop, castle.',
    positional: 'Your homework: when nothing is attacked, improve your worst-placed piece.'
  };
  if (top && tips[top]) text.push(tips[top]);
  return { stats: s, text, keys: bad.map(m => m.i) };
}
