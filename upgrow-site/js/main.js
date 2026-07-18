/* Upgrow Ventures — shared interactions */
(function () {
  // Sticky nav shadow
  var nav = document.querySelector('.nav');
  addEventListener('scroll', function () {
    nav && nav.classList.toggle('scrolled', scrollY > 8);
  }, { passive: true });

  // Mobile menu
  var btn = document.getElementById('menu-btn');
  var links = document.getElementById('nav-links');
  if (btn && links) {
    var syncNavBottom = function () {
      document.documentElement.style.setProperty('--nav-bottom', nav.getBoundingClientRect().bottom + 'px');
    };
    btn.addEventListener('click', function () {
      syncNavBottom();
      var open = links.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    addEventListener('resize', function () {
      if (links.classList.contains('open')) syncNavBottom();
    });
    // Mobile submenu toggles
    links.querySelectorAll('li > button').forEach(function (b) {
      b.addEventListener('click', function () {
        if (innerWidth <= 1080) b.parentElement.classList.toggle('open-sub');
      });
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        btn.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Reveal on scroll
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });

  // Animated counters
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target, to = +el.dataset.to, t0 = null;
      cio.unobserve(el);
      function tick(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / 1400, 1);
        el.textContent = Math.floor(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick); else el.textContent = to;
      }
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.count').forEach(function (el) { cio.observe(el); });

  // Generic tab groups: [data-tabs] buttons control [data-panes] children
  document.querySelectorAll('[data-tabs]').forEach(function (group) {
    var name = group.dataset.tabs;
    var panes = document.querySelectorAll('[data-pane="' + name + '"]');
    group.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        group.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        panes.forEach(function (p) {
          p.style.display = p.dataset.key === b.dataset.key ? '' : 'none';
        });
      });
    });
  });

  // LeadNest screenshot switcher
  var lnImg = document.getElementById('ln-shot-img');
  var lnTabs = document.getElementById('ln-tabs');
  if (lnImg && lnTabs) {
    lnTabs.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        lnTabs.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        lnImg.classList.remove('show');
        setTimeout(function () {
          lnImg.src = b.dataset.src;
          lnImg.alt = 'LeadNest — ' + b.textContent + ' screen';
          lnImg.onload = function () { lnImg.classList.add('show'); };
        }, 180);
      });
    });
  }

  // Forms (no backend yet — mailto fallback + success note)
  document.querySelectorAll('form[data-contact]').forEach(function (f) {
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var d = new FormData(f);
      var body = [];
      d.forEach(function (v, k) { body.push(k + ': ' + v); });
      var ok = f.querySelector('.form-ok');
      if (ok) ok.style.display = 'block';
      location.href = 'mailto:upgrowventures.co@gmail.com?subject=' +
        encodeURIComponent('New enquiry from upgrowventures.co') +
        '&body=' + encodeURIComponent(body.join('\n'));
      f.reset();
    });
  });
  document.querySelectorAll('form[data-news]').forEach(function (f) {
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var b = f.querySelector('button');
      b.textContent = 'Subscribed ✓';
      setTimeout(function () { b.textContent = 'Send'; f.reset(); }, 2500);
    });
  });

  // FAQ accordion
  document.querySelectorAll('.acc-item').forEach(function (item) {
    var q = item.querySelector('.acc-q'), a = item.querySelector('.acc-a');
    if (item.classList.contains('open')) a.style.maxHeight = a.scrollHeight + 'px';
    q.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.acc-item.open').forEach(function (o) {
        o.classList.remove('open');
        o.querySelector('.acc-a').style.maxHeight = 0;
        o.querySelector('.acc-q').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
        q.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Hero canvas — growth network animation
  var cv = document.getElementById('hero-canvas');
  if (cv) {
    var ctx = cv.getContext('2d');
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var W, H, dpr, nodes = [], t = 0;
    var GREEN = '#7fd14f', GREEN_D = '#4ea32e';

    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      var r = cv.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size(); addEventListener('resize', size);

    for (var i = 0; i < 26; i++) {
      nodes.push({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - .5) * .0011, vy: (Math.random() - .5) * .0011,
        r: 1.6 + Math.random() * 2.4
      });
    }

    function curveY(x) { // rising growth curve, 0..1 → canvas y
      var base = .82 - x * .5;
      var wave = Math.sin(x * 7 + t * .018) * .035 + Math.sin(x * 13 - t * .011) * .018;
      return (base + wave) * H;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // faint grid
      ctx.strokeStyle = 'rgba(127,209,79,.07)'; ctx.lineWidth = 1;
      for (var gx = 0; gx <= W; gx += W / 10) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      for (var gy = 0; gy <= H; gy += H / 8) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

      // network nodes
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (!reduced) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > 1) n.vx *= -1;
          if (n.y < 0 || n.y > 1) n.vy *= -1;
        }
        for (var j = i + 1; j < nodes.length; j++) {
          var m = nodes[j];
          var dx = (n.x - m.x) * W, dy = (n.y - m.y) * H;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            ctx.strokeStyle = 'rgba(127,209,79,' + (0.16 * (1 - d / 130)) + ')';
            ctx.beginPath(); ctx.moveTo(n.x * W, n.y * H); ctx.lineTo(m.x * W, m.y * H); ctx.stroke();
          }
        }
      }
      nodes.forEach(function (n) {
        ctx.fillStyle = 'rgba(127,209,79,.75)';
        ctx.beginPath(); ctx.arc(n.x * W, n.y * H, n.r, 0, 7); ctx.fill();
      });

      // growth curve — filled area
      var grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, 'rgba(127,209,79,.32)');
      grad.addColorStop(1, 'rgba(127,209,79,0)');
      ctx.beginPath(); ctx.moveTo(0, curveY(0));
      for (var x = 0; x <= 1.001; x += .02) ctx.lineTo(x * W, curveY(x));
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();

      // curve line
      ctx.beginPath(); ctx.moveTo(0, curveY(0));
      for (x = 0; x <= 1.001; x += .02) ctx.lineTo(x * W, curveY(x));
      ctx.strokeStyle = GREEN; ctx.lineWidth = 2.5;
      ctx.shadowColor = GREEN; ctx.shadowBlur = 12;
      ctx.stroke(); ctx.shadowBlur = 0;

      // pulse dot travelling on the curve
      var px = ((t * .0022) % 1);
      ctx.beginPath(); ctx.arc(px * W, curveY(px), 5, 0, 7);
      ctx.fillStyle = '#fff'; ctx.shadowColor = GREEN; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;

      // end marker
      ctx.beginPath(); ctx.arc(W * .96, curveY(.96), 6, 0, 7);
      ctx.fillStyle = GREEN_D; ctx.fill();
      ctx.beginPath(); ctx.arc(W * .96, curveY(.96), 10 + Math.sin(t * .08) * 3, 0, 7);
      ctx.strokeStyle = 'rgba(127,209,79,.5)'; ctx.lineWidth = 1.5; ctx.stroke();

      t++;
      if (!reduced) requestAnimationFrame(draw);
    }
    draw();
  }

  // Footer year
  var y = document.getElementById('yy');
  if (y) y.textContent = new Date().getFullYear();
})();
