//@ts-check
// NEW LAYOUT: Main page displays saved individual chords gallery with inline previews.
// Click "Create New Chord" to open slide-out builder panel for interval/voicing selection.
import { Interval, VOICING, getStringSets, getAllInversions, notesToChord, Interval_labels } from '../lib/chord.js';
import { SVGuitarChord } from 'svguitar';
import { EditableSVGuitarChord, DOT_COLORS, fingeringToString, layoutChordStrings } from 'text-guitar-chart';

const intervalBox = /** @type {HTMLElement} */(document.getElementById('interval-box'));
const stringSetBox = /** @type {HTMLElement} */(document.getElementById('stringset-box'));
const voicingBox = /** @type {HTMLElement} */(document.getElementById('voicing-box'));
const form = /** @type {HTMLFormElement} */(document.getElementById('voicing-form'));
const results = /** @type {HTMLElement} */(document.getElementById('results'));
const message = /** @type {HTMLElement} */(document.getElementById('message'));
const stringsHint = /** @type {HTMLElement} */(document.getElementById('strings-hint'));

const intervalLabelOptionsBox = /** @type {HTMLElement} */(document.getElementById('interval-label-options'));

// New DOM references for gallery layout
const cartGallery = /** @type {HTMLElement|null} */(document.getElementById('cart-gallery'));
const cartItems = /** @type {HTMLElement|null} */(document.getElementById('cart-items'));
const cartCount = /** @type {HTMLElement|null} */(document.getElementById('cart-count'));
const cartEmptyBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('cart-empty'));
const cartDownloadAsciiBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('cart-download-ascii'));
const cartDownloadUnicodeBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('cart-download-unicode'));
const cartDownloadHtmlBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('cart-download-html'));
const cartDownloadJsonBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('cart-download-json'));

// Builder panel references
const builderPanel = /** @type {HTMLElement|null} */(document.getElementById('builder-panel'));
const openBuilderBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('open-builder'));
const closeBuilderBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('close-builder'));
const addEmptyChordBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('add-empty-chord'));

if (!intervalBox || !stringSetBox || !voicingBox || !form || !results || !message || !intervalLabelOptionsBox) {
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
 * value: { text?: string, color?: string }
 * @type {Map<number,{text?: string, color?: string}>}
 */
const userIntervalOptions = new Map();

/**
 * Normalize color values: non-black colors → BLACK, black → black, undefined/transparent → unchanged
 * @param {string|undefined} color
 * @returns {string|undefined}
 */
function normalizeColor(color) {
  if (!color || color === 'transparent') return color;
  const normalized = color.toLowerCase().trim();
  if (normalized === '#000000' || normalized === '#000' || normalized === 'black') {
    return DOT_COLORS.BLACK;
  }
  return DOT_COLORS.BLACK;
}

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
    if (opts.color) rec.c = opts.color;
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
        /** @type {{text?: string, color?: string}} */
        const rec = {};
        if ('t' in v) rec.text = typeof v.t === 'string' ? v.t : '';
        if (v.c && typeof v.c === 'string') rec.color = v.c;
        if (rec.text !== undefined || rec.color) userIntervalOptions.set(num, rec);
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

/**
 * @typedef {(x: number[]) => number[]} VoicingFn
 * @typedef {string} VoicingName
 * @typedef {Record<string, VoicingFn>} VoicingMap
 */

/**
 * Return allowed voicing names for a given number of intervals.
 * @param {number} count
 * @returns {VoicingName[]}
 */
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
    
    // Text input (only visible when BLACK is selected)
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 2;
    input.value = existing.text !== undefined ? existing.text : (base.fingerOptions?.text || '');
    input.setAttribute('aria-label', base.full + ' label');
    input.addEventListener('input', () => {
      const val = input.value;
      if (val.length > 2) input.value = val.slice(0, 2);
      const record = userIntervalOptions.get(interval) || {};
      // Preserve empty string to explicitly clear default label
      record.text = input.value;
      userIntervalOptions.set(interval, record);
      pushState();
      tryAutoGenerate();
    });
    
    // Color picker: Show checkbox for red color
    const colorContainer = document.createElement('div');
    colorContainer.className = 'color-presets';
    
    const currentColor = normalizeColor(existing.color || base.fingerOptions?.color);
    
    // Red checkbox
    const redLabel = document.createElement('label');
    redLabel.className = 'color-checkbox-label';
    const redCheckbox = document.createElement('input');
    redCheckbox.type = 'checkbox';
    redCheckbox.checked = currentColor === DOT_COLORS.RED;
    const redSpan = document.createElement('span');
    redSpan.textContent = 'red';
    redLabel.appendChild(redCheckbox);
    redLabel.appendChild(redSpan);
    
    // Update input visibility based on color selection
    const updateInputVisibility = () => {
      const isRed = redCheckbox.checked;
      input.style.display = isRed ? 'none' : '';
      if (isRed) {
        // Clear text when RED is selected
        input.value = '';
        const record = userIntervalOptions.get(interval) || {};
        record.text = '';
        userIntervalOptions.set(interval, record);
      }
    };
    
    redCheckbox.addEventListener('change', () => {
      const record = userIntervalOptions.get(interval) || {};
      if (redCheckbox.checked) {
        record.color = DOT_COLORS.RED;
      } else {
        record.color = DOT_COLORS.BLACK;
      }
      userIntervalOptions.set(interval, record);
      updateInputVisibility();
      pushState();
      tryAutoGenerate();
    });
    
    colorContainer.appendChild(redLabel);
    
    row.appendChild(nameSpan);
    row.appendChild(colorContainer);
    row.appendChild(input);
    intervalLabelOptionsBox.appendChild(row);
    
    // Set initial visibility
    updateInputVisibility();
  }
}


