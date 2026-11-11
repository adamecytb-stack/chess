// What Olly says out loud. Every line here is pre-recorded (dev/make_voice.mjs), so speech plays instantly
// in the same natural voice on every device. The on-screen text can be more detailed than the spoken line.
export const PIECES = ['pawn', 'knight', 'bishop', 'rook', 'queen'];
const N = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const pn = t => N[t] || t;
const wins = t => t === 'q' ? 'That wins the queen.' : `That wins a ${pn(t)}.`;

export const S = {
  lead: {
    best: ['Best move!', 'That’s the top move.', 'Exactly right.', 'Spot on.'],
    excellent: ['Excellent.', 'Very strong.', 'Strong move.'],
    good: ['Good move.', 'Solid.', 'That’s a decent move.'],
    inaccuracy: ['Hmm, not the most accurate.', 'There was something a little better.'],
    mistake: ['That’s a mistake.', 'Careful, that’s a mistake.'],
    miss: ['You missed a chance there.'],
    blunder: ['Oh no, that’s a blunder!', 'Ouch, that’s a blunder.']
  },
  theirs: {
    brilliant: 'A brilliant move by your opponent.', great: 'A great move by your opponent.', best: 'Best move by your opponent.',
    excellent: 'An excellent move by your opponent.', good: 'A good move by your opponent.', book: 'Book move.',
    inaccuracy: 'An inaccuracy by your opponent.', mistake: 'A mistake by your opponent.', miss: 'Your opponent missed a chance.', blunder: 'Your opponent blundered.'
  },
  brilliant: 'Wow, brilliant! What a sacrifice.',
  great: 'Great move! It’s the only one that works.',
  greatMate: 'Great move! That starts a forced checkmate.',
  checkmate: 'Checkmate!',
  book: 'Book move.',
  opening: name => `This is the ${name}.`,
  fact: {
    wins, material: 'That wins material.', fork: 'Nice fork!', pin: 'Nice pin.', skewer: 'Nice skewer!', discovered: 'A discovered attack!',
    safe: t => `Good, you get your ${pn(t)} out of danger.`, protects: t => `And it protects your ${pn(t)}.`, threat: 'And it creates a threat.',
    castle: 'Your king is safe now.', develop: 'Good development.', centre: 'Good, you take the centre.', rook: 'The rook loves that open file.',
    passed: 'Push that passed pawn!', king: 'Good, your king joins the fight.', promote: 'A new queen!', check: 'Check!'
  },
  bad: {
    allowsMate1: 'This allows checkmate!', allowsMate: 'This allows a forced checkmate.', missedMate: 'You had a checkmate there!',
    hung: t => `Your ${pn(t)} isn’t protected there.`, unsafe: t => `Your ${pn(t)} isn’t safe there.`, wasHanging: t => `Your ${pn(t)} was already under attack.`,
    guarded: 'That piece was protecting something important.', lets: 'That lets your opponent win material.',
    fork: 'That allows a fork.', pin: 'That allows a pin.', skewer: 'That allows a skewer.', check: 'After the check, you can’t hold everything.',
    loses: 'That loses material.', worse: 'And it gets even worse.',
    oppMistake: 'Your opponent just made a mistake, but you didn’t punish it.',
    free: t => `There was a free ${pn(t)} to take!`, missedFork: 'You missed a fork!', missedPin: 'You missed a pin.', missedSkewer: 'You missed a skewer.',
    missedDisc: 'You missed a discovered attack.', missedWin: 'You missed a way to win material.', missedHidden: 'There’s a way to win material here.',
    throws: 'That throws away your advantage.', clearlyBetter: 'Now your opponent is clearly better.', easier: 'That hands your opponent the easier game.',
    worsens: 'That makes your position worse.', notAccurate: 'Not the most accurate.',
    queen: 'Your queen came out too early.', kingMove: 'Moving the king gives up castling.', weakens: 'That weakens your king.', develop: 'Get your other pieces out first.',
    better: 'There was a better move.', betterCastle: 'Castling was better.', betterDevelop: 'Developing a piece was better.', betterCentre: 'Taking the centre was better.', betterCapture: 'Capturing was better.'
  },
  hint: {
    mate1: 'There’s a checkmate in one! Look at every check.', mate: 'There’s a checkmate here! Look at every check.',
    attacked: t => `Your ${pn(t)} is under attack. Deal with that first.`, free: 'Something of theirs is unprotected. Look closely!',
    fork: 'Look for a fork. One move that attacks two things at once.', pin: 'Look for a pin.', skewer: 'Look for a skewer.',
    disc: 'Try moving a piece out of the way to uncover an attack.', win: 'There’s a way to win material. Check every capture and every check.',
    king: 'Think about your king’s safety.', develop: 'Bring a new piece into the game.', centre: 'Fight for the centre.', capture: 'There’s a capture worth making.',
    threat: 'You can make a strong threat.', improve: t => `Find a better square for one of your pieces. Your ${pn(t)} can do more.`,
    piece: t => `Move your ${pn(t)}.`, show: 'Here’s the move I’d play.', look: 'Let me look.'
  },
  alert: {
    blunder: 'Your opponent just blundered! Can you punish it?', mistake: 'Your opponent just made a mistake! Can you find the best reply?',
    threat: t => `Watch out, your ${pn(t)} is under attack.`, check: 'You’re in check.'
  },
  game: {
    white: 'You have White. Remember: centre, develop, castle.', black: 'You have Black. Your opponent starts.', back: 'Welcome back. Your move.',
    takeback: 'Want to take it back?', tookBack: 'Okay, the move is back. Look again. What is safer, or stronger?', undo: 'Took a move back. Your turn again.',
    win: 'Checkmate, you won!', lost: 'Checkmate. Your opponent wins this one.', resign: 'You resigned.', stalemate: 'Stalemate. It’s a draw.',
    repetition: 'Draw by repetition.', material: 'Draw. There aren’t enough pieces left to checkmate.', fifty: 'Draw by the fifty move rule.',
    review: 'Let’s go through the game together.', playOn: 'Okay, let’s play on.'
  },
  review: {
    win: 'Well played. A win!', draw: 'A draw. Let’s see where either side could have done more.', open: 'Let’s look at what happened.',
    loss: 'A tough one. But losses teach the most.', clean: 'No big mistakes from you in this game. Very clean.', keys: 'Let’s look at the key moments.',
    start: 'Tap next to step through the game. The green arrow shows the move I would have played.', noMore: 'No more big moments from you after this point.',
    retry: 'Find a better move.', same: 'That’s the move from the game. Try something else.', yes: 'Yes! That’s better.', notQuite: 'Not quite. Try again.',
    mine: 'Here’s my choice.', line: 'Here’s the better line.'
  },
  lesson: {
    remember: 'Your move. Do you remember how it starts?', move: 'Your move.', done: 'That’s it. Well done!', next: 'Nice. Ready for the next one?',
    correct: 'Correct!', wrongLearn: 'That’s not the move for this lesson. Follow the blue arrow.', fine: 'That’s a fine move too. But in this lesson we’re learning a different one.',
    stronger: 'That’s a good move, but there’s something even stronger.', quicker: 'That also wins, but there’s a quicker way.',
    tryAgain: 'Try again.', marked: 'Hint: move the piece I marked.', showMove: 'Here’s the move. Play it on the board.',
    pieceHint: t => `Move your ${pn(t)}. I marked it.`, theMove: 'Here’s the move.',
    learned: 'Lesson learned. Now play it from memory to earn all three stars.', perfect: 'Perfect! No mistakes, no hints. This one is yours.',
    wellDone: 'Well done. Do it again without mistakes or hints for three stars.'
  },
  test: 'Hi, I’m Olly, your coach. This is how I sound.'
};

