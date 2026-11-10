// Dev check: node validate.mjs — replays every line and puzzle in course.js.
import { Chess } from './chess.js';
import { COURSE } from './course.js';

let bad = 0, parts = 0, moves = 0;
const ids = new Set();
for (const unit of COURSE) for (const lesson of unit.lessons) {
  if (ids.has(lesson.id)) { bad++; console.log('DUPLICATE ID', lesson.id); }
  ids.add(lesson.id);
  lesson.parts.forEach((part, pi) => {
    parts++;
    const where = `${lesson.id} / ${pi + 1} ${part.title}`;
    let g;
    try { g = part.fen ? new Chess(part.fen) : new Chess(); }
    catch (e) { bad++; console.log('BAD FEN', where, e.message); return; }
    for (let i = 0; i < part.moves.length; i++) {
      const [san] = part.moves[i];
      // mate-in-1 puzzles: the mating move must be the only mate
      if (part.end === 'mate' && i === part.moves.length - 1) {
        const mates = g.moves().filter(m => m.endsWith('#'));
        if (mates.length !== 1) { bad++; console.log('NOT UNIQUE MATE', where, mates.join(' ')); }
      }
      let r;
      try { r = g.move(san, { strict: true }); }
      catch (e) { bad++; console.log('ILLEGAL', where, `move ${i + 1}: ${san}`); return; }
      if (r.san !== san) { bad++; console.log('SAN MISMATCH', where, san, '->', r.san); }
      moves++;
    }
    if (part.end === 'mate' && !g.isCheckmate()) { bad++; console.log('NOT MATE', where); }
    if (part.end === 'stalemate' && !g.isStalemate()) { bad++; console.log('NOT STALEMATE', where); }
    // the learner must make the last move, except in the stalemate-defence line
    const last = g.history({ verbose: true }).at(-1);
    if (last && last.color !== part.side && part.end !== 'stalemate') { bad++; console.log('LINE ENDS ON OPPONENT MOVE', where); }
  });
}
console.log(`${parts} parts, ${moves} moves checked, ${bad} problem(s)`);
process.exit(bad ? 1 : 0);
