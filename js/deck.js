/* Deck engine: stage scaling, slide navigation, hash sync,
   reveal choreography, animated stat counters. */

(() => {
  const stage = document.getElementById('stage');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const progress = document.getElementById('progress');
  const counter = document.getElementById('slide-counter');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current = -1;

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
      const duration = 1400;
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

  /* --- Navigation --- */
  function goTo(index) {
    const next = Math.max(0, Math.min(index, slides.length - 1));
    if (next === current) return;
    if (current >= 0) slides[current].classList.remove('active');
    current = next;
    const slide = slides[current];
    slide.classList.add('active');
    stage.classList.toggle('on-title', current === 0);
    animateCounters(slide);
    progress.style.width = `${((current + 1) / slides.length) * 100}%`;
    counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    history.replaceState(null, '', `#${current + 1}`);
  }

  const nextSlide = () => goTo(current + 1);
  const prevSlide = () => goTo(current - 1);

  window.addEventListener('keydown', (e) => {
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); nextSlide(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); prevSlide(); }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    else if (e.key === 'End') { e.preventDefault(); goTo(slides.length - 1); }
  });

  stage.addEventListener('click', (e) => {
    if (e.clientX / window.innerWidth < 0.2) prevSlide();
    else nextSlide();
  });

  /* Touch swipe */
  let touchX = null;
  window.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 60) (dx < 0 ? nextSlide : prevSlide)();
    touchX = null;
  }, { passive: true });

  /* --- Hash navigation: start there, and follow manual edits --- */
  function goToHash() {
    const n = parseInt((location.hash || '').slice(1), 10);
    goTo(Number.isFinite(n) ? n - 1 : 0);
  }
  window.addEventListener('hashchange', goToHash);
  goToHash();
})();
