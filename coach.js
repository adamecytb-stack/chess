// The coach's brain. Grades moves with consistent engine searches and explains them in plain words.
// Every sentence is built from something checked on the board (exchanges, forks, pins, engine lines).
import { Chess } from './chess.js';
import { COURSE } from './course.js';
import { S, factLine } from './speech.js';

export const DEPTH = 14;      // normal grading depth
export const VERIFY = 17;     // big verdicts (brilliant, great, mistake, miss, blunder) are re-checked this deep

export const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const ORDER = { p: 1, n: 3, b: 3.2, r: 5, q: 9, k: 100 };
export const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
export const CLASSES = {
  brilliant: { label: 'Brilliant' }, great: { label: 'Great move' }, best: { label: 'Best' },
  excellent: { label: 'Excellent' }, good: { label: 'Good' }, book: { label: 'Book' },
  inaccuracy: { label: 'Inaccuracy' }, mistake: { label: 'Mistake' }, miss: { label: 'Miss' }, blunder: { label: 'Blunder' }
};
export const BAD = ['inaccuracy', 'mistake', 'miss', 'blunder'];
const BIG = ['brilliant', 'great', 'mistake', 'miss', 'blunder'];

/* ================= small helpers ================= */
export const uciObj = u => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
const uciOf = m => m.from + m.to + (m.promotion || '');
const other = c => (c === 'w' ? 'b' : 'w');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const art = t => (t === 'q' || t === 'k' ? 'the ' : 'a ') + NAME[t];
const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
const pick = (arr, seed) => arr[hash(seed) % arr.length];
function tryMove(g, u) { try { return g.move(typeof u === 'string' ? uciObj(u) : u); } catch (e) { return null; } }

export const cpOf = l => (l.mate != null ? Math.sign(l.mate || 1) * (10000 - Math.min(Math.abs(l.mate), 50) * 10) : Math.max(-9000, Math.min(9000, l.cp || 0)));
const scoreOf = l => ({ cp: cpOf(l), mate: l.mate ?? null });
const winW = cp => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
export const winFor = (color, cp) => (color === 'w' ? winW(cp) : 100 - winW(cp));
export function evalText(s) {
  if (!s) return '';
  if (s.mate != null) return (s.mate > 0 ? '+' : '−') + 'M' + Math.abs(s.mate);
  const v = s.cp / 100;
  return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1);
}
const mateFor = (s, color) => s && s.mate != null && (color === 'w' ? s.mate > 0 : s.mate < 0);

export function fmtLine(fen, ucis, max = 4) {
  const g = new Chess(fen); const out = [];
  for (const u of (ucis || []).slice(0, max)) {
    const num = g.moveNumber(), turn = g.turn();
    const m = tryMove(g, u); if (!m) break;
    out.push((turn === 'w' ? num + '.' : out.length ? '' : num + '…') + m.san);
  }
  return out.join(' ');
}
export const sanOf = (fen, uci) => { const m = tryMove(new Chess(fen), uci); return m ? m.san : ''; };

/* ================= board analysis ================= */
function pieces(g, color) {
  const out = [];
  for (const row of g.board()) for (const c of row) if (c && (!color || c.color === color)) out.push(c);
  return out;
}
function balance(g, color) { let s = 0; for (const c of pieces(g)) s += (c.color === color ? 1 : -1) * VAL[c.type]; return s; }

// What the side to move wins by capturing on `sq` and continuing the exchange sensibly (>= 0).
function seeGain(g, sq, depth = 0) {
  if (depth > 10) return 0;
  const caps = g.moves({ verbose: true }).filter(m => m.to === sq && m.captured);
  if (!caps.length) return 0;
  caps.sort((a, b) => ORDER[a.piece] - ORDER[b.piece]);
  const m = caps[0];
  const gain = VAL[m.captured] + (m.promotion ? VAL[m.promotion] - 1 : 0);
  g.move(m);
  const reply = seeGain(g, sq, depth + 1);
  g.undo();
  return Math.max(0, gain - reply);
}
// Net material for the side to move if it plays capture `m` and the exchange runs its course.
function captureGain(g, m) {
  const gain = VAL[m.captured] + (m.promotion ? VAL[m.promotion] - 1 : 0);
  g.move(m); const back = seeGain(g, m.to); g.undo();
  return gain - back;
}
// All profitable captures for the side to move, best first.
function winningCaptures(g) {
  const out = [];
  for (const m of g.moves({ verbose: true })) {
    if (!m.captured) continue;
    const gain = captureGain(g, m);
    if (gain > 0) out.push({ m, gain, sq: m.to, type: m.captured });
  }
  return out.sort((a, b) => b.gain - a.gain);
}
const bestCaptureGain = g => { const w = winningCaptures(g); return w.length ? w[0].gain : 0; };

// Same position with the other side to move (null move). null when not possible.
function flip(g) {
  if (g.inCheck()) return null;
  const f = g.fen().split(' ');
  f[1] = f[1] === 'w' ? 'b' : 'w'; f[3] = '-';
  try { return new Chess(f.join(' ')); } catch (e) { return null; }
}
// Pieces of `color` that the other side could win right now (if it were their move).
function threatsAgainst(g, color) {
  const pos = g.turn() === color ? flip(g) : g;
  if (!pos) return [];
  const seen = new Set();
  return winningCaptures(pos).filter(t => !seen.has(t.sq) && seen.add(t.sq));
}

// Enemy targets attacked by the piece on sq (the piece's owner is not to move in g).
function forkTargets(g, sq) {
  const pc = g.get(sq); if (!pc) return [];
  const foe = other(pc.color), out = [];
  for (const p of pieces(g, foe)) {
    if (!g.attackers(p.square, pc.color).includes(sq)) continue;
    if (p.type === 'k') out.push(p);
    else if (VAL[p.type] > VAL[pc.type]) out.push(p);
    else if (VAL[p.type] >= 3 && g.attackers(p.square, foe).length === 0) out.push(p);
  }
  out.sort((a, b) => ORDER[b.type] - ORDER[a.type]);
  if (out.length < 2) return [];
  // the forking piece must not simply be taken (unless taking it is illegal / bad)
  const gg = new Chess(g.fen());
  if (gg.turn() === foe && seeGain(gg, sq) > 0) return [];
  return out;
}

