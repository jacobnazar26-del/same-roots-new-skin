/* Same Roots, New Skin — interactions
   No framework. Everything degrades: the article reads fine with JS off. */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  root.classList.add('js');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- scroll progress + nav shadow ---------- */
  var bar = doc.getElementById('progressBar');
  var nav = doc.getElementById('siteNav');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (bar) bar.style.transform = 'scaleX(' + p + ')';
      if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- mobile nav ---------- */
  var toggle = doc.getElementById('navToggle');
  var menu = doc.getElementById('navMenu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
      menu.classList.toggle('is-open', !open);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
        menu.classList.remove('is-open');
      }
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        toggle.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-open');
        toggle.focus();
      }
    });
  }

  /* ---------- scroll spy (aria-current on nav links) ---------- */
  var navLinks = menu ? Array.prototype.slice.call(menu.querySelectorAll('a[href^="#"]')) : [];
  var spyTargets = navLinks.map(function (a) { return doc.querySelector(a.getAttribute('href')); }).filter(Boolean);
  if ('IntersectionObserver' in window && spyTargets.length) {
    var current = null;
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) current = en.target.id;
      });
      navLinks.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + current;
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    spyTargets.forEach(function (t) { spy.observe(t); });
  }

  /* ---------- reveal on scroll ---------- */
  var reveals = Array.prototype.slice.call(doc.querySelectorAll('.reveal'));
  var vh = window.innerHeight;
  reveals.forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (r.top < vh * 0.9) el.classList.add('in'); // already on screen: show at rest
  });
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { if (!el.classList.contains('in')) io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- lanterns light up ---------- */
  var hero = doc.getElementById('hero');
  if (hero) setTimeout(function () { hero.classList.add('is-lit'); }, 350);

  /* ---------- comparison sliders ---------- */
  Array.prototype.forEach.call(doc.querySelectorAll('[data-compare]'), function (box) {
    var handle = box.querySelector('.compare__handle');
    var pos = 55;
    function set(v) {
      pos = Math.min(100, Math.max(0, v));
      box.style.setProperty('--pos', pos + '%');
      handle.setAttribute('aria-valuenow', String(Math.round(pos)));
      handle.setAttribute('aria-valuetext', Math.round(pos) + '% New York');
    }
    function fromEvent(e) {
      var r = box.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 100);
    }
    var dragging = false;
    box.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.hotspot')) return;
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      box.classList.add('is-dragging');
      try { box.setPointerCapture(e.pointerId); } catch (err) {}
      fromEvent(e);
      e.preventDefault();
    });
    box.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
    function stop(e) {
      if (!dragging) return;
      dragging = false;
      box.classList.remove('is-dragging');
      try { box.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    box.addEventListener('pointerup', stop);
    box.addEventListener('pointercancel', stop);
    box.addEventListener('lostpointercapture', function () { dragging = false; box.classList.remove('is-dragging'); });
    handle.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 10 : 2;
      switch (e.key) {
        case 'ArrowLeft': case 'ArrowDown': set(pos - step); break;
        case 'ArrowRight': case 'ArrowUp': set(pos + step); break;
        case 'Home': set(0); break;
        case 'End': set(100); break;
        case 'PageDown': set(pos - 20); break;
        case 'PageUp': set(pos + 20); break;
        default: return;
      }
      e.preventDefault();
    });
    set(pos);
  });

  /* ---------- hotspots ---------- */
  var hotspots = Array.prototype.slice.call(doc.querySelectorAll('.hotspot'));
  hotspots.forEach(function (h) {
    var x = parseFloat(h.style.getPropertyValue('--x')) || 50;
    var y = parseFloat(h.style.getPropertyValue('--y')) || 50;
    if (x > 66) h.classList.add('hotspot--right');
    else if (x < 34) h.classList.add('hotspot--left');
    if (y < 24) h.classList.add('hotspot--below');
    h.setAttribute('aria-label', 'Hybrid detail: ' + h.querySelector('.hotspot__tip').textContent.trim());
    h.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = h.getAttribute('aria-expanded') === 'true';
      hotspots.forEach(function (o) { o.setAttribute('aria-expanded', 'false'); });
      h.setAttribute('aria-expanded', String(!open));
    });
    h.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  });
  doc.addEventListener('click', function () {
    hotspots.forEach(function (o) { o.setAttribute('aria-expanded', 'false'); });
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hotspots.forEach(function (o) { o.setAttribute('aria-expanded', 'false'); });
  });

  /* ---------- flip cards ---------- */
  Array.prototype.forEach.call(doc.querySelectorAll('.flip'), function (card) {
    card.addEventListener('click', function () {
      card.setAttribute('aria-pressed', String(card.getAttribute('aria-pressed') !== 'true'));
    });
  });

  /* ---------- tabs (each role=tablist is its own group) ---------- */
  Array.prototype.forEach.call(doc.querySelectorAll('[role="tablist"]'), function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    function selectTab(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.setAttribute('tabindex', on ? '0' : '-1');
        var panel = doc.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { selectTab(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') n = tabs[0];
        if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); selectTab(n, true); }
      });
    });
  });

  /* ---------- accordions ---------- */
  Array.prototype.forEach.call(doc.querySelectorAll('.acc__btn'), function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      var panel = doc.getElementById(btn.getAttribute('aria-controls'));
      if (panel) panel.hidden = open;
    });
  });

  /* ---------- compare toggle ---------- */
  var compareToggle = doc.getElementById('compareToggle');
  var voices = doc.getElementById('voicesWidget');
  var compareView = doc.getElementById('compareView');
  if (compareToggle && voices && compareView) {
    compareToggle.addEventListener('click', function () {
      var on = compareToggle.getAttribute('aria-pressed') !== 'true';
      compareToggle.setAttribute('aria-pressed', String(on));
      voices.classList.toggle('is-compare', on);
      compareView.hidden = !on;
    });
  }

  /* ---------- neighborhood cards ---------- */
  Array.prototype.forEach.call(doc.querySelectorAll('.nb-card__btn'), function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      var body = doc.getElementById(btn.getAttribute('aria-controls'));
      if (body) body.hidden = open;
      btn.closest('.nb-card').classList.toggle('is-open', !open);
    });
  });

  /* ---------- citation links: focus the target; "back" prefers history ---------- */
  Array.prototype.forEach.call(doc.querySelectorAll('.cite, .back'), function (a) {
    a.addEventListener('click', function (e) {
      var href = a.getAttribute('href') || '';
      if (a.classList.contains('back') && history.length > 1 && doc.referrer && doc.referrer.indexOf(location.origin) === 0) {
        e.preventDefault(); history.back(); return;
      }
      if (href.charAt(0) !== '#') return;
      var t = doc.querySelector(href);
      if (!t) return;
      if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
      setTimeout(function () { t.focus({ preventScroll: true }); }, 50);
    });
  });
  // arriving from the sources tab: highlight the cited sentence's marker
  if (location.hash && /^#cite-/.test(location.hash)) {
    var c = doc.querySelector(location.hash);
    if (c) { c.setAttribute('tabindex', '-1'); setTimeout(function () { c.focus({ preventScroll: true }); }, 300); }
  }

  /* ---------- polaroid line: the twelve prints, Chinatown beside its twin ---------- */
  var lineEl = doc.querySelector('[data-polaroid-line]');
  if (lineEl && window.PolaroidLine) {
    var CT = 'public/photos/chinatown/', LENS = 'public/photos/lens/';
    function print(dir, file, kind, title, caption, alt, href) {
      var base = file.replace(/\.jpg$/, '');
      return { image: dir + file, webp: dir + base + '.webp', file: file, tag: kind === 'ny' ? 'NEW YORK' : 'HONG KONG / CHINA', tagKind: kind, title: title, caption: caption, alt: alt, href: href };
    }
    PolaroidLine.mount(lineEl, {
      ariaLabel: 'Twelve prints: each Chinatown photo beside its Hong Kong or China twin',
      cardWidth: 280, sag: 44, swing: 1, autoplay: 4500, string: '#8a7f72',
      slides: [
        print(CT, 'ct-1-pell-st.jpg', 'ny', 'Pell Street', 'Fire escapes, hanging paper lanterns, the green Hip Sing Association sign, a Knicks banner.', 'Pell Street looking down the block, with fire escapes, hanging paper lanterns, the green Hip Sing Association sign, and a Knicks banner.', '#place-1'),
        print(LENS, 'lens-6-signs.jpg', 'lens', 'Vertical signs, Hong Kong', 'Vertical Chinese signs and a double-decker bus.', 'Vertical Chinese signs stacked above a Hong Kong street while a red double-decker bus passes beneath them.', '#place-1'),
        print(CT, 'ct-2-temple.jpg', 'ny', 'Mahayana Buddhist Temple', 'Red pillars, green tiled roof, GEICO billboard and graffiti above.', 'The Mahayana Buddhist Temple on Canal Street, with red pillars and a green tiled roof beneath a GEICO billboard and graffiti.', '#place-2'),
        print(LENS, 'lens-3-old-new.jpg', 'lens', 'Old and new, Hong Kong', 'An old lavender apartment building next to a glass tower.', 'An old lavender apartment building in Hong Kong stands in front of a glass tower that reflects the clouds.', '#place-2'),
        print(CT, 'ct-3-hop-kee-stairs.jpg', 'ny', 'The stairs into Hop Kee', '"Hold the handrail please" and a wheelchair sign at the bottom.', 'Steep granite stairs leading down into Hop Kee Restaurant, with a hold-the-handrail sign and a wheelchair symbol at the bottom.', '#place-3'),
        print(LENS, 'lens-2-stairs.jpg', 'lens', 'Hillside stairs, Hong Kong', 'Worn stairs with a railing and graffiti.', 'Worn concrete hillside stairs in Hong Kong with a peeling railing and graffiti on the wall.', '#place-3'),
        print(CT, 'ct-4-noodletown.jpg', 'ny', 'The Noodletown window', 'Hanging roast ducks, a whole roast pig sign for $198, an older woman writing in front.', 'The Great N.Y. Noodletown window, with roast ducks hanging on hooks, a whole roast pig sign for $198, and an older woman writing on a pad in front.', '#place-4'),
        print(LENS, 'lens-4-cured-meat.jpg', 'lens', 'Cured meat, China', 'Cured ducks and red lap cheong sausages in a glass case.', 'Cured ducks pressed flat and red lap cheong sausages hanging in a glass case in China.', '#place-4'),
        print(CT, 'ct-5-graffiti-fruit.jpg', 'ny', 'The graffiti fruit stand', 'Longans under red umbrellas, handwritten prices, graffiti across the front.', 'A wooden fruit stall under red umbrellas, piled with longans and handwritten prices, its front covered in graffiti.', '#place-5'),
        print(LENS, 'lens-5-fruit.jpg', 'lens', 'Fruit stall, Hong Kong', 'Handwritten "20元/份" price signs.', 'A Hong Kong fruit stall with fruit laid out on neat trays under handwritten price signs.', '#place-5'),
        print(CT, 'ct-6-bayard-gift-shop.jpg', 'ny', 'The Bayard Street gift shop', 'Red lanterns, 生意興隆 banners, lucky cats, "NO PHOTOS" notices.', 'A Bayard Street gift shop covered in red lanterns, gold prosperity banners, waving lucky cats, and printed no-photos notices.', '#place-6'),
        print(LENS, 'lens-1-lanterns.jpg', 'lens', 'Lee Tung Avenue, Hong Kong', 'Hundreds of red lanterns at dusk.', 'Hundreds of red lanterns glowing at dusk above Lee Tung Avenue in Hong Kong.', '#place-6')
      ]
    });
  }

  /* ---------- mini map (Leaflet + OpenStreetMap) ---------- */
  var mapEl = doc.getElementById('map');
  if (mapEl && window.L) {
    var stops = [
      { n: 1, name: 'Pell St', ll: [40.7146, -73.9978], id: 'place-1' },
      { n: 2, name: 'Mahayana Temple, 133 Canal St', ll: [40.7172, -73.9953], id: 'place-2' },
      { n: 3, name: 'Hop Kee, 21 Mott St', ll: [40.7143, -73.9989], id: 'place-3' },
      { n: 4, name: 'Great N.Y. Noodletown, 28 Bowery', ll: [40.7152, -73.9966], id: 'place-4' },
      { n: 5, name: 'Graffiti fruit stand (Mott & Canal)', ll: [40.7167, -73.9978], id: 'place-5' },
      { n: 6, name: 'Bayard St gift shop', ll: [40.7155, -73.9985], id: 'place-6' }
    ];
    var map = L.map(mapEl, { scrollWheelZoom: false, tap: true });
    var bounds = L.latLngBounds(stops.map(function (s) { return s.ll; }));
    map.fitBounds(bounds.pad(0.35));
    var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(map);

    // If tiles cannot load (offline, blocked host), keep the pins on a paper grid to scale.
    var loaded = 0, errored = 0, fellBack = false;
    function fallback() {
      if (fellBack || loaded > 0) return;
      fellBack = true;
      mapEl.classList.add('map--fallback');
      var note = doc.createElement('div');
      note.className = 'map__note';
      note.textContent = 'Map tiles could not load here. Pins are still placed to scale; click one to jump to that stop.';
      mapEl.appendChild(note);
    }
    tiles.on('tileload', function () { loaded++; });
    tiles.on('tileerror', function () { errored++; if (errored >= 3) fallback(); });
    setTimeout(function () { if (loaded === 0) fallback(); }, 5000);

    stops.forEach(function (s) {
      var icon = L.divIcon({ className: 'pin-wrap', html: '<span class="pin">' + s.n + '</span>', iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] });
      var m = L.marker(s.ll, { icon: icon, title: s.name, alt: 'Pin ' + s.n + ': ' + s.name, keyboard: true }).addTo(map);
      m.bindPopup('<strong>' + s.n + '. ' + s.name + '</strong>');
      m.on('mouseover', function () { m.openPopup(); });
      m.on('click', function () {
        var target = doc.getElementById(s.id);
        if (!target) return;
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        var h = target.querySelector('h3');
        if (h) { h.setAttribute('tabindex', '-1'); setTimeout(function () { h.focus({ preventScroll: true }); }, 600); }
      });
    });
  }
})();