function clearResults() {
  results.innerHTML = '';
}



/**
 * @param {string} text
 * @param {string} [type]
 */
function setMessage(text, type = '') {
  message.textContent = text;
  message.className = 'message ' + type;
}



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
     * @returns {import('svguitar').FingerOptions}
     */
    const intervalToFingerOptions = (interval) => {
      if (interval === null) return {};
      const base = Interval_labels[interval].fingerOptions ?? {};
      const override = userIntervalOptions.get(interval) || {};
      return {
        className: base.className,
        text: override.text !== undefined ? override.text : base.text,
        color: override.color || normalizeColor(base.color),
      };
    };
    const chord = notesToChord(notesCopy, stringSetBits, intervalToFingerOptions);
    chordShapes.push(chord);
    renderChord(chord, count, voicingName);
    count++;
  }
  if (count === 0) {
    setMessage('No chords produced (unexpected).', 'error');
  } else {
    setMessage(`${count} chord${count > 1 ? 's' : ''} rendered.`);
    pushState();
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
  
  // Add per-chord save controls
  const saveControls = document.createElement('div');
  saveControls.className = 'chord-save-controls';
  
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'chord-save-btn';
  saveBtn.textContent = 'Save';
  saveBtn.setAttribute('aria-label', `Save chord ${index + 1}`);
  
  saveBtn.addEventListener('click', () => {
    const entries = loadCart();
    const frets = Math.max(3, ...chord.map(f => (typeof f[1] === 'number' ? f[1] : 0)));
    const newEntry = { 
      id: String(Date.now()) + Math.random().toString(36).slice(2), 
      fingers: chord,
      barres: [],
      frets,
      created: Date.now() 
    };
    entries.push(newEntry);
    saveCart(entries);
    updateCartCount();
    renderCartGallery();
    
    setMessage('Saved chord.');
    
    // Focus the newly added cart item
    setTimeout(() => {
      const newItem = cartItems?.querySelector(`[data-entry-id="${newEntry.id}"]`);
      if (newItem instanceof HTMLElement) {
        newItem.focus();
        newItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
    }, 100);
  });
  
  saveControls.appendChild(saveBtn);
  holder.appendChild(saveControls);
  
  results.appendChild(holder);

    const frets = Math.max(3, ...chord.map(f => (typeof f[1] === 'number' ? f[1] : 0)));
    const config = { frets, noPosition: true, fingerSize: 0.75, fingerTextSize: 20 };
    
    // Render the SVG for the current results display
    new /** @type {any} */(SVGuitarChord)(svgContainer)
      .chord({ fingers: chord, barres: [] })
      .configure(config)
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
const CART_KEY = 'chordRendererCartV2';

/**
 * @typedef {import('svguitar').Finger} FingerPosition
 * @typedef {{ id:string, created:number, fingers:FingerPosition[], barres:any[], frets:number, config?:any, position?: number?, title?: string? }} CartEntry
 */

/** @returns {CartEntry[]} */
function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Return saved chords as-is; colors are already user-selected values
      return parsed.filter(e => e && e.fingers && Array.isArray(e.fingers));
    }
  } catch {}
  return [];
}