const DIRS = { b: [[1, 1], [1, -1], [-1, 1], [-1, -1]], r: [[1, 0], [-1, 0], [0, 1], [0, -1]] };
DIRS.q = DIRS.b.concat(DIRS.r);
const FILES = 'abcdefgh';
function lineMotif(g, sq) {
  const pc = g.get(sq);
  if (!pc || !DIRS[pc.type]) return null;
  const f0 = FILES.indexOf(sq[0]), r0 = +sq[1];
  for (const [df, dr] of DIRS[pc.type]) {
    let f = f0 + df, r = r0 + dr, first = null;
    while (f >= 0 && f < 8 && r >= 1 && r <= 8) {
      const s = FILES[f] + r, p = g.get(s);
      if (p) {
        if (p.color === pc.color) break;
        if (!first) first = { ...p, square: s };
        else {
          const second = { ...p, square: s };
          if (second.type === 'k' && first.type !== 'k') return { kind: 'pin', front: first, back: second };
          if (first.type === 'k' && VAL[second.type] >= 3) return { kind: 'skewer', front: first, back: second };
          if (first.type === 'q' && VAL[second.type] >= 3 && VAL[pc.type] < 9) return { kind: 'skewer', front: first, back: second };
          if (VAL[second.type] > VAL[first.type] && VAL[second.type] > VAL[pc.type]) return { kind: 'pin', front: first, back: second };
          break;
        }
      }
      f += df; r += dr;
    }
  }
  return null;
}

// Attacks uncovered by moving a piece away (g0 before, g1 after the move m).
function discovered(g0, g1, m) {
  const me = m.color; let bestT = null;
  for (const p of pieces(g1, other(me))) {
    const before = g0.attackers(p.square, me).filter(s => s !== m.from);
    const after = g1.attackers(p.square, me).filter(s => s !== m.to);
    if (after.some(s => !before.includes(s))) {
      if (p.type === 'k' || VAL[p.type] >= 3) if (!bestT || ORDER[p.type] > ORDER[bestT.type]) bestT = p;
    }
  }
  return bestT;
}

// Follow an engine line until it calms down; material change for `color` and what changed hands.
export function pvOutcome(fen, pv, color, max = 10) {
  const g = new Chess(fen), start = balance(g, color);
  const lost = [], won = [];
  let mate = null, captures = 0;
  for (let i = 0; i < Math.min((pv || []).length, max); i++) {
    const m = tryMove(g, pv[i]); if (!m) break;
    if (m.captured) { (m.color === color ? won : lost).push(m.captured); captures++; }
    if (g.isCheckmate()) { mate = m.color === color ? 'win' : 'loss'; break; }
  }
  let delta = balance(g, color) - start;
  if (!mate) {
    const w = winningCaptures(g)[0];
    if (w) { delta += g.turn() === color ? w.gain : -w.gain; (g.turn() === color ? won : lost).push(w.type); }
  }
  return { delta, mate, lost, won, captures };
}
function swingPhrase(out) {
  const L = [...out.lost].sort((a, b) => VAL[b] - VAL[a]), W = [...out.won].sort((a, b) => VAL[b] - VAL[a]);
  // cancel out like-for-like trades
  for (let i = 0; i < L.length; i++) { const j = W.indexOf(L[i]); if (j > -1) { W.splice(j, 1); L.splice(i, 1); i--; } }
  const list = a => {
    const n = {}; a.forEach(t => { n[t] = (n[t] || 0) + 1; });
    return Object.keys(n).sort((x, y) => VAL[y] - VAL[x]).slice(0, 2).map(t => n[t] > 1 ? `${['', '', 'two', 'three', 'four'][n[t]] || n[t]} ${NAME[t]}s` : art(t)).join(' and ');
  };
  if (L.length === 1 && L[0] === 'r' && W.length === 1 && (W[0] === 'n' || W[0] === 'b')) return 'the exchange (a rook for a minor piece)';
  if (!L.length) return 'material';
  return W.length ? `${list(L)} for ${list(W)}` : list(L);
}
function gainPhrase(out) {
  const flipped = { lost: out.won, won: out.lost };
  return swingPhrase(flipped);
}

function isOpenFile(g, file, color) {
  for (let r = 1; r <= 8; r++) { const p = g.get(file + r); if (p && p.type === 'p' && p.color === color) return false; }
  return true;
}
function isPassed(g, sq, color) {
  const f = FILES.indexOf(sq[0]), r = +sq[1], dir = color === 'w' ? 1 : -1;
  for (let df = -1; df <= 1; df++) {
    const ff = f + df; if (ff < 0 || ff > 7) continue;
    for (let rr = r + dir; rr >= 1 && rr <= 8; rr += dir) { const p = g.get(FILES[ff] + rr); if (p && p.type === 'p' && p.color !== color) return false; }
  }
  return true;
}

