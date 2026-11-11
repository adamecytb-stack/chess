// Dev only: run the same EngineCore against the npm stockfish build in Node.
import { createRequire } from 'module';
import { EngineCore } from '../engine.js';
const require = createRequire(import.meta.url);
const NM = 'C:/Users/adame/AppData/Local/Temp/claude/b2eba45fd14913f7/cceb83e9-ccc5-4e34-b87c-514e611851b3/scratchpad/npmtmp/node_modules/stockfish';
export function nodeEngine(kind = 'lite-single') {
  let sf, got = false;
  const core = new EngineCore(cmd => sf.processCommand(cmd));
  sf = require(NM)(kind, line => { if (/^id name/.test(line)) got = true; core.receive(line); });
  const keep = setInterval(() => { if (!got) core.start(); }, 700);
  core.ready.then(() => {});
  core.quit = () => { clearInterval(keep); try { sf.terminate(); } catch (e) {} };
  return core;
}