/** @param {CartEntry[]} entries */
function saveCart(entries) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(entries)); } catch {}
}

/**
 * Move a cart entry up or down.
 * @param {string} id
 * @param {number} delta - +1 to move down, -1 to move up.
 */
function moveCartEntry(id, delta) {
  const entries = loadCart();
  const idx = entries.findIndex(e => e.id === id);
  if (idx < 0) return;
  const newIdx = idx + delta;
  if (newIdx < 0 || newIdx >= entries.length) return;
  const [item] = entries.splice(idx, 1);
  entries.splice(newIdx, 0, item);
  saveCart(entries);
}

function updateCartCount() {
  const len = loadCart().length;
  if (cartCount) cartCount.textContent = String(len);
  refreshCartActionStates();
}

function renderCartGallery() {
  if (!cartItems) return;
  
  const entries = loadCart();
  
  if (entries.length === 0) {
    cartItems.innerHTML = `
      <div class="empty-state">
        <p>No individual chords saved yet.</p>
        <p>Click "Create New Chord" above to get started!</p>
      </div>
    `;
    return;
  }
  
  cartItems.innerHTML = '';
  
  entries.forEach((entry, index) => {
    const item = document.createElement('div');
    item.className = 'cart-item';
    item.tabIndex = -1;
    item.setAttribute('data-entry-id', entry.id);
    
    item.innerHTML = `
      <div class="cart-item-header">
        <div class="cart-item-actions">
          <button type="button" class="reorder-btn up-btn" ${index === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
          <button type="button" class="reorder-btn down-btn" ${index === entries.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
          <button type="button" class="delete-btn" aria-label="Delete chord">✕</button>
        </div>
      </div>
      <div class="cart-item-svg"></div>
    `;
    
    // Render the chord using EditableSVGuitarChord from stored data
    /** @type {HTMLElement | null} */
    const svgContainer = item.querySelector('.cart-item-svg');
    if (svgContainer) {
      const noPosition = entry.position === undefined || entry.position === null;
      const editableChord = new EditableSVGuitarChord(svgContainer, SVGuitarChord)
        .chord({ fingers: entry.fingers, barres: entry.barres, position: entry.position || undefined, title: entry.title || '' })
        .configure({ frets: entry.frets, noPosition, fingerSize: 0.75, fingerTextSize: 20 })

      // Initial draw
      Promise.resolve().then(() => editableChord.draw());
      
      // Add listener for when the chord is modified
      editableChord.onChange( () => {
        const updatedFingers = editableChord.chordConfig.fingers;
        // Update the cart entry with new finger positions
        const entries = loadCart();
        const entryIndex = entries.findIndex(e => e.id === entry.id);
        if (entryIndex !== -1) {
          entries[entryIndex].fingers = updatedFingers;
          // Update frets if needed
          const maxFret = Math.max(3, ...updatedFingers.map((f) => (typeof f[1] === 'number' ? f[1] : 0)));
          entries[entryIndex].frets = maxFret;
          entries[entryIndex].title = editableChord.chordConfig.title || '';
          entries[entryIndex].position = editableChord.chordConfig.position || undefined;
          saveCart(entries);
          updateCartCount();
        }
      });
    }
    
    // Add event listeners
    const upBtn = item.querySelector('.up-btn');
    const downBtn = item.querySelector('.down-btn');
    const deleteBtn = item.querySelector('.delete-btn');
    
    if (upBtn) {
      upBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moveCartEntry(entry.id, -1);
        renderCartGallery();
        updateCartCount();
        // Focus the moved item
        const movedItem = cartItems?.querySelector(`[data-entry-id="${entry.id}"]`);
        if (movedItem instanceof HTMLElement) movedItem.focus();
      });
    }
    
    if (downBtn) {
      downBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moveCartEntry(entry.id, 1);
        renderCartGallery();
        updateCartCount();
        // Focus the moved item
        const movedItem = cartItems?.querySelector(`[data-entry-id="${entry.id}"]`);
        if (movedItem instanceof HTMLElement) movedItem.focus();
      });
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Delete this chord?')) return;
        const newer = loadCart().filter(e => e.id !== entry.id);
        saveCart(newer);
        renderCartGallery();
        updateCartCount();
        // Focus the gallery container
        if (cartGallery instanceof HTMLElement) cartGallery.focus();
      });
    }
    
    cartItems.appendChild(item);
  });
}

