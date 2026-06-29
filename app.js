/* Heldenshop — shared front-end behaviour */
(function () {
  'use strict';

  // ---- Countdown to the film release ----
  function initCountdown() {
    var el = document.getElementById('countdown');
    if (!el) return;
    var target = new Date(el.getAttribute('data-target') || '2026-07-31T00:00:00+02:00').getTime();
    var d = document.getElementById('cd-d'),
        h = document.getElementById('cd-h'),
        m = document.getElementById('cd-m'),
        s = document.getElementById('cd-s');
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    function tick() {
      var diff = Math.max(0, target - Date.now());
      var dd = Math.floor(diff / 864e5); diff -= dd * 864e5;
      var hh = Math.floor(diff / 36e5); diff -= hh * 36e5;
      var mm = Math.floor(diff / 6e4); diff -= mm * 6e4;
      var ss = Math.floor(diff / 1e3);
      if (d) { d.textContent = dd; h.textContent = p2(hh); m.textContent = p2(mm); s.textContent = p2(ss); }
    }
    tick();
    setInterval(tick, 1000);
  }

  // ---- Current year in footer ----
  function initYear() {
    var yr = document.getElementById('yr');
    if (yr) yr.textContent = new Date().getFullYear();
  }

  // ---- Progressive "thanks" for simple forms (no backend) ----
  function initForms() {
    var forms = document.querySelectorAll('form[data-thanks]');
    Array.prototype.forEach.call(forms, function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = f.getAttribute('data-thanks') || 'Bedankt!';
        var box = document.createElement('div');
        box.className = 'form-done';
        box.textContent = msg;
        f.innerHTML = '';
        f.appendChild(box);
      });
    });
  }

  // ---- Reveal on scroll (respects reduced motion) ----
  function initReveal() {
    var nodes = document.querySelectorAll('[data-reveal]');
    if (!nodes.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(nodes, function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    Array.prototype.forEach.call(nodes, function (n) { io.observe(n); });
  }

  function init() { initCountdown(); initYear(); initForms(); initReveal(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
