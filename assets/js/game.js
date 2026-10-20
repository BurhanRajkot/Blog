// The game layer on every page: coins, the shop, secret levels, achievements, the pause menu,
// 8-bit sound, the materializing portrait, RPG dialogue text and pixel confetti.
// The coins live in this browser's localStorage. It's a game, not a paywall.

import { PICO as P, SKINS, POWERS, PALETTES, HERO, heroColors, drawSprite } from './sprites.js';

const root = document.documentElement;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPRITES = document.currentScript?.dataset.sprites || '/sprites/';
const PICO16 = Object.values(P);

// ---------- Save data ----------
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('noitas:' + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('noitas:' + key, JSON.stringify(value)); } catch (e) {}
  },
};

// ---------- 8-bit sound ----------
// On by default. Browsers only allow audio after a click or key press, so the
// AudioContext is created on the first gesture; anything before that stays silent.
let audio = null;
let master = null;
let soundOn = store.get('sound', true);
let musicOn = store.get('music', true);

function ensureAudio() {
  if (audio) return audio;
  try {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    master = audio.createGain();
    master.gain.value = 0.9;
    master.connect(audio.destination);
  } catch (e) { audio = null; }
  return audio;
}

['pointerdown', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, () => {
  if (!soundOn) return;
  ensureAudio();
  if (audio && audio.state === 'suspended') audio.resume();
}, { capture: true, passive: true }));

function tone(freq, dur, { to = freq, type = 'square', vol = 0.06, at = 0 } = {}) {
  const t0 = audio.currentTime + at;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

let noiseBuf = null;
function noise(dur, { vol = 0.03, at = 0, hp = 4000 } = {}) {
  if (!noiseBuf) {
    noiseBuf = audio.createBuffer(1, audio.sampleRate * 0.5, audio.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = audio.currentTime + at;
  const src = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  src.buffer = noiseBuf;
  filter.type = 'highpass';
  filter.frequency.value = hp;
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

const SFX = {
  jump: () => tone(260, 0.14, { to: 620 }),
  jump2: () => tone(420, 0.12, { to: 900 }),
  // Coins climb in pitch as a combo builds
  coin: (combo = 1) => { const k = 2 ** (Math.min(combo - 1, 12) / 12); tone(988 * k, 0.06); tone(1319 * k, 0.16, { at: 0.06 }); },
  hit: () => { tone(180, 0.18, { to: 90, type: 'sawtooth', vol: 0.05 }); noise(0.12, { vol: 0.05, hp: 800 }); },
  stomp: () => { tone(300, 0.08, { to: 120 }); noise(0.08, { vol: 0.05, hp: 1500 }); },
  die: () => { tone(440, 0.12, { to: 220 }); tone(220, 0.45, { to: 55, type: 'sawtooth', at: 0.12, vol: 0.05 }); },
  fall: () => tone(700, 0.6, { to: 60, type: 'triangle', vol: 0.08 }),
  power: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.07, { at: i * 0.05, vol: 0.05 })),
  move: () => tone(440, 0.04, { vol: 0.03 }),
  tick: () => tone(1800, 0.015, { vol: 0.012 }),
  click: () => { tone(880, 0.03, { vol: 0.03 }); tone(1320, 0.04, { at: 0.03, vol: 0.025 }); },
  select: () => { tone(660, 0.05); tone(990, 0.08, { at: 0.05 }); },
  start: () => [392, 523, 659, 784].forEach((f, i) => tone(f, 0.09, { at: i * 0.07 })),
  unlock: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.1, { at: i * 0.075, vol: 0.05 })),
  buy: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.08, { at: i * 0.06, vol: 0.05 })),
  nope: () => { tone(200, 0.08); tone(150, 0.14, { at: 0.09 }); },
  pause: () => { tone(988, 0.06); tone(740, 0.08, { at: 0.06 }); },
  blip: () => tone(1400, 0.02, { vol: 0.015 }),
  level: () => [523, 784, 1047].forEach((f, i) => tone(f, 0.12, { at: i * 0.1 })),
  over: () => [523, 494, 466, 440].forEach((f, i) => tone(f, i === 3 ? 0.5 : 0.18, { at: i * 0.2, type: 'triangle', vol: 0.07 })),
};

