# Knight School

A free chess coach in the browser: opening lessons, tactics puzzles, games against bots with live coaching, and a full game review with move grading and explanations.

Live: https://adamecytb-stack.github.io/chess/

Everything runs on your device. No account, no server.

## Credits

- Chess engine: [Stockfish](https://stockfishchess.org/) 19 via [stockfish.js](https://github.com/nmrugg/stockfish.js) (GPL-3.0, see `engine/LICENSE-GPL3.txt`)
- Rules: [chess.js](https://github.com/jhlywa/chess.js) (BSD-2-Clause)
- Pieces: Colin M.L. Burnett and Rfc1394, from Wikimedia Commons, via [cm-chessboard](https://github.com/shaack/cm-chessboard) (CC BY-SA 3.0)
- Font: Nunito (SIL Open Font License)

This project's own code is released under GPL-3.0 to match the engine.

## Development

`node validate.mjs` replays every lesson line and puzzle in `course.js`.
