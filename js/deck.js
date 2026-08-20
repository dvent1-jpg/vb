/* Deck engine: stage scaling, vertical slide travel with parallax lag,
   overlay transitions on case study covers, hash sync, reveal
   choreography, animated stat counters. */

(() => {
  const stage = document.getElementById('stage');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const progress = document.getElementById('progress');
  const counter = document.getElementById('slide-counter');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TRAVEL = 900; /* transition 850ms + settle margin */

  let current = -1;
  let overlayTimer = null;

  /* --- Stage scaling: fit 1920×1080 into the viewport --- */
  function fitStage() {
    const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = `scale(${scale})`;
  }
  window.addEventListener('resize', fitStage);
  fitStage();

  /* --- Stat counters --- */
  function animateCounters(slide) {
    slide.querySelectorAll('[data-count-to]').forEach((el) => {
      const target = parseFloat(el.dataset.countTo);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      if (reduceMotion) {
        el.textContent = prefix + target.toFixed(decimals) + suffix;
        return;
      }
      const duration = 2000;
      const start = performance.now();
      const ease = (t) => 1 - Math.pow(1 - t, 4);
      function frame(now) {
        const t = Math.min((now - start) / duration, 1);
        el.textContent = prefix + (target * ease(t)).toFixed(decimals) + suffix;
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  /* Apply class changes without animating them */
  function silently(fn) {
    stage.classList.remove('anim');
    fn();
    void stage.offsetWidth;
    stage.classList.add('anim');
  }

  /* Position every slide relative to index n (skipping any exceptions) */
  function setStates(n, skip) {
    slides.forEach((s, i) => {
      if (skip && skip.includes(s)) return;
      s.classList.remove('active', 'is-held', 'z-top');
      s.classList.toggle('is-above', i < n);
      if (i === n) s.classList.add('active');
    });
  }

  /* --- Navigation --- */
  function goTo(index) {
    const next = Math.max(0, Math.min(index, slides.length - 1));
    if (next === current) return;

    /* Flush any pending overlay cleanup */
    if (overlayTimer) { clearTimeout(overlayTimer); overlayTimer = null; }

    const outgoing = current >= 0 ? slides[current] : null;
    const incoming = slides[next];
    const forward = next > current;
    const jump = current < 0 || Math.abs(next - current) > 1 || reduceMotion;

    if (jump) {
      silently(() => setStates(next));
    } else if (forward && incoming.classList.contains('slide--cover')) {
      /* Cover pulls up over a stationary outgoing slide */
      outgoing.classList.remove('active');
      outgoing.classList.add('is-held');
      incoming.classList.add('z-top');
      setStates(next, [outgoing]);
      overlayTimer = setTimeout(() => {
        silently(() => setStates(next));
        overlayTimer = null;
      }, TRAVEL);
    } else if (!forward && outgoing && outgoing.classList.contains('slide--cover')) {
      /* Cover slides down, revealing the prior slide beneath it */
      outgoing.classList.add('z-top');
      silently(() => {
        incoming.classList.remove('is-above');
        incoming.classList.add('is-held');
      });
      outgoing.classList.remove('active');
      overlayTimer = setTimeout(() => {
        silently(() => setStates(next));
        animateCounters(incoming);
        overlayTimer = null;
      }, TRAVEL);
    } else {
      setStates(next);
    }

    current = next;
    stage.classList.toggle('on-title', current === 0);
    if (!overlayTimer || !incoming.classList.contains('is-held')) animateCounters(incoming);
    progress.style.height = `${((current + 1) / slides.length) * 100}%`;
    counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    history.replaceState(null, '', `#${current + 1}`);
  }

  const nextSlide = () => goTo(current + 1);
  const prevSlide = () => goTo(current - 1);

  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowRight', 'Down', 'Right', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); nextSlide(); }
    else if (['ArrowUp', 'ArrowLeft', 'Up', 'Left', 'PageUp'].includes(e.key)) { e.preventDefault(); prevSlide(); }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    else if (e.key === 'End') { e.preventDefault(); goTo(slides.length - 1); }
  });

  stage.addEventListener('click', (e) => {
    if (e.clientY / window.innerHeight < 0.2) prevSlide();
    else nextSlide();
  });

  /* Touch swipe: vertical */
  let touchY = null;
  window.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (touchY === null) return;
    const dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dy) > 60) (dy < 0 ? nextSlide : prevSlide)();
    touchY = null;
  }, { passive: true });

  /* --- Hash navigation: start there, and follow manual edits --- */
  function goToHash() {
    const n = parseInt((location.hash || '').slice(1), 10);
    goTo(Number.isFinite(n) ? n - 1 : 0);
  }
  window.addEventListener('hashchange', goToHash);
  goToHash();
  requestAnimationFrame(() => stage.classList.add('anim'));
})();