function sfx(name, arg) {
  if (!soundOn || !SFX[name] || !ensureAudio() || audio.state !== 'running') return;
  try { SFX[name](arg); } catch (e) {}
}

// ---------- Chiptune soundtrack for runs ----------
// A four-bar loop in A minor (Am, F, C, G): square-wave lead, triangle bass, noise hats.
// Notes are MIDI numbers; 0 is a rest. Scheduled slightly ahead so timing stays tight.
const LEAD = [
  69, 0, 72, 0, 76, 0, 72, 0, 74, 0, 72, 0, 69, 0, 67, 0,
  65, 0, 69, 0, 72, 0, 74, 0, 72, 0, 69, 0, 65, 0, 64, 0,
  67, 0, 72, 0, 76, 0, 79, 0, 76, 0, 72, 0, 67, 0, 72, 0,
  71, 0, 74, 0, 79, 0, 74, 0, 71, 0, 67, 0, 74, 0, 0, 0,
];
const ROOTS = [45, 41, 48, 43];
const BASS_STEP = [0, null, 12, null, 0, null, 12, null, 0, null, 12, null, 0, null, 12, 7];
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

const music = (() => {
  let timer = 0, step = 0, nextAt = 0, bpm = 150, playing = false;
  function schedule() {
    const stepDur = 60 / bpm / 4;
    while (nextAt < audio.currentTime + 0.12) {
      const at = nextAt - audio.currentTime;
      const lead = LEAD[step % 64];
      if (lead) tone(hz(lead), stepDur * 1.6, { vol: 0.022, at: Math.max(0, at) });
      const b = BASS_STEP[step % 16];
      if (b !== null) tone(hz(ROOTS[Math.floor(step / 16) % 4] + b), stepDur * 0.9, { type: 'triangle', vol: 0.06, at: Math.max(0, at) });
      if (step % 2 === 0) noise(0.03, { vol: step % 4 === 0 ? 0.018 : 0.01, at: Math.max(0, at), hp: 6000 });
      nextAt += stepDur;
      step += 1;
    }
  }
  return {
    play() {
      if (playing || !soundOn || !musicOn || !ensureAudio() || audio.state !== 'running') return;
      playing = true;
      step = 0;
      nextAt = audio.currentTime + 0.05;
      schedule();
      timer = setInterval(schedule, 25);
    },
    stop() {
      if (!playing) return;
      playing = false;
      clearInterval(timer);
    },
    tempo(next) { bpm = next; },
    get playing() { return playing; },
  };
})();

function setSound(on) {
  soundOn = on;
  store.set('sound', on);
  if (on) { ensureAudio(); audio?.resume(); }
  else music.stop();
  document.querySelectorAll('.sound-toggle').forEach((b) => b.setAttribute('aria-pressed', String(on)));
  syncMenu();
  if (on) setTimeout(() => sfx('select'), 30);
}

function setMusic(on) {
  musicOn = on;
  store.set('music', on);
  if (!on) music.stop();
  syncMenu();
  sfx('select');
}

// ---------- Toast ----------
const toast = document.querySelector('.toast');
let toastTimer;
function say(html, ms = 2600) {
  if (!toast) return;
  toast.innerHTML = html;
  toast.hidden = false;
  toast.style.animation = 'none';
  void toast.offsetWidth;
  toast.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, ms);
}
const coinImg = (s = 18) => `<img src="${SPRITES}coin.svg" alt="" width="${s}" height="${s}">`;

// ---------- Wallet ----------
let coins = store.get('coins', 0);
const owned = new Set(store.get('owned', []));
const equipped = Object.assign({ skin: 'classic', palette: 'pico' }, store.get('equipped', {}));

function renderWallet(delta) {
  document.querySelectorAll('.wallet-n').forEach((el) => {
    el.textContent = coins.toLocaleString();
    if (!delta) return;
    const wallet = el.closest('.wallet');
    wallet?.classList.remove('bump');
    void wallet?.offsetWidth;
    wallet?.classList.add('bump');
    const plus = document.createElement('span');
    plus.className = 'wallet-plus' + (delta < 0 ? ' minus' : '');
    plus.textContent = (delta > 0 ? '+' : '') + delta;
    wallet?.appendChild(plus);
    setTimeout(() => plus.remove(), 900);
  });
  document.dispatchEvent(new CustomEvent('noitas:coins', { detail: coins }));
}