/** @param {string} text */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Builder panel functionality
function openBuilder() {
  if (!builderPanel) return;
  builderPanel.classList.add('open');
  builderPanel.setAttribute('aria-hidden', 'false');
  
  // Focus the first focusable element in the panel
  const firstFocusable = builderPanel.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (firstFocusable instanceof HTMLElement) {
    firstFocusable.focus();
  }
}

function closeBuilder() {
  if (!builderPanel) return;
  builderPanel.classList.remove('open');
  builderPanel.setAttribute('aria-hidden', 'true');
  
  // Return focus to the open builder button
  if (openBuilderBtn) openBuilderBtn.focus();
}

// Event listeners for builder panel
if (openBuilderBtn) {
  openBuilderBtn.addEventListener('click', openBuilder);
}

if (closeBuilderBtn) {
  closeBuilderBtn.addEventListener('click', closeBuilder);
}

// Add empty chord button listener
if (addEmptyChordBtn) {
  addEmptyChordBtn.addEventListener('click', () => {
    const entries = loadCart();
    const newEntry = { 
      id: String(Date.now()) + Math.random().toString(36).slice(2), 
      fingers: [], // empty chord has no fingers
      barres: [],
      frets: 3, // minimum frets for empty chord
      created: Date.now() 
    };
    entries.push(newEntry);
    saveCart(entries);
    updateCartCount();
    renderCartGallery();
    
    setMessage('Added empty editable chord to gallery.');
    
    // Focus the newly added cart item
    setTimeout(() => {
      const newItem = cartItems?.querySelector(`[data-entry-id="${newEntry.id}"]`);
      if (newItem instanceof HTMLElement) {
        newItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        newItem.focus();
      }
    }, 100);
  });
}

// Escape key handler
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && builderPanel && builderPanel.classList.contains('open')) {
    closeBuilder();
  }
});

if (cartEmptyBtn) {
  cartEmptyBtn.addEventListener('click', () => {
    if (!confirm('Empty all saved chords?')) return;
    saveCart([]);
    updateCartCount();
    renderCartGallery();
  });
}

/**
 * 
 * @param {boolean} useUnicode 
 * @returns {() => void}
 */
