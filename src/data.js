// Content only. Edit this file to rebrand (names, prices, labels).

// Image sequences cut from the AI videos (see tools/prepare-assets.mjs)
export const SEQ = { smash: 144, stack: 144, box: 144 };

// "The Stack" callouts, anchored on the exploded burger in the LAST frame of the
// stack sequence. u, v = position inside the 1280x720 frame (0..1).
export const LAYERS = [
  { name: 'Sesame brioche', note: 'Toasted in beef fat', u: 432 / 1280, v: 150 / 720, side: 'left' },
  { name: 'Iceberg', note: 'Cold, loud crunch', u: 878 / 1280, v: 238 / 720, side: 'right' },
  { name: 'Vine tomato', note: 'Sliced to order', u: 445 / 1280, v: 292 / 720, side: 'left' },
  { name: 'Dill pickles', note: 'House brine, 48 h', u: 772 / 1280, v: 330 / 720, side: 'right' },
  { name: 'Red onion', note: 'Shaved paper thin', u: 462 / 1280, v: 357 / 720, side: 'left' },
  { name: 'Double smash', note: '2 × 90 g, lace edges', u: 862 / 1280, v: 418 / 720, side: 'right' },
  { name: 'Aged cheddar', note: 'Melted twice', u: 420 / 1280, v: 505 / 720, side: 'left' },
  { name: 'Bottom bun', note: 'Built to hold the drip', u: 848 / 1280, v: 600 / 720, side: 'right' },
];

// The glowing star on the closed box (last frame of the box sequence)
export const STAR = { u: 640 / 1280, v: 543 / 720 };

export const MENU = [
  { id: 'classic', name: 'The Classic', ar: 'الكلاسيك', price: 9, img: 'm_classic', desc: 'Double smash, American cheese, pickles, white onion, star sauce.' },
  { id: 'smoke', name: 'Smoke Show', ar: 'دخّان', price: 11, img: 'm_bbq', desc: 'Double smash, cheddar, crispy onion strings, smoky BBQ.' },
  { id: 'triple', name: 'Triple Threat', ar: 'تلاتة', price: 13, img: 'm_triple', desc: 'Three smashed patties, three slices of cheese. No mercy.' },
  { id: 'honey', name: 'Hot Honey', ar: 'عسل حار', price: 10, img: 'm_chicken', desc: 'Crispy chicken thigh, hot honey glaze, slaw, pickles.' },
  { id: 'fries', name: 'Dirty Fries', ar: 'بطاطا بالجبنة', price: 5, img: 'm_fries', desc: 'Skin-on fries drowned in cheese sauce and crispy shallots.' },
  { id: 'shake', name: 'Cookie Shake', ar: 'ميلك شيك', price: 6, img: 'm_shake', desc: 'Vanilla, crushed cookies, whipped cream, red straw.' },
];

// What is already on the receipt before the visitor adds anything
export const DEFAULT_ORDER = ['classic', 'fries', 'shake'];