function earn(n, reason) {
  if (!n) return;
  coins += n;
  store.set('coins', coins);
  renderWallet(n);
  if (reason) say(`${coinImg()}<span><small>${reason}</small>+${n} coins</span>`);
  if (coins >= 100) unlock('rich');
}

function spend(n) {
  if (coins < n) return false;
  coins -= n;
  store.set('coins', coins);
  renderWallet(-n);
  return true;
}

function own(id) {
  owned.add(id);
  store.set('owned', [...owned]);
}

function equip(kind, id) {
  equipped[kind] = id;
  store.set('equipped', equipped);
  if (kind === 'palette') applyPalette();
}

function applyPalette() {
  Object.keys(PALETTES).forEach((p) => root.classList.remove('pal-' + p));
  if (equipped.palette && equipped.palette !== 'pico') root.classList.add('pal-' + equipped.palette);
}

// ---------- Achievements: each one pays 10 coins ----------
const ACHIEVEMENTS = [
  ['new-game', 'New game', 'Visit Noitas for the first time.'],
  ['hop', 'First hop', 'Take control of the runner on the title screen.'],
  ['coins', 'Ka-ching', 'Grab 10 coins in a single run.'],
  ['marathon', 'Marathon', 'Score 500 or more in the runner.'],
  ['quest', 'Level cleared', 'Read a post all the way to the end.'],
  ['explorer', 'Explorer', 'Visit every world.'],
  ['shopper', 'Window shopper', 'Buy something in the item shop.'],
  ['secret', 'Secret level', 'Unlock a locked post with coins.'],
  ['rich', 'Coin hoarder', 'Hold 100 coins at once.'],
  ['night', 'Day and night', 'Change the time of day.'],
  ['paused', 'Take a breather', 'Open the pause menu.'],
  ['konami', 'Cheat code', 'Enter the Konami code.'],
];
const REWARD = 10;
const unlocked = new Set(store.get('trophies', []));
const queue = [];
let showing = false;

function unlock(id) {
  if (unlocked.has(id)) return;
  const a = ACHIEVEMENTS.find((x) => x[0] === id);
  if (!a) return;
  unlocked.add(id);
  store.set('trophies', [...unlocked]);
  queue.push(a);
  syncMenu();
  if (!showing) nextTrophy();
}

function nextTrophy() {
  const a = queue.shift();
  if (!a) { showing = false; return; }
  showing = true;
  sfx('unlock');
  coins += REWARD;
  store.set('coins', coins);
  renderWallet(REWARD);
  say(`<img src="${SPRITES}trophy.svg" alt="" width="24" height="22"><span><small>Achievement unlocked</small>${a[1]} · +${REWARD}</span>`, 3000);
  if (coins >= 100 && !unlocked.has('rich')) setTimeout(() => unlock('rich'), 3300);
  setTimeout(nextTrophy, 3200);
}

function renderTrophies() {
  const list = document.querySelector('.trophy-list');
  if (!list) return;
  list.innerHTML = ACHIEVEMENTS.map(([id, name, how]) => {
    const got = unlocked.has(id);
    return `<li class="${got ? 'got' : ''}"><img src="${SPRITES}${got ? 'trophy' : 'lock'}.svg" alt="" width="22" height="22"><span><b>${got ? name : '???'}</b>${how}</span></li>`;
  }).join('');
}

