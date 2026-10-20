// Title screen runner: a low-res canvas scaled up with crisp pixels.
// Demo mode plays itself. Press start / Space / tap to take over: jump crates, pits and bats,
// grab coins for combos, hit ? blocks for temporary powers. Coins go into the wallet (game.js);
// permanent power-ups and skins come from the item shop.
import { HERO, CRATE, COIN, BAT, MOON, SUN, SHIELD, QBLOCK, FONT, heroColors, drawSprite } from './sprites.js';

const canvas = document.querySelector('.scene canvas');
const stage = canvas?.closest('.title-screen, .game-over');

if (canvas && canvas.getContext && stage) {
  const ctx = canvas.getContext('2d');
  const root = document.documentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noop = () => {};
  const N = () => window.Noitas || { sfx: noop, unlock: noop, earn: noop, confetti: noop, pause: noop, music: { play: noop, stop: noop, tempo: noop }, store: { get: (k, d) => d, set: noop }, has: () => false, skin: 'classic' };

  const hud = {
    score: stage.querySelector('.hud-score'),
    hi: stage.querySelector('.hud-hi'),
    coins: stage.querySelector('.hud-c'),
    level: stage.querySelector('.hud-level'),
    power: stage.querySelector('.hud-power'),
    msg: stage.querySelector('.game-msg'),
    text: stage.querySelector('.game-msg-text'),
    start: stage.querySelector('.press-start'),
  };

  let PX = 4;
  const GROUND = 6;
  const GRAVITY = 300;
  const FAST_FALL = 520;   // holding down pulls you to the ground faster
  const JUMP = -118;       // full jump (held)
  const JUMP_CUT = -72;    // let go early for a short hop
  const JUMP_2 = -100;     // double jump
  const COYOTE = 0.09;     // you can still jump just after running off an edge
  const BUFFER = 0.13;     // a press just before landing still counts

  let W = 0, H = 0, groundY = 0;
  let stars = [], clouds = [], things = [], sparks = [], floats = [], shooting = null;
  let scroll = 0, t = 0, nextShot = 2, nextThing = 1.2, shake = 0, flash = 0, freeze = 0, dustT = 0;
  let dark = true, pal;

  // Game state
  let mode = 'demo';          // demo | play | over
  let speed = 34, score = 0, runCoins = 0, overAt = 0, level = 1;
  let hi = N().store.get('hi', 0);
  let shield = false, airJumps = 0, paused = false, held = false, down = false;
  let lastGround = 0, bufferedAt = -1, combo = 0, lastCoin = -9;
  const powers = { star: 0, magnet: 0, double: 0 };
  let colors = heroColors('classic');

  const palettes = {
    dark: {
      stars: ['#fff1e8', '#ffec27', '#29adff', '#ff77a8', '#c2c3c7'],
      mtn: '#141c3d', mtnCap: '#2a3a6e', far: '#1a2550', near: '#24336a',
      grass: '#00e436', grass2: '#008751', dirt: '#5f574f', dirt2: '#3d3540', pit: '#060917',
      cloud: '#24336a', cloud2: '#1a2550', dust: '#83769c',
    },
    light: {
      mtn: '#fbe7d8', mtnCap: '#ffffff', far: '#fde2cf', near: '#f9d3bb',
      grass: '#00e436', grass2: '#008751', dirt: '#ab5236', dirt2: '#7e2553', pit: '#1d2b53',
      cloud: '#ffffff', cloud2: '#fde2cf', dust: '#ffccaa',
    },
  };

  const hero = { x: 0, y: 0, vy: 0, onGround: true, dead: false, blink: 0, fell: false };
  const HH = HERO.runA.length;
  const RAINBOW = ['#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#ff77a8'];

  const rand = (a, b) => a + Math.random() * (b - a);
  const pad = (n) => String(Math.floor(n)).padStart(6, '0');

  function hill(x, seed, amp, base) {
    return Math.round(base + amp * (0.55 * Math.sin(x / 23 + seed) + 0.3 * Math.sin(x / 11 + seed * 2) + 0.15 * Math.sin(x / 5.3 + seed * 3)));
  }

  // Jagged far mountains from two overlapping triangle waves
  function peak(x) {
    const tri = (v, p) => Math.abs(((v / p) % 2 + 2) % 2 - 1);
    return Math.round(Math.min(30, groundY * 0.55) * (0.35 + 0.45 * (1 - tri(x, 37)) + 0.2 * (1 - tri(x + 11, 13))));
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
  let msgTimer = 0;
  function setMsg(text, kind, ms) {
    if (!hud.msg) return;
    clearTimeout(msgTimer);
    hud.text.textContent = text;
    hud.msg.dataset.kind = kind || '';
    // Restart the CSS pop each time
    hud.text.style.animation = 'none';
    void hud.text.offsetWidth;
    hud.text.style.animation = '';
    if (ms) msgTimer = setTimeout(() => { if (mode === 'play') setMsg('', ''); }, ms);
  }

  let hudCache = '';
  function drawHud() {
    const active = Object.entries(powers).filter(([, v]) => v > 0);
    const power = active.map(([k, v]) => `${{ star: '★', magnet: 'U', double: '×2' }[k]} ${Math.ceil(v)}`).join('  ');
    const key = [Math.floor(score), hi, runCoins, level, power].join('|');
    if (key === hudCache) return;
    hudCache = key;
    if (hud.score) hud.score.textContent = pad(score);
    if (hud.hi) hud.hi.textContent = pad(hi);
    if (hud.coins) hud.coins.textContent = runCoins;
    if (hud.level) hud.level.textContent = level;
    if (hud.power) { hud.power.textContent = power; hud.power.hidden = !power; }
  }

  // ---------- Control ----------
  function canGroundJump() {
    return hero.onGround || (!hero.fell && t - lastGround < COYOTE && hero.vy >= 0);
  }

  function jump() {
    if (hero.dead) return;
    if (canGroundJump()) {
      hero.vy = JUMP;
      hero.onGround = false;
      lastGround = -9;
      bufferedAt = -1;
      if (mode === 'play') N().sfx('jump');
      dust(hero.x + 2, groundY - 1, 3);
    } else if (mode === 'play' && airJumps > 0) {
      airJumps -= 1;
      hero.vy = JUMP_2;
      N().sfx('jump2');
      puff(hero.x + 4, hero.y + HH, '#fff1e8');
    } else if (mode === 'play') {
      bufferedAt = t;
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
    level = 1;
    combo = 0;
    things = [];
    sparks = [];
    floats = [];
    powers.star = powers.magnet = powers.double = 0;
    nextThing = 1.1;
    hero.dead = false;
    hero.fell = false;
    hero.vy = 0;
    hero.onGround = true;
    hero.y = groundY - HH;
    colors = heroColors(N().skin);
    shield = N().has('power:shield');
    airJumps = 0;
    if (document.activeElement === hud.start) hud.start.blur();
    stage.classList.add('is-playing');
    stage.classList.remove('is-over');
    setMsg('Go!', 'go', 700);
    N().sfx('start');
    N().music.tempo(150);
    N().music.play();
    N().unlock('hop');
    hudCache = '';
    drawHud();

    // If the playfield is partly off screen (under the sticky header or below the fold), bring it into view
    const r = canvas.getBoundingClientRect();
    const top = document.querySelector('.header')?.offsetHeight || 0;
    if (r.top < top - 4 || r.bottom > innerHeight + 4) scrollBy({ top: r.top - top, behavior: still ? 'auto' : 'smooth' });
    if (still) schedule(true);
  }

  function gameOver() {
    mode = 'over';
    overAt = t;
    hero.dead = true;
    if (!hero.fell) { hero.vy = -80; hero.onGround = false; }
    shake = 0.35;
    flash = 0.08;
    freeze = 0.22;
    N().music.stop();
    N().sfx(hero.fell ? 'fall' : 'die');
    setTimeout(() => N().sfx('over'), 650);
    navigator.vibrate?.(90);
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
      setTimeout(() => N().confetti(r.left + r.width / 2, r.top + r.height / 2), 300);
    }
    hudCache = '';
    drawHud();
  }

  function act() {
    if (mode === 'play') { held = true; jump(); return; }
    if (mode === 'over' && t - overAt < 0.7) return;
    start();
    held = true;
  }

  // ---------- World ----------
  const W_CRATE = { w: 6, h: 7 };

  function pitAt(x) {
    return things.find((o) => o.kind === 'pit' && x > o.x + 1 && x < o.x + o.w - 1);
  }

  function addCoins(x, baseY, count, arc) {
    for (let i = 0; i < count; i++) {
      const lift = arc ? Math.round(Math.sin((i / Math.max(1, count - 1)) * Math.PI) * arc) : 0;
      things.push({ kind: 'coin', x: x + i * 7, y: baseY - lift, w: 4, h: 4 });
    }
  }

  function spawnDemo() {
    const r = Math.random();
    const x = W + 4;
    if (r < 0.35) things.push({ kind: 'crate', x, y: groundY - 7, ...W_CRATE });
    else if (r < 0.5) things.push({ kind: 'pit', x, w: 14 });
    else addCoins(x, groundY - (Math.random() < 0.5 ? 22 : 9), Math.floor(rand(2, 5)), 2);
    nextThing = rand(1.4, 3.0);
  }

  function spawnPlay() {
    const x = W + 4;
    const options = [
      ['crate', 30],
      ['coins', 26],
      ['crateCoins', score > 30 ? 14 : 0],
      ['pit', score > 40 ? 16 : 0],
      ['stack', score > 80 ? 14 : 0],
      ['bat', score > 150 ? 14 : 0],
      ['qblock', score > 60 && !powers.star && !powers.magnet && !powers.double ? 7 : 0],
    ];
    let roll = Math.random() * options.reduce((s, o) => s + o[1], 0);
    const pick = options.find((o) => (roll -= o[1]) < 0)[0];
    let gap = 0;

    if (pick === 'crate') things.push({ kind: 'crate', x, y: groundY - 7, ...W_CRATE });
    if (pick === 'stack') {
      // A stack needs a held jump
      things.push({ kind: 'crate', x, y: groundY - 7, ...W_CRATE });
      things.push({ kind: 'crate', x, y: groundY - 14, ...W_CRATE });
    }
    if (pick === 'crateCoins') {
      things.push({ kind: 'crate', x: x + 10, y: groundY - 7, ...W_CRATE });
      addCoins(x, groundY - 16, 4, 6);
    }
    if (pick === 'pit') {
      const w = Math.round(rand(12, 15 + Math.min(5, level)));
      things.push({ kind: 'pit', x, w });
      addCoins(x + Math.round(w / 2) - 2, groundY - 18, 1, 0);
      gap = 0.25;
    }
    if (pick === 'bat') {
      // Bats fly at jump height: stay on the ground
      things.push({ kind: 'bat', x, y: groundY - HH - 8, w: 8, h: 5, v: 14 + level * 2, wob: rand(0, 6) });
    }
    if (pick === 'coins') addCoins(x, groundY - (Math.random() < 0.5 ? 20 : 9), Math.floor(rand(3, 7)), 5);
    if (pick === 'qblock') things.push({ kind: 'qblock', x, y: groundY - 24, w: 8, h: 8 });

    // Always leave room to land and jump again
    nextThing = gap + Math.max(0.85, rand(1.0, 1.85) - Math.min(0.45, (speed - 42) / 130));
  }

  function puff(x, y, c, n = 6) {
    for (let i = 0; i < n; i++) sparks.push({ x, y, vx: rand(-25, 25), vy: rand(-20, 5), life: rand(0.2, 0.4), c });
  }

  function dust(x, y, n = 1) {
    for (let i = 0; i < n; i++) sparks.push({ x: x + rand(-1, 1), y, vx: rand(-18, -6), vy: rand(-12, -4), life: rand(0.15, 0.3), c: pal.dust, g: 20 });
  }

  function burst(x, y, c = '#ffec27') {
    for (let i = 0; i < 6; i++) sparks.push({ x, y, vx: rand(-25, 25), vy: rand(-40, -10), life: rand(0.3, 0.6), c: i % 2 ? c : '#fff1e8' });
  }

  function float(x, y, text, c = '#ffec27') {
    floats.push({ x, y, text, c, life: 0.8 });
  }

  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function givePower() {
    const kinds = ['star', 'magnet', 'double'];
    const k = kinds[(Math.random() * kinds.length) | 0];
    powers[k] = { star: 5, magnet: 8, double: 8 }[k];
    setMsg({ star: 'Star power!', magnet: 'Coin magnet!', double: 'Double coins!' }[k], 'power', 1100);
    N().sfx('power');
    flash = 0.05;
  }

  function update(dt) {
    t += dt;
    if (freeze > 0) { freeze -= dt; return; }   // hit-stop on death
    if (shake > 0) shake -= dt;
    if (flash > 0) flash -= dt;
    if (hero.blink > 0) hero.blink -= dt;
    for (const k in powers) if (powers[k] > 0) powers[k] = Math.max(0, powers[k] - dt);

    const moving = mode !== 'over';
    if (mode === 'play') {
      speed = Math.min(105, speed + dt * 1.3);
      score += speed * dt * 0.25;
      const lv = 1 + Math.floor(score / 250);
      if (lv > level) {
        level = lv;
        setMsg(`Level ${level}`, 'level', 1000);
        N().sfx('level');
        N().music.tempo(150 + (level - 1) * 8);
        speed = Math.min(105, speed + 4);
      }
    }
    if (moving) scroll += speed * dt;

    // Hero
    const cx = hero.x + 4;
    if (hero.onGround && !hero.dead && pitAt(cx)) {
      hero.onGround = false;
      hero.vy = 0;
      lastGround = t;
    }
    if (!hero.onGround) {
      hero.vy += (down && hero.vy > -20 ? FAST_FALL : GRAVITY) * dt;
      hero.y += hero.vy * dt;
      const floor = groundY - HH;
      const overPit = pitAt(cx);
      if (!hero.dead && hero.y >= floor && !overPit && !hero.fell) {
        hero.y = floor;
        hero.vy = 0;
        hero.onGround = true;
        lastGround = t;
        if (mode === 'play') {
          airJumps = N().has('power:double-jump') ? 1 : 0;
          dust(hero.x + 4, groundY - 1, 4);
          // Jump buffering: a press just before touching down jumps right away
          if (t - bufferedAt < BUFFER) { jump(); if (!held) release(); }
        }
      } else if (!hero.dead && overPit && hero.y > floor + 3) {
        hero.fell = true;
        if (mode === 'play' && powers.star === 0 && !shield) gameOver();
        else if (mode === 'play') {
          // Shield or star saves you once from a pit: bounce out
          if (!powers.star) shield = false;
          hero.fell = false;
          hero.vy = JUMP * 1.1;
          hero.blink = 1;
          N().sfx('hit');
        } else {
          hero.fell = false;
          hero.vy = JUMP;
        }
      }
    } else if (mode !== 'over') {
      dustT -= dt;
      if (dustT <= 0) { dust(hero.x + 1, groundY - 1); dustT = 0.12; }
    }

    if (moving) {
      nextThing -= dt;
      if (nextThing <= 0) (mode === 'play' ? spawnPlay : spawnDemo)();
    }

    const box = { x: hero.x + 1, y: hero.y + 1, w: 6, h: HH - 1 };
    const magnet = mode === 'play' && (powers.magnet > 0 || N().has('power:magnet'));
    for (let i = things.length - 1; i >= 0; i--) {
      const o = things[i];
      if (moving) o.x -= (speed + (o.v || 0)) * dt;
      if (o.kind === 'bat') o.y += Math.sin(t * 6 + o.wob) * 6 * dt;

      if (o.kind === 'coin') {
        const reach = powers.magnet > 0 ? 40 : 22;
        if (magnet && Math.abs(o.x - hero.x) < reach && Math.abs(o.y - hero.y) < 30) {
          o.x += (hero.x + 2 - o.x) * Math.min(1, dt * 9);
          o.y += (hero.y + 4 - o.y) * Math.min(1, dt * 9);
        }
        if (!hero.dead && overlap(box, o)) {
          o.got = true;
          burst(o.x + 2, o.y + 2);
          if (mode === 'play') {
            combo = t - lastCoin < 0.75 ? combo + 1 : 1;
            lastCoin = t;
            const mult = combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
            const value = powers.double > 0 ? 2 : 1;
            runCoins += value;
            score += 10 * mult;
            N().earn(value);
            N().sfx('coin', combo);
            float(o.x, o.y - 2, mult > 1 ? `+${10 * mult}x${mult}` : '+10');
            if (combo === 5 || combo === 10) setMsg(`Combo x${mult}`, 'combo', 700);
            if (runCoins >= 10) N().unlock('coins');
          }
        }
      } else if (o.kind === 'qblock') {
        if (!hero.dead && mode === 'play' && overlap(box, o)) {
          o.got = true;
          burst(o.x + 4, o.y + 4, '#ffa300');
          float(o.x, o.y - 4, '+50', '#ff77a8');
          score += 50;
          givePower();
        }
      } else if (o.kind === 'pit') {
        // Pits are handled with the hero above
      } else if (mode === 'demo') {
        if (o.kind === 'crate' && hero.onGround && o.x - (hero.x + 8) < 7 && o.x - (hero.x + 8) > 0) jump();
      } else if (mode === 'play' && !hero.dead && overlap(box, { x: o.x + 1, y: o.y + 1, w: o.w - 2, h: o.h - 1 })) {
        if (powers.star > 0) {
          // Star power smashes through
          o.got = true;
          burst(o.x + 3, o.y + 3, '#ff004d');
          float(o.x, o.y - 3, '+25', '#ff77a8');
          score += 25;
          shake = 0.1;
          N().sfx('stomp');
        } else if (hero.blink > 0) {
          // Still flashing after a hit
        } else if (shield) {
          shield = false;
          hero.blink = 1.2;
          shake = 0.2;
          N().sfx('hit');
          puff(hero.x + 4, hero.y + 4, '#29adff');
        } else {
          gameOver();
        }
      }

      // Demo autopilot hops pits too
      if (mode === 'demo' && o.kind === 'pit' && hero.onGround && o.x - (hero.x + 6) < 4 && o.x - (hero.x + 6) > -2) jump();
      if (o.x < -(o.w || 12) - 4 || o.got) things.splice(i, 1);
    }

    for (let s = sparks.length - 1; s >= 0; s--) {
      const p = sparks[s];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g ?? 120) * dt;
      if (p.life <= 0) sparks.splice(s, 1);
    }
    for (let f = floats.length - 1; f >= 0; f--) {
      floats[f].life -= dt;
      floats[f].y -= 14 * dt;
      if (floats[f].life <= 0) floats.splice(f, 1);
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

  // Tiny 3x5 pixel font for score pop-ups
  function text(str, x, y, c) {
    let cx = Math.round(x);
    for (const ch of str) {
      const g = FONT[ch];
      if (g) {
        drawSprite(ctx, g, cx + 1, Math.round(y) + 1, { '#': '#1d2b53' });
        drawSprite(ctx, g, cx, Math.round(y), { '#': c });
      }
      cx += 4;
    }
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

    // Mountains, then two layers of hills, each scrolling slower the further away
    const mtn = Math.floor(scroll * 0.1), far = Math.floor(scroll * 0.25), near = Math.floor(scroll * 0.6);
    for (let x = 0; x < W; x++) {
      const hm = peak(x + mtn);
      ctx.fillStyle = pal.mtn;
      ctx.fillRect(x, groundY - hm, 1, hm);
      if (hm > Math.min(30, groundY * 0.55) * 0.88) { ctx.fillStyle = pal.mtnCap; ctx.fillRect(x, groundY - hm, 1, 2); }
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

    // Pits cut through the ground
    for (const o of things) {
      if (o.kind !== 'pit') continue;
      const x = Math.round(o.x);
      ctx.fillStyle = pal.pit;
      ctx.fillRect(x, groundY, o.w, GROUND);
      ctx.fillStyle = pal.grass2;
      ctx.fillRect(x - 1, groundY, 1, GROUND);
      ctx.fillRect(x + o.w, groundY, 1, GROUND);
    }

    // Things
    for (const o of things) {
      const x = Math.round(o.x), y = Math.round(o.y);
      if (o.kind === 'crate') drawSprite(ctx, CRATE, x, y);
      else if (o.kind === 'bat') drawSprite(ctx, BAT[Math.floor(t * 8) % 2], x, y);
      else if (o.kind === 'qblock') drawSprite(ctx, QBLOCK[Math.floor(t * 4) % 2], x, y + Math.round(Math.sin(t * 5)));
      else if (o.kind === 'coin') drawSprite(ctx, COIN[Math.floor(t * 6 + o.x / 7) % 3], x, y);
    }

    // Hero
    let frame = !hero.onGround ? HERO.jump : (Math.floor(t * (8 + speed / 12)) % 2 ? HERO.runA : HERO.runB);
    if (hero.dead) frame = HERO.hurt;
    if (mode === 'over' && hero.y > H) frame = null;
    if (still && mode === 'demo') frame = HERO.runA;
    const flicker = hero.blink > 0 && Math.floor(t * 16) % 2;
    let skin = colors;
    if (powers.star > 0) {
      const c = RAINBOW[Math.floor(t * 14) % RAINBOW.length];
      skin = { ...colors, R: c, B: RAINBOW[(Math.floor(t * 14) + 3) % RAINBOW.length] };
      if (Math.random() < 0.5) sparks.push({ x: hero.x + rand(0, 8), y: hero.y + rand(0, HH), vx: -20, vy: 0, life: 0.2, c, g: 0 });
    }
    if (frame && !flicker) drawSprite(ctx, frame, hero.x, Math.round(hero.y), skin);
    if (shield && mode === 'play') drawSprite(ctx, SHIELD, hero.x + 9, Math.round(hero.y) - 2);

    for (const p of sparks) {
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    for (const f of floats) {
      if (f.life < 0.25 && Math.floor(t * 20) % 2) continue;
      text(f.text, f.x, f.y, f.c);
    }

    // One-frame flash on big moments
    if (flash > 0 && !still) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#fff1e8';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
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
  document.addEventListener('visibilitychange', () => {
    last = 0;
    // Leaving the tab mid-run pauses the game rather than letting you die off screen
    if (document.hidden && mode === 'play') N().pause();
    schedule();
  });
  document.addEventListener('noitas:pause', () => { paused = true; if (mode === 'play') N().music.stop(); });
  document.addEventListener('noitas:resume', () => {
    paused = false;
    last = 0;
    held = false;
    down = false;
    if (mode === 'play') N().music.play();
    schedule();
  });

  // ---------- Input ----------
  // Tap anywhere on the stage (not on links or the player card)
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button, .player, input')) return;
    e.preventDefault();
    act();
  });
  addEventListener('pointerup', () => { if (held) release(); });
  addEventListener('pointercancel', () => { if (held) release(); });
  hud.start?.addEventListener('click', () => { act(); held = false; });

  const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'];
  const DOWN_KEYS = ['ArrowDown', 'KeyS'];
  const onStage = () => {
    const r = stage.getBoundingClientRect();
    return r.top < innerHeight * 0.6 && r.bottom > innerHeight * 0.25;
  };
  const busy = (e) => document.querySelector('dialog[open]') || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;

  addEventListener('keydown', (e) => {
    const isJump = JUMP_KEYS.includes(e.code);
    const isDown = DOWN_KEYS.includes(e.code);
    if ((!isJump && !isDown && e.code !== 'KeyP') || busy(e)) return;
    const live = mode === 'play' || (mode === 'over' && onStage());

    if (e.code === 'KeyP') {
      if (mode === 'play') { e.preventDefault(); N().pause(); }
      return;
    }
    if (isDown) {
      // Down = fast fall; never let it scroll the page mid-run
      if (mode === 'play') { e.preventDefault(); down = true; }
      return;
    }
    // Before a run starts, a focused link or button keeps its normal Space behaviour
    if (mode === 'demo' && /^(BUTTON|A)$/.test(e.target.tagName)) return;
    if (!live && !(mode === 'demo' && onStage())) return;

    // Held keys fire repeated keydowns: swallow them all so the page never scrolls during a run
    e.preventDefault();
    if (!e.repeat) act();
  });

  addEventListener('keyup', (e) => {
    if (DOWN_KEYS.includes(e.code)) down = false;
    if (!JUMP_KEYS.includes(e.code)) return;
    if (mode === 'play' || held) e.preventDefault();
    release();
  });

  schedule();
}
