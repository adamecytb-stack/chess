// Settings tab.
import { engine, flavor, setFlavor, FLAVORS } from './engine.js';
import { audio, setSound, play } from './sound.js';
import { voice, setVoiceOn, say } from './voice.js';
import { S } from './speech.js';
import { prefs, savePrefs, resetStore, $, esc, ACT, screen, coachBox } from './ui.js';

const THEMES = [['green', 'Green', '#ebecd0', '#739552'], ['wood', 'Wood', '#f0d9b5', '#b58863'], ['ocean', 'Ocean', '#dee3e6', '#8ca2ad'], ['night', 'Night', '#a7a7b3', '#5b5c6e']];

export function viewSettings() {
  const draw = () => {
    const e = engineStatus();
    screen(`
      <div class="home-top"><span class="brand">Settings</span></div>
      <p class="field">Coach voice</p>
      <button class="switch ${voice.on ? 'on' : ''}" data-act="voice"><div><b>Olly talks</b><span>A natural American voice. Recorded in, so it works offline and sounds the same on every device.</span></div><i></i></button>
      <div class="seg" style="margin-top:10px">${[['all', 'Every move'], ['key', 'Big moments only']].map(([k, t]) => `<button class="${prefs.talk === k ? 'on' : ''}" data-act="talk" data-id="${k}">${t}</button>`).join('')}</div>
      <button class="btn sec" data-act="testvoice" style="margin-top:10px">▶ Hear Olly</button>
      <p class="field">Sound effects</p>
      <button class="switch ${audio.on ? 'on' : ''}" data-act="sound"><div><b>Piece sounds</b><span>Moves, captures, checks, castling.</span></div><i></i></button>
      <p class="field">Board</p>
      <div class="themes">${THEMES.map(([id, name, l, d]) => `<button class="theme ${prefs.theme === id ? 'on' : ''}" data-act="theme" data-id="${id}"><span style="background:linear-gradient(135deg,${l} 0 50%,${d} 50%)"></span>${name}</button>`).join('')}</div>
      <p class="field">Engine</p>
      <div class="levels">${Object.entries(FLAVORS).map(([k, f]) => `
        <button class="level ${flavor() === k ? 'on' : ''}" data-act="engine" data-id="${k}"><div><b>${f.label}</b><span>${k === 'lite' ? 'Fast and small. Plenty strong for coaching.' : 'The full-strength network. Big download – best on Wi-Fi or a computer.'}</span></div><em>${f.size}</em></button>`).join('')}</div>
      <p class="muted small" id="estat" style="margin-top:8px">${e}</p>
      <p class="field">Progress</p>
      <button class="btn sec" data-act="reset">Reset all progress</button>
      <p class="foot"><a href="https://github.com/adamecytb-stack/chess#credits">Credits and licences</a></p>`, 'settings');
    ACT.voice = () => { setVoiceOn(!voice.on); draw(); if (voice.on) say(S.test); };
    ACT.talk = el => { prefs.talk = el.dataset.id; savePrefs(); draw(); };
    ACT.testvoice = () => say([S.test, S.lead.best[0], S.fact.fork], { force: true });
    ACT.sound = () => { setSound(!audio.on); draw(); play('move'); };
    ACT.theme = el => { prefs.theme = el.dataset.id; savePrefs(); draw(); };
    ACT.engine = el => {
      if (el.dataset.id === flavor()) return;
      if (el.dataset.id === 'full' && !confirm('The full engine is a 95 MB download. It loads once and is then cached by your browser. Continue?')) return;
      setFlavor(el.dataset.id);
      const eng = engine();
      draw();
      eng.ready.then(() => { const s = $('#estat'); if (s) s.textContent = engineStatus(); }, () => { const s = $('#estat'); if (s) s.textContent = engineStatus(); });
    };
    ACT.reset = () => { if (confirm('Delete all your stars and saved games?')) { resetStore(); draw(); } };
  };
  draw();
}

function engineStatus() {
  try {
    const e = engine();
    if (e.fellBack) return 'The full engine couldn’t load on this device, so the Lite engine is being used.';
    if (e.failed) return 'The engine failed to load. Check your connection and reload.';
    return e.info ? `Running: ${e.info}.` : `Loading ${FLAVORS[e.flavor].label}…`;
  } catch (err) { return ''; }
}