// ---------- Pixel confetti ----------
function confetti(x = innerWidth / 2, y = innerHeight / 3, count = 70) {
  if (still) return;
  const S = 4;
  const cv = document.createElement('canvas');
  cv.className = 'confetti';
  cv.width = Math.ceil(innerWidth / S);
  cv.height = Math.ceil(innerHeight / S);
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const colors = ['#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#ff77a8', '#fff1e8'];
  const bits = Array.from({ length: count }, () => ({
    x: x / S, y: y / S,
    vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 70,
    c: colors[(Math.random() * colors.length) | 0],
    s: Math.random() < 0.3 ? 2 : 1,
  }));
  let last = performance.now(), life = 1.8;
  (function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    life -= dt;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const b of bits) {
      b.vy += 110 * dt; b.vx *= 0.99;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (Math.random() < 0.85) { ctx.fillStyle = b.c; ctx.fillRect(Math.round(b.x), Math.round(b.y), b.s, b.s); }
    }
    if (life > 0) requestAnimationFrame(frame); else cv.remove();
  })(last);
}

function burstFrom(el, count = 50) {
  const r = el.getBoundingClientRect();
  confetti(r.left + r.width / 2, r.top + r.height / 2, count);
}

// ---------- CRT filter and day/night ----------
function setCRT(on) {
  root.classList.toggle('crt', on);
  try { localStorage.setItem('crt', on ? '1' : '0'); } catch (e) {}
  syncMenu();
}

const themeBtn = document.getElementById('theme-toggle');
themeBtn?.addEventListener('click', () => {
  sfx('select');
  unlock('night');
  // PaperMod flips data-theme in its own listener; read it after that runs
  setTimeout(syncMenu, 0);
});

// ---------- Pause menu (also the mobile menu) ----------
const menu = document.querySelector('.pause-menu');

function syncMenu() {
  if (!menu) return;
  const set = (sel, text) => { const el = menu.querySelector(sel); if (el) el.textContent = text; };
  set('.pm-sound', soundOn ? 'On' : 'Off');
  set('.pm-music', musicOn ? 'On' : 'Off');
  set('.pm-crt', root.classList.contains('crt') ? 'On' : 'Off');
  set('.pm-theme', root.dataset.theme === 'dark' ? 'Night' : 'Day');
  set('.pm-trophies', `${unlocked.size}/${ACHIEVEMENTS.length}`);
  renderTrophies();
}

function showScreen(name) {
  menu.querySelectorAll('.pm-screen').forEach((s) => { s.hidden = s.dataset.screen !== name; });
  const first = menu.querySelector(`.pm-screen[data-screen="${name}"] .pm-list :is(a, button)`);
  first?.focus();
}

function openMenu(screen = 'main') {
  if (!menu || menu.open) return;
  syncMenu();
  menu.showModal();
  showScreen(screen);
  sfx('pause');
  unlock('paused');
  document.dispatchEvent(new CustomEvent('noitas:pause'));
}

function closeMenu() { if (menu?.open) menu.close(); }

if (menu) {
  menu.addEventListener('close', () => document.dispatchEvent(new CustomEvent('noitas:resume')));
  menu.addEventListener('cancel', (e) => {
    const current = menu.querySelector('.pm-screen:not([hidden])');
    if (current && current.dataset.screen !== 'main') { e.preventDefault(); showScreen('main'); sfx('move'); }
  });
  menu.addEventListener('click', (e) => {
    if (e.target === menu) { closeMenu(); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'resume') { sfx('select'); closeMenu(); }
    if (act === 'screen') { sfx('select'); showScreen(b.dataset.to); }
    if (act === 'sound') setSound(!soundOn);
    if (act === 'music') setMusic(!musicOn);
    if (act === 'crt') { setCRT(!root.classList.contains('crt')); sfx('select'); }
    if (act === 'theme') themeBtn?.click();
  });
  menu.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...menu.querySelectorAll('.pm-screen:not([hidden]) .pm-list :is(a, button)')];
    const i = items.indexOf(document.activeElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    sfx('move');
    e.preventDefault();
  });
}

document.querySelectorAll('.pause-btn').forEach((b) => b.addEventListener('click', () => openMenu()));
document.querySelectorAll('.sound-toggle').forEach((b) => {
  b.setAttribute('aria-pressed', String(soundOn));
  b.addEventListener('click', () => setSound(!soundOn));
});

function typing(e) {
  const t = e.target;
  return t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
}

