// Course content. Every line and puzzle is checked by validate.mjs.
// part: { title, side:'w'|'b', fen?, prompt?, end?:'mate'|'stalemate', moves:[[san, note], ...] }
// You play the moves of `side`; the other side's moves are played for you.

export const COURSE = [
  /* ------------------------------------------------------------------ */
  {
    id: 'basics', title: 'Opening basics', sub: 'The rules that work in every opening', icon: '♟',
    lessons: [
      {
        id: 'golden-rules', title: 'The 5 golden rules', sub: 'A perfect first 7 moves',
        intro: [
          'You do not need to memorise 20 moves of theory. If you follow five rules you will get a good position in almost every game:',
          '<b>1.</b> Put a pawn in the centre (e4 or d4).<br><b>2.</b> Develop knights and bishops – every move a new piece.<br><b>3.</b> Castle early, your king is safe there.<br><b>4.</b> Do not move the same piece twice without a reason.<br><b>5.</b> Do not bring the queen out early – she gets chased around.',
          'Let’s play a model opening with White and see the rules in action.'
        ],
        parts: [{
          title: 'Model opening', side: 'w',
          moves: [
            ['e4', 'Rule 1: take the centre. The pawn controls d5 and f5 and opens lines for your queen and bishop.'],
            ['e5', 'Black does the same.'],
            ['Nf3', 'Rule 2: develop – and attack the e5 pawn at the same time. A developing move with a threat is the best kind.'],
            ['Nc6', 'Black defends the pawn with a developing move.'],
            ['Bc4', 'The bishop goes to its best diagonal. It looks at f7, the weakest square in Black’s camp (only the king defends it).'],
            ['Bc5', ''],
            ['Nc3', 'Another new piece. Knights belong on c3 and f3, pointing at the centre.'],
            ['Nf6', ''],
            ['d3', 'Protects e4 and c4 and opens the diagonal for the last bishop.'],
            ['d6', ''],
            ['O-O', 'Rule 3: castle. King safe, rook closer to the centre. Notice: 6 moves, no piece moved twice.'],
            ['O-O', ''],
            ['h3', 'A small useful move: it stops …Bg4, which would pin your knight to the queen. Now you are fully ready for the middlegame.']
          ]
        }]
      },
      {
        id: 'scholars', title: 'Scholar’s mate', sub: 'The 4-move trick – and how to punish it',
        intro: [
          'Everybody tries this trick at some point: queen and bishop both attack f7 and it is mate on move 4.',
          'First you will play it yourself to see the pattern. Then you will switch to Black and learn the simple defence – after which White’s queen is just badly placed.'
        ],
        parts: [
          {
            title: 'See the trick', side: 'w',
            moves: [
              ['e4', 'Start normally.'],
              ['e5', ''],
              ['Qh5', 'The queen comes out early (this breaks rule 5!). She attacks e5 and looks at f7.'],
              ['Nc6', 'Black defends e5. So far so good.'],
              ['Bc4', 'Now queen AND bishop attack f7. The threat is Qxf7 mate.'],
              ['Nf6', 'A natural move that attacks the queen… but it ignores the threat.'],
              ['Qxf7#', 'Checkmate. The king cannot take because the bishop protects the queen.']
            ]
          },
          {
            title: 'Stop it as Black', side: 'b',
            moves: [
              ['e4', ''],
              ['e5', 'Answer in the centre.'],
              ['Qh5', 'Here comes the queen.'],
              ['Nc6', 'First defend e5 – with a developing move.'],
              ['Bc4', 'Threat: Qxf7 mate. Find the defence!'],
              ['g6', 'Blocks the queen’s path to f7 and attacks her. She must move again.'],
              ['Qf3', 'She threatens mate on f7 once more.'],
              ['Nf6', 'Blocks the f-file with a developing move. The threat is gone for good.'],
              ['Ne2', ''],
              ['Bg7', 'The pawn on g6 made a perfect home for the bishop.'],
              ['Nbc3', ''],
              ['d6', 'Opens the other bishop.'],
              ['d3', ''],
              ['O-O', 'You are castled and well developed. White wasted time with the queen – you are already slightly better.']
            ]
          }
        ]
      },
      {
        id: 'legal', title: 'Greedy = punished', sub: 'Légal’s mate: why development beats material',
        intro: [
          'This famous trap is more than 250 years old. Black wastes time with pawn moves, then grabs a queen – and gets mated by three small pieces.',
          'The lesson: when you are ahead in development, look for tactics.'
        ],
        parts: [{
          title: 'Légal’s mate', side: 'w',
          moves: [
            ['e4', ''],
            ['e5', ''],
            ['Nf3', 'Develop with a threat.'],
            ['d6', 'Solid, but it locks in the f8 bishop.'],
            ['Bc4', 'Aim at f7.'],
            ['Bg4', 'Black pins your knight to the queen.'],
            ['Nc3', 'Keep developing. You now have three pieces out.'],
            ['g6', 'Too slow! Black has only one piece developed. Time to strike.'],
            ['Nxe5', 'A shock: the “pinned” knight moves and leaves the queen hanging. If Black plays …dxe5 you take Qxg4 and are a pawn up.'],
            ['Bxd1', 'Black takes the queen. Greedy…'],
            ['Bxf7+', 'Check! The king has only one square.'],
            ['Ke7', ''],
            ['Nd5#', 'Checkmate with two knights and a bishop. Black’s extra queen did not help at all.']
          ]
        }]
      }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'white', title: 'Playing White: 1.e4', sub: 'The Italian Game – simple and strong', icon: '♔',
    lessons: [
      {
        id: 'italian', title: 'Italian Game: main setup', sub: 'Your everyday opening with White',
        intro: [
          'The Italian Game (1.e4 e5 2.Nf3 Nc6 3.Bc4) is the best first opening: every move follows the golden rules and the plans are easy to remember.',
          '<b>Your setup:</b> pawns on e4, d3, c3 · bishop on c4 (later b3) · knights on f3 and d2 · castle short · rook to e1.',
          '<b>Your plan:</b> the b1 knight travels d2 → f1 → g3, then you push d3–d4 when you are ready.'
        ],
        parts: [{
          title: 'Main line', side: 'w',
          moves: [
            ['e4', ''],
            ['e5', ''],
            ['Nf3', ''],
            ['Nc6', ''],
            ['Bc4', 'This is the Italian Game.'],
            ['Bc5', 'Black’s most common answer.'],
            ['c3', 'Key move. It prepares d4 later and takes the d4 and b4 squares away from Black’s pieces.'],
            ['Nf6', 'Black attacks e4.'],
            ['d3', 'Defend e4 calmly. (The sharp 5.d4 is also possible, but this is easier to play.)'],
            ['d6', ''],
            ['O-O', 'King to safety.'],
            ['O-O', ''],
            ['Re1', 'The rook supports e4 and frees the f1 square for your knight.'],
            ['a6', 'Black makes a hiding place for the bishop.'],
            ['Bb3', 'You do the same: the bishop steps back so it cannot be chased by …Na5 or …b5 with tempo.'],
            ['Ba7', ''],
            ['h3', 'Stops …Bg4 and …Ng4.'],
            ['h6', ''],
            ['Nbd2', 'The knight starts its journey: d2 → f1 → g3. After that you are ready for d4. You know the Italian!']
          ]
        }]
      },
      {
        id: 'fried-liver', title: 'The Fried Liver attack', sub: 'When Black plays 3…Nf6 carelessly',
        intro: [
          'If Black answers the Italian with 3…Nf6 (the Two Knights Defence), you can jump in with 4.Ng5 and attack f7 with two pieces.',
          'Many players at club level take back on d5 with the knight. That is a mistake – and you sacrifice a knight to drag the king into the middle of the board.'
        ],
        parts: [{
          title: 'Fried Liver', side: 'w',
          moves: [
            ['e4', ''],
            ['e5', ''],
            ['Nf3', ''],
            ['Nc6', ''],
            ['Bc4', ''],
            ['Nf6', 'The Two Knights Defence.'],
            ['Ng5', 'Breaks the “don’t move a piece twice” rule – but with a concrete threat: knight and bishop both hit f7.'],
            ['d5', 'The only good way to block the bishop.'],
            ['exd5', ''],
            ['Nxd5', 'The natural recapture – and the mistake. (Correct is 5…Na5.)'],
            ['Nxf7', 'The sacrifice! The knight forks queen and rook, so Black must take.'],
            ['Kxf7', ''],
            ['Qf3+', 'Check – and a second attacker on the d5 knight, which is pinned by your bishop.'],
            ['Ke6', 'The king has to come out to defend the knight. A king on e6 in the opening!'],
            ['Nc3', 'Bring more pieces. A third attacker on d5.'],
            ['Nb4', 'Black defends d5 again.'],
            ['O-O', 'Safe king, and the rook is ready to join through e1.'],
            ['c6', ''],
            ['d4', 'Open the centre against the king. You are a knight down but Black’s king will not survive long – this position wins most games in practice.']
          ]
        }]
      },
      {
        id: 'vs-others', title: 'When Black avoids 1…e5', sub: 'Simple answers to the Sicilian, French, Caro-Kann and Scandinavian',
        intro: [
          'Black does not have to answer 1.e4 with 1…e5. Here is one easy, healthy line against each of the four other common defences.',
          'You do not need more than this for a long time – just get your pieces out and castle.'
        ],
        parts: [
          {
            title: 'Sicilian (1…c5): the Alapin', side: 'w',
            moves: [
              ['e4', ''],
              ['c5', 'The Sicilian. Black fights for d4 from the side.'],
              ['c3', 'The Alapin: you prepare d4, and if Black takes you recapture with a pawn and keep a big centre.'],
              ['d5', 'Black hits back in the centre immediately.'],
              ['exd5', ''],
              ['Qxd5', 'Normally the queen would be chased by Nc3 – but your pawn is on c3.'],
              ['d4', 'There is your centre.'],
              ['Nc6', ''],
              ['Nf3', ''],
              ['Bg4', ''],
              ['Be2', 'Breaks the pin.'],
              ['cxd4', ''],
              ['cxd4', 'Pawn takes back. Now c3 is free for your knight.'],
              ['e6', ''],
              ['Nc3', 'Develops and attacks the queen – a free move.'],
              ['Qa5', ''],
              ['O-O', 'Fully developed, safe king, more space. A very comfortable position.']
            ]
          },
          {
            title: 'French (1…e6): the Exchange', side: 'w',
            moves: [
              ['e4', ''],
              ['e6', 'The French Defence.'],
              ['d4', 'Always take the full centre when Black lets you.'],
              ['d5', ''],
              ['exd5', 'The Exchange variation: simple and symmetrical, no theory needed.'],
              ['exd5', ''],
              ['Nf3', ''],
              ['Nf6', ''],
              ['Bd3', 'The best square: the bishop aims at h7.'],
              ['Bd6', ''],
              ['O-O', ''],
              ['O-O', ''],
              ['Bg5', 'Pin the knight. Next come Nbd2, c3 and Re1 – easy, natural moves.']
            ]
          },
          {
            title: 'Caro-Kann (1…c6): the Exchange', side: 'w',
            moves: [
              ['e4', ''],
              ['c6', 'The Caro-Kann.'],
              ['d4', ''],
              ['d5', ''],
              ['exd5', ''],
              ['cxd5', ''],
              ['Bd3', 'Takes the f5 square away from Black’s bishop.'],
              ['Nc6', 'Attacks d4.'],
              ['c3', 'Solid protection.'],
              ['Nf6', ''],
              ['Bf4', 'Your dark bishop gets out before you play Nd2.'],
              ['Bg4', ''],
              ['Qb3', 'Steps out of the pin and attacks b7 and d5 together. Black already has to be careful.']
            ]
          },
          {
            title: 'Scandinavian (1…d5)', side: 'w',
            moves: [
              ['e4', ''],
              ['d5', 'The Scandinavian.'],
              ['exd5', 'Just take it.'],
              ['Qxd5', ''],
              ['Nc3', 'Develop with tempo: the queen has to move again.'],
              ['Qa5', ''],
              ['d4', ''],
              ['Nf6', ''],
              ['Nf3', ''],
              ['c6', 'Gives the queen a way back.'],
              ['Bc4', ''],
              ['Bf5', ''],
              ['Bd2', 'A sneaky move: the bishop lines up with the queen on a5. You are ahead in development.']
            ]
          }
        ]
      },
      {
        id: 'london', title: 'Bonus: the London System', sub: 'A “same moves every game” opening with 1.d4',
        intro: [
          'Want an opening where you play nearly the same moves against everything? That is the London System.',
          '<b>Setup:</b> pawns d4, e3, c3 · bishop f4 · knights f3 and d2 · bishop d3 · castle short. It forms a pyramid of pawns that is very hard to break.'
        ],
        parts: [{
          title: 'London setup', side: 'w',
          moves: [
            ['d4', ''],
            ['d5', ''],
            ['Bf4', 'The London bishop – it comes out BEFORE you play e3, so it is not locked in.'],
            ['Nf6', ''],
            ['e3', ''],
            ['e6', ''],
            ['Nf3', ''],
            ['c5', 'Black attacks your centre.'],
            ['c3', 'The pyramid: c3 and e3 hold d4.'],
            ['Nc6', ''],
            ['Nbd2', ''],
            ['Bd6', 'Black offers to trade bishops.'],
            ['Bg3', 'Do not take. If Black takes on g3 you recapture hxg3 and your rook gets the open h-file.'],
            ['O-O', ''],
            ['Bd3', 'Aiming at h7. Next: castle, then Ne5 and a kingside attack.']
          ]
        }]
      }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'black-e4', title: 'Playing Black vs 1.e4', sub: 'Answer 1…e5 and know what is coming', icon: '♚',
    lessons: [
      {
        id: 'b-italian', title: 'Facing the Italian', sub: 'The same setup, from the other side',
        intro: [
          'Against 1.e4 play 1…e5. You already know the Italian with White – with Black you simply build the mirror setup.',
          '<b>Your setup:</b> knights c6 and f6 · bishop c5 (later a7) · pawn d6 · castle short.'
        ],
        parts: [{
          title: 'Solid Italian', side: 'b',
          moves: [
            ['e4', ''],
            ['e5', ''],
            ['Nf3', 'Your pawn is attacked.'],
            ['Nc6', 'Defend it with a knight.'],
            ['Bc4', ''],
            ['Bc5', 'The safest reply. Because your queen still guards g5, there is no Ng5 trick.'],
            ['c3', ''],
            ['Nf6', 'Develop and attack e4.'],
            ['d3', ''],
            ['d6', 'Protects e5 and opens your bishop.'],
            ['O-O', ''],
            ['a6', 'Makes a safe square on a7 for your bishop, so it cannot be hit by b4 or d4.'],
            ['Re1', ''],
            ['Ba7', ''],
            ['Bb3', ''],
            ['O-O', ''],
            ['h3', ''],
            ['h6', 'Stops Bg5. The position is equal – from here the better player wins, not the better memoriser.']
          ]
        }]
      },
      {
        id: 'b-fried', title: 'Defusing the Fried Liver', sub: 'The one move you must know: 5…Na5',
        intro: [
          'If you like 3…Nf6 instead of 3…Bc5, White can try 4.Ng5. You saw what happens after 5…Nxd5 – your king goes for a walk.',
          'The fix is one move: <b>5…Na5!</b> You stay a pawn down for a while, but White’s pieces get pushed back and you take over the game.'
        ],
        parts: [{
          title: 'The 5…Na5 line', side: 'b',
          moves: [
            ['e4', ''],
            ['e5', ''],
            ['Nf3', ''],
            ['Nc6', ''],
            ['Bc4', ''],
            ['Nf6', ''],
            ['Ng5', 'The attack on f7.'],
            ['d5', 'Block the bishop – the only good move.'],
            ['exd5', 'Do NOT take back with the knight!'],
            ['Na5', 'Attack the bishop instead. The Fried Liver is cancelled.'],
            ['Bb5+', ''],
            ['c6', 'Block with the pawn. You are giving a pawn for fast development.'],
            ['dxc6', ''],
            ['bxc6', 'Now the bishop is attacked again.'],
            ['Be2', ''],
            ['h6', 'Kick the knight.'],
            ['Nf3', ''],
            ['e4', 'And kick it again! White’s knight has moved four times.'],
            ['Ne5', ''],
            ['Bd6', 'You are a pawn down, but you have more space and easy development. Your position is great to play.']
          ]
        }]
      },
      {
        id: 'b-ruy', title: 'Facing the Ruy Lopez', sub: '3.Bb5 – the Spanish',
        intro: [
          'Stronger opponents often play 3.Bb5, the Ruy Lopez. The bishop attacks the knight that defends e5.',
          'Do not panic: the e5 pawn is not really hanging. You chase the bishop with …a6 and …b5 and develop normally.'
        ],
        parts: [
          {
            title: 'Main line', side: 'b',
            moves: [
              ['e4', ''],
              ['e5', ''],
              ['Nf3', ''],
              ['Nc6', ''],
              ['Bb5', 'The Ruy Lopez.'],
              ['a6', 'Ask the bishop a question right away.'],
              ['Ba4', ''],
              ['Nf6', 'Develop and attack e4.'],
              ['O-O', ''],
              ['Be7', 'Get ready to castle. The bishop also blocks the e-file, which will matter after Re1.'],
              ['Re1', 'Now White really threatens Bxc6 and Nxe5.'],
              ['b5', 'So you push the bishop away from your knight.'],
              ['Bb3', ''],
              ['d6', 'Solid protection for e5.'],
              ['c3', ''],
              ['O-O', 'You reached the main line of the Spanish with a healthy position.']
            ]
          },
          {
            title: 'Why 4.Bxc6 does not win a pawn', side: 'b',
            moves: [
              ['e4', ''],
              ['e5', ''],
              ['Nf3', ''],
              ['Nc6', ''],
              ['Bb5', ''],
              ['a6', ''],
              ['Bxc6', 'White takes the defender of e5.'],
              ['dxc6', 'Take back with the d-pawn: it opens your queen and bishop.'],
              ['Nxe5', 'White grabs the pawn. Find the reply!'],
              ['Qd4', 'A fork: the queen attacks the knight and the e4 pawn.'],
              ['Nf3', ''],
              ['Qxe4+', 'You win the pawn back with check and you have the two bishops.']
            ]
          }
        ]
      },
      {
        id: 'b-other', title: 'Scotch & King’s Gambit', sub: 'Two more things White can throw at you',
        intro: [
          'Two other openings you will meet after 1.e4 e5. For both you only need the first few moves and one idea.'
        ],
        parts: [
          {
            title: 'Scotch Game (3.d4)', side: 'b',
            moves: [
              ['e4', ''],
              ['e5', ''],
              ['Nf3', ''],
              ['Nc6', ''],
              ['d4', 'The Scotch: White opens the centre at once.'],
              ['exd4', 'Take – otherwise White takes on e5.'],
              ['Nxd4', ''],
              ['Bc5', 'Develop with a threat on the d4 knight.'],
              ['Be3', ''],
              ['Qf6', 'An exception to the queen rule: here she adds pressure on d4 and cannot be chased easily.'],
              ['c3', ''],
              ['Nge7', 'This knight goes to e7 so it does not block your queen.'],
              ['Bc4', ''],
              ['O-O', 'Developed and castled. Fully equal.']
            ]
          },
          {
            title: 'King’s Gambit (2.f4)', side: 'b',
            moves: [
              ['e4', ''],
              ['e5', ''],
              ['f4', 'The King’s Gambit: White offers a pawn for a fast attack.'],
              ['exf4', 'Take it.'],
              ['Nf3', ''],
              ['d5', 'The easy antidote: give the pawn straight back and open lines for your pieces.'],
              ['exd5', ''],
              ['Nf6', 'Develop and attack d5.'],
              ['Bc4', ''],
              ['Nxd5', 'Material is equal, your pieces are free and White’s king is a bit draughty with the f-pawn gone.']
            ]
          }
        ]
      }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'black-d4', title: 'Playing Black vs 1.d4', sub: 'The Queen’s Gambit Declined', icon: '♛',
    lessons: [
      {
        id: 'qgd', title: 'Queen’s Gambit Declined', sub: 'A rock-solid answer to 1.d4',
        intro: [
          'Against 1.d4 play 1…d5, and when White offers the c-pawn (2.c4) support your centre with 2…e6.',
          '<b>Your setup:</b> pawns d5, e6, c6 · knights f6 and d7 · bishop e7 · castle short. It is not flashy, but it is very hard to beat.'
        ],
        parts: [
          {
            title: 'Main setup', side: 'b',
            moves: [
              ['d4', ''],
              ['d5', 'Take your share of the centre.'],
              ['c4', 'The Queen’s Gambit. It is not a real gambit – if you take, White wins the pawn back easily.'],
              ['e6', 'Decline: protect d5 and open your bishop.'],
              ['Nc3', ''],
              ['Nf6', ''],
              ['Bg5', 'A pin on your knight.'],
              ['Be7', 'Break the pin right away.'],
              ['e3', ''],
              ['O-O', ''],
              ['Nf3', ''],
              ['Nbd7', 'The knight goes to d7 (not c6) so the c-pawn stays free to move.'],
              ['Rc1', ''],
              ['c6', 'A solid triangle c6–d5–e6. Later you free your game with …dxc4 and …Nd5 or …e5.']
            ]
          },
          {
            title: 'The Elephant Trap', side: 'b',
            moves: [
              ['d4', ''],
              ['d5', ''],
              ['c4', ''],
              ['e6', ''],
              ['Nc3', ''],
              ['Nf6', ''],
              ['Bg5', ''],
              ['Nbd7', 'This sets a trap: the d5 pawn looks like it can be won, because your f6 knight is pinned.'],
              ['cxd5', ''],
              ['exd5', ''],
              ['Nxd5', 'White falls for it.'],
              ['Nxd5', 'Take anyway! You give up the queen…'],
              ['Bxd8', ''],
              ['Bb4+', '…but this check wins White’s queen: the only way to block is with the queen.'],
              ['Qd2', ''],
              ['Bxd2+', ''],
              ['Kxd2', ''],
              ['Kxd8', 'Count the pieces: you are a full knight up.']
            ]
          }
        ]
      },
      {
        id: 'b-london', title: 'Facing the London', sub: 'Hit the centre with …c5',
        intro: [
          'Many players use the London System (d4 + Bf4) every game. The simplest answer: develop, attack d4 with …c5 and offer to trade their favourite bishop with …Bd6.'
        ],
        parts: [{
          title: 'Anti-London setup', side: 'b',
          moves: [
            ['d4', ''],
            ['d5', ''],
            ['Bf4', 'The London bishop.'],
            ['Nf6', ''],
            ['e3', ''],
            ['c5', 'Attack the centre straight away.'],
            ['c3', ''],
            ['Nc6', 'More pressure on d4.'],
            ['Nd2', ''],
            ['e6', ''],
            ['Ngf3', ''],
            ['Bd6', 'Challenge the London bishop. If it is traded, White’s main attacking piece is gone.'],
            ['Bg3', ''],
            ['O-O', 'A comfortable, equal game.']
          ]
        }]
      }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'tactics', title: 'Tactics', sub: 'Most games are decided here', icon: '♞',
    lessons: [
      {
        id: 'forks', title: 'Forks', sub: 'One piece, two targets', puzzle: true,
        intro: [
          'A <b>fork</b> is one move that attacks two things at once. Your opponent can only save one.',
          'Knights are the best forkers, but pawns and queens fork too. Always look for a check that also attacks a loose piece.'
        ],
        parts: [
          {
            title: 'Knight fork', side: 'w', fen: '4k2r/p4ppp/8/1q1N4/8/8/5PPP/6K1 w - - 0 1',
            prompt: 'White to move. Win the queen.',
            moves: [['Nc7+', 'Check – and the knight attacks the queen too. The king must move.'], ['Kd7', ''], ['Nxb5', 'A whole queen for free. This is called a royal fork.']]
          },
          {
            title: 'Pawn fork', side: 'w', fen: 'r5k1/ppp2ppp/3b1n2/8/3PP3/5N2/PPP2PPP/R5K1 w - - 0 1',
            prompt: 'White to move. Win a piece with a pawn.',
            moves: [['e5', 'The pawn attacks bishop and knight together. It is protected, so taking it does not help Black.'], ['Be7', ''], ['exf6', 'You win a knight.']]
          },
          {
            title: 'Queen fork', side: 'w', fen: '1r4k1/p1p3pp/8/n7/8/7P/PP3PP1/3Q2K1 w - - 0 1',
            prompt: 'White to move. One of Black’s pieces is unprotected – win it.',
            moves: [['Qd5+', 'Check on the diagonal, and the queen also looks along the 5th rank at the loose knight.'], ['Kh8', ''], ['Qxa5', 'Loose pieces drop off! Always check which enemy pieces have no defender.']]
          }
        ]
      },
      {
        id: 'pins', title: 'Pins & skewers', sub: 'Attacking through a piece', puzzle: true,
        intro: [
          'A <b>pin</b>: you attack a piece that cannot move because something more valuable (often the king) stands behind it.',
          'A <b>skewer</b> is the reverse: you attack the valuable piece, it has to move, and you take what was behind it.',
          'Both work on lines – so only bishops, rooks and queens can do them.'
        ],
        parts: [
          {
            title: 'Pin the queen', side: 'w', fen: 'r3k3/pp3ppp/3p4/4q3/8/8/PPPQ1PPP/R5K1 w - - 0 1',
            prompt: 'White to move. Black’s king and queen are on the same file…',
            moves: [['Re1', 'The queen is pinned to the king – she cannot leave the e-file.'], ['Qxe1+', 'The best Black can do is take the rook.'], ['Qxe1+', 'You won a queen for a rook.']]
          },
          {
            title: 'Pin with the bishop', side: 'w', fen: 'r3k2r/pp3ppp/2q1pn2/8/8/2N5/PPP1BPPP/R2Q2K1 w - - 0 1',
            prompt: 'White to move. King and queen are on the same diagonal.',
            moves: [['Bb5', 'Pinned! The bishop is protected by the knight, so Black loses the queen.'], ['Qxb5', ''], ['Nxb5', 'Queen for a bishop.']]
          },
          {
            title: 'Rook skewer', side: 'w', fen: '3q4/8/8/3k4/8/8/6PP/R5K1 w - - 0 1',
            prompt: 'White to move. Win the queen.',
            moves: [['Rd1+', 'Check through the king: when he steps aside, the queen behind him is lost.'], ['Ke6', ''], ['Rxd8', 'That is a skewer.']]
          },
          {
            title: 'Bishop skewer', side: 'w', fen: '7r/p7/5k2/7p/8/8/P4BPP/6K1 w - - 0 1',
            prompt: 'White to move. Win the rook.',
            moves: [['Bd4+', 'King and rook stand on the same diagonal.'], ['Ke6', ''], ['Bxh8', 'Kings and heavy pieces on one line = look for a skewer.']]
          }
        ]
      },
      {
        id: 'discovered', title: 'Discovered attacks & back rank', sub: 'Two classic game-winners', puzzle: true,
        intro: [
          'A <b>discovered attack</b>: you move one piece away and uncover an attack from the piece behind it. If the piece that moves gives check, the opponent has no time to save the other target.',
          'The <b>back rank mate</b>: a castled king trapped behind its own three pawns gets mated by a rook or queen on the last rank.'
        ],
        parts: [
          {
            title: 'Discovered attack', side: 'w', fen: 'r1b2rk1/ppp2ppp/2n5/3q4/8/3B1N2/PPP2PPP/R2Q2K1 w - - 0 1',
            prompt: 'White to move. Your bishop is standing between two queens…',
            moves: [['Bxh7+', 'The bishop leaves with check and uncovers the queen’s attack on d5.'], ['Kxh7', ''], ['Qxd5', 'Queen for a bishop.']]
          },
          {
            title: 'Back rank mate', side: 'w', fen: '6k1/5ppp/8/8/8/8/1q3PPP/3R2K1 w - - 0 1',
            prompt: 'White to move. Mate in 1.', end: 'mate',
            moves: [['Rd8#', 'The king is locked in by his own pawns. Tip: playing h3 or g3 early (“making luft”) prevents this forever.']]
          },
          {
            title: 'Back rank – with a sacrifice', side: 'w', fen: '3r2k1/5ppp/1q6/8/8/8/4QPPP/4R1K1 w - - 0 1',
            prompt: 'White to move. Mate in 2.', end: 'mate',
            moves: [['Qe8+', 'A queen sacrifice! The rook is forced to take.'], ['Rxe8', ''], ['Rxe8#', 'The defender was pulled away and the back rank falls.']]
          }
        ]
      },
      {
        id: 'mates', title: 'Checkmate patterns', sub: 'Five pictures to remember', puzzle: true,
        intro: [
          'Strong players do not calculate every mate – they recognise patterns. Here are five that come up all the time. Each puzzle is mate in 1, except the last one.'
        ],
        parts: [
          {
            title: 'Queen + bishop', side: 'w', fen: '5rk1/5ppp/8/7Q/8/3B4/8/6K1 w - - 0 1',
            prompt: 'Mate in 1.', end: 'mate',
            moves: [['Qxh7#', 'Queen protected by the bishop, right next to the king. This is why Bd3 + Qh5 is so dangerous.']]
          },
          {
            title: 'Ladder mate', side: 'w', fen: '6k1/R7/8/8/8/8/8/1R4K1 w - - 0 1',
            prompt: 'Mate in 1.', end: 'mate',
            moves: [['Rb8#', 'One rook guards the 7th rank, the other gives mate on the 8th.']]
          },
          {
            title: 'Arabian mate', side: 'w', fen: '7k/8/5N2/8/8/8/8/6RK w - - 0 1',
            prompt: 'Mate in 1.', end: 'mate',
            moves: [['Rg8#', 'The knight protects the rook and also covers h7. Rook + knight in the corner.']]
          },
          {
            title: 'Smothered mate', side: 'w', fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
            prompt: 'Mate in 1.', end: 'mate',
            moves: [['Nf7#', 'The king is suffocated by his own pieces. Only a knight can do this.']]
          },
          {
            title: 'Smothered mate – the full trick', side: 'w', fen: '5r1k/6pp/7N/8/2Q5/8/8/6K1 w - - 0 1',
            prompt: 'Mate in 2. Start with a queen sacrifice.', end: 'mate',
            moves: [['Qg8+', 'The king cannot take (the knight protects g8), so the rook must.'], ['Rxg8', 'Now the king has no air at all.'], ['Nf7#', 'One of the most beautiful mates in chess.']]
          }
        ]
      }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'endgames', title: 'Endgames', sub: 'How to actually finish the game', icon: '♜',
    lessons: [
      {
        id: 'ladder', title: 'The ladder mate', sub: 'Two rooks vs a lonely king',
        intro: [
          'With two rooks (or queen + rook) you do not even need your king. The rooks take turns: one <b>guards a rank</b> so the king cannot come back, the other <b>gives check</b> on the next rank. Step by step, like climbing a ladder.',
          'One thing to watch: if the king walks up to a rook, swing that rook far away to the other side of the board.'
        ],
        parts: [
          {
            title: 'Climb the ladder', side: 'w', fen: '8/8/8/4k3/8/8/8/RR4K1 w - - 0 1', end: 'mate',
            moves: [
              ['Ra4', 'First build a wall: the king can no longer cross the 4th rank.'],
              ['Kf5', ''],
              ['Rb5+', 'The other rook checks on the next rank. The king must step back.'],
              ['Kg6', ''],
              ['Ra6+', 'Now the a-rook jumps over and checks.'],
              ['Kf7', ''],
              ['Rb7+', 'Same again.'],
              ['Kg8', ''],
              ['Ra8#', 'Checkmate on the last step of the ladder.']
            ]
          },
          {
            title: 'When the king attacks a rook', side: 'w', fen: '8/8/2k5/1R6/R7/8/8/6K1 w - - 0 1', end: 'mate',
            moves: [
              ['Rh5', 'Your rook is attacked – swing it all the way to the other side. It still guards the 5th rank.'],
              ['Kb6', ''],
              ['Rg4', 'A check on a6 would lose the rook, so bring this one far away too. Keep the rooks on different files.'],
              ['Kc6', ''],
              ['Rg6+', 'Now the ladder works again.'],
              ['Kd7', ''],
              ['Rh7+', ''],
              ['Ke8', ''],
              ['Rg8#', 'Mate.']
            ]
          }
        ]
      },
      {
        id: 'kpk', title: 'King and pawn', sub: 'The most important endgame of all',
        intro: [
          'King + pawn vs king decides thousands of games. Two rules cover most of it:',
          '<b>Attacking:</b> get your king IN FRONT of your pawn. With the king on the 6th rank in front of the pawn you always win.',
          '<b>Defending:</b> stand in front of the pawn, and when it reaches the 6th rank step STRAIGHT back. Then face the enemy king directly (this is called <b>the opposition</b>) and it is a draw by stalemate.'
        ],
        parts: [
          {
            title: 'Win it: king in front', side: 'w', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
            moves: [
              ['Kd6', 'Step to the side to make room for the pawn. (Kf6 works the same way.)'],
              ['Kd8', 'Black faces your king.'],
              ['e6', 'Now the pawn can advance safely.'],
              ['Ke8', ''],
              ['e7', 'The pawn arrives WITHOUT check – that is the sign you are winning. Black must leave e8.'],
              ['Kf7', ''],
              ['Kd7', 'Your king guards the queening square.'],
              ['Kf6', ''],
              ['e8=Q', 'A new queen. The rest is easy.']
            ]
          },
          {
            title: 'Draw it: straight back', side: 'b', fen: '8/8/4k3/8/4PK2/8/8/8 w - - 0 1', end: 'stalemate',
            moves: [
              ['e5', 'White pushes. You are a pawn down – but this is a draw if you know how.'],
              ['Ke7', 'Stay in front of the pawn.'],
              ['Kf5', ''],
              ['Kf7', 'Face the king: this is the opposition. He cannot move forward.'],
              ['e6+', ''],
              ['Ke7', 'Back in front of the pawn.'],
              ['Ke5', ''],
              ['Ke8', 'The key move: STRAIGHT back. (Stepping to d8 or f8 loses!)'],
              ['Kd6', ''],
              ['Kd8', 'Whichever side he comes, face him. Opposition again.'],
              ['e7+', 'The pawn arrives WITH check – the sign of a draw.'],
              ['Ke8', ''],
              ['Ke6', 'Stalemate! White had to protect the pawn, and you have no legal move. Half a point saved.']
            ]
          }
        ]
      },
      {
        id: 'checklist', title: 'Your every-move checklist', sub: 'What to think about once the opening is over',
        intro: [
          'The opening is finished, the pieces are out… now what? Use this checklist. It is worth more than any memorised line.',
          '<b>Before every move, look at:</b><br>1. <b>Checks</b> – every check you can give and every check they can give.<br>2. <b>Captures</b> – what can be taken, by both sides.<br>3. <b>Threats</b> – what does their last move want?',
          '<b>If nothing is happening:</b><br>• Find your worst piece and give it a better square.<br>• Put rooks on open files.<br>• Trade pieces when you are ahead, avoid trades when you are behind.<br>• In the endgame, bring your king to the centre – it is a fighting piece.',
          '<b>Before you let go of the piece:</b> ask “is the square I am moving to safe?” This one question removes most blunders.',
          'Finally: play real games (10 minutes or longer) and look at every loss to find the one move where it went wrong. That is how the course turns into rating points.'
        ],
        parts: []
      }
    ]
  }
];
