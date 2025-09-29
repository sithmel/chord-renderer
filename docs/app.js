//@ts-check
import { Interval, VOICING, getStringSets, getAllInversions, notesToChord, Interval_labels } from '../lib/chord.js';
import { SVGuitarChord } from 'svguitar';

const intervalBox = /** @type {HTMLElement} */(document.getElementById('interval-box'));
const stringSetBox = /** @type {HTMLElement} */(document.getElementById('stringset-box'));
const voicingBox = /** @type {HTMLElement} */(document.getElementById('voicing-box'));
const form = /** @type {HTMLFormElement} */(document.getElementById('voicing-form'));
const results = /** @type {HTMLElement} */(document.getElementById('results'));
const message = /** @type {HTMLElement} */(document.getElementById('message'));
const jsonOutput = /** @type {HTMLTextAreaElement} */(document.getElementById('json-output'));
const copyBtn = /** @type {HTMLButtonElement} */(document.getElementById('copy-json'));
const stringsHint = /** @type {HTMLElement} */(document.getElementById('strings-hint'));

const intervalLabelOptionsBox = /** @type {HTMLElement} */(document.getElementById('interval-label-options'));
const titleInput = /** @type {HTMLInputElement|null} */(document.getElementById('result-title'));
const addToCartBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('add-to-cart'));
const cartToggleBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('cart-toggle'));
const cartDropdown = /** @type {HTMLElement|null} */(document.getElementById('cart-dropdown'));
const cartList = /** @type {HTMLElement|null} */(document.getElementById('cart-list'));
const cartCount = /** @type {HTMLElement|null} */(document.getElementById('cart-count'));
const cartEmptyBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('cart-empty'));
const cartDownloadBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('cart-download'));
const cartPdfBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('cart-pdf'));

if (!intervalBox || !stringSetBox || !voicingBox || !form || !results || !message || !jsonOutput || !copyBtn || !intervalLabelOptionsBox) {
  throw new Error('Required DOM elements not found');
}

// Build list of Interval entries (constant uppercase keys only)
const intervalEntries = Object.entries(Interval).filter(([k]) => k === k.toUpperCase())
  .sort((a, b) => /** @type {number} */(a[1]) - /** @type {number} */(b[1]));

/** @type {Set<number>} */
const selectedIntervals = new Set();

/**
 * Store user overrides for interval display.
 * key: interval number
 * value: { text?: string, colored?: boolean }
 * @type {Map<number,{text?: string, colored?: boolean}>}
 */
const userIntervalOptions = new Map();

/**
 * Build current UI state for URL.
 */
function buildState() {
  const intervalsArray = Array.from(selectedIntervals).sort((a,b)=>a-b);
  const voicingInput = /** @type {HTMLInputElement|null} */(form.querySelector('input[name="voicing"]:checked'));
  const stringSetInput = /** @type {HTMLInputElement|null} */(form.querySelector('input[name="stringset"]:checked'));
  /** @type {Record<string, any>} */
  const o = {};
  for (const [interval, opts] of userIntervalOptions) {
    /** @type {Record<string, any>} */
    const rec = {};
    if (opts.text !== undefined) rec.t = opts.text; // explicit empty string allowed
    if (opts.colored) rec.c = 1;
    if (Object.keys(rec).length) o[String(interval)] = rec;
  }
  return {
    i: intervalsArray,
    v: voicingInput ? voicingInput.value : undefined,
    s: stringSetInput ? stringSetInput.value : undefined,
    o,
  };
}

/** Serialize and push state into query string (replaceState). */
function pushState() {
  try {
    const state = buildState();
    const hasData = (state.i && state.i.length) || state.v || state.s || Object.keys(state.o).length;
    const url = hasData
      ? `${location.pathname}?state=${encodeURIComponent(JSON.stringify(state))}`
      : location.pathname;
    history.replaceState(null, '', url);
  } catch {
    // ignore serialization errors
  }
}