function downloadCartAsText(useUnicode) {
  return () => {
    if (!cartItems) return;
    const entries = loadCart();
    if (entries.length === 0) return;
    const strings = entries.map((e) => fingeringToString(e, {useUnicode}));
    const columns = [1, 2, 3, 5, 6, 9].includes(strings.length) ? 3 : 4;
    const full = layoutChordStrings(strings, columns, 2);
    
    const blob = new Blob([full], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'saved-chords.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

if (cartDownloadAsciiBtn) {
  cartDownloadAsciiBtn.addEventListener('click', downloadCartAsText(false));
}

if (cartDownloadUnicodeBtn) {
  cartDownloadUnicodeBtn.addEventListener('click', downloadCartAsText(true));
}

// Build printable HTML document containing all cart entry SVGs
/**
 * @typedef {(s:string) => string} EscaperFn
 */

/**
 * Build printable HTML document containing SVG strings.
 * @param {string[]} svgStrings
 * @returns {string}
 */
function buildCartHtmlFromSvgs(svgStrings) {
  /** @type {EscaperFn} */
  const esc = (s) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]||c));
  /** @type {string} */
  const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ' UTC');
  /** @type {string} */
  let out = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />';
  out += '<title>Saved Chords Export</title><meta name="viewport" content="width=device-width,initial-scale=1" />';
  out += '<style>' +
    ':root{--border:#ccc;--text:#222;--bg:#fff;--accent:#2563eb;}body{font-family:system-ui,sans-serif;margin:1rem auto 2rem;max-width:960px;line-height:1.35;background:var(--bg);color:var(--text);}header{margin:0 0 1.25rem;border-bottom:2px solid var(--border);padding:0 0 .6rem;}h1{font-size:1.05rem;margin:.2rem 0 .1rem;letter-spacing:.5px;}.meta{font-size:.6rem;color:#555;margin:0;}.chords{display:flex;flex-direction:column;gap:1.2rem;}section.chord{padding:.75rem .9rem .9rem;page-break-inside:avoid;break-inside:avoid;}section.chord h2{font-size:.8rem;margin:0 0 .5rem;text-align:center;letter-spacing:.4px;}section.chord svg{display:block;margin:0 auto;max-width:100%;height:auto;}@media print{body{background:#fff;}section.chord{box-shadow:none;background:#fff;}}' +
    '</style></head><body>';
  out += `<header><p class="meta">Chord Export by Drop voicings visualizer: ${window.location.origin + window.location.pathname}</p></header>`;
  out += '<div class="chords">';
  for (const svg of svgStrings) {
    out += `<section class="chord">${svg}</section>`;
  }
  out += '</div></body></html>';
  return out;
}

if (cartDownloadJsonBtn) {
  cartDownloadJsonBtn.addEventListener('click', () => {
    const entries = loadCart();
    if (!entries.length) return;
    
    const jsonData = JSON.stringify(entries, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'saved-chords.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

if (cartDownloadHtmlBtn) {
  cartDownloadHtmlBtn.addEventListener('click', () => {
    if (!cartItems) return;
    const svgElements = cartItems.querySelectorAll('.cart-item-svg svg');
    if (!svgElements.length) return;
    const svgStrings = Array.from(svgElements).map(svg => svg.outerHTML);
    const html = buildCartHtmlFromSvgs(svgStrings);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'saved-chords.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

updateCartCount();

// ---- Cart action state helper ----
function refreshCartActionStates() {
  const len = loadCart().length;
  if (cartEmptyBtn) cartEmptyBtn.disabled = len === 0;
  if (cartDownloadAsciiBtn) cartDownloadAsciiBtn.disabled = len === 0;
  if (cartDownloadUnicodeBtn) cartDownloadUnicodeBtn.disabled = len === 0;
  if (cartDownloadHtmlBtn) cartDownloadHtmlBtn.disabled = len === 0;
  if (cartDownloadJsonBtn) cartDownloadJsonBtn.disabled = len === 0;
}

// Initialize gallery and actions
updateCartCount();
renderCartGallery();
refreshCartActionStates();
