// Position editor: place pieces, choose who moves, or paste a FEN.
import { Chess } from './chess.js';
import { pieceSvg } from './board.js';
import { play } from './sound.js';
import { $, esc, ACT, screen, go } from './ui.js';
import { getSetup, useCustom, startGame, LEVELS } from './play.js';

const FILES = 'abcdefgh';
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
let E = null;

function parse(placement) {
  const map = {};
  placement.split('/').forEach((row, r) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { f += +ch; continue; }
      map[FILES[f] + (8 - r)] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toLowerCase();
      f++;
    }
  });
  return map;
}
function placement(map) {
  const rows = [];
  for (let r = 8; r >= 1; r--) {
    let row = '', empty = 0;
    for (const f of FILES) {
      const p = map[f + r];
      if (!p) { empty++; continue; }
      if (empty) { row += empty; empty = 0; }
      row += p[0] === 'w' ? p[1].toUpperCase() : p[1];
    }
    rows.push(row + (empty || ''));
  }
  return rows.join('/');
}
function castling(map) {
  let c = '';
  if (map.e1 === 'wk') { if (map.h1 === 'wr') c += 'K'; if (map.a1 === 'wr') c += 'Q'; }
  if (map.e8 === 'bk') { if (map.h8 === 'br') c += 'k'; if (map.a8 === 'br') c += 'q'; }
  return c || '-';
}
const fenOf = () => `${placement(E.map)} ${E.turn} ${castling(E.map)} - 0 1`;

// Returns an error message, or '' when the position can be played.
export function checkFen(fen) {
  const map = parse(fen.split(' ')[0]);
  const kings = c => Object.values(map).filter(p => p === c + 'k').length;
  if (kings('w') !== 1 || kings('b') !== 1) return 'Each side needs exactly one king.';
  if (Object.entries(map).some(([sq, p]) => p[1] === 'p' && (sq[1] === '1' || sq[1] === '8'))) return 'Pawns can’t stand on the first or last row.';
  let g;
  try { g = new Chess(fen); } catch (e) { return 'That position isn’t valid.'; }
  const f = fen.split(' '); f[1] = f[1] === 'w' ? 'b' : 'w';
  try { if (new Chess(f.join(' ')).inCheck()) return `${f[1] === 'w' ? 'White' : 'Black'} is in check but it’s not their move.`; } catch (e) { /* ignore */ }
  if (g.isCheckmate()) return 'This position is already checkmate.';
  if (g.isStalemate()) return 'This position is already stalemate.';
  return '';
}

// Small static board for previews.
export function miniBoard(fen) {
  const map = parse(fen.split(' ')[0]);
  let h = '';
  for (let r = 8; r >= 1; r--) for (let f = 0; f < 8; f++) {
    const sq = FILES[f] + r, p = map[sq];
    h += `<div class="s ${(f + r) % 2 ? 'l' : 'd'}">${p ? pieceSvg(p[0], p[1]) : ''}</div>`;
  }
  return `<div class="mini">${h}</div>`;
}

