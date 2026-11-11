// Move-grade badges (own designs). Each is a 24x24 SVG: coloured disc + white mark.
export const CLS_COLOR = {
  brilliant: '#1fb5ad', great: '#4f8fe0', best: '#6dba3a', excellent: '#8fc25a', good: '#9fae86', book: '#a8835a',
  inaccuracy: '#f2c14c', mistake: '#f2994a', miss: '#e8698a', blunder: '#e5483b'
};
const T = (txt, size = 13, dx = 0) => `<text x="${12 + dx}" y="12.5" text-anchor="middle" dominant-baseline="central" font-family="Nunito,system-ui,sans-serif" font-weight="900" font-size="${size}" fill="#fff">${txt}</text>`;
const MARK = {
  brilliant: T('!!', 12.5),
  great: T('!', 14),
  best: '<path d="M12 4.6l2.2 4.6 5 .6-3.7 3.4 1 5-4.5-2.5-4.5 2.5 1-5L4.8 9.8l5-.6z" fill="#fff"/>',
  excellent: '<path d="M7 11h2.6v7.4H7zM10.7 18.4V11l2.6-5c1.3 0 2 .8 1.8 2l-.5 2.4h3.3c1 0 1.7.9 1.5 1.9l-1.1 4.6c-.2.9-1 1.5-1.9 1.5z" fill="#fff"/>',
  good: '<path d="M6.5 12.3l3.6 3.6 7.4-7.6" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>',
  book: '<path d="M12 8.2c-1.6-1.2-3.7-1.6-6.2-1.6v10.2c2.5 0 4.6.4 6.2 1.6 1.6-1.2 3.7-1.6 6.2-1.6V6.6c-2.5 0-4.6.4-6.2 1.6zm0 0v10.2" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>',
  inaccuracy: T('?!', 12),
  mistake: T('?', 14),
  miss: '<path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>',
  blunder: T('??', 12)
};
export function clsIcon(cls, size = 22) {
  if (!MARK[cls]) return '';
  return `<svg class="ci" viewBox="0 0 24 24" width="${size}" height="${size}" aria-label="${cls}"><circle cx="12" cy="12" r="11.5" fill="${CLS_COLOR[cls]}"/>${MARK[cls]}</svg>`;
}
