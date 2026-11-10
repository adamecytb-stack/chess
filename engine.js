// Thin promise wrapper around the Stockfish WASM worker (UCI protocol).
const URL = 'engine/stockfish-19-lite-single.js';

class Engine {
  constructor() {
    this.failed = false;
    this.cur = null;
    this.chain = Promise.resolve();
    this.ready = new Promise((res, rej) => { this._ok = res; this._no = rej; });
    this.ready.catch(() => {});
    try {
      this.w = new Worker(URL);
      this.w.onmessage = e => this._line(String(e.data));
      this.w.onerror = () => { this.failed = true; this._no(new Error('engine failed')); if (this.cur) { this.cur.reject(new Error('engine failed')); this.cur = null; } };
      this.w.postMessage('uci');
    } catch (e) { this.failed = true; this._no(e); }
  }

  _line(l) {
    if (l === 'uciok') return this.w.postMessage('isready');
    if (l === 'readyok') return this._ok(true);
    const c = this.cur;
    if (!c) return;
    if (l.startsWith('info') && l.includes(' pv ')) {
      const t = l.split(' ');
      const at = k => t.indexOf(k);
      const k = at('multipv') > -1 ? +t[at('multipv') + 1] : 1;
      const si = at('score');
      const val = +t[si + 2] * c.sign;
      const line = { depth: +t[at('depth') + 1], pv: t.slice(at('pv') + 1) };
      if (t[si + 1] === 'mate') line.mate = val; else line.cp = val;
      c.lines[k - 1] = line;
    } else if (l.startsWith('bestmove')) {
      this.cur = null;
      c.resolve({ best: l.split(' ')[1], lines: c.lines.filter(Boolean) });
    }
  }

  // Scores come back from White's point of view: cp (centipawns) or mate (+ = White mates).
  analyse(fen, { depth = 11, multipv = 1, movetime = 0 } = {}) {
    const run = async () => {
      await this.ready;
      return new Promise((resolve, reject) => {
        this.cur = { resolve, reject, lines: [], sign: fen.split(' ')[1] === 'w' ? 1 : -1 };
        this.w.postMessage('setoption name MultiPV value ' + multipv);
        this.w.postMessage('position fen ' + fen);
        this.w.postMessage('go depth ' + depth + (movetime ? ' movetime ' + movetime : ''));
      });
    };
    const p = this.chain.then(run);
    this.chain = p.catch(() => {});
    return p;
  }

  stop() { if (this.cur && this.w) this.w.postMessage('stop'); }
}

let inst = null;
export const engine = () => (inst ||= new Engine());
