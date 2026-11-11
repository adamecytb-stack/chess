# Knight School

A free chess coach in the browser: opening lessons, tactics puzzles, games against six bots with a live coach (Olly the owl), and a full game review with move grades, explanations, best lines and retries.

Live: https://adamecytb-stack.github.io/chess/

Everything runs on your device. No account, no server.

## Credits

- Chess engine: [Stockfish](https://stockfishchess.org/) 19 via [stockfish.js](https://github.com/nmrugg/stockfish.js) (GPL-3.0, see `engine/LICENSE-GPL3.txt`)
- Rules: [chess.js](https://github.com/jhlywa/chess.js) (BSD-2-Clause)
- Pieces: Colin M.L. Burnett and Rfc1394, from Wikimedia Commons, via [cm-chessboard](https://github.com/shaack/cm-chessboard) (CC BY-SA 3.0)
- Coach voice: pre-recorded with [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0), voice "af_heart", using [kokoro-js](https://github.com/hexgrad/kokoro) (Apache-2.0)
- Sound effects, owl, bot portraits and move-grade icons: made for this project
- Font: Nunito (SIL Open Font License)

This project's own code is released under GPL-3.0 to match the engine.

## Development

- `node validate.mjs` replays every lesson line and puzzle in `course.js`.
- `python dev/make_sounds.py` renders the sound effects into `sounds/`.
- `node dev/make_voice.mjs` records any new coach lines into `sounds/voice/` (incremental).
- `python dev/serve.py` serves the app locally with the right file types.
