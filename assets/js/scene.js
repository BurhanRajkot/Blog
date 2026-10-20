// Title screen runner: a low-res canvas scaled up with crisp pixels.
// Demo mode plays itself. Press start / Space / tap to take over: jump crates and bats, grab coins.
// Coins go straight into the wallet (see game.js); power-ups and skins come from the item shop.
import { HERO, CRATE, COIN, BAT, MOON, SUN, SHIELD, heroColors, drawSprite } from './sprites.js';

const canvas = document.querySelector('.scene canvas');
const stage = canvas?.closest('.title-screen, .game-over');

if (canvas && canvas.getContext && stage) {
  const ctx = canvas.getContext('2d');
  const root = document.documentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = () => window.Noitas || { sfx() {}, unlock() {}, earn() {}, confetti() {}, store: { get: (k, d) => d, set() {} }, has: () => false, skin: 'classic' };

  const hud = {
    score: stage.querySelector('.hud-score'),
    hi: stage.querySelector('.hud-hi'),
    coins: stage.querySelector('.hud-c'),
    msg: stage.querySelector('.game-msg'),
    text: stage.querySelector('.game-msg-text'),
    start: stage.querySelector('.press-start'),
  };

  let PX = 4;
  const GROUND = 6;
  const GRAVITY = 300;
  const JUMP = -118;      // full jump (held)
  const JUMP_CUT = -72;   // let go early for a short hop
  const JUMP_2 = -100;    // double jump

  let W = 0, H = 0, groundY = 0;
  let stars = [], clouds = [], things = [], sparks = [], shooting = null;
  let scroll = 0, t = 0, nextShot = 2, nextThing = 1.2, shake = 0;
  let dark = true, pal;

  // Game state
  let mode = 'demo';          // demo | play | over
  let speed = 34, score = 0, runCoins = 0, overAt = 0;
  let hi = N().store.get('hi', 0);
  let shield = false, airJumps = 0, paused = false, held = false;
  let colors = heroColors('classic');

  const palettes = {
    dark: {
      stars: ['#fff1e8', '#ffec27', '#29adff', '#ff77a8', '#c2c3c7'],
      far: '#1a2550', near: '#24336a',
      grass: '#00e436', grass2: '#008751', dirt: '#5f574f', dirt2: '#3d3540',
      cloud: '#24336a', cloud2: '#1a2550',
    },
    light: {
      far: '#fde2cf', near: '#f9d3bb',
      grass: '#00e436', grass2: '#008751', dirt: '#ab5236', dirt2: '#7e2553',
      cloud: '#ffffff', cloud2: '#fde2cf',
    },
  };

  const hero = { x: 0, y: 0, vy: 0, onGround: true, dead: false, blink: 0 };
  const HH = HERO.runA.length;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pad = (n) => String(Math.floor(n)).padStart(6, '0');

  function hill(x, seed, amp, base) {
    return Math.round(base + amp * (0.55 * Math.sin(x / 23 + seed) + 0.3 * Math.sin(x / 11 + seed * 2) + 0.15 * Math.sin(x / 5.3 + seed * 3)));
  }

  function readTheme() {
    dark = root.dataset.theme !== 'light';
    pal = dark ? palettes.dark : palettes.light;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    PX = r.width < 600 ? 3 : 4;
    W = Math.max(1, Math.ceil(r.width / PX));
    H = Math.max(1, Math.ceil(r.height / PX));
    canvas.width = W;
    canvas.height = H;
    groundY = H - GROUND;
    hero.x = Math.round(Math.min(W * 0.14, 60));
    if (hero.onGround) hero.y = groundY - HH;

    stars = [];
    const n = Math.round(W * (groundY - 10) / 160);
    for (let i = 0; i < n; i++) {
      stars.push({ x: Math.floor(rand(0, W)), y: Math.floor(rand(0, groundY - 14)), c: Math.floor(rand(0, 5)), p: rand(0, 6.28), s: rand(1.2, 3.5), big: Math.random() < 0.08 });
    }
    clouds = [];
    for (let j = 0; j < Math.max(3, Math.round(W / 70)); j++) {
      clouds.push({ x: rand(0, W), y: Math.floor(rand(4, groundY * 0.45)), w: Math.floor(rand(10, 22)), v: rand(2, 5) });
    }
    things = things.filter((o) => o.x < W + 10);
  }

  // ---------- HUD ----------
  function setMsg(text, kind) {
    if (!hud.msg) return;
    hud.text.textContent = text;
    hud.msg.dataset.kind = kind || '';
  }

  function drawHud() {
    if (hud.score) hud.score.textContent = pad(score);
    if (hud.hi) hud.hi.textContent = pad(hi);
    if (hud.coins) hud.coins.textContent = runCoins;
  }

  // ---------- Control ----------
  function jump() {
    if (hero.dead) return;
    if (hero.onGround) {
      hero.vy = JUMP;
      hero.onGround = false;
      if (mode === 'play') N().sfx('jump');
    } else if (mode === 'play' && airJumps > 0) {
      airJumps -= 1;
      hero.vy = JUMP_2;
      N().sfx('jump2');
      puff(hero.x + 4, hero.y + HH, '#fff1e8');
    }
  }

  function release() {
    held = false;
    if (!hero.onGround && hero.vy < JUMP_CUT) hero.vy = JUMP_CUT;
  }

  function start() {
    mode = 'play';
    speed = 42;
    score = 0;
    runCoins = 0;
    things = [];
    sparks = [];
    nextThing = 1.1;
    hero.dead = false;
    hero.vy = 0;
    hero.onGround = true;
    hero.y = groundY - HH;
    colors = heroColors(N().skin);
    shield = N().has('power:shield');
    airJumps = 0;
    if (document.activeElement === hud.start) hud.start.blur();
    stage.classList.add('is-playing');
    stage.classList.remove('is-over');
    setMsg('Go!', 'go');
    setTimeout(() => { if (mode === 'play') setMsg('', ''); }, 700);
    N().sfx('start');
    N().unlock('hop');
    drawHud();
    if (still) schedule(true);
  }

  function gameOver() {
    mode = 'over';
    overAt = t;
    hero.dead = true;
    hero.vy = -80;
    hero.onGround = false;
    shake = 0.35;
    N().sfx('die');
    stage.classList.remove('is-playing');
    stage.classList.add('is-over');

    const bonus = Math.floor(score / 100);
    const best = score > hi;
    if (best) { hi = Math.floor(score); N().store.set('hi', hi); }
    if (bonus) N().earn(bonus);
    if (score >= 500) N().unlock('marathon');

    let line = `Game over · ${pad(score)}`;
    if (best && score > 0) line = `New high score · ${pad(score)}`;
    setMsg(`${line} · +${runCoins + bonus} coins · Tap or Space to retry`, 'over');
    if (best && score > 50) {
      const r = canvas.getBoundingClientRect();
      N().confetti(r.left + r.width / 2, r.top + r.height / 2);
    }
    drawHud();
  }

  function act() {
    if (mode === 'play') { held = true; jump(); return; }
    if (mode === 'over' && t - overAt < 0.6) return;
    start();
    held = true;
  }

  // ---------- World ----------
  function spawnDemo() {
    if (Math.random() < 0.45) {
      things.push({ kind: 'crate', x: W + 4, y: groundY - CRATE.length, w: 6, h: 7 });
    } else {
      const high = Math.random() < 0.5;
      const count = Math.floor(rand(2, 5));
      for (let i = 0; i < count; i++) {
        things.push({ kind: 'coin', x: W + 4 + i * 7, y: groundY - (high ? 22 : 9) - (i === 1 || i === 2 ? 2 : 0), w: 4, h: 4 });
      }
    }
    nextThing = rand(1.4, 3.2);
  }

  function spawnPlay() {
    const r = Math.random();
    const x = W + 4;
    if (r < 0.38) {
      things.push({ kind: 'crate', x, y: groundY - 7, w: 6, h: 7 });
    } else if (r < 0.56 && score > 60) {
      // A stack needs a held jump
      things.push({ kind: 'crate', x, y: groundY - 7, w: 6, h: 7 });
      things.push({ kind: 'crate', x, y: groundY - 14, w: 6, h: 7 });
    } else if (r < 0.74 && score > 120) {
      // Bats fly at jump height: stay on the ground
      things.push({ kind: 'bat', x, y: groundY - HH - 8, w: 8, h: 5, v: 14 });
    } else {
      const high = Math.random() < 0.5;
      const count = Math.floor(rand(3, 6));
      for (let i = 0; i < count; i++) {
        const arc = Math.round(Math.sin((i / (count - 1)) * Math.PI) * 5);
        things.push({ kind: 'coin', x: x + i * 7, y: groundY - (high ? 20 : 9) - arc, w: 4, h: 4 });
      }
    }
    // Always leave room to land and jump again
    nextThing = Math.max(0.85, rand(1.0, 1.9) - Math.min(0.5, (speed - 42) / 120));
  }

  function puff(x, y, c) {
    for (let i = 0; i < 6; i++) sparks.push({ x, y, vx: rand(-25, 25), vy: rand(-20, 5), life: rand(0.2, 0.4), c });
  }

  function burst(x, y) {
    for (let i = 0; i < 6; i++) sparks.push({ x, y, vx: rand(-25, 25), vy: rand(-40, -10), life: rand(0.3, 0.6), c: i % 2 ? '#ffec27' : '#fff1e8' });
  }

  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function update(dt) {
    t += dt;
    if (shake > 0) shake -= dt;
    if (hero.blink > 0) hero.blink -= dt;

    const moving = mode !== 'over';
    if (mode === 'play') {
      speed = Math.min(100, speed + dt * 1.3);
      score += speed * dt * 0.25;
    }
    if (moving) scroll += speed * dt;

    // Hero
    if (!hero.onGround) {
      hero.vy += GRAVITY * dt;
      hero.y += hero.vy * dt;
      const floor = groundY - HH;
      if (!hero.dead && hero.y >= floor) {
        hero.y = floor;
        hero.vy = 0;
        hero.onGround = true;
        if (mode === 'play') airJumps = N().has('power:double-jump') ? 1 : 0;
      }
    }

    if (moving) {
      nextThing -= dt;
      if (nextThing <= 0) (mode === 'play' ? spawnPlay : spawnDemo)();
    }

    const box = { x: hero.x + 1, y: hero.y + 1, w: 6, h: HH - 1 };
    const magnet = mode === 'play' && N().has('power:magnet');
    for (let i = things.length - 1; i >= 0; i--) {
      const o = things[i];
      if (moving) o.x -= (speed + (o.v || 0)) * dt;

      if (o.kind === 'coin') {
        if (magnet && Math.abs(o.x - hero.x) < 22 && Math.abs(o.y - hero.y) < 26) {
          o.x += (hero.x + 2 - o.x) * Math.min(1, dt * 8);
          o.y += (hero.y + 4 - o.y) * Math.min(1, dt * 8);
        }
        if (!hero.dead && overlap(box, o)) {
          o.got = true;
          burst(o.x + 2, o.y + 2);
          if (mode === 'play') {
            runCoins += 1;
            score += 10;
            N().earn(1);
            N().sfx('coin');
            if (runCoins === 10) N().unlock('coins');
          }
        }
      } else if (mode === 'demo') {
        // Autopilot hops crates
        if (o.kind === 'crate' && hero.onGround && o.x - (hero.x + 8) < 7 && o.x - (hero.x + 8) > 0) jump();
      } else if (mode === 'play' && !hero.dead && hero.blink <= 0 && overlap(box, { x: o.x + 1, y: o.y + 1, w: o.w - 2, h: o.h - 1 })) {
        if (shield) {
          shield = false;
          hero.blink = 1.2;
          shake = 0.2;
          N().sfx('hit');
          puff(hero.x + 4, hero.y + 4, '#29adff');
        } else {
          gameOver();
        }
      }
      if (o.x < -12 || o.got) things.splice(i, 1);
    }

    for (let s = sparks.length - 1; s >= 0; s--) {
      const p = sparks[s];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt;
      if (p.life <= 0) sparks.splice(s, 1);
    }

    nextShot -= dt;
    if (dark && nextShot <= 0 && !shooting) {
      shooting = { x: rand(W * 0.3, W), y: rand(0, groundY * 0.3), life: 0.9 };
      nextShot = rand(3, 7);
    }
    if (shooting) {
      shooting.x -= 110 * dt; shooting.y += 55 * dt; shooting.life -= dt;
      if (shooting.life <= 0) shooting = null;
    }

    for (const cl of clouds) {
      cl.x -= cl.v * dt;
      if (cl.x + cl.w < 0) { cl.x = W + rand(0, 20); cl.y = Math.floor(rand(4, groundY * 0.45)); }
    }

    if (mode === 'play') drawHud();
  }

  function cloud(x, y, w, fill, shade) {
    x = Math.round(x);
    ctx.fillStyle = shade;
    ctx.fillRect(x + 1, y + 3, w, 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y + 2, w, 2);
    ctx.fillRect(x + 2, y + 1, w - 5, 1);
    ctx.fillRect(x + Math.floor(w / 3), y, Math.floor(w / 3), 1);
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (shake > 0 && !still) ctx.translate(Math.round(rand(-1, 1)), Math.round(rand(-1, 1)));

    // Sky
    if (dark) {
      drawSprite(ctx, MOON, W - 22, 6);
      for (const st of stars) {
        const on = Math.sin(t * st.s + st.p);
        if (on < -0.35) continue;
        ctx.fillStyle = pal.stars[st.c % pal.stars.length];
        ctx.fillRect(st.x, st.y, 1, 1);
        if (st.big && on > 0.6) { ctx.fillRect(st.x - 1, st.y, 3, 1); ctx.fillRect(st.x, st.y - 1, 1, 3); }
      }
      if (shooting) {
        for (let k = 0; k < 7; k++) {
          ctx.globalAlpha = Math.max(0, 1 - k / 7) * Math.min(1, shooting.life * 2);
          ctx.fillStyle = k ? '#fff1e8' : '#ffec27';
          ctx.fillRect(Math.round(shooting.x + k * 2), Math.round(shooting.y - k), 1, 1);
        }
        ctx.globalAlpha = 1;
      }
    } else {
      drawSprite(ctx, SUN, W - 24, 6);
    }
    for (const cl of clouds) cloud(cl.x, cl.y, cl.w, pal.cloud, pal.cloud2);

    // Parallax hills
    const far = Math.floor(scroll * 0.25), near = Math.floor(scroll * 0.6);
    for (let x = 0; x < W; x++) {
      const hf = hill(x + far, 1.7, 7, Math.min(22, groundY * 0.42));
      ctx.fillStyle = pal.far;
      ctx.fillRect(x, groundY - hf, 1, hf);
      const hn = hill(x + near, 4.1, 4, Math.min(11, groundY * 0.22));
      ctx.fillStyle = pal.near;
      ctx.fillRect(x, groundY - hn, 1, hn);
    }

    // Ground
    ctx.fillStyle = pal.grass;
    ctx.fillRect(0, groundY, W, 1);
    ctx.fillStyle = pal.grass2;
    ctx.fillRect(0, groundY + 1, W, 1);
    ctx.fillStyle = pal.dirt;
    ctx.fillRect(0, groundY + 2, W, GROUND - 2);
    ctx.fillStyle = pal.dirt2;
    const g = Math.floor(scroll) % 8;
    for (let d = -g; d < W; d += 8) { ctx.fillRect(d + 2, groundY + 3, 1, 1); ctx.fillRect(d + 6, groundY + 5, 1, 1); }

    // Things
    for (const o of things) {
      const x = Math.round(o.x), y = Math.round(o.y);
      if (o.kind === 'crate') drawSprite(ctx, CRATE, x, y);
      else if (o.kind === 'bat') drawSprite(ctx, BAT[Math.floor(t * 8) % 2], x, y);
      else drawSprite(ctx, COIN[Math.floor(t * 6 + o.x / 7) % 3], x, y);
    }

    // Hero
    let frame = !hero.onGround ? HERO.jump : (Math.floor(t * 10) % 2 ? HERO.runA : HERO.runB);
    if (hero.dead) frame = HERO.hurt;
    if (mode === 'over' && hero.y > H) frame = null;
    if (still && mode === 'demo') frame = HERO.runA;
    const flicker = hero.blink > 0 && Math.floor(t * 16) % 2;
    if (frame && !flicker) drawSprite(ctx, frame, hero.x, Math.round(hero.y), colors);
    if (shield && mode === 'play') drawSprite(ctx, SHIELD, hero.x + 9, Math.round(hero.y) - 2);

    for (const p of sparks) {
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
  }

  // ---------- Loop ----------
  let last = 0, raf = 0, visible = true;

  function loop(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (!paused) update(dt);
    draw();
    schedule();
  }

  // Reduced motion: the demo is a still frame, but a game you start still runs
  function schedule(force) {
    const run = force || !still || mode !== 'demo';
    if (!raf && visible && !document.hidden && run) raf = requestAnimationFrame(loop);
  }

  readTheme();
  resize();
  colors = heroColors(N().skin);
  if (still) {
    things.push({ kind: 'crate', x: Math.round(W * 0.55), y: groundY - CRATE.length, w: 6, h: 7 });
    things.push({ kind: 'coin', x: Math.round(W * 0.35), y: groundY - 12, w: 4, h: 4 });
  }
  draw();
  drawHud();
  setMsg('Demo', 'demo');

  new MutationObserver(() => { readTheme(); draw(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  new ResizeObserver(() => { resize(); draw(); }).observe(canvas);
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    last = 0;
    schedule();
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => { last = 0; schedule(); });
  document.addEventListener('noitas:pause', () => { paused = true; });
  document.addEventListener('noitas:resume', () => { paused = false; last = 0; schedule(); });

  // Input: tap anywhere on the stage (not on links or the player card), the start button, or keys
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button, .player, input')) return;
    e.preventDefault();
    act();
  });
  addEventListener('pointerup', () => { if (held) release(); });
  hud.start?.addEventListener('click', () => { act(); held = false; });

  const onStage = () => {
    const r = stage.getBoundingClientRect();
    return r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.3;
  };
  addEventListener('keydown', (e) => {
    if (!['Space', 'ArrowUp', 'KeyW'].includes(e.code) || e.repeat) return;
    if (document.querySelector('dialog[open]')) return;
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target.tagName) && mode !== 'play') return;
    if (mode !== 'play' && !onStage()) return;
    e.preventDefault();
    act();
  });
  addEventListener('keyup', (e) => { if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) release(); });

  schedule();
}