// ---------- Keyboard: Esc pauses, Konami code toggles CRT ----------
const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let kpos = 0;
document.addEventListener('keydown', (e) => {
  // preventDefault + next tick, or the same Esc press closes the dialog it just opened
  if (e.key === 'Escape' && !menu?.open && !typing(e)) { e.preventDefault(); setTimeout(openMenu, 0); return; }
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  kpos = key === konami[kpos] ? kpos + 1 : (key === konami[0] ? 1 : 0);
  if (kpos < konami.length) return;
  kpos = 0;
  const on = !root.classList.contains('crt');
  setCRT(on);
  sfx('level');
  unlock('konami');
  say(on ? 'CRT mode on' : 'CRT mode off');
});

// ---------- Portrait: materializes once from 16-colour pixels to the real photo ----------
function nearestPico(r, g, b) {
  let best = PICO16[0], bd = Infinity;
  for (const h of PICO16) {
    const pr = parseInt(h.slice(1, 3), 16), pg = parseInt(h.slice(3, 5), 16), pb = parseInt(h.slice(5, 7), 16);
    const d = 2 * (r - pr) ** 2 + 4 * (g - pg) ** 2 + 3 * (b - pb) ** 2;
    if (d < bd) { bd = d; best = h; }
  }
  return best;
}

function materialize(frame) {
  const img = frame.querySelector('.portrait-real');
  const cv = frame.querySelector('.portrait-fx');
  if (still || !img || !cv?.getContext) return;
  const ctx = cv.getContext('2d');
  const small = document.createElement('canvas');
  const sctx = small.getContext('2d', { willReadFrequently: true });

  function render(cols, quantize) {
    const r = frame.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    const w = cols, h = Math.max(1, Math.round(cols * (r.height / r.width)));
    small.width = w; small.height = h;
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(img, 0, 0, w, h);
    if (quantize) {
      const data = sctx.getImageData(0, 0, w, h);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const hex = nearestPico(px[i], px[i + 1], px[i + 2]);
        px[i] = parseInt(hex.slice(1, 3), 16); px[i + 1] = parseInt(hex.slice(3, 5), 16); px[i + 2] = parseInt(hex.slice(5, 7), 16);
      }
      sctx.putImageData(data, 0, 0);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, cv.width, cv.height);
  }

  const FRAMES = [[6, 1], [9, 1], [13, 1], [18, 1], [26, 1], [36, 0], [52, 0], [80, 0], [130, 0]];
  function play() {
    frame.classList.add('fx-on');
    let i = 0;
    (function step() {
      render(...FRAMES[i]);
      i += 1;
      if (i < FRAMES.length) setTimeout(step, 85);
      else setTimeout(() => frame.classList.remove('fx-on'), 85);
    })();
  }

  const start = () => {
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      play();
    }, { threshold: 0.3 });
    io.observe(frame);
  };
  if (img.complete && img.naturalWidth) start(); else img.addEventListener('load', start, { once: true });
}
document.querySelectorAll('.portrait').forEach(materialize);

// ---------- RPG dialogue: text types itself out ----------
function setupTypewriter(el) {
  const text = el.textContent.trim();
  if (still || !text) return;
  el.textContent = '';
  const sr = document.createElement('span');
  sr.className = 'visually-hidden';
  sr.textContent = text;
  const shown = document.createElement('span');
  shown.setAttribute('aria-hidden', 'true');
  // Reserve the final height so the card doesn't grow while typing
  const ghost = document.createElement('span');
  ghost.className = 'tw-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.textContent = text;
  el.append(sr, ghost, shown);

  let i = 0, timer = 0;
  const finish = () => { clearTimeout(timer); shown.textContent = text; el.classList.add('typed'); };
  const tick = () => {
    i += 1;
    shown.textContent = text.slice(0, i);
    if (i % 3 === 0 && text[i - 1] !== ' ') sfx('blip');
    if (i < text.length) timer = setTimeout(tick, /[.,!?]/.test(text[i - 1]) ? 160 : 22);
    else finish();
  };
  el.addEventListener('click', finish);
  const io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    timer = setTimeout(tick, 600);
  });
  io.observe(el);
}
document.querySelectorAll('[data-typewriter]').forEach(setupTypewriter);