/* ================= opening book ================= */
const OPENINGS = [
  ['e4 e5', 'Open Game'], ['e4 e5 Nf3 Nc6', 'King’s Knight Opening'],
  ['e4 e5 Nf3 Nc6 Bc4', 'Italian Game'], ['e4 e5 Nf3 Nc6 Bc4 Bc5', 'Giuoco Piano'],
  ['e4 e5 Nf3 Nc6 Bc4 Nf6', 'Two Knights Defence'], ['e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7', 'Fried Liver Attack'],
  ['e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5', 'Two Knights Defence: Polerio'], ['e4 e5 Nf3 Nc6 Bc4 Bc5 b4', 'Evans Gambit'],
  ['e4 e5 Nf3 Nc6 Bb5', 'Ruy Lopez'], ['e4 e5 Nf3 Nc6 Bb5 a6', 'Ruy Lopez: Morphy Defence'], ['e4 e5 Nf3 Nc6 Bb5 Nf6', 'Ruy Lopez: Berlin Defence'],
  ['e4 e5 Nf3 Nc6 Bb5 a6 Bxc6', 'Ruy Lopez: Exchange'], ['e4 e5 Nf3 Nc6 d4', 'Scotch Game'],
  ['e4 e5 Nf3 Nc6 Nc3', 'Three Knights Opening'], ['e4 e5 Nf3 Nc6 Nc3 Nf6', 'Four Knights Game'],
  ['e4 e5 Nf3 Nf6', 'Petrov’s Defence'], ['e4 e5 Nf3 d6', 'Philidor Defence'], ['e4 e5 f4', 'King’s Gambit'],
  ['e4 e5 Nc3', 'Vienna Game'], ['e4 e5 Bc4', 'Bishop’s Opening'], ['e4 e5 d4 exd4', 'Centre Game'],
  ['e4 c5', 'Sicilian Defence'], ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3', 'Sicilian: Open'],
  ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', 'Sicilian: Najdorf'], ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6', 'Sicilian: Dragon'],
  ['e4 c5 c3', 'Sicilian: Alapin'], ['e4 c5 Nc3', 'Sicilian: Closed'], ['e4 c5 d4 cxd4 c3', 'Smith-Morra Gambit'],
  ['e4 e6', 'French Defence'], ['e4 e6 d4 d5 exd5', 'French: Exchange'], ['e4 e6 d4 d5 e5', 'French: Advance'],
  ['e4 c6', 'Caro-Kann Defence'], ['e4 c6 d4 d5 exd5 cxd5', 'Caro-Kann: Exchange'], ['e4 c6 d4 d5 e5', 'Caro-Kann: Advance'],
  ['e4 d5', 'Scandinavian Defence'], ['e4 d5 exd5 Nf6', 'Scandinavian: Modern'],
  ['e4 d6', 'Pirc Defence'], ['e4 g6', 'Modern Defence'], ['e4 Nf6', 'Alekhine’s Defence'], ['e4 Nc6', 'Nimzowitsch Defence'],
  ['d4 d5', 'Queen’s Pawn Game'], ['d4 d5 c4', 'Queen’s Gambit'], ['d4 d5 c4 e6', 'Queen’s Gambit Declined'],
  ['d4 d5 c4 dxc4', 'Queen’s Gambit Accepted'], ['d4 d5 c4 c6', 'Slav Defence'],
  ['d4 d5 Bf4', 'London System'], ['d4 Nf6 Bf4', 'London System'], ['d4 d5 Nf3 Nf6 Bf4', 'London System'],
  ['d4 Nf6 c4 g6', 'King’s Indian Defence'], ['d4 Nf6 c4 g6 Nc3 d5', 'Grünfeld Defence'], ['d4 Nf6 c4 e6 Nc3 Bb4', 'Nimzo-Indian Defence'],
  ['d4 Nf6 c4 e6', 'Indian Defence'], ['d4 Nf6 c4 c5', 'Benoni Defence'], ['d4 Nf6', 'Indian Defence'], ['d4 f5', 'Dutch Defence'],
  ['c4', 'English Opening'], ['Nf3', 'Réti Opening'], ['f4', 'Bird’s Opening'], ['b3', 'Nimzo-Larsen Attack'], ['g3', 'King’s Fianchetto'],
  ['e4', 'King’s Pawn Opening'], ['d4', 'Queen’s Pawn Opening']
];
// Moves that are "book" in addition to the named lines (main theory, a few moves deep).
const EXTRA_BOOK = [
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O', 'e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6 d3 d6 c3', 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 c3 d6 O-O',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3',
  'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5',
  'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6', 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nxd4 Bb4',
  'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3', 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O',
  'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bc5', 'e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4',
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6', 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6',
  'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7', 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1', 'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7',
  'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3', 'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6',
  'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7', 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7', 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6',
  'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7', 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6', 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2',
  'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5', 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6',
  'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O', 'e4 g6 d4 Bg7 Nc3 d6', 'e4 Nf6 e5 Nd5 d4 d6 Nf3',
  'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7', 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5', 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6',
  'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5', 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7',
  'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5', 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5', 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6',
  'd4 Nf6 c4 e6 Nf3 d5 Nc3 Be7', 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O', 'd4 Nf6 Nf3 g6 g3 Bg7 Bg2 O-O O-O d6',
  'd4 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O', 'd4 d5 Nf3 Nf6 e3 e6 Bd3 c5 b3', 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7',
  'c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6', 'c4 Nf6 Nc3 e6 e4 d5', 'c4 c5 Nf3 Nf6 Nc3 Nc6', 'Nf3 d5 g3 Nf6 Bg2 c6 O-O Bg4',
  'Nf3 Nf6 c4 g6 Nc3 Bg7 e4 d6'
];
export const OPENING_NAMES = [...new Set(OPENINGS.map(o => o[1]))];
const nameAt = new Map(), bookSet = new Set();
const addBook = sans => { for (let i = 1; i <= sans.length; i++) bookSet.add(sans.slice(0, i).join(' ')); };
for (const [line, name] of OPENINGS) { nameAt.set(line, name); addBook(line.split(' ')); }
for (const line of EXTRA_BOOK) addBook(line.split(' '));
const TRAPS = ['scholars', 'legal', 'fried-liver', 'Why 4.Bxc6 does not win a pawn', 'The Elephant Trap'];
for (const u of COURSE) for (const l of u.lessons) for (const p of l.parts)
  if (!p.fen && !TRAPS.includes(l.id) && !TRAPS.includes(p.title)) addBook(p.moves.map(m => m[0].replace(/[+#]/g, '')).slice(0, 14));

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

/* ================= grading ================= */
function sacrificeValue(g0, m, g1) {
  const after = bestCaptureGain(g1);
  if (after < 2) return { value: 0 };
  const f = flip(g0);
  const before = f ? bestCaptureGain(f) : 0;
  const took = m.captured ? VAL[m.captured] : 0;
  if (after < before + 2) return { value: 0 };
  const target = winningCaptures(g1)[0];
  return { value: after - took >= 2 ? after - took : 0, piece: target && target.type };
}

export function classify(x) {
  const { mover, best, played } = x;
  const wB = winFor(mover, best.cp), wP = winFor(mover, played.cp);
  const drop = Math.max(0, wB - wP);
  let cls;
  if (x.mated) cls = 'best';
  else if (x.book && drop < 8) cls = 'book';
  else if (x.isBest || drop < 0.6) cls = 'best';
  else if (drop < 2) cls = 'excellent';
  else if (drop < 5) cls = 'good';
  else if (drop < 10) cls = 'inaccuracy';
  else if (drop < 20) cls = 'mistake';
  else cls = 'blunder';
  if ((cls === 'best' || cls === 'excellent') && !x.book && x.sac >= 2 && wP >= 40 && wB <= 97) cls = 'brilliant';
  else if (cls === 'best' && !x.book && x.second && x.legal > 1 && !x.recapture && !(x.capGain >= 2)) {
    const w2 = winFor(mover, x.second.cp);
    if (wB - w2 >= 15 && w2 < 85 && !(wB > 97 && w2 > 90)) cls = 'great';
  }
  if (mateFor(played, other(mover)) && !mateFor(best, other(mover)) && BAD.includes(cls) && cls !== 'blunder') cls = wB >= 10 ? 'blunder' : 'mistake';
  if ((cls === 'mistake' || cls === 'blunder') && x.playedDelta >= 0 && (x.bestDelta - x.playedDelta >= 2 || mateFor(best, mover))) cls = 'miss';
  const acc = cls === 'book' || cls === 'best' || cls === 'brilliant' || cls === 'great' ? 100
    : Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1669));
  return { cls, drop, acc };
}

// Grade one move. Root search (several candidate moves) + the played move searched from the same root,
// so both scores come from one consistent search. Big verdicts are re-checked deeper.
export async function gradeMove(eng, fen, uci, opts = {}) {
  const depth = opts.depth || DEPTH;
  const g0 = new Chess(fen), mover = g0.turn();
  const g1 = new Chess(fen);
  const m = tryMove(g1, uci);
  if (!m) throw new Error('illegal move ' + uci);
  const base = { fen, uci, san: m.san, mover, from: m.from, to: m.to, legal: g0.moves().length, book: !!opts.book, prevCls: opts.prevCls || null, prevTo: opts.prevTo || null };
  if (g1.isCheckmate()) {
    const s = { cp: mover === 'w' ? 10000 : -10000, mate: mover === 'w' ? 1 : -1 };
    return { ...base, depth, best: s, played: s, bestPv: [uci], playedPv: [uci], second: null, cls: 'best', acc: 100, drop: 0, sac: 0, bestDelta: 0, playedDelta: 0 };
  }
  const root = await eng.analyse(fen, { depth, multipv: 2, tag: opts.tag });
  let pl = root.lines.find(l => l.pv[0] === uci);
  if (!pl) {
    const r = await eng.analyse(fen, { depth, searchmoves: [uci], tag: opts.tag });
    pl = r.lines[0] || { cp: 0, pv: [uci] };
  }
  const bl = root.lines[0] || pl;
  const best = scoreOf(bl), played = scoreOf(pl);
  const second = root.lines[1] ? scoreOf(root.lines[1]) : null;
  const bestOut = pvOutcome(fen, bl.pv, mover), playedOut = pvOutcome(fen, pl.pv, mover);
  const sac = sacrificeValue(g0, m, g1);
  const recapture = !!(m.captured && opts.prevTo === m.to);
  let capGain = 0;
  if (m.captured) { const gg = new Chess(fen); const mm = gg.moves({ verbose: true }).find(x => uciOf(x) === uciOf(m)); if (mm) capGain = captureGain(gg, mm); }
  const res = classify({ mover, best, played, second, isBest: bl.pv[0] === uci, book: base.book, sac: sac.value, recapture, legal: base.legal, capGain, bestDelta: bestOut.delta, playedDelta: playedOut.delta });
  const info = {
    ...base, depth, best, played, second, secondUci: root.lines[1] ? root.lines[1].pv[0] : null,
    bestPv: bl.pv.slice(0, 10), playedPv: pl.pv.slice(0, 10), sac: sac.value, sacPiece: sac.piece || null,
    bestDelta: bestOut.delta, playedDelta: playedOut.delta, ...res
  };
  if (BIG.includes(info.cls) && depth < VERIFY && !opts.noVerify) return gradeMove(eng, fen, uci, { ...opts, depth: VERIFY });
  if (info.cls === 'brilliant') {
    const take = winningCaptures(g1)[0];
    if (take) {
      const gC = new Chess(g1.fen()); gC.move(take.m);
      if (!gC.isGameOver()) {
        const r = await eng.analyse(gC.fen(), { depth, tag: opts.tag });
        if (r.lines[0]) info.sacLine = [uciOf(take.m), ...r.lines[0].pv.slice(0, 6)];
        info.sacMate = !!(r.lines[0] && mateFor(scoreOf(r.lines[0]), mover));
      }
    }
  }
  return info;
}

// Book moves in live play skip the engine; they get an evaluation later during review.
export function bookInfo(fen, uci) {
  const g = new Chess(fen), m = tryMove(new Chess(fen), uci);
  return { fen, uci, san: m.san, mover: g.turn(), from: m.from, to: m.to, legal: g.moves().length, book: true, cls: 'book', acc: 100, drop: 0, depth: 0 };
}

/* ================= words ================= */
// Perspective: whose move is being described. mine = the user's move.
export function persp(mine, moverName = 'your opponent', oppName = 'your opponent') {
  return mine
    ? { mine, you: 'you', You: 'You', your: 'your', Your: 'Your', s: '', have: 'have', opp: oppName, Opp: cap(oppName), opps: oppName === 'your opponent' ? 'your opponent’s' : oppName + '’s' }
    : { mine, you: moverName, You: cap(moverName), your: moverName + '’s', Your: cap(moverName) + '’s', s: 's', have: 'has', opp: 'you', Opp: 'You', opps: 'your' };
}

// True, short facts about a move ("develops the knight", "forks the king and the rook").
function moveFacts(fen, uci, opts = {}) {
  const g0 = new Chess(fen), me = g0.turn();
  const g1 = new Chess(fen); const m = tryMove(g1, uci);
  if (!m) return [];
  const facts = [];
  if (g1.isCheckmate()) return ['delivers checkmate'];
  if (m.promotion) facts.push(`promotes to ${art(m.promotion)}`);
  if (m.captured) {
    const gg = new Chess(fen); const mm = gg.moves({ verbose: true }).find(x => uciOf(x) === uci);
    const gain = mm ? captureGain(gg, mm) : 0;
    const back = gain < VAL[m.captured];
    if (opts.prevTo === m.to && m.captured) facts.push('takes back');
    else if (!back && gain >= 1) facts.push(`wins ${art(m.captured)}${g1.attackers(m.to, other(me)).length ? '' : ' for free'}`);
    else if (gain >= 2) facts.push(m.captured === 'r' ? 'wins the exchange' : 'wins material');
    else if (gain >= 1) facts.push('wins a pawn');
    else if (gain === 0) facts.push(m.piece === m.captured ? `trades ${NAME[m.piece]}s` : `trades the ${NAME[m.piece]} for ${art(m.captured)}`);
  }
  const fork = forkTargets(g1, m.to);
  if (fork.length >= 2) facts.push(`forks the ${NAME[fork[0].type]} and the ${NAME[fork[1].type]}`);
  const lm = lineMotif(g1, m.to);
  if (lm && !fork.length) facts.push(lm.kind === 'pin' ? `pins the ${NAME[lm.front.type]} to the ${NAME[lm.back.type]}` : `skewers the ${NAME[lm.front.type]} and the ${NAME[lm.back.type]}`);
  const disc = discovered(g0, g1, m);
  if (disc) facts.push(disc.type === 'k' ? 'gives a discovered check' : `uncovers an attack on the ${NAME[disc.type]}`);
  else if (g1.inCheck() && !facts.length) facts.push('gives check');
  // safety (not judged while the opponent is in check – a check only hides threats for one move)
  if (!g1.inCheck()) {
    const t0 = threatsAgainst(g0, me), t1 = threatsAgainst(g1, me);
    if (t0.some(t => t.sq === m.from) && !t1.some(t => t.sq === m.to)) facts.push(`gets the ${NAME[m.piece]} out of danger`);
    else if (!m.captured) {
      const saved = t0.find(t => t.sq !== m.from && !t1.some(u => u.sq === t.sq) && g1.get(t.sq) && g1.get(t.sq).color === me);
      if (saved && saved.gain >= 1) facts.push(`protects the ${NAME[saved.type]} on ${saved.sq}`);
    }
  }
  // new threat of our own
  if (!g1.inCheck()) {
    const f1 = flip(g1);
    if (f1) {
      const mine = winningCaptures(f1).filter(t => t.gain >= 2);
      const had = new Set(winningCaptures(g0).map(t => t.sq));
      const nw = mine.find(t => !had.has(t.sq) && !(lm && lm.front.square === t.sq) && !fork.some(f => f.square === t.sq));
      if (nw && facts.length < 2) facts.push(`threatens to win the ${NAME[nw.type]} on ${nw.sq}`);
    }
  }
  if (m.san.startsWith('O-O')) facts.push('gets the king to safety');
  const home = me === 'w' ? '1' : '8';
  if ((m.piece === 'n' || m.piece === 'b') && m.from[1] === home && g0.moveNumber() <= 15 && !m.captured) facts.push(`develops the ${NAME[m.piece]}`);
  if (m.piece === 'p' && 'cdef'.includes(m.to[0]) && '45'.includes(m.to[1]) && g0.moveNumber() <= 12 && !m.captured) facts.push('takes space in the centre');
  if (m.piece === 'r' && m.from[0] !== m.to[0] && isOpenFile(g1, m.to[0], me)) facts.push('puts the rook on an open file');
  if (m.piece === 'p' && !m.captured && isPassed(g1, m.to, me) && '3456'.includes(m.from[1]) && (me === 'w' ? +m.to[1] >= 5 : +m.to[1] <= 4)) facts.push('pushes the passed pawn');
  if (m.piece === 'k' && !m.san.startsWith('O-O') && pieces(g1).filter(p => p.type !== 'p' && p.type !== 'k').length <= 4 && 'cdef'.includes(m.to[0]) && '3456'.includes(m.to[1])) facts.push('brings the king into the game');
  return [...new Set(facts)];
}
const joinFacts = f => f.length <= 1 ? (f[0] || '') : f.slice(0, -1).join(', ') + ' and ' + f[f.length - 1];

// Plain-language explanation of a graded move. opts: { prevInfo, hideBest, openingName, prevTo }
export function describe(info, P = persp(true), opts = {}) { return explain(info, P, opts).text; }

// Explanation of a graded move: { text (shown), say (spoken lines, all pre-recorded) }.
export function explain(info, P = persp(true), opts = {}) {
  opts = { ...opts, prevTo: opts.prevTo !== undefined ? opts.prevTo : info.prevTo };
  const fen = info.fen, me = info.mover, foe = other(me);
  const seed = fen + info.uci;
  const bestUci = info.bestPv && info.bestPv[0];
  const bestSan = bestUci ? sanOf(fen, bestUci) : '';
  const hide = !!opts.hideBest;
  const facts = moveFacts(fen, info.uci, opts).slice(0, 2);
  const bestFacts = bestUci && bestUci !== info.uci ? moveFacts(fen, bestUci, opts).slice(0, 2) : [];
  const cls = info.cls;
  const R = (text, say) => ({ text, say: P.mine ? say.filter(Boolean) : [S.theirs[cls]].filter(Boolean) });
  const better = () => {
    if (hide || !bestSan || bestUci === info.uci) return '';
    return bestFacts.length ? ` Better was <b>${bestSan}</b> – it ${joinFacts(bestFacts)}.` : ` Better was <b>${bestSan}</b>.`;
  };
  const betterSay = () => {
    if (hide || !bestSan || bestUci === info.uci) return null;
    const f = bestFacts[0] || '';
    if (f.startsWith('gets the king to safety') || bestSan.startsWith('O-O')) return S.bad.betterCastle;
    if (f.startsWith('develops')) return S.bad.betterDevelop;
    if (f.startsWith('takes space')) return S.bad.betterCentre;
    if (/^(wins|takes back|trades)/.test(f)) return S.bad.betterCapture;
    return S.bad.better;
  };

  /* ----- good moves ----- */
  if (cls === 'book') return R(opts.openingName ? `This is the ${opts.openingName}.` : 'A standard opening move.', [S.book, opts.openingName && S.opening(opts.openingName)]);
  if (facts[0] === 'delivers checkmate') return R('Checkmate!', [S.checkmate]);
  if (info.legal === 1) return R('The only legal move.', []);
  if (cls === 'brilliant') {
    const piece = info.sacPiece ? NAME[info.sacPiece] : 'piece';
    const g1b = new Chess(fen); tryMove(g1b, info.uci);
    if (info.sacLine && info.sacLine.length > 1) {
      const take = sanOf(g1b.fen(), info.sacLine[0]);
      const g2 = new Chess(g1b.fen()); tryMove(g2, info.sacLine[0]);
      const rest = fmtLine(g2.fen(), info.sacLine.slice(1), info.sacMate ? 5 : 4);
      return R(`Brilliant! ${P.You} offer${P.s} the ${piece}. If it’s taken with <b>${take}</b>, then <b>${rest}</b> ${info.sacMate ? 'leads to mate' : 'turns the tables'}.`, [S.brilliant]);
    }
    return R(`Brilliant! ${P.You} offer${P.s} the ${piece}, and taking it doesn’t work: <b>${fmtLine(fen, info.playedPv, 5)}</b>.`, [S.brilliant]);
  }
  if (cls === 'great') {
    const wB = winFor(me, info.best.cp);
    if (mateFor(info.best, me)) return R(`Great move! It starts a forced mate: <b>${fmtLine(fen, info.bestPv, Math.min(2 * Math.abs(info.best.mate) - 1, 7))}</b>.`, [S.greatMate]);
    const what = wB >= 70 ? `keeps ${P.your} advantage` : wB >= 35 ? 'keeps the balance' : `keeps ${P.you} in the game`;
    const alt = info.secondUci ? ` Most other moves, like <b>${sanOf(fen, info.secondUci)}</b>, are much worse.` : '';
    return R(`Great move! The only move that ${what}${facts.length ? ` – it ${joinFacts(facts)}` : ''}.${alt}`, [S.great]);
  }
  if (!BAD.includes(cls)) {
    const lead = pick({ best: ['Best move', 'That’s the top move', 'Exactly right', 'Spot on'], excellent: ['Excellent', 'Very strong', 'Strong move'], good: ['Good move', 'Solid', 'A decent move'] }[cls], seed);
    const sayLead = pickLine(S.lead[cls], seed);
    if (facts.length) {
      const tail = cls === 'good' && bestSan && !hide ? ` <b>${bestSan}</b> was a little more precise.` : '';
      return R(`${lead} – it ${joinFacts(facts)}.${tail}`, [sayLead, factLine(facts[0])]);
    }
    if (cls === 'best') return R(`${lead}. ${pick(['That’s what I’d play too.', 'Nothing better here.', 'Nicely found.'], seed + 'x')}`, [sayLead]);
    if (cls === 'excellent') return R(hide || !bestSan ? `${lead}.` : `${lead} – about as good as my top pick <b>${bestSan}</b>.`, [sayLead]);
    return R(hide || !bestSan ? `${lead}.` : `${lead}. <b>${bestSan}</b> was a little more precise${bestFacts.length ? ` – it ${joinFacts(bestFacts)}` : ''}.`, [sayLead]);
  }

  /* ----- bad moves ----- */
  const lead = pickLine(S.lead[cls], seed);
  const g0 = new Chess(fen), g1 = new Chess(fen); const m = tryMove(g1, info.uci);
  const pv = info.playedPv || [];
  const reply = pv[1] ? tryMove(new Chess(g1.fen()), pv[1]) : null;

  // allows mate
  if (mateFor(info.played, foe)) {
    const n = Math.abs(info.played.mate);
    const line = fmtLine(g1.fen(), pv.slice(1), Math.min(2 * n, 6));
    return R(n <= 1 ? `This allows checkmate: <b>${line}</b>.${better()}` : `This allows a forced mate in ${n}: <b>${line}</b>.${better()}`,
      [lead, n <= 1 ? S.bad.allowsMate1 : S.bad.allowsMate]);
  }
  // missed mate
  if (mateFor(info.best, me) && !mateFor(info.played, me)) {
    const n = Math.abs(info.best.mate);
    if (hide) return R('There’s a forced checkmate here. Look at every check!', [S.hint.mate]);
    return R(n <= 3 ? `${P.You} had checkmate in ${n}: <b>${fmtLine(fen, info.bestPv, 2 * n - 1)}</b>.` : `${P.You} had a forced mate starting with <b>${bestSan}</b>.`, [S.bad.missedMate]);
  }

  const lossOut = pvOutcome(fen, pv, me), bestOut = pvOutcome(fen, info.bestPv || [], me);
  // loses material
  if (lossOut.delta <= -1 && bestOut.delta - lossOut.delta >= 1 && reply) {
    const what = swingPhrase(lossOut);
    const line = `<b>${fmtLine(g1.fen(), pv.slice(1), 3)}</b>`;
    const gR = new Chess(g1.fen()); tryMove(gR, pv[1]);
    let why, say;
    const longLine = `<b>${fmtLine(g1.fen(), pv.slice(1), 7)}</b>`;
    // a real exchange sequence: we grab something straight back after their capture
    let moreCaptures = 0;
    { const gg = new Chess(g1.fen()); const a = tryMove(gg, pv[1]); const b2 = a && pv[2] ? tryMove(gg, pv[2]) : null; if (a && a.captured) moreCaptures++; if (b2 && b2.captured) moreCaptures++; }
    if (reply.captured && reply.to === m.to) {
      const defended = g1.attackers(m.to, me).length > 0;
      if (moreCaptures > 1) { why = `${P.Your} ${NAME[m.piece]} on ${m.to} isn’t safe: after ${longLine} ${P.you} ${P.mine ? 'are' : 'is'} down ${what}.`; say = S.bad.unsafe(m.piece); }
      else if (defended) { why = `${P.Your} ${NAME[m.piece]} on ${m.to} can be taken: after ${line} ${P.you} lose${P.s} ${what}.`; say = S.bad.unsafe(m.piece); }
      else { why = `${P.Your} ${NAME[m.piece]} on ${m.to} isn’t protected – <b>${reply.san}</b> just takes it.`; say = S.bad.hung(m.piece); }
    } else if (reply.captured) {
      const t0 = threatsAgainst(g0, me);
      const wasHanging = t0.some(t => t.sq === reply.to);
      const guarded = g0.attackers(reply.to, me).includes(m.from) && !g1.attackers(reply.to, me).includes(m.to);
      if (wasHanging) { why = `${P.Your} ${NAME[reply.captured]} on ${reply.to} was already under attack and ${P.you} didn’t save it – <b>${reply.san}</b> wins it.`; say = S.bad.wasHanging(reply.captured); }
      else if (guarded) { why = `${P.Your} ${NAME[m.piece]} was guarding the ${NAME[reply.captured]} on ${reply.to}. Now <b>${reply.san}</b> wins it.`; say = S.bad.guarded; }
      else { why = `This lets <b>${reply.san}</b> win ${what}.`; say = S.bad.lets; }
      if ((wasHanging || guarded) && -lossOut.delta >= VAL[reply.captured] + 2) why += ` And it gets worse: ${longLine}.`;
    } else {
      const fork = forkTargets(gR, reply.to);
      const lm = lineMotif(gR, reply.to);
      if (fork.length >= 2) { why = `Now <b>${reply.san}</b> forks ${P.your} ${NAME[fork[0].type]} and ${NAME[fork[1].type]} – ${P.you} lose${P.s} ${what}.`; say = S.bad.fork; }
      else if (lm && lm.front.color === me) {
        why = lm.kind === 'pin'
          ? `Now <b>${reply.san}</b> pins ${P.your} ${NAME[lm.front.type]} to the ${NAME[lm.back.type]}, and ${P.you} lose${P.s} ${what}.`
          : `Now <b>${reply.san}</b> skewers ${P.your} ${NAME[lm.front.type]} and ${NAME[lm.back.type]} – ${P.you} lose${P.s} ${what}.`;
        say = lm.kind === 'pin' ? S.bad.pin : S.bad.skewer;
      } else if (gR.inCheck()) { why = `After <b>${reply.san}</b> ${P.you} can’t hold everything: ${line} and ${P.you} lose${P.s} ${what}.`; say = S.bad.check; }
      else {
        const thr = threatsAgainst(gR, me)[0];
        why = thr ? `After <b>${reply.san}</b> the ${NAME[thr.type]} on ${thr.sq} is attacked and can’t be saved – ${P.you} lose${P.s} ${what}.`
          : `After ${line} ${P.you} lose${P.s} ${what}.`;
        say = S.bad.loses;
      }
    }
    return R(why + better(), [lead, say, betterSay()]);
  }

  // missed a win of material
  if (bestOut.delta - lossOut.delta >= 1 && bestOut.delta >= 1) {
    const punish = opts.prevInfo && BAD.includes(opts.prevInfo.cls);
    const intro = punish ? `${P.Opp} just made a mistake, but ${P.you} didn’t punish it. ` : '';
    const gain = gainPhrase(bestOut);
    if (hide) return R(`${intro}There’s a way to win material here. Look at checks, captures and attacks.`, [punish && S.bad.oppMistake, S.bad.missedHidden]);
    const gB = new Chess(fen); const b = tryMove(gB, bestUci);
    let why, say;
    if (b && b.captured && g0.attackers(b.to, foe).length === 0) { why = `The ${NAME[b.captured]} on ${b.to} was free – <b>${b.san}</b> wins it.`; say = S.bad.free(b.captured); }
    else {
      const fork = b ? forkTargets(gB, b.to) : [];
      const lm = b ? lineMotif(gB, b.to) : null;
      const disc = b ? discovered(g0, gB, b) : null;
      if (fork.length >= 2) { why = `<b>${b.san}</b> would fork the ${NAME[fork[0].type]} and the ${NAME[fork[1].type]} and win ${gain}.`; say = S.bad.missedFork; }
      else if (lm && lm.front.color === foe) { why = `<b>${b.san}</b> would ${lm.kind === 'pin' ? `pin the ${NAME[lm.front.type]} to the ${NAME[lm.back.type]}` : `skewer the ${NAME[lm.front.type]} and the ${NAME[lm.back.type]}`} and win ${gain}.`; say = lm.kind === 'pin' ? S.bad.missedPin : S.bad.missedSkewer; }
      else if (disc) { why = `<b>${b.san}</b> uncovers an attack on the ${NAME[disc.type]} and wins ${gain}.`; say = S.bad.missedDisc; }
      else { why = `<b>${fmtLine(fen, info.bestPv, 5)}</b> wins ${gain}.`; say = S.bad.missedWin; }
    }
    return R(intro + why, [punish ? S.bad.oppMistake : lead, say]);
  }

  // no tactic: positional reasons we can actually verify
  const wB = winFor(me, info.best.cp), wP = winFor(me, info.played.cp);
  let shift, shiftSay;
  if (wB >= 65 && wP <= 58) { shift = `This throws away ${P.your} advantage.`; shiftSay = S.bad.throws; }
  else if (wB >= 40 && wP < 35) { shift = `Now ${P.opp} is clearly better.`; shiftSay = S.bad.clearlyBetter; }
  else if (wB >= 45 && wP < 45) { shift = `This hands ${P.opp} the easier game.`; shiftSay = S.bad.easier; }
  else { shift = cls === 'inaccuracy' ? 'Not the most accurate.' : `This makes ${P.your} position worse.`; shiftSay = cls === 'inaccuracy' ? null : S.bad.worsens; }
  let why = '', whySay = null;
  const home = me === 'w' ? '1' : '8';
  const undeveloped = pieces(g0, me).filter(p => (p.type === 'n' || p.type === 'b') && p.square[1] === home).length;
  const rights = g0.getCastlingRights(me);
  if (m.piece === 'q' && g0.moveNumber() <= 10 && undeveloped >= 2 && reply && new Chess(g1.fen()).attackers(m.to, foe).length === 0) {
    const gR = new Chess(g1.fen()); tryMove(gR, pv[1]);
    if (gR.attackers(m.to, foe).length) { why = ` The queen comes out too early – after <b>${reply.san}</b> she has to move again while ${P.opp} develops.`; whySay = S.bad.queen; }
  }
  if (!why && m.piece === 'k' && !m.san.startsWith('O-O') && (rights.k || rights.q) && !g0.inCheck()) { why = ` Moving the king gives up castling.`; whySay = S.bad.kingMove; }
  if (!why && m.piece === 'p' && 'fgh'.includes(m.from[0]) && pieces(g0, me).some(p => p.type === 'k' && 'gh'.includes(p.square[0]))) { why = ` It loosens the pawns in front of ${P.your} king.`; whySay = S.bad.weakens; }
  if (!why && g0.moveNumber() <= 12 && undeveloped >= 2 && bestFacts.some(f => f.startsWith('develops') || f.startsWith('gets the king')) && !facts.some(f => f.startsWith('develops') || f.startsWith('gets the king'))) {
    why = ` ${P.You} still ${P.have} pieces at home – getting them out matters more.`; whySay = S.bad.develop;
  }
  if (!why && reply) {
    const rf = moveFacts(g1.fen(), pv[1], {}).filter(f => !f.startsWith('develops') && !f.startsWith('takes space')).slice(0, 1);
    if (rf.length) why = ` Now <b>${reply.san}</b> ${rf[0]}.`;
  }
  return R(`${shift}${why}${better()}`, [lead, shiftSay, whySay, whySay ? null : betterSay()]);
}
const pickLine = (arr, seed) => (arr ? pick(arr, seed + 's') : null);

/* ================= hints ================= */
// Three levels: an idea, the piece, the move. Returns { text, say, squares, arrow }.
export function hintFor(fen, root, level, P = persp(true)) {
  const best = root && root.lines[0];
  if (!best) return null;
  const g0 = new Chess(fen), me = g0.turn();
  const bu = best.pv[0], b = tryMove(new Chess(fen), bu);
  if (!b) return null;
  const s = scoreOf(best);
  const H = (text, say, extra = {}) => ({ text, say: [say], squares: [], ...extra });
  if (level >= 3) {
    const f = moveFacts(fen, bu).slice(0, 2);
    return H(`Play <b>${b.san}</b>${f.length ? ` – it ${joinFacts(f)}` : ''}.`, S.hint.show, { arrow: [b.from, b.to] });
  }
  if (level === 2) return H(`Move ${P.your} ${NAME[b.piece]}${b.piece === 'p' ? ` on ${b.from}` : ''}.`, S.hint.piece(b.piece), { squares: [b.from] });
  // level 1: the idea
  if (mateFor(s, me)) return Math.abs(s.mate) <= 1 ? H(S.hint.mate1, S.hint.mate1) : H(S.hint.mate, S.hint.mate);
  const out = pvOutcome(fen, best.pv, me);
  const t0 = threatsAgainst(g0, me);
  const gB = new Chess(fen); tryMove(gB, bu);
  if (t0.length && t0[0].gain >= 1 && !threatsAgainst(gB, me).some(t => t.sq === t0[0].sq) && out.delta <= 0)
    return H(`${P.Your} ${NAME[t0[0].type]} on ${t0[0].sq} is under attack. Deal with that first.`, S.hint.attacked(t0[0].type));
  if (out.delta >= 1) {
    if (b.captured && g0.attackers(b.to, other(me)).length === 0) return H(S.hint.free, S.hint.free);
    if (forkTargets(gB, b.to).length >= 2) return H('Look for a fork – one move that attacks two things at once.', S.hint.fork);
    const lm = lineMotif(gB, b.to);
    if (lm) return lm.kind === 'pin' ? H(S.hint.pin, S.hint.pin) : H('Look for a skewer – attack through one piece to the one behind.', S.hint.skewer);
    if (discovered(g0, gB, b)) return H(S.hint.disc, S.hint.disc);
    return H(S.hint.win, S.hint.win);
  }
  if (b.san.startsWith('O-O')) return H(S.hint.king, S.hint.king);
  const home = me === 'w' ? '1' : '8';
  if ((b.piece === 'n' || b.piece === 'b') && b.from[1] === home && g0.moveNumber() <= 15) return H(S.hint.develop, S.hint.develop);
  if (b.piece === 'p' && 'cdef'.includes(b.to[0]) && '45'.includes(b.to[1]) && g0.moveNumber() <= 12) return H(S.hint.centre, S.hint.centre);
  if (b.captured) return H(S.hint.capture, S.hint.capture);
  const f = moveFacts(fen, bu);
  if (f.some(x => x.startsWith('threatens'))) return H(S.hint.threat, S.hint.threat);
  return H(`Find a better square for one of your pieces – the ${NAME[b.piece]} can do more.`, S.hint.improve(b.piece));
}

/* ================= coach remarks during a game ================= */
// After the opponent moves: point out their blunder or a new threat (without giving the answer away).
export function afterOpponent(info, fenNow, fenBefore, P = persp(true)) {
  const me = new Chess(fenNow).turn();
  if (info && (info.cls === 'blunder' || info.cls === 'mistake' || info.cls === 'miss')) {
    const big = info.cls === 'blunder';
    return { mood: 'wow', text: `${P.Opp} just made a ${big ? 'big mistake' : 'mistake'}! Can you find the best reply?`, say: [big ? S.alert.blunder : S.alert.mistake] };
  }
  const now = threatsAgainst(new Chess(fenNow), me).filter(t => t.gain >= 2);
  const before = new Set(threatsAgainst(new Chess(fenBefore), me).map(t => t.sq));
  const nw = now.find(t => !before.has(t.sq));
  if (nw) return { mood: 'think', text: `Watch out – ${P.your} ${NAME[nw.type]} on ${nw.sq} is under attack.`, say: [S.alert.threat(nw.type)] };
  if (new Chess(fenNow).inCheck()) return { mood: 'think', text: 'You’re in check.', say: [S.alert.check] };
  return null;
}

/* ================= review ================= */
export async function reviewGame(eng, sans, startFen, known, onProgress, cancelled) {
  const g = startFen ? new Chess(startFen) : new Chess();
  const fens = [g.fen()], mvs = [];
  for (const s of sans) { mvs.push(g.move(s)); fens.push(g.fen()); }
  const op = startFen ? { name: '', plies: 0 } : opening(sans);
  const out = [];
  for (let i = 0; i < mvs.length; i++) {
    const m = mvs[i], uci = uciOf(m);
    let info = known && known[i];
    const usable = info && info.uci === uci && info.fen === fens[i] && info.depth > 0 && info.best;
    if (!usable) {
      info = await gradeMove(eng, fens[i], uci, { book: i < op.plies, prevTo: i && mvs[i - 1].captured ? mvs[i - 1].to : null, prevCls: i ? out[i - 1].cls : null, tag: 'review' });
    }
    out.push(info);
    if (cancelled && cancelled()) return null;
    onProgress && onProgress((i + 1) / mvs.length);
  }
  return { fens, moves: out, opening: op.name };
}

export function accuracyOf(list) {
  const a = list.filter(m => m.cls !== 'book').map(m => m.acc);
  if (!a.length) return 100;
  const mean = a.reduce((s, x) => s + x, 0) / a.length;
  const harm = a.length / a.reduce((s, x) => s + 1 / Math.max(x, 5), 0);
  return (mean + harm) / 2;
}

export function summarize(rev, me, result, oppName) {
  const stat = c => {
    const ms = rev.moves.filter(m => m.mover === c);
    const n = {}; Object.keys(CLASSES).forEach(k => { n[k] = ms.filter(m => m.cls === k).length; });
    return { acc: accuracyOf(ms), n };
  };
  const s = { w: stat('w'), b: stat('b') };
  const mine = rev.moves.map((m, i) => ({ ...m, i, no: Math.floor(i / 2) + 1 })).filter(m => m.mover === me);
  const bad = mine.filter(m => ['mistake', 'blunder', 'miss'].includes(m.cls));
  const worst = [...bad].sort((a, b) => b.drop - a.drop)[0];
  const text = [];
  const you = me === 'w' ? '1-0' : '0-1';
  text.push(result === you ? 'Well played – a win!' : result === '1/2-1/2' ? 'A draw. Let’s see where either side could have done more.' : result === '*' ? 'Let’s look at what happened.' : 'A tough one – but losses teach the most.');
  if (rev.opening) {
    const early = mine.find(m => m.no <= 10 && BAD.includes(m.cls));
    text.push(`It was the <b>${rev.opening}</b>. ` + (early ? `The first slip came on move ${early.no}.` : 'You came out of the opening in good shape.'));
  }
  if (worst) {
    const P = persp(true, 'you', oppName || 'your opponent');
    text.push(`The key moment was move ${worst.no}, <b>${worst.san}</b>: ${describe(worst, P, { prevInfo: rev.moves[worst.i - 1] })}`);
  } else text.push('No big mistakes from you in this game – very clean.');
  const great = mine.filter(m => m.cls === 'brilliant' || m.cls === 'great');
  if (great.length) text.push(`Best moment: <b>${great[0].no}.${great[0].mover === 'b' ? '..' : ''}${great[0].san}</b> – ${CLASSES[great[0].cls].label.toLowerCase()}!`);
  const counts = {};
  for (const m of bad.concat(mine.filter(x => x.cls === 'inaccuracy'))) {
    const said = explain(m, persp(true)).say.join(' ');
    const k = /checkmate/.test(said) && !/You had/.test(said) ? 'mate' : /missed|free|chance|punish/i.test(said) ? 'miss'
      : /protected|safe|under attack|protecting|lets your opponent|allows a (fork|pin|skewer)|loses material|hold everything/.test(said) ? 'hung' : 'other';
    counts[k] = (counts[k] || 0) + (m.cls === 'blunder' ? 3 : m.cls === 'inaccuracy' ? 0.5 : 1.5);
  }
  const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  const tips = {
    hung: 'Homework: before you let go of a piece, ask “is that square safe, and is everything still protected?”',
    mate: 'Homework: every move, look at the checks your opponent could give – that’s how mates sneak up on you.',
    miss: 'Homework: when your opponent moves, ask “did that leave something loose?” Checks, captures, attacks – every move.',
    other: 'Homework: in quiet positions, find your worst piece and give it a better square.'
  };
  if (top) text.push(tips[top]);
  return { stats: s, text, keys: bad.map(m => m.i) };
}
