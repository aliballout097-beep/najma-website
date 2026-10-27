// NAJMA (نجمة) — entry point.
// Scroll -> one progress number per chapter (0..1) -> frames, effects, labels, ring, receipt.
// Everything visual is a pure function of scroll + time, so the reel recorder can replay it.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Stage, wordTexture } from './stage.js';
import { Sequences } from './sequence.js';
import { LAYERS, STAR, MENU, DEFAULT_ORDER, SEQ } from './data.js';

gsap.registerPlugin(ScrollTrigger);

const REC = new URLSearchParams(location.search).has('rec');
const root = document.documentElement;
if (REC) root.classList.add('rec');
const $ = (id) => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/* ------------------------------------------------------------------ state */
const state = { intro: 0, hero: 0, smash: 0, stack: 0, box: 0, lineup: 0, order: 0, page: 0 };
let vw = innerWidth;
let vh = innerHeight;
let portrait = false;

/* ------------------------------------------------------------------ scroll */
const track = (trigger, key, start = 'top top', end = 'bottom bottom') =>
  ScrollTrigger.create({ trigger, start, end, onUpdate: (s) => (state[key] = s.progress) });
track('#top', 'hero', 'top top', 'bottom top');
track('#smash', 'smash');
track('#stack', 'stack');
track('#box', 'box');
track('#lineup', 'lineup');
track('#order', 'order');
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => (state.page = s.progress) });

let lenis = null;
if (!REC) {
  lenis = new Lenis({ lerp: 0.09 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
document.querySelectorAll('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    const y = el.offsetTop + parseFloat(a.dataset.go || 0) * Math.max(0, el.offsetHeight - innerHeight);
    lenis ? lenis.scrollTo(y, { duration: 2.2 }) : scrollTo(0, y);
  })
);

/* ------------------------------------------------------------------ text reveals */
// data-r="chapter:inStart:inEnd:outStart:outEnd" (-1 = always in / never out); data-rm = portrait
let reveals = [];
const parseReveals = () => {
  reveals = [...document.querySelectorAll('[data-r]')].map((el) => {
    const [key, a, b, c, d] = ((portrait && el.dataset.rm) || el.dataset.r).split(':');
    return { el, key, a: +a, b: +b, c: +c, d: +d };
  });
};
const applyReveals = () => {
  for (const r of reveals) {
    const p = state[r.key];
    const i = r.a < 0 ? 1 : smooth(r.a, r.b, p);
    const o = r.c < 0 ? 0 : smooth(r.c, r.d, p);
    const op = i * (1 - o);
    r.el.style.opacity = op.toFixed(3);
    r.el.style.transform = `translate3d(0, ${((1 - i) * 50 - o * 30).toFixed(1)}px, 0)`;
    r.el.style.visibility = op < 0.005 ? 'hidden' : 'visible';
  }
};

/* ------------------------------------------------------------------ frame geometry */
// Where a 16:9 frame sits on screen. zoom 1 = fills the height (desktop) / a wide crop (phone).
function fit(zoom, sx = 0, sy = 0) {
  let w, h, x, y;
  if (portrait) {
    w = vw * 1.72 * zoom;
    h = (w * 9) / 16;
    x = (vw - w) / 2;
    y = vh * 0.42 - h / 2 + sy * vh;
  } else {
    h = vh * 0.84 * zoom;
    w = (h * 16) / 9;
    x = (vw - w) / 2 + sx * vw;
    y = (vh - h) / 2 + sy * vh;
  }
  return { x, y, w, h };
}
const mixRect = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });

