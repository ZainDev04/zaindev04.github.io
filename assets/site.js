/* =========================================================================
   Shaikh Muhammad Zain — portfolio behaviour
   No dependencies. Every effect degrades to readable static content.
   ========================================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var RM = window.matchMedia('(prefers-reduced-motion:reduce)');
  var reduced = function () { return RM.matches; };

  /* ---- theme ----------------------------------------------------------- */
  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  }
  function syncToggle(btn) {
    var dark = currentTheme() === 'dark';
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('title', dark ? 'Switch to light' : 'Switch to dark');
  }
  function initTheme() {
    var btn = document.querySelector('.tog');
    if (!btn) return;
    syncToggle(btn);
    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      syncToggle(btn);
    });
  }

  /* ---- header: stuck state + scroll progress --------------------------- */
  function initScroll() {
    var head = document.querySelector('header');
    var prog = document.querySelector('.progress');
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset;
      if (head) head.classList.toggle('stuck', y > 8);
      if (prog) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
      }
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---- mobile menu ------------------------------------------------------ */
  function initMenu() {
    var btn = document.querySelector('.burger');
    var sheet = document.getElementById('menu');
    if (!btn || !sheet) return;

    function setOpen(open) {
      btn.setAttribute('aria-expanded', String(open));
      sheet.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) { var a = sheet.querySelector('a'); if (a) a.focus(); }
    }
    btn.addEventListener('click', function () {
      setOpen(btn.getAttribute('aria-expanded') !== 'true');
    });
    sheet.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
        setOpen(false); btn.focus();
      }
    });
    // a resize past the breakpoint must not leave the sheet stranded open
    window.addEventListener('resize', function () {
      if (window.innerWidth > 820 && btn.getAttribute('aria-expanded') === 'true') setOpen(false);
    });
  }

  /* ---- headline: word-by-word entrance ---------------------------------- */
  /* Splits only top-level text nodes. Inline elements (the gradient .lit
     span) are wrapped whole, so background-clip:text keeps working. */
  function splitWords(el) {
    var units = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        var parts = node.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        parts.forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span');
          w.className = 'word';
          var inner = document.createElement('span');
          inner.textContent = part;
          w.appendChild(inner);
          frag.appendChild(w);
          units.push(w);
        });
        el.replaceChild(frag, node);
      } else if (node.nodeType === 1) {
        var wrap = document.createElement('span');
        wrap.className = 'word';
        el.replaceChild(wrap, node);
        wrap.appendChild(node);
        units.push(wrap);
      }
    });
    units.forEach(function (u, i) { u.style.setProperty('--i', i); });
    return units;
  }
  function initHeadline() {
    var el = document.querySelector('[data-split]');
    if (!el) return;
    var units = splitWords(el);
    requestAnimationFrame(function () {
      units.forEach(function (u) { u.classList.add('in'); });
    });
  }

  /* ---- scroll reveal ---------------------------------------------------- */
  function initReveal() {
    var items = document.querySelectorAll('.rv');
    if (!items.length) return;

    if (!('IntersectionObserver' in window) || reduced()) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        entry.target.style.transitionDelay = Math.min(i, 5) * 70 + 'ms';
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    items.forEach(function (el) { io.observe(el); });

    // Safety net: anything already on screen shows immediately, and nothing
    // is allowed to stay invisible if an observer callback never fires.
    requestAnimationFrame(function () {
      items.forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.95) {
          el.classList.add('in'); io.unobserve(el);
        }
      });
    });
    setTimeout(function () {
      document.querySelectorAll('.rv:not(.in)').forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
      });
    }, 2500);
  }

  /* ---- count-up --------------------------------------------------------- */
  function initCounters() {
    var nodes = document.querySelectorAll('[data-n]');
    if (!nodes.length) return;

    function fmt(v, dec) {
      return v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }
    function run(el) {
      var target = parseFloat(el.dataset.n);
      var dec = parseInt(el.dataset.dec || '0', 10);
      var pre = el.dataset.pre || '';
      var suf = el.dataset.suf || '';
      if (reduced()) { el.textContent = pre + fmt(target, dec) + suf; return; }
      var t0 = null, D = 1200;
      requestAnimationFrame(function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min((ts - t0) / D, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = pre + fmt(target * eased, dec) + suf;
        if (p < 1) requestAnimationFrame(step);
      });
    }
    if (!('IntersectionObserver' in window)) { nodes.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    nodes.forEach(function (el) { io.observe(el); });
  }

  /* ---- copy to clipboard ------------------------------------------------ */
  function initCopy() {
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
      var label = btn.querySelector('.copy-label');
      if (!label) return;
      var idle = label.textContent;   // captured once, so rapid clicks can't
      var timer;                      // latch the label to "Copied" forever

      function flash(msg) {
        label.textContent = msg;
        clearTimeout(timer);
        timer = setTimeout(function () { label.textContent = idle; }, 1800);
      }
      function legacyCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:absolute;left:-9999px';
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        return ok;
      }
      // Always report an outcome: a rejected clipboard promise (denied
      // permission, no focus) falls back rather than failing silently.
      function fallback(text) { flash(legacyCopy(text) ? 'Copied' : 'Press Ctrl+C'); }

      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(
            function () { flash('Copied'); },
            function () { fallback(text); }
          );
        } else {
          fallback(text);
        }
      });
    });
  }

  /* ---- the split animation ---------------------------------------------- */
  /* 8,130 pages sitting in one bucket, resolving into five populations. */
  function initSplit() {
    var cv = document.getElementById('split');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio || 1, 2);

    var GROUPS = [
      { n: 250, label: '3,365', name: 'recently published, establishing', hi: false },
      { n: 218, label: '2,920', name: 'long-tenured, settled low',        hi: false },
      { n: 58,  label: '735',   name: 'high-yield, mis-bucketed',         hi: true  },
      { n: 46,  label: '588',   name: 'intermittent exposure',            hi: false },
      { n: 40,  label: '522',   name: 'unlisted remainder',               hi: false }
    ];

    var W = 0, H = 0, CY = 0, RS = [], pts = [];
    var t = 0, idle = 0, started = false, running = false;

    function token(name) {
      return getComputedStyle(root).getPropertyValue(name).trim();
    }
    function layout() {
      W = cv.clientWidth || cv.parentNode.clientWidth || 600;
      var slot = W / (GROUPS.length + 1);
      var rMax = Math.min(70, slot * 0.46);
      RS = GROUPS.map(function (g) {
        return Math.max(15, Math.min(rMax, Math.sqrt(g.n) * 3.9));
      });
      H = Math.round(Math.max(190, Math.min(360, Math.max.apply(null, RS) * 2.7 + 74)));

      cv.width = Math.round(W * DPR);
      cv.height = Math.round(H * DPR);
      cv.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      CY = (H - 30) / 2;
      var cx = W / 2;
      pts = [];
      GROUPS.forEach(function (g, k) {
        var tx = slot * (k + 1), r = RS[k];
        for (var j = 0; j < g.n; j++) {
          var a = Math.random() * Math.PI * 2;
          var rr = Math.sqrt(Math.random());
          pts.push({
            x0: cx + (Math.random() - 0.5) * W * 0.3,
            y0: CY + (Math.random() - 0.5) * H * 0.5,
            x1: tx + Math.cos(a) * rr * r,
            y1: CY + Math.sin(a) * rr * r * 1.2,
            hi: g.hi,
            d: Math.random() * 0.34,
            ph: Math.random() * Math.PI * 2,
            sp: 0.6 + Math.random() * 0.8
          });
        }
      });
    }
    function ease(p) { return p < 0 ? 0 : p > 1 ? 1 : 1 - Math.pow(1 - p, 3); }

    function draw() {
      var cMuted = token('--muted') || '#888';
      var cAccent = token('--accent') || '#E9A15E';
      var cDot = cMuted;
      ctx.clearRect(0, 0, W, H);

      /* the hand-written rule's single bucket, dissolving */
      var bo = 1 - ease(t * 1.5);
      if (bo > 0.01) {
        ctx.save();
        ctx.strokeStyle = cMuted;
        ctx.globalAlpha = bo * 0.4;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        var bw = W * 0.34, bh = H * 0.6;
        ctx.strokeRect(W / 2 - bw / 2, CY - bh / 2, bw, bh);
        ctx.setLineDash([]);
        ctx.fillStyle = cMuted;
        ctx.font = '500 11px ' + (token('--mono') || 'monospace');
        ctx.textAlign = 'center';
        ctx.fillText('8,130 pages — one bucket', W / 2, CY - bh / 2 - 9);
        ctx.restore();
      }

      /* the points */
      pts.forEach(function (p) {
        var pp = ease((t - p.d) / (1 - p.d));
        var wob = idle > 0 && pp >= 1
          ? Math.sin(idle * p.sp + p.ph) * 1.1
          : 0;
        var x = p.x0 + (p.x1 - p.x0) * pp;
        var y = p.y0 + (p.y1 - p.y0) * pp + wob;

        if (p.hi) {
          ctx.fillStyle = cAccent;
          ctx.globalAlpha = 0.4 + 0.6 * pp;
          ctx.shadowColor = cAccent;
          ctx.shadowBlur = 7 * pp;
          ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 6.2832); ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = cDot;
          ctx.globalAlpha = 0.55;
          ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.2832); ctx.fill();
        }
        ctx.globalAlpha = 1;
      });

      /* counts under each resolved group */
      if (t > 0.55) {
        var la = Math.min((t - 0.55) / 0.4, 1);
        var slot = W / (GROUPS.length + 1);
        ctx.save();
        ctx.globalAlpha = la;
        ctx.font = '500 11px ' + (token('--mono') || 'monospace');
        ctx.textAlign = 'center';
        GROUPS.forEach(function (g, k) {
          ctx.fillStyle = g.hi ? cAccent : cMuted;
          ctx.fillText(g.label, slot * (k + 1), H - 12);
        });
        ctx.restore();
      }
    }

    function loop() {
      if (t < 1) t = Math.min(t + 0.0085, 1);
      else idle += 0.012;
      draw();
      if (running) requestAnimationFrame(loop);
    }
    function start() {
      if (started) return;
      started = true;
      if (reduced()) { t = 1; draw(); return; }
      running = true;
      requestAnimationFrame(loop);
    }

    layout(); draw();

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) { running = false; return; }   // no frames offscreen
          start();
          if (started && !running && !reduced()) {
            running = true;
            requestAnimationFrame(loop);
          }
        });
      }, { threshold: 0.2 });
      io.observe(cv);
    } else {
      start();
    }

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { var was = t; layout(); t = was; draw(); }, 140);
    });

    var replay = document.querySelector('.replay');
    if (replay) replay.addEventListener('click', function () {
      t = 0; idle = 0; started = false; running = false;
      layout(); start();
    });

    // repaint on theme change so canvas colours follow the tokens
    new MutationObserver(function () { draw(); })
      .observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    window.matchMedia('(prefers-color-scheme:dark)').addEventListener
      && window.matchMedia('(prefers-color-scheme:dark)')
           .addEventListener('change', function () { draw(); });
  }

  /* ---- boot ------------------------------------------------------------- */
  function boot() {
    window.__siteBooted = true;   // tells the inline fallback to stand down
    initTheme();
    initScroll();
    initMenu();
    initHeadline();
    initReveal();
    initCounters();
    initCopy();
    initSplit();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
