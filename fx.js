// Little celebration burst (no library).
export function confetti(anchor, count = 70) {
  if (!anchor || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const b = anchor.getBoundingClientRect();
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.className = 'confetti';
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  document.body.appendChild(c);
  const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
  const colors = ['#81b64c', '#f7c045', '#4f8fe0', '#e8698a', '#1fb5ad', '#ffffff'];
  const ps = Array.from({ length: count }, () => ({
    x: b.left + b.width / 2 + (Math.random() - 0.5) * b.width * 0.3, y: b.top + b.height * 0.45,
    vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 12 - 4, s: 5 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
    c: colors[Math.floor(Math.random() * colors.length)]
  }));
  const t0 = performance.now();
  (function frame(t) {
    const dt = Math.min(2, (t - (frame.last || t)) / 16.7); frame.last = t;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of ps) {
      p.vy += 0.38 * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    }
    if (t - t0 < 2600) requestAnimationFrame(frame); else c.remove();
  })(t0);
}