export function viewEditor() {
  const s = getSetup();
  const fen = s.fen || START_FEN;
  E = { map: parse(fen.split(' ')[0]), turn: fen.split(' ')[1] || 'w', tool: 'wq', flip: false };
  screen(`<div class="top"><button class="back" data-go="#/play" aria-label="Back">‹</button><span class="ttl">Set up a position</span></div>
    <div class="ed">
      <div class="ed-board" id="edb"></div>
      <div class="ed-pal" id="pal"></div>
      <p class="muted small ed-tip">Pick a piece, then tap squares to place it. Tap a piece of the same kind again to remove it.</p>
      <div class="seg" id="turnseg"></div>
      <div class="ed-row"><button class="btn sec sm" data-act="startpos">Start position</button><button class="btn sec sm" data-act="clear">Clear</button><button class="btn sec sm" data-act="flipb">Flip</button></div>
      <div class="ed-fen"><input id="fen" spellcheck="false" autocomplete="off" aria-label="FEN"><button class="btn sec sm" data-act="loadfen">Load FEN</button></div>
      <p class="ed-msg" id="emsg"></p>
      <button class="btn col" data-act="usepos" id="usepos"><span>Play this position</span><small id="usemode"></small></button>
    </div>`, null);
  $('#view').classList.add('pad');
  ACT.sq = el => {
    const sq = el.dataset.id, cur = E.map[sq];
    if (E.tool === 'x' || cur === E.tool) delete E.map[sq];
    else {
      if (E.tool[1] === 'p' && (sq[1] === '1' || sq[1] === '8')) { msg('Pawns can’t go on the first or last row.'); play('illegal'); return; }
      if (E.tool[1] === 'k') for (const k of Object.keys(E.map)) if (E.map[k] === E.tool) delete E.map[k];
      E.map[sq] = E.tool;
    }
    play('move'); draw();
  };
  ACT.tool = el => { E.tool = el.dataset.id; draw(); };
  ACT.turn = el => { E.turn = el.dataset.id; draw(); };
  ACT.startpos = () => { E.map = parse(START_FEN.split(' ')[0]); E.turn = 'w'; draw(); };
  ACT.clear = () => { E.map = { e1: 'wk', e8: 'bk' }; draw(); };
  ACT.flipb = () => { E.flip = !E.flip; draw(); };
  ACT.loadfen = () => {
    const v = $('#fen').value.trim().replace(/\s+/g, ' ');
    const parts = v.split(' ');
    if (!/^([pnbrqkPNBRQK1-8]{1,8}\/){7}[pnbrqkPNBRQK1-8]{1,8}$/.test(parts[0])) { msg('That doesn’t look like a FEN.'); return; }
    E.map = parse(parts[0]); E.turn = parts[1] === 'b' ? 'b' : 'w'; draw();
  };
  ACT.usepos = () => {
    const f = fenOf(), err = checkFen(f);
    if (err) { msg(err); play('illegal'); return; }
    useCustom(f);
    startGame();
  };
  draw();
}

function msg(t) { const m = $('#emsg'); if (m) m.textContent = t; }

function draw() {
  let h = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const f = E.flip ? 7 - x : x, r = E.flip ? y + 1 : 8 - y, sq = FILES[f] + r, p = E.map[sq];
    h += `<button class="s ${(f + r) % 2 ? 'l' : 'd'}" data-act="sq" data-id="${sq}" aria-label="${sq}">${p ? pieceSvg(p[0], p[1]) : ''}${x === 0 ? `<i class="cr">${r}</i>` : ''}${y === 7 ? `<i class="cf">${FILES[f]}</i>` : ''}</button>`;
  }
  $('#edb').innerHTML = h;
  $('#pal').innerHTML = ['w', 'b'].map(c => `<div class="ed-pr">${'kqrbnp'.split('').map(t => `<button class="ed-t ${E.tool === c + t ? 'on' : ''}" data-act="tool" data-id="${c + t}" aria-label="${c === 'w' ? 'White' : 'Black'} ${t}">${pieceSvg(c, t)}</button>`).join('')}${c === 'b' ? `<button class="ed-t ${E.tool === 'x' ? 'on' : ''}" data-act="tool" data-id="x" aria-label="Eraser">✕</button>` : '<span class="ed-t blank"></span>'}</div>`).join('');
  $('#turnseg').innerHTML = [['w', 'White to move'], ['b', 'Black to move']].map(([k, t]) => `<button class="${E.turn === k ? 'on' : ''}" data-act="turn" data-id="${k}">${t}</button>`).join('');
  const f = fenOf(), err = checkFen(f);
  const inp = $('#fen'); if (inp && document.activeElement !== inp) inp.value = f;
  msg(err);
  $('#usepos').disabled = !!err;
  const s = getSetup(), um = $('#usemode');
  if (um) um.textContent = s.level === 'otb' ? 'Over the board – you move both sides' : `Against ${(LEVELS.find(l => l.id === s.level) || { name: 'the bot' }).name}`;
}
