// Inline SVG icons (original drawings, currentColor based, 24x24 grid).

const P = {
  // Armor pieces
  head: '<path d="M5 13c0-4.4 3.1-8 7-8s7 3.6 7 8v3l-2 3H7l-2-3z"/><path d="M8 13h8M12 5v3"/>',
  chest: '<path d="M6 4l3 2h6l3-2 3 4-3 3v9H6v-9L3 8z"/><path d="M12 6v14M9 11h6"/>',
  arms: '<path d="M7 3h6l1 9-2 9H8L6 12z"/><path d="M6.5 8h7.5M7 13h6.5"/><path d="M14 12l4-1v4l-4 1"/>',
  waist: '<path d="M3 8h18v4H3z"/><path d="M6 12l-1 8 4-2 1-6M18 12l1 8-4-2-1-6"/><circle cx="12" cy="10" r="1.5"/>',
  legs: '<path d="M7 3h4l-.5 10L11 21H5l1-8zM13 3h4l1 10 1 8h-6l.5-8z"/>',
  charm: '<path d="M12 3l3 4-3 14-3-14z"/><path d="M9 7h6"/><circle cx="12" cy="3" r="1"/>',
  deco: '<path d="M12 3l7 6-7 12L5 9z"/><path d="M5 9h14M9 9l3 12 3-12M9 9l3-6 3 6"/>',
  // Weapons
  'great-sword': '<path d="M14 3l6 1-1 6-9 9-4-4z"/><path d="M5 13l6 6M3 21l3-3"/>',
  'long-sword': '<path d="M20 3L7 16M18 3h3v3L8 19"/><path d="M5 15l4 4M3 21l3-3"/>',
  'sword-shield': '<path d="M15 3l5 2-8 8-2-2zM9 12l3 3M5 18l3-3"/><path d="M4 9c0 6 4 9 4 9s4-3 4-9l-4-2z"/>',
  'dual-blades': '<path d="M5 3l11 11M19 3L8 14M4 16l4 4M20 16l-4 4"/><path d="M3 21l2-2M21 21l-2-2"/>',
  hammer: '<path d="M8 3h9v7H8z"/><path d="M12 10v11"/><path d="M10 21h4"/>',
  'hunting-horn': '<path d="M6 21c0-6 2-10 6-14l4-4 3 3-4 4c-4 4-6 8-9 11z"/><circle cx="16" cy="6" r="1.2"/><path d="M4 17l3 3"/>',
  lance: '<path d="M20 3l-3 7-9 9-3-3 9-9z"/><path d="M3 15c0 4 3 6 3 6s3-1 5-3l-5-5z"/>',
  gunlance: '<path d="M21 3l-4 6-8 8-3-3 8-8z"/><path d="M14 9l2 2M4 14c0 4 3 6 3 6l3-3-3-3z"/><circle cx="18" cy="6" r="1"/>',
  'switch-axe': '<path d="M5 21L17 9"/><path d="M14 4c3-1 6 1 6 4s-3 4-5 3l-3-3c-1-2 0-3 2-4z"/>',
  'charge-blade': '<path d="M18 3l3 3-11 11-3-3z"/><path d="M4 12c0 5 4 8 4 8s3-2 4-5l-5-5z"/>',
  'insect-glaive': '<path d="M4 20L20 4"/><path d="M17 4l3 3M4 17l3 3"/><path d="M10 7c-2 0-3 1-3 2s2 1 3 0 1-2 0-2z"/>',
  bow: '<path d="M6 3c8 2 12 8 12 18"/><path d="M6 3l12 18"/><path d="M4 13l8-2"/>',
  'heavy-bowgun': '<path d="M3 9h14l4 2v3H11l-2 6H5l2-6H3z"/><path d="M13 9V6h3v3"/>',
  'light-bowgun': '<path d="M4 10h12l4 2-4 2H11l-2 5H6l2-5H4z"/><path d="M12 10V7"/>',
  // UI
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14A8 8 0 1 1 10 4a7 7 0 0 0 10 10z"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M16 16l5 5"/>',
  rotl: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 3v5h5"/>',
  rotr: '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 3v5h-5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="9" cy="15" r="1"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>',
  crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
  paw: '<circle cx="7" cy="9" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="17" cy="9" r="2"/><path d="M8 17c0-3 2-5 4-5s4 2 4 5-2 3-4 3-4 0-4-3z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1"/>',
  shield: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>',
  sword: '<path d="M19 3l2 2-12 12-3-1-1-3zM5 17l-2 4 4-2"/>'
};

/** Returns an inline SVG string. Decorative by default (aria-hidden). */
export function icon(name, { size = 20, label, cls = '' } = {}) {
  const body = P[name] || P.deco;
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${body}</svg>`;
}
