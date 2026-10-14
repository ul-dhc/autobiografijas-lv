(() => {
  const textButton = document.querySelector('.text-size');
  const english = document.documentElement.lang === 'en';
  let textSize = 0;
  try { textSize = localStorage.getItem('lfk-text-size') === 'large' ? 1 : 0; } catch {}
  const applyTextSize = () => {
    document.documentElement.style.setProperty('--text-scale', textSize ? '1.2' : '1');
    document.documentElement.dataset.textSize = textSize ? 'large' : 'normal';
    textButton?.setAttribute('aria-pressed', String(Boolean(textSize)));
    const label = textSize
      ? (english ? 'Restore standard text size' : 'Atjaunot parasto teksta izmēru')
      : (english ? 'Increase text size' : 'Palielināt tekstu');
    if (textButton) { textButton.title = label; textButton.setAttribute('aria-label', label); }
  };
  applyTextSize();
  textButton?.addEventListener('click', () => {
    textSize = textSize ? 0 : 1;
    applyTextSize();
    try { localStorage.setItem('lfk-text-size', textSize ? 'large' : 'normal'); } catch {}
  });
  document.querySelectorAll('[data-copy-target]').forEach(button => {
    button.addEventListener('click', async () => {
      const citation = document.getElementById(button.dataset.copyTarget);
      const status = button.nextElementSibling;
      if (!citation) return;
      try {
        await navigator.clipboard.writeText(citation.textContent.trim());
        status.textContent = english ? 'Reference copied.' : 'Atsauce nokopēta.';
      } catch {
        status.textContent = english ? 'Select and copy the reference text above.' : 'Iezīmē un nokopē atsauces tekstu augstāk.';
      }
    });
  });
  const diarySlides = [...document.querySelectorAll('.pudelis-slide')];
  const diaryControls = document.querySelector('.pudelis-controls');
  let diaryIndex = 0;
  const moveDiary = step => {
    if (!diarySlides.length) return;
    diaryIndex = (diaryIndex + step + diarySlides.length) % diarySlides.length;
    diarySlides.forEach((slide, i) => { slide.hidden = i !== diaryIndex; });
    const position = document.querySelector('.diary-position');
    if (position) position.textContent = `${diaryIndex + 1} / ${diarySlides.length}`;
    const status = document.querySelector('.pudelis-status');
    if (status) status.textContent = english
      ? `Diary entry ${diaryIndex + 1} of ${diarySlides.length}`
      : `Dienasgrāmatas ieraksts ${diaryIndex + 1} no ${diarySlides.length}`;
  };
  if (diaryControls && diarySlides.length > 1) diaryControls.hidden = false;
  document.querySelectorAll('[data-diary-step]').forEach(button => {
    button.addEventListener('click', () => moveDiary(Number(button.dataset.diaryStep)));
  });
  diaryControls?.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    moveDiary(event.key === 'ArrowLeft' ? -1 : 1);
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const numbers = [...document.querySelectorAll('[data-count]')];
  const format = new Intl.NumberFormat(document.documentElement.lang === 'lv' ? 'lv-LV' : 'en-GB', { useGrouping: 'always' });
  numbers.forEach(el => { el.textContent = format.format(Number(el.dataset.count)); });
  if (!reduced.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);
        const total = Number(el.dataset.count);
        const started = performance.now();
        const tick = time => {
          const progress = Math.min(1, (time - started) / 1400);
          el.textContent = format.format(Math.round(total * (1 - Math.pow(1 - progress, 3))));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.65 });
    numbers.forEach(el => observer.observe(el));
  }
})();