/** Read state object from URL (if present). */
function readStateFromURL() {
  const params = new URLSearchParams(location.search);
  const raw = params.get('state');
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

/**
 * Apply a previously serialized state.
 * @param {any} state
 */
function applyState(state) {
  if (!state || typeof state !== 'object') return;
  /**
   * Serialized state read from URL.
   * @typedef {Object} SerializedState
   * @property {number[]} [i] - selected intervals
   * @property {string} [v] - voicing key
   * @property {string} [s] - stringset key
   * @property {Record<string,{t?:string,c?:number}>} [o] - overrides map
   */

  /** @type {SerializedState} */
  const s = /** @type {any} */ (state);

  /** @type {number[]} */
  const intervals = Array.isArray(s.i) ? s.i.filter(n => Number.isInteger(n)).map(Number) : [];
  selectedIntervals.clear();
  for (const n of intervals) {
    if (selectedIntervals.size >= 4) break; // enforce limit (now 4)
    selectedIntervals.add(Number(n));
  }
  userIntervalOptions.clear();
  if (state.o && typeof state.o === 'object') {
    for (const [k, v] of Object.entries(state.o)) {
      const num = Number(k);
      if (!Number.isInteger(num)) continue;
      if (v && typeof v === 'object') {
        /** @type {{text?: string, colored?: boolean}} */
        const rec = {};
        if ('t' in v) rec.text = typeof v.t === 'string' ? v.t : '';
        if (v.c === 1) rec.colored = true;
        if (rec.text !== undefined || rec.colored) userIntervalOptions.set(num, rec);
      }
    }
  }
  // Re-render dependent UI
  renderIntervals();
  updateStringSets();
  renderVoicings();
  renderIntervalLabelOptions();
  // Apply voicing
  if (state.v && typeof state.v === 'string') {
    const voicingInput = /** @type {HTMLInputElement|null} */(form.querySelector(`input[name="voicing"][value="${state.v}"]`));
    if (voicingInput) voicingInput.checked = true;
  }
  // Apply string set
  if (state.s && typeof state.s === 'string') {
    const stringSetInput = /** @type {HTMLInputElement|null} */(form.querySelector(`input[name="stringset"][value="${state.s}"]`));
    if (stringSetInput) stringSetInput.checked = true;
  }
  // After applying all, ensure label options reflect overrides
  renderIntervalLabelOptions();
}

function renderIntervals() {
  intervalBox.innerHTML = '';
  for (const [name, val] of intervalEntries) {
    const id = `int-${name}`;
    const label = document.createElement('label');
    label.className = 'check-wrap';
    label.innerHTML = `<input type="checkbox" value="${val}" id="${id}"><span>${Interval_labels[val].full}</span>`;
    const input = /** @type {HTMLInputElement} */(label.querySelector('input'));
    input.checked = selectedIntervals.has(Number(val));
    input.addEventListener('change', () => {
      if (input.checked) {
        if (selectedIntervals.size >= 4) {
          input.checked = false;
          setMessage('Max 4 intervals.', 'error');
          return;
        }
        selectedIntervals.add(Number(val));
      } else {
        selectedIntervals.delete(Number(val));
      }
      updateStringSets();
      renderVoicings();
      renderIntervalLabelOptions();
      pushState();
      tryAutoGenerate();
    });
    intervalBox.appendChild(label);
  }
}

function updateStringSets() {
  stringSetBox.innerHTML = '';
  const count = selectedIntervals.size;
  if (count === 0) {
    stringsHint.textContent = 'Select intervals first to see valid string sets.';
    return;
  }
  stringsHint.textContent = `${count} interval${count>1?'s':''} selected.`;
  let index = 0;
  for (const set of getStringSets(count)) {
    const id = `ss-${index}`;
    const label = document.createElement('label');
    label.className = 'radio-wrap';
    const visual = set.map(b => b ? '●' : '○').join('');
    label.innerHTML = `<input type="radio" name="stringset" value="${set.map(b=>b?1:0).join('')}" id="${id}"><span>${visual}</span>`;
    stringSetBox.appendChild(label);
    index++;
  }
  if (stringSetBox.firstElementChild) {
    /** @type {HTMLInputElement} */(stringSetBox.firstElementChild.querySelector('input')).checked = true;
  }
}

function getAllowedVoicingNames(count) {
  if (count === 2) return ['CLOSE'];
  if (count === 3) return ['CLOSE', 'DROP_2'];
  if (count >= 4) return Object.keys(VOICING);
  return []; // <2 notes
}

function renderVoicings() {
  const count = selectedIntervals.size;
  const previouslySelected = /** @type {HTMLInputElement|null} */(form.querySelector('input[name="voicing"]:checked'));
  const prevValue = previouslySelected ? previouslySelected.value : null;
  const allowed = getAllowedVoicingNames(count);
  voicingBox.innerHTML = '';
  allowed.forEach((name, i) => {
    const id = `voi-${name}`;
    const label = document.createElement('label');
    label.className = 'radio-wrap';
    const checkedAttr = (prevValue && prevValue === name) || (!prevValue && i === 0) ? 'checked' : '';
    label.innerHTML = `<input type="radio" name="voicing" value="${name}" id="${id}" ${checkedAttr}><span>${name.replace(/_/g,' ')}</span>`;
    voicingBox.appendChild(label);
  });
  // If previous selection invalid now, ensure none or first is selected
  if (allowed.length === 0) return; // nothing selectable yet
  const stillSelected = /** @type {HTMLInputElement|null} */(form.querySelector('input[name="voicing"]:checked'));
  if (!stillSelected) {
    /** @type {HTMLInputElement|null} */(form.querySelector('input[name="voicing"]'))?.setAttribute('checked','checked');
  }
}

function renderIntervalLabelOptions() {
  intervalLabelOptionsBox.innerHTML = '';
  if (selectedIntervals.size === 0) return;
  const sorted = Array.from(selectedIntervals).sort((a,b)=>a-b);
  for (const interval of sorted) {
    const base = Interval_labels[interval];
    const existing = userIntervalOptions.get(interval) || {};
    const row = document.createElement('div');
    row.className = 'interval-label-row';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'interval-name';
    nameSpan.textContent = base.full;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 3;
    input.value = existing.text !== undefined ? existing.text : (base.fingerOptions?.text || '');
    input.setAttribute('aria-label', base.full + ' label');
    input.addEventListener('input', () => {
      const val = input.value.trim();
      if (val.length > 3) input.value = val.slice(0,3);
      const record = userIntervalOptions.get(interval) || {};
      // Preserve empty string to explicitly clear default label
      record.text = input.value.trim();
      userIntervalOptions.set(interval, record);
      pushState();
      tryAutoGenerate();
    });
    const colorLabel = document.createElement('label');
    colorLabel.className = 'inline';
    const colorCheckbox = document.createElement('input');
    colorCheckbox.type = 'checkbox';
    colorCheckbox.checked = existing.colored ?? false; // default now false (no color)
    colorCheckbox.addEventListener('change', () => {
      const record = userIntervalOptions.get(interval) || {};
      record.colored = colorCheckbox.checked;
      userIntervalOptions.set(interval, record);
      pushState();
      tryAutoGenerate();
    });
    colorLabel.appendChild(colorCheckbox);
    const smallTxt = document.createElement('span');
    smallTxt.textContent = 'color';
    colorLabel.appendChild(smallTxt);
    row.appendChild(nameSpan);
    row.appendChild(input);
    row.appendChild(colorLabel);
    intervalLabelOptionsBox.appendChild(row);
  }
}

function clearResults() {
  results.innerHTML = '';
  jsonOutput.value = '';
  if (addToCartBtn) { addToCartBtn.disabled = true; }
}

/**
 * Build a combined SVG of all rendered chord diagrams.
 * Layout: 4 per row with spacing.
 * @returns {string|null}
 */
function buildCombinedSvg() {
  const chordSvgs = /** @type {NodeListOf<SVGSVGElement>} */(results.querySelectorAll('.chord-block svg'));
  if (!chordSvgs.length) return null;
  const PER_ROW = 4;
  const H_GAP = 24;
  const V_GAP = 24;
  /** @type {{w:number,h:number,el:SVGSVGElement}[]} */
  const items = [];
  let maxW = 0, maxH = 0;
  for (const el of chordSvgs) {
    let w = parseFloat(el.getAttribute('width') || '');
    let h = parseFloat(el.getAttribute('height') || '');
    const vb = el.getAttribute('viewBox');
    if ((!w || !h) && vb) {
      const p = vb.trim().split(/\s+/);
      if (p.length === 4) {
        const vw = parseFloat(p[2]);
        const vh = parseFloat(p[3]);
        if (!w) w = vw;
        if (!h) h = vh;
      }
    }
    if (!w) w = 120;
    if (!h) h = 140;
    if (w > maxW) maxW = w;
    if (h > maxH) maxH = h;
    items.push({ w, h, el });
  }
  const count = items.length;
  const rows = Math.ceil(count / PER_ROW);
  const cellW = maxW + H_GAP;
  const cellH = maxH + V_GAP;
  const totalW = Math.min(PER_ROW, count) * cellW - H_GAP;
  const totalH = rows * cellH - V_GAP;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`;
  out += `\n<!-- Combined ${count} chord diagram${count>1?'s':''}; ${PER_ROW} per row -->\n`;
  items.forEach((item, i) => {
    const col = i % PER_ROW;
    const row = Math.floor(i / PER_ROW);
    const x = col * cellW;
    const y = row * cellH;
    const src = item.el;
    const viewBox = src.getAttribute('viewBox') || `0 0 ${item.w} ${item.h}`;
    out += `<g transform="translate(${x},${y})"><svg viewBox="${viewBox}" width="${item.w}" height="${item.h}">${src.innerHTML}</svg></g>`;
  });
  out += '\n</svg>\n';
  return out;
}

/**
 * @param {string} text
 * @param {string} [type]
 */
function setMessage(text, type = '') {
  message.textContent = text;
  message.className = 'message ' + type;
}

copyBtn.addEventListener('click', async () => {
  if (!jsonOutput.value) return;
  try {
    await navigator.clipboard.writeText(jsonOutput.value);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 1200);
  } catch {
    jsonOutput.select();
    document.execCommand('copy');
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 1200);
  }
});

/**
 * Determine whether we have enough info to generate chords.
 */
function canGenerate() {
  if (selectedIntervals.size < 2) return false;
  const voicingInput = /** @type {HTMLInputElement|null} */(form.querySelector('input[name="voicing"]:checked'));
  if (!voicingInput) return false;
  const stringSetInput = /** @type {HTMLInputElement|null} */(form.querySelector('input[name="stringset"]:checked'));
  if (!stringSetInput) return false;
  return true;
}

/**
 * Perform chord generation.
 */
function generateChords() {
  clearResults();
  setMessage('');
  if (selectedIntervals.size < 2) {
    setMessage('Select at least two intervals.', 'error');
    return;
  }
  const voicingInput = /** @type {HTMLInputElement|null} */(form.querySelector('input[name="voicing"]:checked'));
  if (!voicingInput) {
    setMessage('Select a voicing.', 'error');
    return;
  }
  const voicingName = voicingInput.value;
  const voicingFn = /** @type {(x:number[])=>number[]} */(VOICING[voicingName]);
  const stringSetInput = /** @type {HTMLInputElement|null} */(form.querySelector('input[name="stringset"]:checked'));
  if (!stringSetInput) {
    setMessage('Select a string set.', 'error');
    return;
  }
  const stringSetBits = stringSetInput.value.split('').map(c => c === '1');
  const intervalsArray = Array.from(selectedIntervals).sort((a,b)=>a-b);

  /** @type {Array<import('../lib/chord.js').Chord>} */
  const chordShapes = [];
  let count = 0;
  for (const inversion of getAllInversions([...intervalsArray], voicingFn)) {
    // Prepare notes copy for note->chord consumption (it mutates via shift())
    const notesCopy = [...inversion];
    /**
     * Get finger options for a given interval.
     * @param {number|null} interval
     * @returns {import('../lib/chord.js').FingerOptions}
     */
    const intervalToFingerOptions = (interval) => {
      if (interval === null) return {};
      const base = Interval_labels[interval].fingerOptions ?? {};
      const override = userIntervalOptions.get(interval) || {};
      return {
        className: base.className,
        text: override.text !== undefined ? override.text : base.text,
        color: override.colored === true ? base.color : undefined,
      };
    };
    const chord = notesToChord(notesCopy, stringSetBits, intervalToFingerOptions);
    chordShapes.push(chord);
    renderChord(chord, count, voicingName);
    count++;
  }
  if (count === 0) {
    setMessage('No chords produced (unexpected).', 'error');
    jsonOutput.value = '';
  } else {
    setMessage(`${count} chord${count > 1 ? 's' : ''} rendered.`);
    jsonOutput.value = JSON.stringify(chordShapes, null, 2);
    pushState();
    enableChordSelection();
  }
}

/**
 * Attempt generation if possible; otherwise show guidance or clear.
 */
function tryAutoGenerate() {
  if (canGenerate()) {
    generateChords();
  } else {
    clearResults();
    if (selectedIntervals.size > 0 && selectedIntervals.size < 2) {
      setMessage('Select at least two intervals.', 'error');
    } else if (selectedIntervals.size >= 2) {
      // Have enough intervals; maybe missing voicing or string set
      const voicingInput = /** @type {HTMLInputElement|null} */(form.querySelector('input[name="voicing"]:checked'));
      const stringSetInput = /** @type {HTMLInputElement|null} */(form.querySelector('input[name="stringset"]:checked'));
      if (!voicingInput) setMessage('Select a voicing.', 'error');
      else if (!stringSetInput) setMessage('Select a string set.', 'error');
      else setMessage('');
    } else {
      setMessage('');
    }
  }
}

/**
 * Render a chord using svguitar.
 * @param {import('../lib/chord.js').Chord} chord
 * @param {number} index
 * @param {string} voicingName
 */
function renderChord(chord, index, voicingName) {
  const holder = document.createElement('div');
  holder.className = 'chord-block';
  const title = document.createElement('div');
  title.className = 'chord-title';
  title.textContent = index === 0 ? `${voicingName} (root)` : `${voicingName} inv ${index}`;
  holder.appendChild(title);

  const svgContainer = document.createElement('div');
  holder.appendChild(svgContainer);
  results.appendChild(holder);

  const frets = Math.max(3, ...chord.map(f => f[1]));

  new /** @type {any} */(SVGuitarChord)(svgContainer)
    .chord({ fingers: chord, barres: [] })
    .configure({ frets, noPosition: true })
    .draw();
}

// Keep submit handler for manual triggers (backward compatibility / URL state load)
form.addEventListener('submit', (e) => {
  e.preventDefault();
  generateChords();
});

// Clear & auto generate on voicing or string set changes
voicingBox.addEventListener('change', (e) => {
  if (/** @type {HTMLElement} */(e.target).tagName === 'INPUT') {
    pushState();
    tryAutoGenerate();
  }
});
stringSetBox.addEventListener('change', (e) => {
  if (/** @type {HTMLElement} */(e.target).tagName === 'INPUT') {
    pushState();
    tryAutoGenerate();
  }
});

// Initial render
renderIntervals();
renderVoicings();
updateStringSets();
renderIntervalLabelOptions();
// Apply state from URL if present
const initialState = readStateFromURL();
if (initialState) {
  applyState(initialState);
  // Ensure URL normalized (in case of trimming invalid data)
  pushState();
  // Auto-generate chords if state is complete
  tryAutoGenerate();
}

// ---- Cart + selection logic ----

/** @type {string} */
const CART_KEY = 'chordRendererCartV1';

/**
 * @typedef {{ id:string, title:string, svg:string, created:number }} CartEntry
 */

/** @returns {CartEntry[]} */
function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(e => e && typeof e.svg === 'string');
  } catch {}
  return [];
}

/** @param {CartEntry[]} entries */
function saveCart(entries) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(entries)); } catch {}
}

function updateCartCount() {
  const len = loadCart().length;
  if (cartCount) cartCount.textContent = String(len);
  if (cartToggleBtn) {
    cartToggleBtn.setAttribute('aria-label', `Cart (${len} item${len !== 1 ? 's' : ''})`);
    if (len === 0) {
      cartToggleBtn.setAttribute('aria-disabled', 'true');
      cartToggleBtn.disabled = true; // prevent opening when empty
    } else {
      cartToggleBtn.removeAttribute('aria-disabled');
      cartToggleBtn.disabled = false;
    }
  }
  // Also keep action buttons in sync if helper present
  if (typeof refreshCartActionStates === 'function') {
    try { refreshCartActionStates(); } catch {}
  }
}

function renderCartList() {
  if (!cartList) return;
  cartList.innerHTML = '';
  const entries = loadCart();
  for (const entry of entries) {
    const li = document.createElement('li');
    const titleSpan = document.createElement('span');
    titleSpan.textContent = entry.title || 'Untitled';
    li.appendChild(titleSpan);
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => {
      const newer = loadCart().filter(e => e.id !== entry.id);
      saveCart(newer);
      updateCartCount();
      renderCartList();
    });
    li.appendChild(delBtn);
    cartList.appendChild(li);
  }
}

function toggleCart(open) {
  if (!cartDropdown || !cartToggleBtn) return;
  const empty = loadCart().length === 0;
  const shouldOpen = open !== undefined ? open : cartDropdown.hasAttribute('hidden');
  if (shouldOpen && empty) {
    // Do not open when empty; provide subtle feedback
    cartToggleBtn.setAttribute('aria-expanded', 'false');
    return;
  }
  if (shouldOpen) {
    cartDropdown.removeAttribute('hidden');
    cartToggleBtn.setAttribute('aria-expanded', 'true');
    renderCartList();
    const firstAction = cartDropdown.querySelector('button, [href], input, [tabindex]');
    if (firstAction instanceof HTMLElement) firstAction.focus();
  } else {
    cartDropdown.setAttribute('hidden', '');
    cartToggleBtn.setAttribute('aria-expanded', 'false');
  }
}

if (cartToggleBtn) {
  cartToggleBtn.addEventListener('click', () => toggleCart());
  document.addEventListener('click', (e) => {
    if (!cartDropdown || !cartToggleBtn) return;
    if (cartDropdown.hasAttribute('hidden')) return;
    const t = e.target;
    if (!(t instanceof Node)) return;
    if (!cartDropdown.contains(t) && !cartToggleBtn.contains(t)) {
      toggleCart(false);
    }
  });
}

if (cartEmptyBtn) {
  cartEmptyBtn.addEventListener('click', () => {
    if (!confirm('Empty cart?')) return;
    saveCart([]);
    updateCartCount();
    renderCartList();
  });
}

if (cartDownloadBtn) {
  cartDownloadBtn.addEventListener('click', () => {
    const entries = loadCart();
    if (!entries.length) return;
    const full = combineCartEntries(entries);
    const blob = new Blob([full], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chord-groups.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

/**
 * Enable chord selection checkboxes and Add to cart button.
 */
function enableChordSelection() {
  const blocks = /** @type {NodeListOf<HTMLElement>} */(results.querySelectorAll('.chord-block'));
  let first = true;
  blocks.forEach((b, i) => {
    let sel = b.querySelector('.chord-select');
    if (!sel) {
      const wrap = document.createElement('label');
      wrap.className = 'chord-select';
      wrap.innerHTML = `<input type="checkbox" checked aria-label="Select chord ${i+1}" />`;
      b.appendChild(wrap);
    }
  });
  refreshAddToCartState();
}

function getSelectedChordSvgs() {
  const out = [];
  const blocks = /** @type {NodeListOf<HTMLElement>} */(results.querySelectorAll('.chord-block'));
  blocks.forEach((b) => {
    const cb = /** @type {HTMLInputElement|null} */(b.querySelector('.chord-select input'));
    if (cb && cb.checked) {
      const svg = b.querySelector('svg');
      if (svg) out.push(svg);
    }
  });
  return out;
}

function refreshAddToCartState() {
  if (!addToCartBtn) return;
  const svgs = getSelectedChordSvgs();
  addToCartBtn.disabled = svgs.length === 0;
}

results.addEventListener('change', (e) => {
  const t = /** @type {HTMLElement} */(e.target);
  if (t && t.matches('.chord-select input')) refreshAddToCartState();
});

if (addToCartBtn) {
  addToCartBtn.addEventListener('click', () => {
    const selected = getSelectedChordSvgs();
    if (!selected.length) return;
    const title = titleInput ? titleInput.value.trim() || 'Chord Group' : 'Chord Group';
    const svg = buildPartialGroupSvg(selected, title);
    const entries = loadCart();
    entries.push({ id: String(Date.now()) + Math.random().toString(36).slice(2), title, svg, created: Date.now() });
    saveCart(entries);
    updateCartCount();
    setMessage('Added group to cart.');
    if (cartDropdown && !cartDropdown.hasAttribute('hidden')) renderCartList();
  });
}

updateCartCount();

/**
 * Build an SVG for selected chord svgs (with title) 4 per row.
 * @param {SVGSVGElement[]} svgs
 * @param {string} title
 */
function buildPartialGroupSvg(svgs, title) {
  const PER_ROW = 4;
  const H_GAP = 24; const V_GAP = 24;
  /** @type {{w:number,h:number,inner:string}[]} */
  const items = [];
  let maxW = 0, maxH = 0;
  for (const el of svgs) {
    let w = parseFloat(el.getAttribute('width') || '');
    let h = parseFloat(el.getAttribute('height') || '');
    const vb = el.getAttribute('viewBox');
    if ((!w || !h) && vb) {
      const p = vb.trim().split(/\s+/);
      if (p.length === 4) {
        const vw = parseFloat(p[2]);
        const vh = parseFloat(p[3]);
        if (!w) w = vw; if (!h) h = vh;
      }
    }
    if (!w) w = 120; if (!h) h = 140;
    if (w > maxW) maxW = w; if (h > maxH) maxH = h;
    items.push({ w, h, inner: el.innerHTML });
  }
  const count = items.length;
  const rows = Math.ceil(count / PER_ROW);
  const cellW = maxW + H_GAP; const cellH = maxH + V_GAP;
  const totalW = Math.min(PER_ROW, count) * cellW - H_GAP;
  const titleH = 40; // extra space for title text
  const totalH = rows * cellH - V_GAP + titleH;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`;
  out += `\n<text x="50%" y="20" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" font-weight="600">${escapeSvgText(title)}</text>`;
  items.forEach((item, i) => {
    const col = i % PER_ROW; const row = Math.floor(i / PER_ROW);
    const x = col * cellW; const y = row * cellH + titleH;
    out += `<g transform="translate(${x},${y})"><svg viewBox="0 0 ${item.w} ${item.h}" width="${item.w}" height="${item.h}">${item.inner}</svg></g>`;
  });
  out += '\n</svg>'; return out;
}

/** @param {string} t */
function escapeSvgText(t) { return t.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]||c)); }

