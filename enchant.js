// Enchanted light for the sky heroes: soft bokeh + autonomous glowing motes.
// One canvas per hero, pre-rendered sprites, additive blending. Pauses off-screen,
// draws a single still frame for reduced-motion visitors.
(() => {
  const heroes = document.querySelectorAll('.sky');
  if (!heroes.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(devicePixelRatio || 1, 2);
  const PALETTE = [[255, 226, 160], [255, 178, 222], [196, 178, 255], [170, 225, 255], [255, 255, 255]];

  // Soft radial sprite per colour, reused for every particle
  const sprite = ([r, g, b], hard) => {
    const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
    const x = c.getContext('2d'), gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    if (hard) { // mote: bright core, quick falloff
      gr.addColorStop(0, `rgba(255,255,255,1)`); gr.addColorStop(.18, `rgba(${r},${g},${b},.9)`);
      gr.addColorStop(.45, `rgba(${r},${g},${b},.22)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    } else {    // bokeh: nearly flat disc with a faint rim, like an out-of-focus light
      gr.addColorStop(0, `rgba(${r},${g},${b},.55)`); gr.addColorStop(.72, `rgba(${r},${g},${b},.5)`);
      gr.addColorStop(.86, `rgba(${r},${g},${b},.62)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    }
    x.fillStyle = gr; x.fillRect(0, 0, s, s); return c;
  };
  const MOTES = PALETTE.map(c => sprite(c, true)), BOKEH = PALETTE.map(c => sprite(c, false));
  const rand = (a, b) => a + Math.random() * (b - a);

  let lastScroll = scrollY, scrollVel = 0;
  addEventListener('scroll', () => { scrollVel += (scrollY - lastScroll) * .6; lastScroll = scrollY; }, { passive: true });

  heroes.forEach(hero => {
    const canvas = document.createElement('canvas');
    canvas.className = 'enchant'; canvas.setAttribute('aria-hidden', 'true');
    hero.prepend(canvas);
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, bokeh = [], motes = [], visible = true, raf = 0, last = performance.now();

    const seed = () => {
      const area = W * H, small = W < 700;
      bokeh = Array.from({ length: Math.round(Math.min(18, area / 70000)) }, () => ({
        x: rand(0, W), y: rand(0, H), r: rand(small ? 16 : 26, small ? 44 : 78), z: rand(.25, 1),
        a: rand(.09, .22), vx: rand(-4, 4), vy: rand(-6, -1), ph: rand(0, 6.28), c: BOKEH[(Math.random() * 4) | 0],
      }));
      motes = Array.from({ length: Math.round(Math.min(small ? 34 : 70, area / 16000)) }, () => ({
        x: rand(0, W), y: rand(0, H), r: rand(1.2, 3.4), z: rand(.4, 1), a: rand(.45, .95),
        dir: rand(0, 6.28), sp: rand(6, 18), tw: rand(.6, 1.8), ph: rand(0, 6.28), c: MOTES[(Math.random() * PALETTE.length) | 0],
      }));
    };
    const resize = () => {
      const r = hero.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      seed();
    };

    const wrap = (p, m) => {
      if (p.x < -m) p.x += W + 2 * m; else if (p.x > W + m) p.x -= W + 2 * m;
      if (p.y < -m) p.y += H + 2 * m; else if (p.y > H + m) p.y -= H + 2 * m;
    };

    const frame = now => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const t = now / 1000;
      // scroll progress through this hero drives depth parallax
      const top = hero.getBoundingClientRect().top, prog = Math.max(0, Math.min(1, -top / H));
      hero.style.setProperty('--hp', prog.toFixed(3));
      scrollVel *= .9;
      const swirl = Math.max(-40, Math.min(40, scrollVel));

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      for (const b of bokeh) {
        b.x += (b.vx + Math.sin(t * .2 + b.ph) * 3) * dt * b.z;
        b.y += (b.vy - swirl * .35) * dt * b.z;
        wrap(b, b.r * 2);
        const py = b.y - prog * H * .35 * b.z;           // deeper layers move more
        const pulse = .75 + .25 * Math.sin(t * .6 + b.ph);
        ctx.globalAlpha = b.a * pulse;
        ctx.drawImage(b.c, b.x - b.r, py - b.r, b.r * 2, b.r * 2);
      }
      for (const m of motes) {
        // autonomous wander: a slowly turning heading with a gentle upward drift
        m.dir += (Math.sin(t * .5 + m.ph) * .9 + Math.sin(t * 1.3 + m.ph * 2) * .4) * dt;
        const sp = m.sp * m.z;
        m.x += Math.cos(m.dir) * sp * dt + Math.sin(t + m.ph) * 4 * dt;
        m.y += (Math.sin(m.dir) * sp - 7 * m.z - swirl * 1.1 * m.z) * dt;
        wrap(m, 20);
        const py = m.y - prog * H * .6 * m.z;
        const tw = .35 + .65 * Math.pow(.5 + .5 * Math.sin(t * m.tw * 2.2 + m.ph), 2);
        const s = m.r * 5 * (.8 + .2 * tw);
        ctx.globalAlpha = m.a * tw;
        ctx.drawImage(m.c, m.x - s / 2, py - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      if (!reduced && visible && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const start = () => { if (reduced || raf) return; last = performance.now(); raf = requestAnimationFrame(t => { raf = 0; frame(t); }); };
    new ResizeObserver(() => { resize(); if (reduced) frame(performance.now()); }).observe(hero);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else { cancelAnimationFrame(raf); raf = 0; } }).observe(hero);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) start(); });
    resize();
    reduced ? frame(performance.now()) : start();
  });
})();
