// Title screen scene: a low-res canvas scaled up with crisp pixels.
// Stars or clouds, parallax hills, and a little runner who hops crates and grabs coins.
// Click or tap the scene to jump. Pauses off screen; draws one still frame for reduced motion.
(function () {
  var canvas = document.querySelector('.scene canvas');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var root = document.documentElement;
  var hud = document.querySelector('.coin-hud');
  var hudN = hud && hud.querySelector('.coin-n');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var PX = 4;           // CSS pixels per art pixel
  var GROUND = 6;       // ground strip height, art px
  var SPEED = 34;       // world scroll, art px per second
  var GRAVITY = 260;
  var JUMP = -92;

  var W = 0, H = 0, groundY = 0;
  var stars = [], clouds = [], things = [], sparks = [], shooting = null;
  var scroll = 0, t = 0, nextShot = 2, nextThing = 1.2, coins = 0;
  var dark = true, pal;

  var palettes = {
    dark: {
      stars: ['#fff1e8', '#ffec27', '#29adff', '#ff77a8', '#c2c3c7'],
      far: '#1a2550', near: '#24336a',
      grass: '#00e436', grass2: '#008751', dirt: '#5f574f', dirt2: '#3d3540',
      cloud: '#24336a', cloud2: '#1a2550'
    },
    light: {
      far: '#fde2cf', near: '#f9d3bb',
      grass: '#00e436', grass2: '#008751', dirt: '#ab5236', dirt2: '#7e2553',
      cloud: '#ffffff', cloud2: '#fde2cf'
    }
  };

  // Sprites as strings; one char per pixel, "." is transparent
  var COLORS = { R: '#ff004d', S: '#ffccaa', K: '#1d2b53', B: '#29adff', P: '#83769c', Y: '#ffec27', O: '#ffa300', W: '#fff1e8', N: '#ab5236', D: '#5f574f' };
  var RUN_A = ['..RRRR..', '.RRRRRRR', '..SSKS..', '..SSSS..', '.BBBBBB.', 'S.BBBB.S', '..BBBB..', '..PPPP..', '.PP..PP.', '.P....P.'];
  var RUN_B = ['..RRRR..', '.RRRRRRR', '..SSKS..', '..SSSS..', '.BBBBBB.', '.SBBBBS.', '..BBBB..', '..PPPP..', '..PP.P..', '..P..PP.'];
  var JUMP_S = ['..RRRR..', '.RRRRRRR', '..SSKS..', 'S.SSSS.S', '.BBBBBB.', '..BBBB..', '..BBBB..', '..PPPP..', '.PP..PP.', 'P......P'];
  var CRATE = ['NNNNNN', 'NOOOON', 'NONNON', 'NNOONN', 'NONNON', 'NOOOON', 'NNNNNN'];
  var COIN = [['.YY.', 'YOYY', 'YOYY', '.YY.'], ['.Y..', '.O..', '.Y..', '.Y..'], ['.YY.', 'YYOY', 'YYOY', '.YY.']];

  var hero = { x: 0, y: 0, vy: 0, onGround: true };

  function sprite(rows, x, y) {
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      for (var c = 0; c < row.length; c++) {
        var ch = row[c];
        if (ch === '.') continue;
        ctx.fillStyle = COLORS[ch];
        ctx.fillRect(x + c, y + r, 1, 1);
      }
    }
  }

  // Deterministic rolling hills from a few sines
  function hill(x, seed, amp, base) {
    return Math.round(base + amp * (0.55 * Math.sin(x / 23 + seed) + 0.3 * Math.sin(x / 11 + seed * 2) + 0.15 * Math.sin(x / 5.3 + seed * 3)));
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function readTheme() {
    dark = root.dataset.theme !== 'light';
    pal = dark ? palettes.dark : palettes.light;
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    PX = r.width < 600 ? 3 : 4;
    W = Math.max(1, Math.ceil(r.width / PX));
    H = Math.max(1, Math.ceil(r.height / PX));
    canvas.width = W;
    canvas.height = H;
    groundY = H - GROUND;
    hero.x = Math.round(Math.min(W * 0.14, 60));
    if (hero.onGround) hero.y = groundY - RUN_A.length;

    stars = [];
    var n = Math.round(W * (groundY - 10) / 160);
    for (var i = 0; i < n; i++) {
      stars.push({ x: Math.floor(rand(0, W)), y: Math.floor(rand(0, groundY - 14)), c: Math.floor(rand(0, 5)), p: rand(0, 6.28), s: rand(1.2, 3.5), big: Math.random() < 0.08 });
    }
    clouds = [];
    for (var j = 0; j < Math.max(3, Math.round(W / 70)); j++) {
      clouds.push({ x: rand(0, W), y: Math.floor(rand(4, groundY * 0.45)), w: Math.floor(rand(10, 22)), v: rand(2, 5) });
    }
    things = things.filter(function (o) { return o.x < W + 10; });
  }

  function jump() {
    if (!hero.onGround) return;
    hero.vy = JUMP;
    hero.onGround = false;
  }

  function spawn() {
    if (Math.random() < 0.45) {
      things.push({ kind: 'crate', x: W + 4, y: groundY - CRATE.length });
    } else {
      // A short arc of coins, sometimes high enough to need a jump
      var high = Math.random() < 0.5;
      var count = Math.floor(rand(2, 5));
      for (var i = 0; i < count; i++) {
        things.push({ kind: 'coin', x: W + 4 + i * 7, y: groundY - (high ? 22 : 9) - (i === 1 || i === 2 ? 2 : 0) });
      }
    }
    nextThing = rand(1.4, 3.2);
  }

  function burst(x, y) {
    for (var i = 0; i < 6; i++) {
      sparks.push({ x: x, y: y, vx: rand(-25, 25), vy: rand(-40, -10), life: rand(0.3, 0.6), c: i % 2 ? '#ffec27' : '#fff1e8' });
    }
  }

  function update(dt) {
    t += dt;
    scroll += SPEED * dt;

    // Hero physics
    if (!hero.onGround) {
      hero.vy += GRAVITY * dt;
      hero.y += hero.vy * dt;
      var floor = groundY - RUN_A.length;
      if (hero.y >= floor) { hero.y = floor; hero.vy = 0; hero.onGround = true; }
    }

    // World things scroll left with the near hills
    nextThing -= dt;
    if (nextThing <= 0) spawn();
    for (var i = things.length - 1; i >= 0; i--) {
      var o = things[i];
      o.x -= SPEED * dt;
      var hx = hero.x, hy = hero.y;
      if (o.kind === 'crate') {
        // Auto-hop when a crate gets close
        if (hero.onGround && o.x - (hx + 8) < 7 && o.x - (hx + 8) > 0) jump();
      } else if (!o.got && o.x < hx + 7 && o.x + 4 > hx + 1 && o.y < hy + 10 && o.y + 4 > hy) {
        o.got = true;
        coins++;
        burst(o.x + 2, o.y + 2);
        if (hud) { hud.hidden = false; hudN.textContent = coins; }
      }
      if (o.x < -10 || o.got) things.splice(i, 1);
    }

    for (var s = sparks.length - 1; s >= 0; s--) {
      var p = sparks[s];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt;
      if (p.life <= 0) sparks.splice(s, 1);
    }

    // Shooting stars at night
    nextShot -= dt;
    if (dark && nextShot <= 0 && !shooting) {
      shooting = { x: rand(W * 0.3, W), y: rand(0, groundY * 0.3), life: 0.9 };
      nextShot = rand(3, 7);
    }
    if (shooting) {
      shooting.x -= 110 * dt; shooting.y += 55 * dt; shooting.life -= dt;
      if (shooting.life <= 0) shooting = null;
    }

    for (var c = 0; c < clouds.length; c++) {
      var cl = clouds[c];
      cl.x -= cl.v * dt;
      if (cl.x + cl.w < 0) { cl.x = W + rand(0, 20); cl.y = Math.floor(rand(4, groundY * 0.45)); }
    }
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
    ctx.clearRect(0, 0, W, H);

    // Sky: twinkling stars at night, drifting clouds by day
    if (dark) {
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var on = Math.sin(t * st.s + st.p);
        if (on < -0.35) continue;
        ctx.fillStyle = pal.stars[st.c % pal.stars.length];
        ctx.fillRect(st.x, st.y, 1, 1);
        if (st.big && on > 0.6) {
          ctx.fillRect(st.x - 1, st.y, 3, 1);
          ctx.fillRect(st.x, st.y - 1, 1, 3);
        }
      }
      if (shooting) {
        for (var k = 0; k < 7; k++) {
          ctx.globalAlpha = Math.max(0, 1 - k / 7) * Math.min(1, shooting.life * 2);
          ctx.fillStyle = k ? '#fff1e8' : '#ffec27';
          ctx.fillRect(Math.round(shooting.x + k * 2), Math.round(shooting.y - k), 1, 1);
        }
        ctx.globalAlpha = 1;
      }
    }
    for (var c = 0; c < clouds.length; c++) {
      var cl = clouds[c];
      cloud(cl.x, cl.y, cl.w, pal.cloud, pal.cloud2);
    }

    // Parallax hills, one column at a time
    var far = Math.floor(scroll * 0.25), near = Math.floor(scroll * 0.6);
    for (var x = 0; x < W; x++) {
      var hf = hill(x + far, 1.7, 7, Math.min(22, groundY * 0.42));
      ctx.fillStyle = pal.far;
      ctx.fillRect(x, groundY - hf, 1, hf);
      var hn = hill(x + near, 4.1, 4, Math.min(11, groundY * 0.22));
      ctx.fillStyle = pal.near;
      ctx.fillRect(x, groundY - hn, 1, hn);
    }

    // Ground: grass lip, then dirt with a scrolling speckle
    ctx.fillStyle = pal.grass;
    ctx.fillRect(0, groundY, W, 1);
    ctx.fillStyle = pal.grass2;
    ctx.fillRect(0, groundY + 1, W, 1);
    ctx.fillStyle = pal.dirt;
    ctx.fillRect(0, groundY + 2, W, GROUND - 2);
    ctx.fillStyle = pal.dirt2;
    var g = Math.floor(scroll) % 8;
    for (var d = -g; d < W; d += 8) {
      ctx.fillRect(d + 2, groundY + 3, 1, 1);
      ctx.fillRect(d + 6, groundY + 5, 1, 1);
    }

    // Crates and coins
    for (var j = 0; j < things.length; j++) {
      var o = things[j];
      if (o.kind === 'crate') sprite(CRATE, Math.round(o.x), o.y);
      else sprite(COIN[Math.floor(t * 6 + o.x / 7) % 3], Math.round(o.x), o.y);
    }

    // Hero
    var frame = !hero.onGround ? JUMP_S : (Math.floor(t * 8) % 2 ? RUN_A : RUN_B);
    if (still) frame = RUN_A;
    sprite(frame, hero.x, Math.round(hero.y));

    for (var s = 0; s < sparks.length; s++) {
      ctx.fillStyle = sparks[s].c;
      ctx.fillRect(Math.round(sparks[s].x), Math.round(sparks[s].y), 1, 1);
    }
  }

  var last = 0, raf = 0, visible = true;

  function loop(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    update(dt);
    draw();
    schedule();
  }

  function schedule() {
    if (!raf && visible && !document.hidden && !still) raf = requestAnimationFrame(loop);
  }

  readTheme();
  resize();
  if (still) {
    things.push({ kind: 'crate', x: Math.round(W * 0.55), y: groundY - CRATE.length });
    things.push({ kind: 'coin', x: Math.round(W * 0.35), y: groundY - 12 });
  }
  draw();

  new MutationObserver(function () { readTheme(); draw(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  if ('ResizeObserver' in window) {
    new ResizeObserver(function () { resize(); draw(); }).observe(canvas);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      last = 0;
      schedule();
    }).observe(canvas);
  }

  document.addEventListener('visibilitychange', function () { last = 0; schedule(); });

  // The canvas sits behind the title, so listen on the whole stage
  canvas.closest('.title-screen').addEventListener('pointerdown', function (e) {
    if (e.target.closest('a, button, .player')) return;
    jump();
  });

  schedule();
})();
