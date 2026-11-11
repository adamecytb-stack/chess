// Small illustrated portraits for the bots (own artwork).
const face = (skin, extra = '') => `<circle cx="20" cy="21" r="9.5" fill="${skin}"/>${extra}`;
const eyes = (y = 21, c = '#2a221c') => `<circle cx="16.6" cy="${y}" r="1.25" fill="${c}"/><circle cx="23.4" cy="${y}" r="1.25" fill="${c}"/>`;
const smile = (y = 25) => `<path d="M17 ${y}q3 2.6 6 0" fill="none" stroke="#7a3b2a" stroke-width="1.3" stroke-linecap="round"/>`;
const body = c => `<path d="M7 40c0-8 6-11 13-11s13 3 13 11z" fill="${c}"/>`;

const ART = {
  pip: (bg) => `<rect width="40" height="40" fill="${bg}"/>${body('#f2a541')}${face('#f6cfa8')}
    <path d="M10.5 18c1-6 5-9 9.5-9s8.5 3 9.5 9z" fill="#e24b3b"/><path d="M28 17.5h6.5c0 1.6-1.6 2.2-3.5 2.2H28z" fill="#c23a2c"/>
    ${eyes(21.5)}<circle cx="15.2" cy="24.2" r=".7" fill="#d9926a"/><circle cx="24.8" cy="24.2" r=".7" fill="#d9926a"/>${smile(25.2)}`,
  mira: (bg) => `<rect width="40" height="40" fill="${bg}"/>${body('#7c5cd6')}<circle cx="20" cy="8.5" r="4.5" fill="#2b1d16"/>${face('#a86c48')}
    <path d="M10.5 21c0-7 4-10.5 9.5-10.5S29.5 14 29.5 21c-2-3-5-5-9.5-5.5-4.5.5-7.5 2.5-9.5 5.5z" fill="#2b1d16"/>
    ${eyes(22)}${smile(25.6)}<circle cx="10.6" cy="24" r="1.2" fill="#f2c94c"/>`,
  bruno: (bg) => `<rect width="40" height="40" fill="${bg}"/>${body('#3d7a5a')}${face('#e9b48a')}
    <path d="M10.6 19c0-6 4-9.5 9.4-9.5s9.4 3.5 9.4 9.5c-1.5-2.5-4-3.5-9.4-3.5s-7.9 1-9.4 3.5z" fill="#6b3f22"/>
    <path d="M11.5 22.5c.5 6 4 9.5 8.5 9.5s8-3.5 8.5-9.5c-1.5 2.5-4 3.5-8.5 3.5s-7-1-8.5-3.5z" fill="#6b3f22"/>${eyes(21)}<path d="M17.5 25.6q2.5 1.4 5 0" fill="none" stroke="#3b2414" stroke-width="1.2" stroke-linecap="round"/>`,
  ingrid: (bg) => `<rect width="40" height="40" fill="${bg}"/>${body('#d65b7a')}
    <path d="M9 30c-1-10 2-20 11-20s12 10 11 20z" fill="#e8c45c"/>${face('#f3d2b8')}
    <path d="M10.6 20c.5-6 4.5-9 9.4-9s8.9 3 9.4 9c-3-3-6-4-9.4-4s-6.4 1-9.4 4z" fill="#e8c45c"/>
    <circle cx="16.4" cy="21.5" r="2.8" fill="none" stroke="#2a221c" stroke-width="1.1"/><circle cx="23.6" cy="21.5" r="2.8" fill="none" stroke="#2a221c" stroke-width="1.1"/><path d="M19.2 21.5h1.6" stroke="#2a221c" stroke-width="1.1"/>
    ${eyes(21.5)}${smile(25.8)}`,
  viktor: (bg) => `<rect width="40" height="40" fill="${bg}"/><path d="M7 40c0-8 6-11 13-11s13 3 13 11z" fill="#2c3445"/><path d="M17 29l3 5 3-5z" fill="#fff"/><path d="M19.2 31.5h1.6l.6 3h-2.8z" fill="#b8323c"/>
    ${face('#eec29e')}<path d="M10.8 19.5c0-5.5 4-9 9.2-9s9.2 3.5 9.2 9c-1.2-1.6-2-4.5-4-5-2 1.5-8.4 1.5-10.4 0-2 .5-2.8 3.4-4 5z" fill="#b9bcc4"/>
    ${eyes(21)}<path d="M15.8 24.6c1.6-1.2 3-1 4.2-.2 1.2-.8 2.6-1 4.2.2-1.4 1.2-2.8 1-4.2.4-1.4.6-2.8.8-4.2-.4z" fill="#8d9098"/>`,
  max: (bg) => `<rect width="40" height="40" fill="${bg}"/><path d="M7 40c0-8 6-11 13-11s13 3 13 11z" fill="#3a3f4a"/>
    <rect x="11" y="11" width="18" height="17" rx="4" fill="#9aa3b2"/><rect x="13.5" y="15.5" width="13" height="6" rx="3" fill="#1d2129"/>
    <circle cx="17" cy="18.5" r="1.6" fill="#ff4d3d"/><circle cx="23" cy="18.5" r="1.6" fill="#ff4d3d"/><path d="M16 24.5h8" stroke="#1d2129" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M20 11V7.5" stroke="#9aa3b2" stroke-width="1.6"/><circle cx="20" cy="6.5" r="1.6" fill="#ff4d3d"/>`
};
export function avatar(id, bg) {
  const f = ART[id];
  return `<svg viewBox="0 0 40 40" class="avatar" aria-hidden="true">${f ? f(bg) : `<rect width="40" height="40" fill="${bg}"/>`}</svg>`;
}