export const pick = (arr, seed) => { let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0; return arr[Math.abs(h) % arr.length]; };

// Spoken line for a fact string produced by the coach ("forks the king and the rook" -> "Nice fork!")
export function factLine(f) {
  if (!f) return null;
  let m;
  if ((m = f.match(/^wins (?:a |the )?(pawn|knight|bishop|rook|queen)/))) return wins({ pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q' }[m[1]]);
  if (/^wins (material|the exchange)/.test(f)) return S.fact.material;
  if (f.startsWith('forks')) return S.fact.fork;
  if (f.startsWith('pins')) return S.fact.pin;
  if (f.startsWith('skewers')) return S.fact.skewer;
  if (/discovered|uncovers/.test(f)) return S.fact.discovered;
  if ((m = f.match(/^gets the (pawn|knight|bishop|rook|queen|king) out of danger/))) return m[1] === 'king' ? S.fact.castle : S.fact.safe(m[1]);
  if ((m = f.match(/^protects the (pawn|knight|bishop|rook|queen)/))) return S.fact.protects(m[1]);
  if (f.startsWith('threatens')) return S.fact.threat;
  if (f.startsWith('gets the king to safety')) return S.fact.castle;
  if (f.startsWith('develops')) return S.fact.develop;
  if (f.startsWith('takes space')) return S.fact.centre;
  if (f.startsWith('puts the rook')) return S.fact.rook;
  if (f.startsWith('pushes the passed')) return S.fact.passed;
  if (f.startsWith('brings the king')) return S.fact.king;
  if (f.startsWith('promotes')) return S.fact.promote;
  return null;
}

// Every line Olly can say in games, hints and reviews (used to pre-record the voice).
export function allGameLines(openingNames = []) {
  const out = [];
  const add = x => { if (Array.isArray(x)) x.forEach(add); else if (typeof x === 'function') PIECES.forEach(p => add(x(p))); else if (x && typeof x === 'object') Object.values(x).forEach(add); else if (x) out.push(x); };
  add(S.lead); add(S.theirs);
  add([S.brilliant, S.great, S.greatMate, S.checkmate, S.book, S.test]);
  add(['pawn', 'knight', 'bishop', 'rook', 'queen'].map(n => wins({ pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q' }[n])));
  add(S.fact); add(S.bad); add(S.hint); add(S.alert); add(S.game); add(S.review); add(S.lesson);
  out.push(S.hint.piece('k'), S.hint.improve('k'), S.lesson.pieceHint('k'));
  openingNames.forEach(n => out.push(S.opening(n)));
  return out;
}
