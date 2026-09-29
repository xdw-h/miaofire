const paths = {
  fish: '<path d="M3 12c5-9 13-9 18 0-5 9-13 9-18 0Z"/><path d="m3 12-3-6v12Z"/><circle cx="16" cy="10" r="1.4" fill="#fff8dd"/><path d="M9 7v10" stroke="#fff8dd" stroke-width="1.5" fill="none"/>',
  paw: '<ellipse cx="8" cy="7" rx="2.1" ry="2.8"/><ellipse cx="16" cy="7" rx="2.1" ry="2.8"/><ellipse cx="3.8" cy="12" rx="1.8" ry="2.4"/><ellipse cx="20.2" cy="12" rx="1.8" ry="2.4"/><path d="M6 19c0-3 3-7 6-7s6 4 6 7c0 3-4 1-6 1s-6 2-6-1Z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 8v8m-2-7h3a2 2 0 0 1 0 4h-2a2 2 0 0 0 0 3h3" fill="none" stroke="#fff8df" stroke-width="1.5"/>',
  gem: '<path d="m5 4 14 0 4 7-11 11L1 11Z"/><path d="m5 4 3 7 4 11 4-11 3-7M1 11h22M8 11l4-7 4 7" fill="none" stroke="white" stroke-opacity=".6" stroke-width="1.3"/>',
  crystal: '<path d="m12 1 7 6v11l-7 5-7-5V7Z"/><path d="m12 1 1 8 6-2M13 9l-1 14M5 7l8 2-8 9" fill="none" stroke="white" stroke-opacity=".55" stroke-width="1.3"/>',
  attack: '<path d="m17 2 5 0v5L8 21l-5-5Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="m3 12 9 9M3 22l5-5" fill="none" stroke="currentColor" stroke-width="2"/>',
  speed: '<path d="M14 1 4 14h7l-1 9L21 9h-8Z"/>',
  income: '<circle cx="9" cy="13" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M13 4a7 7 0 0 1 7 12M9 9v8m-2-6h4m-4 4h4" fill="none" stroke="currentColor" stroke-width="2"/>',
  up: '<path d="m6 13 6-6 6 6M12 7v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  pause: '<rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/>',
  play: '<path d="m7 3 15 9L7 21Z"/>',
  sound: '<path d="m3 9 4 0 6-5v16l-6-5H3Z"/><path d="M16 8q6 4 0 8m3-11q9 7 0 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  mute: '<path d="m3 9 4 0 6-5v16l-6-5H3Z"/><path d="m17 9 5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="7" r="1.2"/>',
  gear: '<path d="m9 2-1 3-3 1-2 4 2 3v4l4 3 3-1 3 1 4-3v-4l2-3-2-4-3-1-1-3Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="11" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  check: '<path d="m5 12 5 5L20 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  leaf: '<path d="M20 3C9 1 1 7 5 15s17 7 15-12Z"/><path d="m4 22 12-15M9 15l-1-5m1 5 6 1" fill="none" stroke="#f4faf2" stroke-width="1.5" stroke-linecap="round"/>',
  chest: '<path d="M3 10V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v3M3 10h18v11H3Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 3v18M16 3v18" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="10" y="9" width="4" height="5" rx="1"/>',
  close: '<path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  trophy: '<path d="M7 3h10v7a5 5 0 0 1-10 0ZM7 5H3v4a4 4 0 0 0 4 4m10-8h4v4a4 4 0 0 1-4 4M12 15v5M7 21h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  target: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="1.3"/>',
  backpack: '<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v12H5Z" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="8" y="12" width="8" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  refresh: '<path d="M20 9a8 8 0 1 0-1 9M20 3v6h-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  plus: '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  clock: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 6v6l4 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  wood: '<path d="m5 7 9-4 6 4v10l-9 4-6-4Z"/><path d="m5 7 6 4 9-4m-9 4v10M8 5l6 4m0 5 3-1" fill="none" stroke="#fff6dd" stroke-opacity=".65" stroke-width="1.4"/>',
};
export function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${paths[name] || paths.paw}</svg>`;
}
export function weaponSvg(type, tier = 0) {
  const colors = {pistol: ['#d9954c', '#f5c570'], smg: ['#5b9f8e', '#97d3b1'], shotgun: ['#ca8069', '#efb58c']};
  const [dark, light] = colors[type] || colors.pistol;
  const barrel = type === 'shotgun' ? '<rect x="60" y="24" width="32" height="8" rx="3" fill="#354a43"/><rect x="60" y="33" width="32" height="5" rx="2" fill="#63776c"/>' : type === 'smg' ? '<rect x="65" y="27" width="25" height="9" rx="2" fill="#354a43"/><path d="m48 41-2 20h10l5-20" fill="#354a43"/>' : '<rect x="61" y="28" width="16" height="10" rx="2" fill="#354a43"/>';
  return `<svg viewBox="0 0 108 78" aria-hidden="true" class="weapon-art"><ellipse cx="54" cy="65" rx="34" ry="5" fill="#29483d" opacity=".08"/><g transform="rotate(-12 54 38)">${barrel}<path d="m28 35-6 25q9 4 15 1l8-21" fill="#43564c"/><rect x="19" y="23" width="51" height="20" rx="6" fill="${dark}"/><path d="M26 23h37a7 7 0 0 1 7 7H22Z" fill="${light}"/><rect x="32" y="17" width="16" height="7" rx="3" fill="#40594d"/><path d="M42 42v8h12l3-8" fill="none" stroke="#40594d" stroke-width="3"/><circle cx="57" cy="34" r="4" fill="#fff0c9"/><circle cx="57" cy="34" r="1.5" fill="${dark}"/>${tier > 0 ? '<path d="m81 12 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#e8b850"/>' : ''}</g></svg>`;
}
