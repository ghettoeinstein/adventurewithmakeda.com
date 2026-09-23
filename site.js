// Adventure with Makeda — small, dependency-free interactions.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile menu
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('primary-nav');
  const setMenu = open => {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.label').textContent = open ? 'Close' : 'Menu';
  };
  toggle?.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav?.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav?.classList.contains('open')) { setMenu(false); toggle.focus(); }
  });
  matchMedia('(min-width: 861px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  // Storybook reveals, staggered within groups
  document.querySelectorAll('[data-stagger]').forEach(group =>
    [...group.children].forEach((child, i) => child.style.setProperty('--d', `${Math.min(i, 5) * 90}ms`)));
  const reveals = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  }

  // World map: draw a smooth candy trail through the portal centres
  const drawTrail = map => {
    const svg = map.querySelector('svg.trail');
    const box = map.getBoundingClientRect();
    const pts = [...map.querySelectorAll('.portal')].map(p => {
      const r = p.getBoundingClientRect();
      return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
    });
    if (pts.length < 2) return;
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1},${c2},${p2}`;
    }
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    svg.querySelectorAll('path').forEach(p => p.setAttribute('d', d));
  };
  const maps = document.querySelectorAll('[data-map]');
  const redraw = () => maps.forEach(drawTrail);
  if (maps.length) {
    // portals bob, so measure their resting centres once they are laid out
    maps.forEach(m => m.querySelectorAll('.portal').forEach(p => { p.style.animationPlayState = 'paused'; }));
    requestAnimationFrame(() => { redraw(); maps.forEach(m => m.querySelectorAll('.portal').forEach(p => { p.style.animationPlayState = ''; })); });
    addEventListener('resize', () => requestAnimationFrame(redraw));
    document.fonts?.ready.then(redraw);
  }

  // Sparkle burst — a little celebration on every tap of a portal, button, or medal
  const COLORS = ['#ffd24a', '#ff6fb5', '#7fd8ff', '#8ef0b0', '#c9a4ff'];
  const burst = (x, y, n = 12) => {
    if (reduced) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.style.left = `${x}px`; s.style.top = `${y}px`;
      s.style.setProperty('--sc', COLORS[i % COLORS.length]);
      const size = 8 + Math.random() * 12; s.style.width = s.style.height = `${size}px`;
      document.body.append(s);
      const a = (Math.PI * 2 * i) / n + Math.random() * .5, dist = 40 + Math.random() * 60;
      s.animate([
        { transform: 'translate(0,0) scale(.4) rotate(0deg)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * dist}px, ${Math.sin(a) * dist}px) scale(1) rotate(180deg)`, opacity: 1, offset: .6 },
        { transform: `translate(${Math.cos(a) * dist * 1.2}px, ${Math.sin(a) * dist * 1.2 + 20}px) scale(0) rotate(270deg)`, opacity: 0 },
      ], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => s.remove();
    }
  };
  document.addEventListener('pointerdown', e => {
    const t = e.target.closest('.btn, .portal, .value, .cameo .ring, .world-close, .rp-play, .song-chip');
    if (t) burst(e.clientX, e.clientY, t.matches('.portal') ? 18 : 10);
  });

  // Jelly medallions
  document.querySelectorAll('.value').forEach(v => {
    const medal = v.querySelector('.medal');
    const wobble = () => { if (reduced) return; medal.classList.remove('jelly'); void medal.offsetWidth; medal.classList.add('jelly'); };
    v.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') wobble(); });
    v.addEventListener('click', wobble);
  });

  // World cards
  let opener = null;
  document.querySelectorAll('[data-world]').forEach(btn => btn.addEventListener('click', () => {
    const dlg = document.getElementById(`world-${btn.dataset.world}`);
    if (!dlg) return;
    opener = btn;
    dlg.showModal();
    const r = dlg.querySelector('.world-inner').getBoundingClientRect();
    setTimeout(() => burst(r.left + r.width / 2, r.top + 20, 22), 180);
  }));
  document.querySelectorAll('dialog.world-card').forEach(dlg => {
    dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => opener?.focus());
  });

  // Royal theme-song player: one track, play / pause. Nothing loads until the first tap.
  const player = document.querySelector('[data-player]');
  if (player) {
    const audio = player.querySelector('audio');
    const btn = player.querySelector('[data-play]');
    const cur = player.querySelector('[data-cur]');
    const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const sync = () => {
      const on = !audio.paused;
      player.classList.toggle('playing', on);
      btn.setAttribute('aria-label', on ? 'Pause the theme song' : 'Play the theme song');
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = on ? 'playing' : 'paused';
    };
    const play = () => {
      player.classList.add('loading');
      if ('mediaSession' in navigator && !navigator.mediaSession.metadata) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Adventure with Makeda', artist: 'Adventure with Makeda', album: 'Theme Song',
          artwork: [
            { src: 'assets/theme-cover-400.webp', sizes: '400x400', type: 'image/webp' },
            { src: 'assets/theme-cover-800.webp', sizes: '800x800', type: 'image/webp' },
            { src: 'assets/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        });
        navigator.mediaSession.setActionHandler('play', () => audio.play());
        navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      }
      return audio.play().catch(() => {}).finally(() => player.classList.remove('loading'));
    };
    btn.addEventListener('click', () => (audio.paused ? play() : audio.pause()));
    ['play', 'pause', 'ended'].forEach(ev => audio.addEventListener(ev, sync));
    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      player.style.setProperty('--p', `${(audio.currentTime / audio.duration) * 100}%`);
      cur.textContent = fmt(audio.currentTime);
    });
    audio.addEventListener('ended', () => { audio.currentTime = 0; player.style.setProperty('--p', '0%'); cur.textContent = '0:00'; });
    // hero chip: start the song, then glide down to the player
    document.querySelectorAll('[data-play-theme]').forEach(chip => chip.addEventListener('click', e => {
      e.preventDefault();
      play();
      player.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    }));
  }

  // Offline shell
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
