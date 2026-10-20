// Small, dependency-free interactions. Everything degrades to a normal page without JS.
const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Header border once scrolled, and the reading progress line on posts
const progress = document.querySelector('.read-progress span');
const article = document.querySelector('.post-body');
let ticking = false;

function onScroll() {
  ticking = false;
  root.toggleAttribute('data-scrolled', scrollY > 8);
  if (progress && article) {
    const r = article.getBoundingClientRect();
    const total = r.height - innerHeight * 0.6;
    const p = Math.min(1, Math.max(0, -r.top / Math.max(total, 1)));
    progress.style.setProperty('--p', p.toFixed(4));
  }
}
addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
}, { passive: true });
onScroll();

// Theme toggle: a circle of the new theme grows out of the button
const themeBtn = document.querySelector('.theme-toggle');
if (themeBtn) {
  themeBtn.addEventListener('click', (e) => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const apply = () => {
      root.dataset.theme = next;
      try { localStorage.setItem('pref-theme', next); } catch (err) {}
    };

    if (!document.startViewTransition || reduceMotion.matches) { apply(); return; }

    const x = e.clientX || innerWidth - 40;
    const y = e.clientY || 36;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    root.classList.add('theme-vt');
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(0.7, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
    vt.finished.finally(() => root.classList.remove('theme-vt'));
  });
}

// Follow the system theme live, unless the reader picked one
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  let saved = null;
  try { saved = localStorage.getItem('pref-theme'); } catch (err) {}
  if (!saved) root.dataset.theme = e.matches ? 'dark' : 'light';
});

// Mobile menu
const menuBtn = document.querySelector('.menu-toggle');
const mobileNav = document.getElementById('mobile-nav');
if (menuBtn && mobileNav) {
  const setOpen = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobileNav.hidden = !open;
    root.classList.toggle('nav-open', open);
  };
  menuBtn.addEventListener('click', () => setOpen(menuBtn.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  matchMedia('(min-width: 861px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
}

// Portrait: tilts toward the pointer, the photo drifts the other way inside the frame
const fine = matchMedia('(hover: hover) and (pointer: fine)');
document.querySelectorAll('[data-tilt]').forEach((frame) => {
  if (!fine.matches || reduceMotion.matches) return;
  let raf = 0;
  frame.addEventListener('pointermove', (e) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const b = frame.getBoundingClientRect();
      const nx = (e.clientX - b.left) / b.width - 0.5;
      const ny = (e.clientY - b.top) / b.height - 0.5;
      frame.classList.add('is-tilting');
      frame.style.setProperty('--ry', `${(nx * 7).toFixed(2)}deg`);
      frame.style.setProperty('--rx', `${(-ny * 7).toFixed(2)}deg`);
      frame.style.setProperty('--px', `${(-nx * 14).toFixed(1)}px`);
      frame.style.setProperty('--py', `${(-ny * 14).toFixed(1)}px`);
      frame.style.setProperty('--mx', `${((nx + 0.5) * 100).toFixed(1)}%`);
      frame.style.setProperty('--my', `${((ny + 0.5) * 100).toFixed(1)}%`);
    });
  });
  frame.addEventListener('pointerleave', () => {
    cancelAnimationFrame(raf);
    frame.classList.remove('is-tilting');
    ['--rx', '--ry', '--px', '--py'].forEach((p) => frame.style.removeProperty(p));
  });
});

// Code blocks: language label and a copy button
document.querySelectorAll('.prose .highlight').forEach((block) => {
  const code = block.querySelector('code');
  if (!code) return;
  const lang = code.dataset.lang;
  if (lang && lang !== 'fallback' && lang !== 'text') {
    const label = document.createElement('span');
    label.className = 'code-lang';
    label.textContent = lang;
    block.appendChild(label);
  }
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'copy-code';
  btn.textContent = 'Copy';
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.innerText.replace(/\n$/, ''));
      btn.textContent = 'Copied';
    } catch (err) {
      btn.textContent = 'Press Ctrl+C';
      getSelection().selectAllChildren(code);
    }
    btn.classList.add('done');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('done'); }, 1800);
  });
  block.appendChild(btn);
});

// Toast
const toast = document.querySelector('.toast');
let toastTimer;
function say(text) {
  if (!toast) return;
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2400);
}

// For the gamers: up up down down left right left right B A turns the portrait 8-bit
try { if (localStorage.getItem('pixel') === '1') root.classList.add('pixel'); } catch (err) {}
const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let pos = 0;
document.addEventListener('keydown', (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  pos = key === konami[pos] ? pos + 1 : (key === konami[0] ? 1 : 0);
  if (pos < konami.length) return;
  pos = 0;
  const on = root.classList.toggle('pixel');
  try { localStorage.setItem('pixel', on ? '1' : '0'); } catch (err) {}
  say(on ? '8-bit mode unlocked' : 'Back to high-res');
});
