// Pre-records everything Olly says with the Kokoro-82M neural voice (Apache-2.0), voice "af_heart" (American English).
// Run:  node dev/make_voice.mjs [--count]      (incremental: only new lines are generated)
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { COURSE } from '../course.js';
import { allGameLines } from '../speech.js';
import { OPENING_NAMES } from '../coach.js';
import { speakable, voiceKey } from '../voice.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const OUT = path.join(ROOT, 'sounds', 'voice');
const KOKORO = 'C:/Users/adame/AppData/Local/Temp/claude/b2eba45fd14913f7/cceb83e9-ccc5-4e34-b87c-514e611851b3/scratchpad/kok/node_modules/kokoro-js/dist/kokoro.js';
const VOICE = 'af_heart', SPEED = 1.0;
fs.mkdirSync(OUT, { recursive: true });

/* ---- collect every line ---- */
const lines = [];
lines.push(...allGameLines(OPENING_NAMES));
for (const unit of COURSE) for (const l of unit.lessons) {
  lines.push(...l.intro);
  for (const part of l.parts) {
    if (part.prompt) lines.push(part.prompt);
    for (const [san, note] of part.moves) {
      if (note) lines.push(note);
      if (!l.puzzle) lines.push(`Play ${san}.`);
    }
  }
}
const byKey = new Map();
for (const l of lines) { const k = voiceKey(l); if (k && !byKey.has(k)) byKey.set(k, l); }
const manPath = path.join(OUT, 'manifest.json');
const manifest = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : {};
const todo = [...byKey].filter(([k]) => !manifest[k] || !fs.existsSync(path.join(OUT, manifest[k])));
console.log(`${byKey.size} lines, ${todo.length} to record`);
if (process.argv.includes('--count')) { process.exit(0); }

/* ---- record ---- */
const { KokoroTTS } = await import('file:///' + KOKORO);
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
const SR = 24000;
const silence = n => new Float32Array(Math.round(SR * n));
function wav(samples) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples.length * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  return b;
}
let done = 0; const t0 = Date.now();
for (const [key, line] of todo) {
  const text = speakable(line);
  const sentences = text.match(/[^.!?]+[.!?]*["”)]?/g).map(s => s.trim()).filter(Boolean);
  const parts = [];
  for (const s of sentences) {
    const a = await tts.generate(s, { voice: VOICE, speed: SPEED });
    parts.push(a.audio, silence(0.16));
  }
  parts.pop();
  const total = parts.reduce((n, p) => n + p.length, 0), all = new Float32Array(total);
  let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
  const id = createHash('sha1').update(key).digest('hex').slice(0, 10);
  const tmp = path.join(OUT, id + '.wav'), mp3 = path.join(OUT, id + '.mp3');
  fs.writeFileSync(tmp, wav(all));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-af',
    'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,adelay=20,apad=pad_dur=0.04',
    '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '40k', mp3]);
  fs.unlinkSync(tmp);
  manifest[key] = id + '.mp3';
  if (++done % 25 === 0) {
    fs.writeFileSync(manPath, JSON.stringify(manifest));
    console.log(`${done}/${todo.length}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
}
fs.writeFileSync(manPath, JSON.stringify(manifest));
console.log(`done: ${done} recorded in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
process.exit(0);