// ---------- Progress: cleared posts, explored worlds, owned secret levels ----------
const cleared = new Set(store.get('cleared', []));
document.querySelectorAll('.slot[data-path]').forEach((slot) => {
  const path = slot.dataset.path;
  if (cleared.has(path)) {
    slot.classList.add('is-cleared');
    slot.querySelector('.slot-cleared')?.removeAttribute('hidden');
  }
  if (slot.classList.contains('slot-locked') && owned.has('post:' + path)) slot.classList.add('is-owned');
});

const worlds = [...document.querySelectorAll('.pause-menu [data-world]')].map((a) => a.dataset.world);
const here = location.pathname.split('/').filter(Boolean)[0];
if (here && worlds.includes(here)) {
  const seen = new Set(store.get('worlds', []));
  seen.add(here);
  store.set('worlds', [...seen]);
  if (worlds.every((w) => seen.has(w))) unlock('explorer');
}

// Reaching the end of a post clears the level and pays out
const CLEAR_REWARD = 25;
function watchFinishLine() {
  const article = document.querySelector('.post-single');
  const finishLine = article?.querySelector('.post-footer');
  if (!finishLine) return;
  const io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting || scrollY < 200) return;
    io.disconnect();
    const path = location.pathname;
    if (cleared.has(path)) return;
    cleared.add(path);
    store.set('cleared', [...cleared]);
    sfx('level');
    confetti(innerWidth / 2, innerHeight * 0.55);
    earn(CLEAR_REWARD, 'Level cleared');
    setTimeout(() => unlock('quest'), 2000);
  }, { threshold: 0.5 });
  io.observe(finishLine);
}

// ---------- Secret levels: locked posts you buy with coins ----------
function decode(b64) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function addCopyButtons(scope) {
  scope.querySelectorAll('pre > code').forEach((code) => {
    const box = code.closest('.highlight') || code.parentNode;
    if (box.querySelector('.copy-code')) return;
    const b = document.createElement('button');
    b.className = 'copy-code';
    b.textContent = 'copy';
    b.addEventListener('click', () => {
      navigator.clipboard?.writeText(code.textContent);
      b.textContent = 'copied!';
      setTimeout(() => { b.textContent = 'copy'; }, 2000);
    });
    box.appendChild(b);
  });
}

function openVault(vault, animate) {
  const body = document.querySelector('.post-content');
  const payload = vault.dataset.payload;
  if (!body || !payload) return;
  body.innerHTML = decode(payload);
  // Scripts inserted via innerHTML don't run; re-create them (charts need this)
  body.querySelectorAll('script').forEach((old) => {
    const s = document.createElement('script');
    [...old.attributes].forEach((a) => s.setAttribute(a.name, a.value));
    s.textContent = old.textContent;
    old.replaceWith(s);
  });
  addCopyButtons(body);
  body.hidden = false;
  setTimeout(() => revealIn(body), 0);
  if (animate) {
    vault.classList.add('opening');
    setTimeout(() => { vault.hidden = true; }, still ? 0 : 700);
    body.classList.add('revealed');
  } else {
    vault.hidden = true;
  }
  watchFinishLine();
}

function setupVault(vault) {
  const id = 'post:' + vault.dataset.path;
  const price = +vault.dataset.price;
  const btn = vault.querySelector('.vault-buy');
  const need = vault.querySelector('.vault-need');
  if (owned.has(id)) { openVault(vault, false); return; }

  const refresh = () => {
    const short = Math.max(0, price - coins);
    btn.disabled = short > 0;
    btn.setAttribute('aria-disabled', String(short > 0));
    vault.classList.toggle('can-afford', !short);
    need.textContent = short ? `You have ${coins} coins. ${short} more to go.` : `You have ${coins} coins. Enough to get in.`;
  };
  refresh();
  document.addEventListener('noitas:coins', refresh);

  btn.addEventListener('click', () => {
    if (owned.has(id)) return;
    if (!spend(price)) { sfx('nope'); vault.classList.add('shake'); setTimeout(() => vault.classList.remove('shake'), 400); return; }
    own(id);
    btn.disabled = true;
    btn.blur();
    sfx('buy');
    burstFrom(vault, 80);
    unlock('secret');
    openVault(vault, true);
  });
}