/* ------------------------------------------------------------------ HUD (stack callouts) */
const svgNS = 'http://www.w3.org/2000/svg';
const hudLines = $('hudLines');
const tags = LAYERS.map((l, i) => {
  const el = document.createElement('div');
  el.className = `tag tag--${l.side}`;
  el.innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b><strong>${l.name}</strong><span>${l.note}</span>`;
  $('hudTags').appendChild(el);
  const line = document.createElementNS(svgNS, 'line');
  const dot = document.createElementNS(svgNS, 'circle');
  dot.setAttribute('r', '4');
  hudLines.append(line, dot);
  return { ...l, el, line, dot };
});
function placeTags(rect) {
  tags.forEach((t, i) => {
    const op = smooth(0.17 + i * 0.03, 0.25 + i * 0.03, state.stack) * (1 - smooth(0.5, 0.58, state.stack));
    if (op < 0.005) {
      t.el.style.opacity = t.line.style.opacity = t.dot.style.opacity = 0;
      return;
    }
    const x = rect.x + t.u * rect.w;
    const y = rect.y + t.v * rect.h;
    const dir = t.side === 'left' ? -1 : 1;
    const gap = (portrait ? 18 : clamp(vw * 0.05, 40, 96)) * (0.3 + 0.7 * op);
    const x2 = x + dir * gap;
    t.line.setAttribute('x1', x);
    t.line.setAttribute('y1', y);
    t.line.setAttribute('x2', x2);
    t.line.setAttribute('y2', y);
    t.dot.setAttribute('cx', x);
    t.dot.setAttribute('cy', y);
    t.line.style.opacity = t.dot.style.opacity = op;
    if (portrait) t.el.style.maxWidth = `${Math.max(64, dir < 0 ? x2 - 8 : vw - x2 - 8)}px`;
    t.el.style.opacity = op;
    t.el.style.transform = `translate3d(${x2 + dir * 8}px, ${y}px, 0) translate(${dir < 0 ? '-100%' : '0'}, -50%)`;
  });
}

/* ------------------------------------------------------------------ the lineup ring */
const ring = $('ring');
const ringItems = MENU.map((m) => {
  const el = document.createElement('div');
  el.className = 'ring-item';
  el.innerHTML = `<img src="img/${m.img}_a.webp" alt="${m.name}" draggable="false"><img class="alt" src="img/${m.img}_b.webp" alt="" draggable="false">`;
  ring.appendChild(el);
  return el;
});
let ringIndex = -1;
function showItem(i) {
  if (i === ringIndex) return;
  ringIndex = i;
  const m = MENU[i];
  $('liName').textContent = m.name;
  $('liAr').textContent = m.ar;
  $('liDesc').textContent = m.desc;
  $('liPrice').textContent = `$${m.price}`;
  $('liCount').textContent = `${String(i + 1).padStart(2, '0')} / ${String(MENU.length).padStart(2, '0')}`;
}
function updateRing() {
  const f = clamp((state.lineup - 0.06) / 0.86) * (MENU.length - 1);
  let c = 0;
  for (let k = 0; k < MENU.length - 1; k++) c += easeIO(smooth(0.22, 0.78, clamp(f - k)));
  const step = 360 / MENU.length;
  const itemW = ringItems[0].offsetWidth || 400;
  const R = (itemW / 2 / Math.tan(Math.PI / MENU.length)) * 1.08;
  ring.style.transform = `translateZ(${-R}px) rotateY(${(-c * step).toFixed(3)}deg)`;
  ringItems.forEach((el, i) => {
    const a = ((i - c) * step * Math.PI) / 180;
    const facing = Math.cos(a);
    el.style.transform = `rotateY(${i * step}deg) translateZ(${R}px)`;
    el.style.opacity = (0.08 + 0.92 * smooth(-0.1, 1, facing)).toFixed(3);
  });
  const idx = Math.round(c);
  showItem(idx);
  $('liPanel').style.opacity = (1 - smooth(0.1, 0.4, Math.abs(c - idx))).toFixed(3);
  $('liBar').style.transform = `scaleX(${(c / (MENU.length - 1)).toFixed(4)})`;
}

/* ------------------------------------------------------------------ receipt */
const order = [...DEFAULT_ORDER];
const paper = $('paper');
const receiptItems = $('rcItems');
function renderReceipt() {
  const lines = order.map((id) => MENU.find((m) => m.id === id));
  receiptItems.innerHTML = lines.map((m) => `<div class="rc-row"><span>1× ${m.name.toUpperCase()}</span><i></i><span>$${m.price.toFixed(2)}</span></div>`).join('');
  const total = lines.reduce((s, m) => s + m.price, 0);
  $('rcSub').textContent = `$${total.toFixed(2)}`;
  $('rcTotal').textContent = `$${total.toFixed(2)}`;
  $('orderCount').textContent = order.length;
  const text = `Hi NAJMA ★ my order:\n${lines.map((m) => `• ${m.name} — $${m.price}`).join('\n')}\nTotal: $${total}`;
  $('sendBtn').href = $('sendBtn2').href = `https://wa.me/?text=${encodeURIComponent(text)}`;
}
const now = REC ? new Date(2026, 9, 3, 21, 14) : new Date();
$('rcDate').textContent = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(2)}  ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
$('rcNo').textContent = `#${String(263 + Math.floor(now.getMinutes() / 3)).padStart(4, '0')}`;
renderReceipt();
$('addBtn').addEventListener('click', () => {
  order.push(MENU[ringIndex].id);
  renderReceipt();
  gsap.fromTo('#orderCount', { scale: 1.8 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' });
  const t = $('toast');
  t.innerHTML = `<b>★</b> ${MENU[ringIndex].name} added. It's on the receipt.`;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2400);
});
function updateReceipt() {
  const full = $('rcInner').offsetHeight;
  const printed = smooth(0.08, 0.7, state.order);
  paper.style.height = `${(printed * full).toFixed(1)}px`;
  $('printer').classList.toggle('busy', printed > 0.01 && printed < 0.99);
}

/* ------------------------------------------------------------------ marquees (driven by JS so the recorder can replay them) */
const marquees = [...document.querySelectorAll('.marquee-track')];
function updateMarquees(t) {
  const y = scrollY;
  marquees.forEach((m, i) => {
    const w = m.scrollWidth / 2;
    const off = ((t * 60 + y * 0.35) % w) * (i % 2 ? 1 : -1);
    m.style.transform = `translate3d(${i % 2 ? off - w : off}px, 0, 0)`;
  });
}

/* ------------------------------------------------------------------ cursor */
const cursor = $('cursor');
let mouse = { x: vw / 2, y: vh / 2 };
if (!REC && matchMedia('(pointer: fine)').matches) {
  addEventListener('pointermove', (e) => (mouse = { x: e.clientX, y: e.clientY }));
  document.addEventListener('pointerover', (e) => cursor.classList.toggle('big', !!e.target.closest('a, button, .ring-item')));
} else cursor.style.display = 'none';

/* ------------------------------------------------------------------ the director */
let stage = null;
let seqs = null;
let words = {};
let lastY = 0;
let lastT = 0;
let vel = 0;
let lift = 0;

function frame(t) {
  const dt = Math.max(1 / 120, t - lastT || 1 / 60);
  const dy = scrollY - lastY;
  lastY = scrollY;
  lastT = t;
  vel = lerp(vel, clamp(dy / dt / 2600, -1, 1), 0.25);
  lift += Math.abs(dy) * 0.0007;

  // intro reveal of the hero copy
  const it = state.intro;
  root.style.setProperty('--i1', smooth(0.1, 0.6, it).toFixed(3));
  root.style.setProperty('--i2', smooth(0.3, 0.8, it).toFixed(3));
  root.style.setProperty('--i3', smooth(0.5, 1, it).toFixed(3));
  applyReveals();
  updateMarquees(t);
  updateRing();
  updateReceipt();
  $('nav').classList.toggle('on-light', state.box > 0.9 && $('foot').getBoundingClientRect().top > 60);
  cursor.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0) rotate(${(t * 40 + vel * 200).toFixed(1)}deg)`;

  if (!stage || !seqs) return;

  /* --- which frames, where --- */
  const { smash, stack, box } = state;
  const sIdx = easeIO(clamp((smash - 0.04) / 0.86)) * (SEQ.smash - 1);
  const stackIdx = (1 - easeIO(clamp((stack - 0.56) / 0.38))) * (SEQ.stack - 1);
  const boxIdx = easeIO(clamp((box - 0.1) / 0.62)) * (SEQ.box - 1);
  const smashIn = smooth(0, 0.18, smash);
  const stackIn = smooth(0, 0.14, stack);
  const boxIn = smooth(0, 0.1, box);
  const push = easeIO(smooth(0.72, 0.97, box));
  const portal = smooth(0.82, 1, box);

  let sx = lerp(0, 0.1, smashIn);
  sx = lerp(sx, 0.04, stackIn);
  sx = lerp(sx, 0.06, boxIn);
  let zoom = lerp(1, portrait ? 0.84 : 1.04, stackIn); // phones: pull back so the callouts fit
  zoom = lerp(zoom, 1, boxIn);
  const base = fit(zoom * (1 + (1 - it) * 0.12), sx);

  let A, B, mix, rectA = base, rectB = base;
  if (box > 0) {
    A = seqs.get('stack', 0);
    B = seqs.get('box', boxIdx);
    mix = boxIn;
    // push into the glowing star: zoom, and slide the star to the centre of the screen
    const sxStar = base.x + STAR.u * base.w;
    const syStar = base.y + STAR.v * base.h;
    const k = 1 + 1.9 * push * push;
    const tx = lerp(sxStar, vw / 2, push);
    const ty = lerp(syStar, vh / 2, push);
    rectB = { w: base.w * k, h: base.h * k, x: tx - STAR.u * base.w * k, y: ty - STAR.v * base.h * k };
    rectA = base;
    // the portal: the menu opens out of the star
    const r = portal * Math.hypot(vw, vh) * 1.05;
    $('portal').style.clipPath = `circle(${r.toFixed(1)}px at ${tx.toFixed(1)}px ${ty.toFixed(1)}px)`;
    $('portal').style.visibility = portal > 0.001 ? 'visible' : 'hidden';
  } else {
    $('portal').style.visibility = 'hidden';
    if (stack > 0) {
      A = seqs.get('smash', SEQ.smash - 1);
      B = seqs.get('stack', stackIdx);
      mix = stackIn;
    } else {
      A = B = seqs.get('smash', sIdx);
      mix = 0;
    }
  }
  stage.setFrames(A, B);
  placeTags(rectB);

  /* --- the giant word behind the food --- */
  const wordsOrder = [
    ['NAJMA', 1 - smashIn],
    ['SMASH', smashIn * (1 - stackIn)],
    ['STACK', stackIn * (1 - boxIn)],
    ['BOXED', boxIn],
  ];
  wordsOrder.sort((a, b) => b[1] - a[1]);
  const [w1, w2] = wordsOrder;
  const wordW = portrait ? vw * 1.02 : Math.min(vw * 0.9, base.w * 0.72);
  const wordH = (wordW * 600) / 2048;
  const wordRect = { w: wordW, h: wordH, x: base.x + base.w / 2 - wordW / 2, y: base.y + base.h * 0.5 - wordH * 0.52 };
  const wordAlpha = (0.92 * it) * (1 - push);

  /* --- shake + speed --- */
  const blast = smooth(0.18, 0.3, smash) * (1 - smooth(0.42, 0.6, smash));
  const amp = blast * (2 + Math.abs(vel) * 10) + Math.abs(vel) * 1.5 * (1 - smooth(0.7, 1, box));
  const shake = { x: Math.sin(t * 87.3) * amp + Math.sin(t * 41.1) * amp * 0.5, y: Math.cos(t * 73.7) * amp };

  stage.draw({
    rectA, rectB, mix,
    word: { a: words[w1[0]], b: words[w2[0]], mix: w2[1] / Math.max(0.0001, w1[1] + w2[1]), alpha: wordAlpha * Math.max(w1[1] + w2[1], 0), rect: wordRect },
    time: t,
    vel: vel * (0.6 + blast),
    heat: lerp(1, 0.35, smashIn) * (1 - boxIn * 0.6),
    shake,
    embers: { lift, alpha: (0.35 + 0.65 * it) * (1 - portal) * (1 + blast) },
    fade: lerp(0, 1, smooth(0, 0.4, it)),
  });
}

function resize() {
  vw = innerWidth;
  vh = innerHeight;
  portrait = vw / vh < 0.9 || vw <= 760;
  root.classList.toggle('is-portrait', portrait);
  parseReveals();
  stage?.resize(vw, vh);
}

/* ------------------------------------------------------------------ boot */
async function boot() {
  const setLoad = (v) => {
    root.style.setProperty('--load', v.toFixed(3));
    $('loaderPct').textContent = String(Math.round(v * 100)).padStart(2, '0');
  };
  await document.fonts.load('100px Anton').catch(() => {});
  words = Object.fromEntries(['NAJMA', 'SMASH', 'STACK', 'BOXED'].map((w) => [w, wordTexture(w)]));
  try {
    stage = new Stage($('gl'), { rec: REC });
  } catch (e) {
    console.warn('WebGL unavailable', e);
    root.classList.add('no-gl');
  }
  resize();
  addEventListener('resize', resize);

  seqs = new Sequences();
  let resolveFirst;
  const firstReady = new Promise((r) => (resolveFirst = r));
  const loadingAll = seqs.load((p) => {
    // the loader waits for the whole first chapter, the rest streams in behind
    const smashDone = seqs.frames.smash.filter(Boolean).length / SEQ.smash;
    setLoad(Math.min(1, smashDone));
    if (smashDone >= 1) resolveFirst();
  });
  await (REC ? loadingAll : firstReady);
  ScrollTrigger.refresh();

  if (REC) {
    window.__rec = {
      frame(t, intro = 1) {
        state.intro = intro;
        ScrollTrigger.update();
        frame(t);
      },
      tint: () => (state.box > 0.9 && $('foot').getBoundingClientRect().top > innerHeight * 0.5 ? '#e9d9bb' : '#d4501a'),
      sections() {
        const s = {};
        for (const id of ['top', 'smash', 'stack', 'box', 'lineup', 'order', 'foot']) s[id] = { top: $(id).offsetTop, height: $(id).offsetHeight };
        return { s, vh: innerHeight, max: document.documentElement.scrollHeight - innerHeight };
      },
    };
    window.__ready = true;
    return;
  }

  $('loader').classList.add('done');
  const start = performance.now() + 300;
  gsap.ticker.add(() => {
    const now = performance.now();
    state.intro = clamp((now - start) / 1800);
    frame(now / 1000);
  });
}

boot();