/**
 * Combine multiple cart entry svgs vertically.
 * @param {CartEntry[]} entries
 */
function combineCartEntries(entries) {
  // First parse widths & heights
  const parts = entries.map(e => ({ svg: e.svg, w: extractSvgDimension(e.svg, 'width'), h: extractSvgDimension(e.svg, 'height') }));
  const totalW = Math.max(...parts.map(p => p.w));
  let y = 0; let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" viewBox="0 0 ${totalW} ${parts.reduce((a,p)=>a+p.h,0)}">`;
  parts.forEach(p => {
    out += `\n<g transform="translate(0,${y})">${stripOuterSvg(p.svg)}</g>`; y += p.h;
  });
  out += '\n</svg>';
  return out;
}

function extractSvgDimension(svg, attr) {
  const m = svg.match(new RegExp(attr+"=\"(\\d+(?:\\.\\d+)?)\""));
  if (m) return parseFloat(m[1]);
  const vb = svg.match(/viewBox=\"[^\"]+\"/);
  if (vb) {
    const nums = vb[0].match(/[-\d.]+/g);
    if (nums && nums.length === 4) {
      return attr === 'width' ? parseFloat(nums[2]) : parseFloat(nums[3]);
    }
  }
  return 0;
}

function stripOuterSvg(svg) {
  const inner = svg.replace(/^<svg[^>]*>/i, '').replace(/<\/svg>\s*$/i, '');
  return inner;
}

// Title input default fallback
if (titleInput) {
  if (!titleInput.value) titleInput.value = 'Chord Group';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && cartDropdown && !cartDropdown.hasAttribute('hidden')) {
    toggleCart(false);
    cartToggleBtn?.focus();
  }
});