const vault = document.querySelector('.vault');
if (vault) setupVault(vault); else watchFinishLine();

// ---------- Item shop ----------
function spriteCanvas(rows, colors, scale = 4) {
  const cv = document.createElement('canvas');
  const w = Math.max(...rows.map((r) => r.length));
  cv.width = w; cv.height = rows.length;
  cv.className = 'item-art';
  cv.style.setProperty('--w', w * scale + 'px');
  drawSprite(cv.getContext('2d'), rows, 0, 0, colors);
  return cv;
}

function paletteSwatch(id) {
  const cols = {
    pico: ['#1d2b53', '#ff004d', '#ffec27', '#29adff'],
    gameboy: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
    virtual: ['#000000', '#550000', '#aa0000', '#ff0000'],
  }[id];
  const el = document.createElement('span');
  el.className = 'item-swatch';
  el.innerHTML = cols.map((c) => `<i style="background:${c}"></i>`).join('');
  return el;
}

function itemCard(kind, id, item) {
  const li = document.createElement('li');
  li.className = 'shop-item';
  const art = document.createElement('div');
  art.className = 'item-stage';
  if (kind === 'skin') art.appendChild(spriteCanvas(HERO.runA, heroColors(id), 5));
  else if (kind === 'power') art.appendChild(spriteCanvas(item.icon, P, 5));
  else art.appendChild(paletteSwatch(id));
  const info = document.createElement('div');
  info.className = 'item-info';
  info.innerHTML = `<h3 class="item-name">${item.name}</h3><p class="item-blurb">${item.blurb}</p>`;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn item-btn';
  li.append(art, info, btn);

  const key = kind + ':' + id;
  const free = !item.price;
  const refresh = () => {
    const has = free || owned.has(key);
    const on = (kind === 'skin' && equipped.skin === id) || (kind === 'palette' && equipped.palette === id);
    li.classList.toggle('is-owned', has);
    li.classList.toggle('is-on', on || (kind === 'power' && has));
    btn.disabled = false;
    if (!has) {
      btn.innerHTML = `${coinImg(14)} ${item.price}`;
      btn.classList.toggle('too-pricey', coins < item.price);
      btn.setAttribute('aria-label', `Buy ${item.name} for ${item.price} coins`);
    } else if (kind === 'power') {
      btn.textContent = 'Active';
      btn.disabled = true;
    } else {
      btn.textContent = on ? 'Equipped' : 'Equip';
      btn.disabled = on;
      btn.removeAttribute('aria-label');
    }
  };
  btn.addEventListener('click', () => {
    const has = free || owned.has(key);
    if (!has) {
      if (!spend(item.price)) { sfx('nope'); li.classList.add('shake'); setTimeout(() => li.classList.remove('shake'), 400); say(`${coinImg()}<span><small>Not enough coins</small>Need ${item.price - coins} more</span>`); return; }
      own(key);
      sfx('buy');
      burstFrom(btn, 40);
      unlock('shopper');
      if (kind !== 'power') equip(kind, id);
    } else {
      sfx('select');
      equip(kind, id);
    }
    document.dispatchEvent(new CustomEvent('noitas:shop'));
  });
  document.addEventListener('noitas:shop', refresh);
  document.addEventListener('noitas:coins', refresh);
  refresh();
  return li;
}

