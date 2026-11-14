// Router and start-up.
import { engine } from './engine.js';
import { unlockAudio } from './sound.js';
import { ACT, go, applyTheme } from './ui.js';
import * as UI from './ui.js';
import { viewHome, viewIntro, startLesson, stopLesson, byId } from './learn.js';
import { viewPlaySetup, viewGame } from './play.js';
import { viewReviewList, viewReview, reviewKeys } from './review.js';
import { viewSettings } from './settings.js';
import { viewEditor } from './editor.js';

function route() {
  stopLesson();
  const [, kind, id, mode] = location.hash.split('/');
  if (kind === 'play') return viewPlaySetup();
  if (kind === 'game') return viewGame();
  if (kind === 'review') return id ? viewReview(id, mode) : viewReviewList();
  if (kind === 'settings') return viewSettings();
  if (kind === 'setup') return viewEditor();
  const lesson = kind === 'l' && byId(id);
  if (!lesson) return viewHome();
  if ((mode === 'learn' || mode === 'practice') && lesson.parts.length) return startLesson(lesson, mode);
  viewIntro(lesson);
}

document.addEventListener('click', e => {
  const gb = e.target.closest('[data-global]');
  if (gb && gb.dataset.global === 'mute') return UI.toggleMute(gb);
  const t = e.target.closest('[data-go],[data-act]');
  if (!t || t.disabled) return;
  if (t.dataset.go) return go(t.dataset.go);
  const fn = UI.ACT[t.dataset.act];
  if (fn) fn(t, e);
});
// iOS only allows sound and speech after a tap
document.addEventListener('pointerdown', () => { unlockAudio(); }, { once: true, capture: true });
document.addEventListener('keydown', reviewKeys);
window.addEventListener('hashchange', route);

(async function boot() {
  applyTheme();
  try { document.getElementById('sprite').innerHTML = await (await fetch('pieces.svg')).text(); } catch (e) { /* pieces stay empty */ }
  route();
  setTimeout(() => { try { engine(); } catch (e) { /* ignore */ } }, 600);
})();
