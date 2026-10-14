import { normalizeSearch } from '../data/catalogue';

const root = document.querySelector('[data-catalogue]');
if (root) {
  const en = root.dataset.lang === 'en';
  const form = root.querySelector('[data-catalogue-controls]');
  const query = form.querySelector('[name=q]');
  const mobileCatalogue = matchMedia('(max-width: 650px)');
  const filterToggle = form.querySelector('[data-filter-toggle]');
  const types = [...form.querySelectorAll('[name=type]')];
  const selectedTypes = () => types.filter(input => input.checked).map(input => input.value);
  const sort = form.querySelector('[name=sort]');
  const grid = root.querySelector('[data-catalogue-grid]');
  const cards = [...grid.querySelectorAll('[data-catalogue-card]')];
  const pinStorageKey = 'autobiografijas:pinned-collections:v1';
  let pinned = [];
  try {
    const saved = JSON.parse(localStorage.getItem(pinStorageKey) || '[]');
    if (Array.isArray(saved)) pinned = [...new Set(saved)].filter(id => cards.some(card => card.dataset.collectionId === id));
  } catch { /* Pins still work for this visit if storage is unavailable. */ }
  const count = root.querySelector('[data-catalogue-count]');
  const empty = root.querySelector('[data-catalogue-empty]');
  const load = root.querySelector('[data-catalogue-load]');
  const more = root.querySelector('[data-catalogue-more]');
  const visible = root.querySelector('[data-catalogue-visible]');
  const viewButtons = [...root.querySelectorAll('[data-catalogue-view]')];
  const collator = new Intl.Collator(en ? 'en' : 'lv', { numeric: true, sensitivity: 'base' });
  let limit = 24;
  let view = 'grid';
  let debounce;
  let lastFirstBatch = [];
  const optionExists = (select, value) => [...select.options].some(option => option.value === value);
  const readUrl = () => {
    const params = new URLSearchParams(location.search);
    query.value = params.get('q') || '';
    const requestedTypes = params.getAll('type').flatMap(value => value.split(','));
    types.forEach(input => { input.checked = requestedTypes.includes(input.value); });
    sort.value = optionExists(sort, params.get('sort')) ? params.get('sort') : 'number';
    view = !mobileCatalogue.matches && params.get('view') === 'list' ? 'list' : 'grid';
    const requested = Number(params.get('limit'));
    limit = Number.isFinite(requested) && requested >= 24 ? Math.min(cards.length, requested) : 24;
  };
  const writeUrl = () => {
    const url = new URL(location.href);
    const params = url.searchParams;
    for (const [key, value] of Object.entries({ q: query.value.trim(), type: selectedTypes().join(','), sort: sort.value === 'number' ? '' : sort.value, view: view === 'grid' ? '' : view, limit: limit > 24 ? String(limit) : '' })) {
      if (value) params.set(key, value); else params.delete(key);
    }
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    const language = document.querySelector('[data-language-link]');
    if (language) { const target = new URL(language.href); target.search = url.search; target.hash = url.hash; language.href = target.href; }
  };
  const render = (updateUrl = true) => {
    const words = normalizeSearch(query.value).split(' ').filter(Boolean);
    const matches = cards.filter(card => words.every(word => card.dataset.search.includes(word)) && selectedTypes().every(type => card.dataset.types.split(',').includes(type)));
    matches.sort((a, b) => {
      const aPin = pinned.indexOf(a.dataset.collectionId);
      const bPin = pinned.indexOf(b.dataset.collectionId);
      if (aPin !== bPin) return (aPin < 0 ? Infinity : aPin) - (bPin < 0 ? Infinity : bPin);
      if (sort.value === 'title') return collator.compare(a.dataset.title, b.dataset.title) || Number(a.dataset.number) - Number(b.dataset.number);
      if (sort.value === 'year') return Number(a.dataset.year || Infinity) - Number(b.dataset.year || Infinity) || Number(a.dataset.number) - Number(b.dataset.number);
      return Number(a.dataset.number) - Number(b.dataset.number);
    });
    cards.forEach(card => {
      card.hidden = true;
      const isPinned = pinned.includes(card.dataset.collectionId);
      card.classList.toggle('is-pinned', isPinned);
      const button = card.querySelector('[data-pin-collection]');
      button.hidden = false;
      button.setAttribute('aria-pressed', String(isPinned));
      const action = isPinned ? (en ? 'Unpin collection' : 'Atspraust kolekciju') : (en ? 'Pin collection' : 'Piespraust kolekciju');
      button.setAttribute('aria-label', `${action}: ${card.dataset.title}`);
      button.title = isPinned ? (en ? 'Unpin' : 'Atspraust') : (en ? 'Pin to top' : 'Piespraust sākumā');
    });
    matches.forEach((card, index) => { card.hidden = index >= limit; grid.append(card); });
    if (mobileCatalogue.matches) view = 'grid';
    grid.dataset.view = view;
    const activeFilterCount = selectedTypes().length + Number(sort.value !== 'number');
    const filterCount = form.querySelector('[data-filter-count]');
    filterCount.textContent = String(activeFilterCount);
    filterCount.hidden = !activeFilterCount;
    viewButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.catalogueView === view)));
    const found = matches.length;
    count.textContent = en ? `${found} ${found === 1 ? 'collection' : 'collections'}` : `Atrastas kolekcijas: ${found}`;
    empty.hidden = found > 0;
    load.hidden = found === 0;
    more.hidden = found <= limit;
    visible.textContent = en ? `Showing ${Math.min(limit, found)} of ${found}` : `Parādītas ${Math.min(limit, found)} no ${found} kolekcijām`;
    const reset = root.querySelector('.catalogue-reset');
    const hasFilters = Boolean(query.value.trim() || selectedTypes().length || sort.value !== 'number');
    reset.hidden = !hasFilters && !pinned.length;
    reset.textContent = pinned.length
      ? (hasFilters ? (en ? 'Clear filters and pins' : 'Notīrīt filtrus un piespraudes') : (en ? 'Remove all pins' : 'Noņemt visas piespraudes'))
      : (en ? 'Clear filters' : 'Notīrīt filtrus');
    lastFirstBatch = matches.slice(limit, limit + 24);
    if (updateUrl) writeUrl();
    return matches;
  };
  const disclosures = cards.map(card => card.querySelector('details'));
  const setAnchor = (id = '') => {
    const url = new URL(location.href);
    url.hash = id;
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    writeUrl();
  };
  const closeDisclosures = (except = null) => {
    disclosures.forEach(details => { if (details !== except) details.open = false; });
    if (!except && cards.some(card => `#${card.id}` === location.hash)) setAnchor();
  };
  disclosures.forEach(details => {
    details.querySelector('summary').addEventListener('click', event => {
      if (event.target.closest('[data-copy-collection], [data-pin-collection]')) return;
      event.preventDefault();
      const opening = !details.open;
      closeDisclosures(details);
      details.open = opening;
      setAnchor(opening ? details.closest('[data-catalogue-card]').id : '');
    });
  });
  document.addEventListener('click', event => {
    const opened = disclosures.find(details => details.open);
    if (opened && !opened.contains(event.target)) closeDisclosures();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const opened = disclosures.find(details => details.open);
    if (!opened) return;
    closeDisclosures();
    opened.querySelector('summary').focus({ preventScroll: true });
  });
  const openAnchor = () => {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!id) { closeDisclosures(); return; }
    const card = cards.find(card => card.id === id);
    if (!card) return;
    clearTimeout(debounce);
    let matches = render(false);
    if (!matches.includes(card)) {
      query.value = '';
      types.forEach(input => { input.checked = false; });
      matches = render(false);
    }
    limit = Math.max(limit, Math.ceil((matches.indexOf(card) + 1) / 24) * 24);
    render();
    const details = card.querySelector('details');
    closeDisclosures(details);
    details.open = true;
    requestAnimationFrame(() => {
      card.scrollIntoView({ block: 'start' });
      details.querySelector('summary').focus({ preventScroll: true });
    });
  };
  root.querySelectorAll('[data-copy-collection]').forEach(link => {
    let copiedTimeout;
    link.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const url = new URL(link.href);
      url.search = '';
      const status = root.querySelector('[data-copy-status]');
      const fallback = root.querySelector('[data-copy-fallback]');
      fallback.hidden = true;
      try {
        await navigator.clipboard.writeText(url.href);
        status.textContent = en ? 'Collection link copied' : 'Kolekcijas saite nokopēta';
        link.dataset.copied = 'true';
        clearTimeout(copiedTimeout);
        copiedTimeout = setTimeout(() => { delete link.dataset.copied; status.textContent = ''; }, 1800);
      } catch {
        fallback.hidden = false;
        const input = fallback.querySelector('input');
        input.value = url.href;
        input.focus();
        input.select();
        status.textContent = en ? 'Select and copy the link below.' : 'Iezīmē un nokopē zemāk redzamo saiti.';
      }
    });
  });
  let pinMotion = [];
  root.querySelectorAll('[data-pin-collection]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      clearTimeout(debounce);
      pinMotion.forEach(animation => animation.cancel());
      pinMotion = [];
      const card = button.closest('[data-catalogue-card]');
      const id = card.dataset.collectionId;
      const pinning = !pinned.includes(id);
      const readerPosition = { left: window.scrollX, top: window.scrollY };
      const positions = new Map(cards.filter(item => !item.hidden).map(item => [item, item.getBoundingClientRect()]));
      pinned = pinning ? [id, ...pinned] : pinned.filter(value => value !== id);
      try { localStorage.setItem(pinStorageKey, JSON.stringify(pinned)); } catch { /* Keep the current visit usable. */ }
      render();
      button.focus({ preventScroll: true });
      // Keep the viewport stationary while the cards animate to their new positions.
      if (window.scrollY !== readerPosition.top || window.scrollX !== readerPosition.left) {
        window.scrollTo({ ...readerPosition, behavior: 'instant' });
      }
      const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduceMotion) {
        positions.forEach((before, item) => {
          if (item.hidden) return;
          const after = item.getBoundingClientRect();
          const x = before.left - after.left;
          const y = before.top - after.top;
          if (!x && !y) return;
          pinMotion.push(item.animate([
            { transform: `translate(${x}px, ${y}px)`, zIndex: item === card ? 2 : 1 },
            { transform: 'translate(0, 0)', zIndex: item === card ? 2 : 1 },
          ], { duration: pinning ? 1000 : 520, easing: 'cubic-bezier(.25, .8, .25, 1)' }));
        });
      }
    });
  });
  readUrl();
  form.hidden = false;
  filterToggle.hidden = false;
  filterToggle.addEventListener('click', () => {
    const open = filterToggle.getAttribute('aria-expanded') !== 'true';
    filterToggle.setAttribute('aria-expanded', String(open));
    form.dataset.mobileFiltersOpen = String(open);
  });
  mobileCatalogue.addEventListener('change', () => { if (mobileCatalogue.matches) view = 'grid'; render(); });
  root.querySelector('[data-catalogue-actions]').hidden = false;
  render();
  openAnchor();
  form.addEventListener('submit', event => { event.preventDefault(); clearTimeout(debounce); limit = 24; render(); });
  query.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => { limit = 24; render(); }, 120); });
  [...types, sort].forEach(select => select.addEventListener('change', () => { clearTimeout(debounce); limit = 24; render(); }));
  viewButtons.forEach(button => button.addEventListener('click', () => { view = button.dataset.catalogueView; render(); }));
  root.querySelectorAll('[data-catalogue-reset]').forEach(button => button.addEventListener('click', () => {
    clearTimeout(debounce);
    pinMotion.forEach(animation => animation.cancel());
    pinMotion = [];
    query.value = '';
    types.forEach(input => { input.checked = false; });
    sort.value = 'number';
    pinned = [];
    try { localStorage.removeItem(pinStorageKey); } catch { /* Reset still applies to this visit. */ }
    limit = 24;
    closeDisclosures();
    render();
    query.focus();
  }));
  more.addEventListener('click', () => {
    const next = lastFirstBatch[0];
    limit += 24;
    render();
    next?.querySelector('summary')?.focus({ preventScroll: true });
  });
  addEventListener('hashchange', openAnchor);
  addEventListener('popstate', () => { readUrl(); render(); openAnchor(); });
  addEventListener('pageshow', event => { if (event.persisted) { readUrl(); render(); openAnchor(); } });
}
