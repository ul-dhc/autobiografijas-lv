import { normalizeSearch } from '../data/catalogue';

const root = document.querySelector('[data-catalogue]');
if (root) {
  const en = root.dataset.lang === 'en';
  const form = root.querySelector('[data-catalogue-controls]');
  const query = form.querySelector('[name=q]');
  const types = [...form.querySelectorAll('[name=type]')];
  const selectedTypes = () => types.filter(input => input.checked).map(input => input.value);
  const sort = form.querySelector('[name=sort]');
  const grid = root.querySelector('[data-catalogue-grid]');
  const cards = [...grid.querySelectorAll('[data-catalogue-card]')];
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
    view = params.get('view') === 'list' ? 'list' : 'grid';
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
    root.querySelectorAll('[data-collection-link]').forEach(link => {
      const target = new URL(link.href);
      target.search = url.search;
      link.href = target.href;
    });
    const language = document.querySelector('[data-language-link]');
    if (language) { const target = new URL(language.href); target.search = url.search; language.href = target.href; }
  };
  const render = (updateUrl = true) => {
    const words = normalizeSearch(query.value).split(' ').filter(Boolean);
    const matches = cards.filter(card => words.every(word => card.dataset.search.includes(word)) && selectedTypes().every(type => card.dataset.types.split(',').includes(type)));
    matches.sort((a, b) => {
      if (sort.value === 'title') return collator.compare(a.dataset.title, b.dataset.title) || Number(a.dataset.number) - Number(b.dataset.number);
      if (sort.value === 'year') return Number(a.dataset.year || Infinity) - Number(b.dataset.year || Infinity) || Number(a.dataset.number) - Number(b.dataset.number);
      return Number(a.dataset.number) - Number(b.dataset.number);
    });
    cards.forEach(card => { card.hidden = true; });
    matches.forEach((card, index) => { card.hidden = index >= limit; grid.append(card); });
    grid.dataset.view = view;
    viewButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.catalogueView === view)));
    const found = matches.length;
    count.textContent = en ? `${found} ${found === 1 ? 'collection' : 'collections'}` : `Atrastas kolekcijas: ${found}`;
    empty.hidden = found > 0;
    load.hidden = found === 0;
    more.hidden = found <= limit;
    visible.textContent = en ? `Showing ${Math.min(limit, found)} of ${found}` : `Parādītas ${Math.min(limit, found)} no ${found} kolekcijām`;
    root.querySelector('.catalogue-reset').hidden = !query.value.trim() && !selectedTypes().length && sort.value === 'number';
    lastFirstBatch = matches.slice(limit, limit + 24);
    if (updateUrl) writeUrl();
  };
  readUrl();
  form.hidden = false;
  root.querySelector('[data-catalogue-actions]').hidden = false;
  render();
  form.addEventListener('submit', event => { event.preventDefault(); clearTimeout(debounce); limit = 24; render(); });
  query.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => { limit = 24; render(); }, 120); });
  [...types, sort].forEach(select => select.addEventListener('change', () => { clearTimeout(debounce); limit = 24; render(); }));
  viewButtons.forEach(button => button.addEventListener('click', () => { view = button.dataset.catalogueView; render(); }));
  root.querySelectorAll('[data-catalogue-reset]').forEach(button => button.addEventListener('click', () => { clearTimeout(debounce); query.value = ''; types.forEach(input => { input.checked = false; }); sort.value = 'number'; limit = 24; render(); query.focus(); }));
  more.addEventListener('click', () => {
    const next = lastFirstBatch[0];
    limit += 24;
    render();
    next?.querySelector('h2 a')?.focus({ preventScroll: true });
  });
  addEventListener('popstate', () => { readUrl(); render(); });
  addEventListener('pageshow', event => { if (event.persisted) { readUrl(); render(); } });
}
