// UCI engine wrapper (Stockfish in a Web Worker). Works the same in Node for tests via EngineCore.
// Scores are always returned from White's point of view: { cp } or { mate } (+ = White is winning / mates).

export const FLAVORS = {
  lite: { file: 'engine/stockfish-19-lite-single.js', label: 'Stockfish 19 Lite', size: '2 MB' },
  full: { file: 'engine/stockfish-19-single.js', label: 'Stockfish 19 Full', size: '95 MB' }
};

export class EngineCore {
  constructor(send) {
    // Commands are sent asynchronously so we never re-enter the engine from inside its own output callback.
    const out = [];
    this.send = cmd => {
      out.push(cmd);
      if (out.length === 1) setTimeout(() => { while (out.length) send(out.shift()); }, 0);
    };
    this.queue = [];
    this.cur = null;
    this.cache = new Map();
    this.ready = new Promise((res, rej) => { this._ok = res; this._no = rej; });
    this.ready.catch(() => {});
    this.failed = false;
    this.info = '';
  }

  start() { this.send('uci'); }

  fail(err) {
    this.failed = true;
    this._no(err);
    if (this.cur) { this.cur.reject(err); this.cur = null; }
    for (const j of this.queue) j.reject(err);
    this.queue = [];
  }

  receive(line) {
    line = String(line).trim();
    if (!line) return;
    if (line.startsWith('id name')) this.info = line.slice(8);
    if (line === 'uciok') {
      this.send('setoption name Hash value 32');
      this.send('isready');
      return;
    }
    if (line === 'readyok') { this._ok(true); this._pump(); return; }
    const j = this.cur;
    if (!j) return;
    if (line.startsWith('info') && line.includes(' pv ') && !line.includes('bound')) {
      const t = line.split(' ');
      const at = k => t.indexOf(k);
      const k = at('multipv') > -1 ? +t[at('multipv') + 1] : 1;
      const si = at('score');
      if (si < 0) return;
      const val = +t[si + 2] * j.sign;
      const out = { depth: +t[at('depth') + 1], pv: t.slice(at('pv') + 1) };
      if (t[si + 1] === 'mate') out.mate = val; else out.cp = val;
      j.lines[k - 1] = out;
    } else if (line.startsWith('bestmove')) {
      this.cur = null;
      const best = line.split(' ')[1];
      const lines = j.lines.filter(Boolean);
      if (j.cancelled) j.reject(new Error('cancelled'));
      else j.resolve({ best: best === '(none)' ? null : best, lines, depth: lines[0] ? lines[0].depth : 0 });
      this._pump();
    }
  }

  _pump() {
    if (this.cur || this.failed) return;
    let j;
    while ((j = this.queue.shift())) {
      if (j.cancelled) { j.reject(new Error('cancelled')); continue; }
      break;
    }
    if (!j) return;
    this.cur = j;
    const o = j.opts;
    this.send('setoption name MultiPV value ' + (o.searchmoves ? 1 : o.multipv || 1));
    this.send('position fen ' + j.fen);
    let go = 'go depth ' + (o.depth || 12);
    if (o.movetime) go += ' movetime ' + o.movetime;
    if (o.searchmoves) go += ' searchmoves ' + o.searchmoves.join(' ');   // must be last
    this.send(go);
  }

  analyse(fen, opts = {}) {
    const key = [fen, opts.depth, opts.multipv || 1, (opts.searchmoves || []).join(','), opts.movetime || 0].join('|');
    if (this.cache.has(key)) return this.cache.get(key);
    // a deeper or wider cached root search can answer this one too
    if (!opts.searchmoves && !opts.movetime) {
      for (const [k, v] of this.cache) {
        const [f, d, m, s, mt] = k.split('|');
        if (f === fen && !s && mt === '0' && +d === opts.depth && +m >= (opts.multipv || 1) && v.done) return v;
      }
    }
    let job;
    const p = new Promise((resolve, reject) => {
      job = { fen, opts, resolve, reject, lines: [], sign: fen.split(' ')[1] === 'w' ? 1 : -1, cancelled: false, tag: opts.tag || '' };
    });
    p.then(() => { p.done = true; }, () => { this.cache.delete(key); });
    this.cache.set(key, p);
    if (this.cache.size > 600) this.cache.delete(this.cache.keys().next().value);
    this.queue.push(job);
    this.ready.then(() => this._pump(), () => {});
    return p;
  }

  // Cancel queued and running jobs with this tag (or all if no tag).
  cancel(tag) {
    for (const j of this.queue) if (!tag || j.tag === tag) j.cancelled = true;
    if (this.cur && (!tag || this.cur.tag === tag)) { this.cur.cancelled = true; this.send('stop'); }
  }

  newGame() { this.send('ucinewgame'); }
}

/* ---------------- browser ---------------- */
let inst = null, instFlavor = null;

export function flavor() {
  try { return localStorage.getItem('ks.engine') === 'full' ? 'full' : 'lite'; } catch (e) { return 'lite'; }
}

export function setFlavor(f) {
  try { localStorage.setItem('ks.engine', f); } catch (e) { /* ignore */ }
  if (inst && instFlavor !== f) { try { inst.worker.terminate(); } catch (e) { /* ignore */ } inst = null; }
}

function boot(f) {
  let w;
  const core = new EngineCore(cmd => w && w.postMessage(cmd));
  try {
    w = new Worker(FLAVORS[f].file);
    w.onmessage = e => core.receive(e.data);
    w.onerror = () => core.fail(new Error('engine failed to load'));
    core.worker = w;
    core.start();
  } catch (e) { core.fail(e); }
  core.flavor = f;
  return core;
}

export function engine() {
  if (inst) return inst;
  instFlavor = flavor();
  inst = boot(instFlavor);
  // if the big engine fails (memory on phones), fall back to Lite
  if (instFlavor === 'full') {
    const mine = inst;
    mine.ready.catch(() => {
      if (inst !== mine) return;
      instFlavor = 'lite'; inst = boot('lite'); inst.fellBack = true;
    });
  }
  return inst;
}
