import { nodeEngine } from './node-engine.mjs';
import * as C from '../coach.js';
const e = nodeEngine(); await e.ready;
const games = process.argv[2] ? [process.argv[2]] : [
  'e4 e5 Nf3 Nc6 Bc4 Nd4 Nxe5 Qg5 Nxf7 Qxg2 Rf1 Qxe4+ Be2 Nf3#',
  'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5 Bxd1 Bxf7+ Ke7 Nd5#',
  'e4 e5 Qh5 Nc6 Bc4 Nf6 Qxf7#',
  'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 cxd5 exd5 Nxd5 Nxd5 Bxd8 Bb4+ Qd2 Bxd2+ Kxd2 Kxd8',
  'e4 c5 Nf3 d6 Bb5+ Nd7 O-O a6 Bxd7+ Bxd7 d4 Bg4 dxc5 Bxf3 Qxf3 dxc5 Rd1 Qc7 Bf4 e5 Qg3 Nf6 Bxe5 Qb6 Bxf6 gxf6 Nc3 h5 Nd5 Qxb2 Nc7+ Kd8 Nxa8+'
];
for (const line of games) {
  const sans = line.split(' ');
  const t = Date.now();
  const rev = await C.reviewGame(e, sans, null, null);
  console.log(`\n=== ${line.slice(0, 50)}  (${rev.opening}) ${((Date.now() - t) / 1000).toFixed(1)}s`);
  rev.moves.forEach((m, i) => {
    const P = C.persp(m.mover === 'w', m.mover === 'w' ? 'White' : 'Black');
    const txt = C.describe(m, C.persp(true), { prevInfo: rev.moves[i - 1], openingName: rev.opening, prevTo: i ? rev.moves[i - 1].to : null }).replace(/<\/?b>/g, '');
    console.log(`${String(Math.floor(i / 2) + 1).padStart(2)}${m.mover === 'w' ? '.' : '…'}${m.san.padEnd(7)} ${m.cls.padEnd(10)} d${m.depth} ${C.evalText(m.best).padStart(6)} ${C.evalText(m.played).padStart(6)}  ${txt}`);
  });
}
e.quit(); process.exit(0);
