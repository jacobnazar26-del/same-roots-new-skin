/* Polaroid Line — a vanilla-JS port of the 21st.dev "Polaroid Line Carousel"
   (React/TSX original kept at components/ui/polaroid-line-carousel.tsx).
   Instant photos pegged to a sagging string. Drag the line (or use the arrows)
   and the prints slide along it, swinging on their pegs and settling with a
   little overshoot; at rest they sway in a light breeze. Same physics as the
   original: a critically damped spring moves the line, a damped pendulum
   swings each print. Drag, click a print, ←/→ and autoplay (which waits while
   someone is interacting). The painted-landscape fallback of the original is
   replaced by this site's "Photo coming" placeholder. */
(function (global) {
  'use strict';

  // #region logic (unchanged from the original)
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  /** Height of a string sagging by `sag` between (0, y0) and (w, y0), at x. */
  function stringY(x, w, y0, sag) { var t = clamp(x / w, 0, 1); return y0 + 4 * sag * t * (1 - t); }
  /** One step of a critically damped spring toward target. */
  function springStep(x, v, target, dt, k) {
    k = k || 70; var c = 2 * Math.sqrt(k);
    var nv = v + (k * (target - x) - c * v) * dt;
    return [x + nv * dt, nv];
  }
  /** One step of a print's swing. */
  function swingStep(a, w, lineVel, dt, gain) {
    var nw = w + (-38 * a - 4.2 * w + lineVel * 0.0034 * gain) * dt;
    return [clamp(a + nw * dt, -0.6, 0.6), nw];
  }
  /** Index of the print nearest the centre for a line offset. */
  function nearestAt(off, spacing, n) { return clamp(Math.round(off / spacing), 0, Math.max(0, n - 1)); }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  // #endregion logic

  function el(tag, cls, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  /**
   * mount(root, { slides, cardWidth, sag, swing, autoplay, string, ariaLabel, onChange })
   * slide: { image, webp, file, title, caption, alt, tag, tagKind ('ny'|'lens'), href }
   */
  function mount(root, options) {
    var opts = Object.assign({
      slides: [], cardWidth: 300, sag: 46, swing: 1, autoplay: 4500,
      string: '#8a7f72', ariaLabel: 'Image carousel', onChange: null
    }, options || {});
    var slides = opts.slides, n = slides.length;
    if (!root || !n) return null;

    root.classList.add('pl-root');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-roledescription', 'carousel');
    root.setAttribute('aria-label', opts.ariaLabel);
    root.tabIndex = 0;
    root.dataset.drag = '0';

    // ----- build -----
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'pl-string'); svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(svgNS, 'path');
    path.setAttribute('fill', 'none'); path.setAttribute('stroke', opts.string);
    path.setAttribute('stroke-width', '1.5'); path.setAttribute('stroke-linecap', 'round');
    svg.appendChild(path); root.appendChild(svg);

    var cards = slides.map(function (sl, i) {
      var card = el('div', 'pl-card', { 'data-i': String(i), 'data-on': i === 0 ? '1' : '0' });
      if (i !== 0) card.setAttribute('aria-hidden', 'true');
      var print = el('div', 'pl-print');
      var shot = el('div', 'pl-shot photo', { 'data-file': sl.file || '' });
      if (sl.image) {
        var pic = el('picture');
        if (sl.webp) { var src = el('source'); src.srcset = sl.webp; src.type = 'image/webp'; pic.appendChild(src); }
        var img = el('img');
        img.src = sl.image; img.alt = sl.alt || sl.title || ''; img.loading = 'lazy'; img.decoding = 'async'; img.draggable = false;
        img.addEventListener('error', function () { shot.classList.add('is-missing'); });
        pic.appendChild(img); shot.appendChild(pic);
      }
      var note = el('div', 'pl-note');
      if (sl.tag) { var tag = el('span', 'pl-tag pl-tag--' + (sl.tagKind || 'ny')); tag.textContent = sl.tag; note.appendChild(tag); }
      var t = el('span', 'pl-note__t'); t.textContent = sl.title || ''; note.appendChild(t);
      print.appendChild(shot); print.appendChild(note);
      card.appendChild(print); card.appendChild(el('div', 'pl-peg'));
      root.appendChild(card);
      return card;
    });

    var bar = el('div', 'pl-bar');
    var cap = el('div', 'pl-cap', { 'aria-hidden': 'true' });
    var count = el('span', 'pl-count', { 'aria-hidden': 'true' });
    var link = el('a', 'pl-link'); link.textContent = 'Read this stop ↓';
    function btn(label, d) {
      var b = el('button', 'pl-btn', { type: 'button', 'aria-label': label });
      b.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="' + d + '" stroke="currentColor" stroke-width="1.4"/></svg>';
      return b;
    }
    var prevBtn = btn('Previous', 'M10 3 5 8l5 5'), nextBtn = btn('Next', 'm6 3 5 5-5 5');
    bar.appendChild(cap); bar.appendChild(count); bar.appendChild(link); bar.appendChild(prevBtn); bar.appendChild(nextBtn);
    root.appendChild(bar);
    var sr = el('div', 'pl-sr', { 'aria-live': 'polite' }); root.appendChild(sr);

    // ----- state -----
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var size = { w: 1200, h: 800, cw: opts.cardWidth };
    var spacing = size.cw * 1.08;
    var S = { off: 0, vel: 0, target: 0, a: [], w: [] };
    var drag = null, lastTouch = 0, active = -1;

    function measure() {
      var r = root.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var cw = Math.round(Math.max(150, Math.min(opts.cardWidth, r.width * 0.42, r.height * 0.42)));
      var idx = active < 0 ? 0 : active;
      size = { w: r.width, h: r.height, cw: cw };
      spacing = cw * 1.08;
      root.style.setProperty('--pl-cw', cw + 'px');
      S.target = idx * spacing; S.off = idx * spacing;
    }
    measure();
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(root);
    else window.addEventListener('resize', measure);

    function goTo(i) { S.target = clamp(i, 0, n - 1) * spacing; }
    function setActive(i) {
      if (i === active) return;
      active = i;
      var s = slides[i] || {};
      cards.forEach(function (c, j) {
        c.dataset.on = j === i ? '1' : '0';
        if (j === i) c.removeAttribute('aria-hidden'); else c.setAttribute('aria-hidden', 'true');
      });
      cap.innerHTML = '';
      if (s.title) { var t = el('span', 'pl-title'); t.textContent = s.title; cap.appendChild(t); }
      if (s.caption) { var c2 = el('span', 'pl-sub'); c2.textContent = s.caption; cap.appendChild(c2); }
      count.innerHTML = '<b>' + pad2(i + 1) + '</b> / ' + pad2(n);
      if (s.href) { link.href = s.href; link.hidden = false; } else { link.hidden = true; }
      sr.textContent = 'Print ' + (i + 1) + ' of ' + n + (s.title ? ': ' + s.title : '');
      if (typeof opts.onChange === 'function') opts.onChange(i);
    }
    setActive(0);

    // ----- the simulation, written straight to the DOM each frame -----
    var visible = true, raf = 0, prevT = performance.now();
    function frame(now) {
      raf = 0;
      if (!visible) return;
      var dt = Math.min(0.033, (now - prevT) / 1000); prevT = now;
      var w = size.w, h = size.h, cw = size.cw;
      var y0 = Math.max(40, h * 0.2);
      var lineVel;
      if (drag && drag.moved) {
        lineVel = drag.v * 1000;
      } else {
        var before = S.off;
        var sp = springStep(S.off, S.vel, S.target, dt); S.off = sp[0]; S.vel = sp[1];
        lineVel = -(S.off - before) / Math.max(dt, 1e-3);
      }
      var g = reduce ? 0 : opts.swing;
      var near = nearestAt(S.off, spacing, n);
      for (var i = 0; i < n; i++) {
        var c = cards[i];
        var x = w / 2 + i * spacing - S.off;
        if (x < -cw * 1.5 || x > w + cw * 1.5) { c.style.visibility = 'hidden'; continue; }
        c.style.visibility = 'visible';
        var a = S.a[i] || 0, av = S.w[i] || 0;
        var sw = swingStep(a, av, lineVel, dt, g); a = sw[0]; av = sw[1];
        if (g) a += Math.sin(now / 1300 + i * 1.7) * 0.0009 * g;
        S.a[i] = a; S.w[i] = av;
        var y = stringY(x, w, y0, opts.sag) - 6;
        c.style.transform = 'translate(' + (x - cw / 2).toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + a.toFixed(4) + 'rad)';
        c.style.zIndex = String(i === near ? n + 1 : n - Math.abs(i - near));
      }
      path.setAttribute('d', 'M0 ' + y0 + ' Q' + w / 2 + ' ' + (y0 + 2 * opts.sag) + ' ' + w + ' ' + y0);
      if (near !== active) setActive(near);
      raf = requestAnimationFrame(frame);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && !raf) { prevT = performance.now(); raf = requestAnimationFrame(frame); }
      }).observe(root);
    }
    raf = requestAnimationFrame(frame);

    // autoplay, back to the first print after the last
    if (opts.autoplay && n > 1) {
      setInterval(function () {
        if (document.hidden || drag || performance.now() - lastTouch < opts.autoplay) return;
        goTo(active >= n - 1 ? 0 : active + 1);
      }, opts.autoplay);
    }

    // ----- input -----
    root.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.pl-bar')) return;
      if (e.button !== undefined && e.button !== 0) return;
      lastTouch = performance.now();
      drag = { x: e.clientX, off: S.off, lx: e.clientX, lt: e.timeStamp, v: 0, moved: false };
    });
    root.addEventListener('pointermove', function (e) {
      var d = drag; if (!d) return;
      var dx = e.clientX - d.x;
      if (!d.moved && Math.abs(dx) > 5) {
        d.moved = true; root.dataset.drag = '1';
        try { root.setPointerCapture(e.pointerId); } catch (err) {}
      }
      if (!d.moved) return;
      var dt = Math.max(1, e.timeStamp - d.lt);
      d.v = 0.7 * ((e.clientX - d.lx) / dt) + 0.3 * d.v;
      d.lx = e.clientX; d.lt = e.timeStamp;
      var max = (n - 1) * spacing;
      var off = d.off - dx;
      if (off < 0) off *= 0.35;
      if (off > max) off = max + (off - max) * 0.35;
      S.off = off;
    });
    function up(e) {
      var d = drag; drag = null; lastTouch = performance.now();
      if (!d) return;
      if (d.moved) {
        root.dataset.drag = '0';
        S.vel = -d.v * 1000;
        goTo(nearestAt(S.off - d.v * 180, spacing, n));
        return;
      }
      var card = e.target.closest('[data-i]');
      if (card) goTo(Number(card.getAttribute('data-i')));
    }
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', up);
    function step(dir) { lastTouch = performance.now(); goTo(clamp(active + dir, 0, n - 1)); }
    prevBtn.addEventListener('click', function () { step(-1); });
    nextBtn.addEventListener('click', function () { step(1); });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else return;
      e.preventDefault();
    });

    return { goTo: goTo, step: step, getActive: function () { return active; } };
  }

  global.PolaroidLine = { mount: mount, clamp: clamp, stringY: stringY, springStep: springStep, swingStep: swingStep, nearestAt: nearestAt, pad2: pad2 };
})(window);