// ---- PDF Export ----

let exportingPdf = false;

/** Enable/disable cart action buttons based on items */
function refreshCartActionStates() {
  const len = loadCart().length;
  if (cartEmptyBtn) cartEmptyBtn.disabled = len === 0;
  if (cartDownloadBtn) cartDownloadBtn.disabled = len === 0;
  if (cartPdfBtn) cartPdfBtn.disabled = len === 0;
}

// Ensure initial state reflects available cart actions
refreshCartActionStates();

/**
 * Export cart entries to paginated PDF (A4 portrait, 2x2 grid per page).
 * Uses global window.jspdf.jsPDF and window.svg2pdf (loaded via CDN).
 */
async function exportCartToPdf() {
  if (exportingPdf) return;
  exportingPdf = true;
  try {
    const entries = loadCart();
    if (!entries.length) return;

    const w = /** @type {any} */(window);
    if (!w.jspdf) {
      setMessage('PDF libs not loaded.', 'error');
      return;
    }
    // Resolve svg2pdf function across possible global shapes
    let raw = w.svg2pdf;
    /** @type {any} */
    let svg2pdfFn = typeof raw === 'function' ? raw
      : raw && typeof raw.svg2pdf === 'function' ? raw.svg2pdf
      : raw && typeof raw.default === 'function' ? raw.default
      : null;
    if (!svg2pdfFn) {
      setMessage('svg2pdf not available.', 'error');
      return;
    }

    setMessage('Building PDF…');
    /** @type {any} */
    const { jsPDF } = w.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const COLS = 2;
    const ROWS = 2;
    const PER_PAGE = COLS * ROWS;
    const padding = 32;
    const cellW = (pageW - padding * 2) / COLS;
    const cellH = (pageH - padding * 2) / ROWS;
    const titleSpace = 20;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const tmp = document.createElement('div');
      tmp.innerHTML = entry.svg.trim();
      const svgEl = tmp.querySelector('svg');
      if (!(svgEl instanceof SVGSVGElement)) continue;

      // Flatten nested <svg> nodes into <g> to avoid nested roots issues
      const nested = Array.from(svgEl.querySelectorAll('svg'));
      for (const inner of nested) {
        if (inner === svgEl) continue;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const transform = inner.getAttribute('transform');
        if (transform) g.setAttribute('transform', transform);
        const cls = inner.getAttribute('class');
        if (cls) g.setAttribute('class', cls);
        while (inner.firstChild) g.appendChild(inner.firstChild);
        inner.replaceWith(g);
      }

      // Determine intrinsic size
      let origW = parseFloat(svgEl.getAttribute('width') || '');
      let origH = parseFloat(svgEl.getAttribute('height') || '');
      const vb = svgEl.getAttribute('viewBox');
      if ((!origW || !origH) && vb) {
        const parts = vb.trim().split(/\s+/);
        if (parts.length === 4) {
          if (!origW) origW = parseFloat(parts[2]);
          if (!origH) origH = parseFloat(parts[3]);
        }
      }
      if (!origW) origW = 400;
      if (!origH) origH = 300;

      // Inject title if not already present
      const hasTitle = Array.from(svgEl.querySelectorAll('text')).some(t => t.textContent === entry.title);
      if (!hasTitle) {
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', String(origW / 2));
        title.setAttribute('y', '16');
        title.setAttribute('text-anchor', 'middle');
        title.setAttribute('font-size', '14');
        title.setAttribute('font-family', 'system-ui, sans-serif');
        title.setAttribute('font-weight', '600');
        title.textContent = entry.title;
        svgEl.insertBefore(title, svgEl.firstChild);
        origH += titleSpace;
      }

      svgEl.setAttribute('viewBox', `0 0 ${origW} ${origH}`);
      svgEl.removeAttribute('width');
      svgEl.removeAttribute('height');

      const col = (i % PER_PAGE) % COLS;
      const row = Math.floor((i % PER_PAGE) / COLS);
      const x = padding + col * cellW;
      const y = padding + row * cellH;

      const targetW = cellW - 8; // small inner padding
      const targetH = cellH - 8;

      try {
        await svg2pdfFn(svgEl, doc, { x, y, width: targetW, height: targetH });
      } catch (err) {
        console.error(err);
        setMessage('Error rendering some SVG to PDF', 'error');
      }

      const isLastOnPage = ((i % PER_PAGE) === PER_PAGE - 1) && (i !== entries.length - 1);
      if (isLastOnPage) doc.addPage();
    }

    try {
      doc.save('chord-groups.pdf');
      setMessage('PDF exported.');
    } catch (err) {
      console.error(err);
      setMessage('PDF export failed.', 'error');
    }
  } finally {
    exportingPdf = false;
  }
}

if (cartPdfBtn) {
  cartPdfBtn.addEventListener('click', () => {
    exportCartToPdf();
  });
}
