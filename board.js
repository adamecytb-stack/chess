// Interactive board: animated pieces, tap or drag to move, highlights, arrows, badges.
const FILES = 'abcdefgh';
export const pieceSvg = (color, type) => `<svg viewBox="3.5 3.5 33 33" aria-hidden="true"><use href="#${color}${type}"/></svg>`;

export function createBoard(root, opts) {
  // opts.movesFrom(sq) -> array of target squares (empty = piece cannot be picked up)
  // opts.onMove(from, to)
  root.classList.add('bd');
  root.innerHTML = '<div class="bd-sq"></div><svg class="bd-ar" viewBox="0 0 8 8"></svg><div class="bd-pc"></div><div class="bd-top"></div>';
  const [sqLayer, arLayer, pcLayer, topLayer] = root.children;
  let flip = false, pieces = [], sel = null, targets = [];
  let marks = { last: [], check: null, hint: [], arrows: [], badge: null, wrong: null };
  let drag = null;

  const xy = sq => {
    const f = FILES.indexOf(sq[0]), r = +sq[1];
    return [flip ? 7 - f : f, flip ? r - 1 : 8 - r];
  };
  const place = (p, animate) => {
    const [x, y] = xy(p.sq);
    p.el.style.transition = animate ? 'transform .2s cubic-bezier(.3,.7,.3,1)' : 'none';
    p.el.style.transform = `translate(${x * 100}%,${y * 100}%)`;
    p.el.classList.remove('drag');
  };

  function drawSquares() {
    let h = '';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const f = flip ? 7 - x : x, r = flip ? y + 1 : 8 - y, sq = FILES[f] + r;
      const c = ['s', (f + r) % 2 ? 'l' : 'd'];
      if (marks.last.includes(sq)) c.push('last');
      if (sel === sq) c.push('sel');
      if (marks.check === sq) c.push('check');
      if (marks.wrong === sq) c.push('wrong');
      if (marks.hint.includes(sq)) c.push('hint');
      if (targets.includes(sq)) c.push(pieces.some(p => p.sq === sq) ? 'ring' : 'dot');
      h += `<div class="${c.join(' ')}">${x === 0 ? `<i class="cr">${r}</i>` : ''}${y === 7 ? `<i class="cf">${FILES[f]}</i>` : ''}</div>`;
    }
    sqLayer.innerHTML = h;
    // arrows
    arLayer.innerHTML = marks.arrows.map(([a, b, cls]) => {
      const [x1, y1] = xy(a).map(v => v + 0.5), [x2, y2] = xy(b).map(v => v + 0.5);
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      const hx = x2 - ux * 0.42, hy = y2 - uy * 0.42, sx = x1 + ux * 0.3, sy = y1 + uy * 0.3, w = 0.09, hw = 0.24;
      const pts = [[sx - uy * w, sy + ux * w], [hx - uy * w, hy + ux * w], [hx - uy * hw, hy + ux * hw], [x2, y2],
        [hx + uy * hw, hy - ux * hw], [hx + uy * w, hy - ux * w], [sx + uy * w, sy - ux * w]];
      return `<polygon class="ar ${cls || ''}" points="${pts.map(p => p.map(v => v.toFixed(3)).join(',')).join(' ')}"/>`;
    }).join('');
    // badge
    const old = topLayer.querySelector('.badge'); if (old) old.remove();
    if (marks.badge) {
      const [x, y] = xy(marks.badge.sq);
      const b = document.createElement('div');
      b.className = 'badge c-' + marks.badge.cls + (x === 7 || y === 0 ? ' edge' : '');
      b.textContent = marks.badge.text;
      b.style.left = (x + 1) * 12.5 + '%'; b.style.top = y * 12.5 + '%';
      topLayer.appendChild(b);
    }
  }

  function setPosition(grid, { animate = true, flipped = flip } = {}) {
    const flipChanged = flipped !== flip;
    flip = flipped; sel = null; targets = [];
    const want = [];
    for (const row of grid) for (const c of row) if (c) want.push({ sq: c.square, key: c.color + c.type });
    const keep = [], oldLeft = [];
    for (const p of pieces) {
      const i = want.findIndex(w => w.sq === p.sq && w.key === p.key);
      if (i > -1) { want.splice(i, 1); keep.push(p); } else oldLeft.push(p);
    }
    const dist = (a, b) => Math.abs(a.charCodeAt(0) - b.charCodeAt(0)) + Math.abs(a[1] - b[1]);
    for (const w of want) {
      let best = -1;
      oldLeft.forEach((p, i) => { if (p.key === w.key && (best < 0 || dist(p.sq, w.sq) < dist(oldLeft[best].sq, w.sq))) best = i; });
      if (best > -1) {
        const p = oldLeft.splice(best, 1)[0];
        const wasDragged = p.el.classList.contains('drag');
        p.sq = w.sq; p.el.style.zIndex = 3;
        place(p, animate && !wasDragged && !flipChanged);
        setTimeout(() => { p.el.style.zIndex = ''; }, 220);
        keep.push(p);
      } else {
        const el = document.createElement('div');
        el.className = 'pc';
        el.innerHTML = pieceSvg(w.key[0], w.key[1]);
        pcLayer.appendChild(el);
        const p = { sq: w.sq, key: w.key, el };
        place(p, false);
        keep.push(p);
      }
    }
    for (const p of oldLeft) {
      const el = p.el;
      if (animate && !flipChanged) { el.style.transition = 'opacity .16s .06s'; el.style.opacity = 0; setTimeout(() => el.remove(), 240); }
      else el.remove();
    }
    for (const p of keep) if (p.el.classList.contains('drag') || flipChanged) place(p, false);
    pieces = keep;
    drawSquares();
  }

  function setMarks(m) { marks = Object.assign({ last: [], check: null, hint: [], arrows: [], badge: null, wrong: null }, m); drawSquares(); }
  function patchMarks(m) { Object.assign(marks, m); drawSquares(); }

  const sqAt = (cx, cy) => {
    const b = root.getBoundingClientRect();
    const x = Math.floor((cx - b.left) / (b.width / 8)), y = Math.floor((cy - b.top) / (b.height / 8));
    if (x < 0 || x > 7 || y < 0 || y > 7) return null;
    return FILES[flip ? 7 - x : x] + (flip ? y + 1 : 8 - y);
  };

  root.addEventListener('pointerdown', e => {
    if (e.button > 0 || topLayer.querySelector('.promo')) return;
    const sq = sqAt(e.clientX, e.clientY);
    if (!sq) return;
    if (sel && targets.includes(sq)) { const from = sel; sel = null; targets = []; opts.onMove(from, sq); return; }
    const moves = opts.movesFrom(sq);
    if (!moves || !moves.length) { if (sel) { sel = null; targets = []; drawSquares(); } return; }
    const wasSel = sel === sq;
    sel = sq; targets = moves; drawSquares();
    const p = pieces.find(q => q.sq === sq);
    drag = { p, sq, x0: e.clientX, y0: e.clientY, moved: false, wasSel };
    try { root.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    e.preventDefault();
  });
  root.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 7) return;
    drag.moved = true;
    const b = root.getBoundingClientRect(), s = b.width / 8;
    const el = drag.p.el;
    el.classList.add('drag'); el.style.transition = 'none';
    el.style.transform = `translate(${e.clientX - b.left - s / 2}px,${e.clientY - b.top - s * (e.pointerType === 'touch' ? 1.1 : 0.5)}px) scale(${e.pointerType === 'touch' ? 1.5 : 1.12})`;
  });
  const end = e => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) { if (d.wasSel) { sel = null; targets = []; drawSquares(); } return; }
    const sq = e.type === 'pointercancel' ? null : sqAt(e.clientX, e.clientY - (e.pointerType === 'touch' ? root.getBoundingClientRect().width / 8 * 0.6 : 0));
    if (sq && targets.includes(sq)) { sel = null; targets = []; opts.onMove(d.sq, sq); }
    else { place(d.p, true); if (sq !== d.sq) { sel = null; targets = []; } drawSquares(); }
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);

  function askPromotion(color) {
    return new Promise(res => {
      const box = document.createElement('div');
      box.className = 'promo';
      box.innerHTML = '<div class="promo-in">' + ['q', 'r', 'b', 'n'].map(t => `<button data-t="${t}">${pieceSvg(color, t)}</button>`).join('') + '</div>';
      box.addEventListener('click', ev => {
        const b = ev.target.closest('[data-t]');
        box.remove(); res(b ? b.dataset.t : null);
      });
      topLayer.appendChild(box);
    });
  }

  drawSquares();
  return { setPosition, setMarks, patchMarks, askPromotion, get flipped() { return flip; } };
}