function setupShop(shop) {
  const fill = (sel, kind, items) => {
    const grid = shop.querySelector(sel);
    if (!grid) return;
    Object.entries(items).forEach(([id, item]) => grid.appendChild(itemCard(kind, id, item)));
  };
  fill('.shop-skins', 'skin', SKINS);
  fill('.shop-powers', 'power', POWERS);
  fill('.shop-palettes', 'palette', PALETTES);

  shop.querySelectorAll('.secret-item').forEach((li) => {
    const id = 'post:' + li.dataset.path;
    const price = +li.dataset.price;
    const btn = li.querySelector('.item-btn');
    const refresh = () => {
      const has = owned.has(id);
      li.classList.toggle('is-owned', has);
      btn.classList.toggle('too-pricey', !has && coins < price);
      if (has) { btn.textContent = 'Play level ▶'; btn.setAttribute('aria-label', 'Read ' + li.querySelector('.item-name').textContent); }
    };
    btn.addEventListener('click', () => {
      if (owned.has(id)) { location.href = li.dataset.path; return; }
      if (!spend(price)) { sfx('nope'); li.classList.add('shake'); setTimeout(() => li.classList.remove('shake'), 400); say(`${coinImg()}<span><small>Not enough coins</small>Need ${price - coins} more</span>`); return; }
      own(id);
      sfx('buy');
      burstFrom(btn, 60);
      unlock('shopper');
      unlock('secret');
      refresh();
    });
    document.addEventListener('noitas:coins', refresh);
    refresh();
  });
  shop.classList.add('ready');
}
const shop = document.querySelector('.shop');
if (shop) setupShop(shop);

// ---------- UI feel: menu sounds, click sparks, stepped reveals ----------
const UI = '.btn, .world a, .slot > a, .shop-item, #menu a, .pm-list a, .pm-list button, .wallet, .hud-btn, #theme-toggle, .paginav a, .post-tags a, .logo a';
const fine = matchMedia('(hover: hover) and (pointer: fine)');
let lastHover = null, lastTick = 0;
document.addEventListener('pointerover', (e) => {
  if (!fine.matches) return;
  const el = e.target.closest(UI);
  if (!el || el === lastHover) { if (!el) lastHover = null; return; }
  lastHover = el;
  const now = performance.now();
  if (now - lastTick > 45) { lastTick = now; sfx('tick'); }
});
document.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const el = e.target.closest(UI);
  // Buttons with their own sounds (shop, vault, pause menu actions) skip the generic click
  if (el && !el.matches('.item-btn, .vault-buy, .sound-toggle, [data-act], #theme-toggle')) sfx('click');
  if (still || (e.target.closest('.title-screen, .game-over') && !el)) return;
  spark(e.clientX, e.clientY);
});

function spark(x, y) {
  const box = document.createElement('span');
  box.className = 'spark';
  box.style.left = x + 'px';
  box.style.top = y + 'px';
  const dirs = [[-1, -1], [0, -1.3], [1, -1], [-1.2, 0.2], [1.2, 0.2], [0, 1]];
  box.innerHTML = dirs.map(([dx, dy]) => `<i style="--dx:${dx};--dy:${dy}"></i>`).join('');
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 450);
}

// Content steps into view as you scroll, like sprites loading in
const REVEAL = '.screen-heading, .world, .slot, .shop-item, .player-links li, .earn-list li, .empty-world, .level-end, .paginav, .post-tags, .world-banner, .post-content > :is(h2, h3, pre, .highlight, blockquote, table, figure, div, ul, ol)';
const revealer = !still && 'IntersectionObserver' in window && new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    revealer.unobserve(en.target);
  });
}, { rootMargin: '0px 0px -8% 0px' });

function revealIn(scope = document) {
  if (!revealer) return;
  scope.querySelectorAll(REVEAL).forEach((el) => {
    if (el.classList.contains('rv')) return;
    // Things already on screen keep their load animation; only what's below the fold steps in
    if (scope === document && el.getBoundingClientRect().top < innerHeight) return;
    const i = [...el.parentElement.children].indexOf(el);
    el.style.setProperty('--rv-d', `${(i % 6) * 70}ms`);
    el.classList.add('rv');
    revealer.observe(el);
  });
}
revealIn();

// ---------- Daily bonus and first visit ----------
const today = new Date().toISOString().slice(0, 10);
const lastDay = store.get('day', null);
if (!lastDay) {
  store.set('day', today);
  setTimeout(() => unlock('new-game'), 1800);
} else if (lastDay !== today) {
  store.set('day', today);
  setTimeout(() => earn(5, 'Daily bonus'), 1200);
}

applyPalette();
renderWallet(0);
syncMenu();

// Shared with scene.js
window.Noitas = {
  sfx, say, unlock, confetti, store, earn, music, SPRITES,
  pause: () => openMenu(),
  get skin() { return equipped.skin; },
  has: (id) => owned.has(id),
};
