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
const chordTitleInput = /** @type {HTMLInputElement} */(document.getElementById('chord-title-input'));

// New DOM references for gallery layout
const cartGallery = /** @type {HTMLElement|null} */(document.getElementById('cart-gallery'));
const cartItems = /** @type {HTMLElement|null} */(document.getElementById('cart-items'));
const cartCount = /** @type {HTMLElement|null} */(document.getElementById('cart-count'));
const cartEmptyBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('cart-empty'));
const cartDownloadHtmlBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('cart-download-html'));

// Show as menu references
const showAsBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('show-as-btn'));
const showAsMenu = /** @type {HTMLElement|null} */(document.getElementById('show-as-menu'));

// Export overlay references
const exportOverlay = /** @type {HTMLElement|null} */(document.getElementById('export-overlay'));
const exportOverlayText = /** @type {HTMLElement|null} */(document.getElementById('export-overlay-text'));
const exportOverlayClose = /** @type {HTMLButtonElement|null} */(document.getElementById('export-overlay-close'));
const exportOverlayCopy = /** @type {HTMLButtonElement|null} */(document.getElementById('export-overlay-copy'));

// Title modal references
const titleModal = /** @type {HTMLElement|null} */(document.getElementById('title-modal'));
const titleModalClose = /** @type {HTMLButtonElement|null} */(document.getElementById('title-modal-close'));
const titleModalCancel = /** @type {HTMLButtonElement|null} */(document.getElementById('title-modal-cancel'));
const titleModalExport = /** @type {HTMLButtonElement|null} */(document.getElementById('title-modal-export'));
const htmlTitleInput = /** @type {HTMLInputElement|null} */(document.getElementById('html-title-input'));
const charCount = /** @type {HTMLElement|null} */(document.getElementById('char-count'));

// Builder panel references
const builderPanel = /** @type {HTMLElement|null} */(document.getElementById('builder-panel'));
const openBuilderBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('open-builder'));
const closeBuilderBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('close-builder'));
const addEmptyChordBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('add-empty-chord'));

if (!intervalBox || !stringSetBox || !voicingBox || !form || !results || !message || !intervalLabelOptionsBox || !chordTitleInput) {
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

/** Custom chord title (empty string is valid; reset to voicingName when voicing changes) */
let customChordTitle = '';

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
    t: customChordTitle || undefined,
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
  // Apply chord title
  if (state.t && typeof state.t === 'string') {
    customChordTitle = state.t;
    chordTitleInput.value = state.t;
  } else {
    customChordTitle = '';
    chordTitleInput.value = '';
  }
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
    input.maxLength = 1;
    input.value = existing.text !== undefined ? existing.text : '';
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
        text: override.text !== undefined ? override.text : '',
        color: override.color || normalizeColor(base.color),
      };
    };
    const chord = notesToChord(notesCopy, stringSetBits, intervalToFingerOptions);
    
    // Add muted string markers for inactive strings
    for (let i = 0; i < stringSetBits.length; i++) {
      if (!stringSetBits[i]) {
        const stringNumber = 6 - i; // Convert index to guitar string numbering
        // Only add if not already present (safety check)
        if (!chord.find(f => f[0] === stringNumber)) {
          chord.push([stringNumber, 'x']);
        }
      }
    }

    // Sort chord array by string number descending (6 to 1) for consistency
    chord.sort((a, b) => b[0] - a[0]);
    
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
      created: Date.now(),
      title: customChordTitle,
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
      .chord({ fingers: chord, barres: [], title: customChordTitle })
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
    // Reset chord title to new voicing name when voicing changes
    const voicingInput = /** @type {HTMLInputElement} */(e.target);
    customChordTitle = voicingInput.value;
    chordTitleInput.value = voicingInput.value;
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

// Update customChordTitle when user edits the chord name input
chordTitleInput.addEventListener('input', () => {
  customChordTitle = chordTitleInput.value;
  pushState();
  tryAutoGenerate();
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

// ---- Export overlay functions ----

/**
 * Show the export overlay with given content
 * @param {string} content 
 */
function showExportOverlay(content) {
  if (!exportOverlay || !exportOverlayText) return;
  exportOverlayText.textContent = content;
  exportOverlay.hidden = false;
  exportOverlay.setAttribute('aria-hidden', 'false');
  // Reset copy button state
  if (exportOverlayCopy) {
    exportOverlayCopy.textContent = 'Copy to Clipboard';
    exportOverlayCopy.classList.remove('copied');
  }
}

/**
 * Close the export overlay
 */
function closeExportOverlay() {
  if (!exportOverlay) return;
  exportOverlay.hidden = true;
  exportOverlay.setAttribute('aria-hidden', 'true');
}

/**
 * Show the title input modal
 */
function showTitleModal() {
  if (!titleModal || !htmlTitleInput) return;
  titleModal.hidden = false;
  titleModal.setAttribute('aria-hidden', 'false');
  htmlTitleInput.value = '';
  if (charCount) charCount.textContent = '50';
  htmlTitleInput.focus();
}

/**
 * Close the title input modal
 */
function closeTitleModal() {
  if (!titleModal) return;
  titleModal.hidden = true;
  titleModal.setAttribute('aria-hidden', 'true');
  if (cartDownloadHtmlBtn) cartDownloadHtmlBtn.focus();
}

/**
 * Slugify a title for use in filename
 * @param {string} title
 * @returns {string}
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_') || 'saved-chords';
}

/**
 * Truncate title with ellipsis if needed
 * @param {string} title
 * @param {number} maxLength
 * @returns {string}
 */
function truncateTitle(title, maxLength) {
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength) + '...';
}

/**
 * Copy overlay content to clipboard
 */
async function copyExportToClipboard() {
  if (!exportOverlayText || !exportOverlayCopy) return;
  const content = exportOverlayText.textContent || '';
  try {
    await navigator.clipboard.writeText(content);
    exportOverlayCopy.textContent = 'Copied!';
    exportOverlayCopy.classList.add('copied');
    setTimeout(() => {
      if (exportOverlayCopy) {
        exportOverlayCopy.textContent = 'Copy to Clipboard';
        exportOverlayCopy.classList.remove('copied');
      }
    }, 2000);
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    alert('Failed to copy to clipboard. Please select and copy manually.');
  }
}

// Export overlay event listeners
if (exportOverlayClose) {
  exportOverlayClose.addEventListener('click', closeExportOverlay);
}

if (exportOverlayCopy) {
  exportOverlayCopy.addEventListener('click', copyExportToClipboard);
}

// Close overlay on backdrop click
if (exportOverlay) {
  exportOverlay.addEventListener('click', (e) => {
    if (e.target === exportOverlay) {
      closeExportOverlay();
    }
  });
}

// Close overlay on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && exportOverlay && !exportOverlay.hidden) {
    closeExportOverlay();
  }
});

/**
 * 
 * @param {boolean} useUnicode 
 * @returns {() => void}
 */
function exportCartAsText(useUnicode) {
  return () => {
    if (!cartItems) return;
    const entries = loadCart();
    if (entries.length === 0) return;
    const strings = entries.map((e) => fingeringToString(cartEntryToChord(e), {useUnicode}));
    const columns = [1, 2, 3, 5, 6, 9].includes(strings.length) ? 3 : 4;
    const full = layoutChordStrings(strings, columns, 2);
    showExportOverlay(full);
  }
}

/**
 * Export cart as JSON
 */
function exportCartAsJson() {
  const entries = loadCart();
  if (!entries.length) return;
  const jsonData = JSON.stringify(entries, null, 2);
  showExportOverlay(jsonData);
}

// Show as menu handlers
if (showAsBtn && showAsMenu) {
  // Toggle menu on button click
  showAsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = showAsBtn.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      closeShowAsMenu();
    } else {
      openShowAsMenu();
    }
  });

  // Handle menu item clicks
  const menuItems = showAsMenu.querySelectorAll('[role="menuitem"]');
  menuItems.forEach((item) => {
    item.addEventListener('click', () => {
      const format = item.getAttribute('data-format');
      closeShowAsMenu();
      
      if (format === 'ascii') {
        exportCartAsText(false)();
      } else if (format === 'unicode') {
        exportCartAsText(true)();
      } else if (format === 'json') {
        exportCartAsJson();
      }
    });
  });

  // Keyboard navigation
  showAsMenu.addEventListener('keydown', (e) => {
    const items = Array.from(showAsMenu.querySelectorAll('[role="menuitem"]'));
    const currentIndex = items.indexOf(/** @type {HTMLElement} */(document.activeElement));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      /** @type {HTMLElement} */(items[nextIndex]).focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      /** @type {HTMLElement} */(items[prevIndex]).focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeShowAsMenu();
      if (showAsBtn) showAsBtn.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      /** @type {HTMLElement} */(document.activeElement)?.click();
    }
  });

  // Close menu on outside click
  document.addEventListener('click', (e) => {
    if (showAsMenu && !showAsMenu.hidden && showAsBtn) {
      const target = /** @type {Node} */(e.target);
      if (!showAsMenu.contains(target) && !showAsBtn.contains(target)) {
        closeShowAsMenu();
      }
    }
  });
}

/**
 * Open the Show as menu
 */
function openShowAsMenu() {
  if (!showAsBtn || !showAsMenu) return;
  showAsMenu.hidden = false;
  showAsBtn.setAttribute('aria-expanded', 'true');
  // Focus first menu item
  const firstItem = /** @type {HTMLElement|null} */(showAsMenu.querySelector('[role="menuitem"]'));
  if (firstItem) firstItem.focus();
}

/**
 * Close the Show as menu
 */
function closeShowAsMenu() {
  if (!showAsBtn || !showAsMenu) return;
  showAsMenu.hidden = true;
  showAsBtn.setAttribute('aria-expanded', 'false');
}

// Build printable HTML document containing all cart entry SVGs
/**
 * @typedef {(s:string) => string} EscaperFn
 */

/**
 * 
 * @param {CartEntry} cart
 * @returns {import('svguitar').Chord} 
 */
function cartEntryToChord(cart) {
  return {
    fingers: cart.fingers,
    barres: cart.barres,
    position: cart.position ?? undefined,
    title: cart.title ?? '',
  };
}

/**
 * @param {import('svguitar').Chord} fingering
 * @returns {Promise<string>} SVG string
 */
async function getSVGFromFingering(fingering) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const noPosition = fingering.position === undefined || fingering.position === null;
  const frets = Math.max(3, ...fingering.fingers.map(f => (typeof f[1] === 'number' ? f[1] : 0)));
  const svguitar = new SVGuitarChord(container)
    .chord({ fingers: fingering.fingers, barres: fingering.barres, position: fingering.position || undefined, title: fingering.title || '' })
    .configure({ frets, noPosition, fingerSize: 0.75, fingerTextSize: 20 });

  await Promise.resolve().then(() => svguitar.draw());
  const svg = container.querySelector('svg');

  const content =  svg ? svg.outerHTML : '';
  document.body.removeChild(container);
  return content;
}

/**
 * Build printable HTML document containing SVG strings.
 * @param {string[]} svgStrings
 * @param {string} [title] - Optional title for the document
 * @returns {string}
 */
function buildCartHtmlFromSvgs(svgStrings, title) {
  /** @type {string} */
  const displayTitle = title ? truncateTitle(title, 50) : 'Saved Chords Export';
  /** @type {string} */
  let out = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />';
  out += `<title>${displayTitle}</title><meta name="viewport" content="width=device-width,initial-scale=1" />`;
  out += '<style>' +
    ':root{--border:#ccc;--text:#222;--bg:#fff;--accent:#2563eb}body{font-family:system-ui,sans-serif;margin:1rem auto 2rem;max-width:960px;line-height:1.35;background:var(--bg);color:var(--text)}header{margin:0 0 1.25rem;border-bottom:2px solid var(--border);padding:0 0 .6rem}h1{margin:.2rem 0 .1rem;letter-spacing:.5px}.meta{font-size:.6rem;color:#555;margin:0}.chord-item svg{display:block;margin:0 auto;max-width:100%;height:auto}@media print{body{background:#fff}section.chord{box-shadow:none;background:#fff}}.chord-container{display:grid;grid-template-columns:repeat(4,1fr);max-width:100%;gap:20px;align-items:start;justify-content:center}.chord-item{margin:auto}.chord-container:has(.chord-item:nth-last-child(1)){grid-template-columns:repeat(1,1fr)}.chord-container:has(.chord-item:nth-last-child(2)){grid-template-columns:repeat(2,1fr)}.chord-container:has(.chord-item:nth-last-child(3)){grid-template-columns:repeat(3,1fr)}.chord-container:has(.chord-item:nth-last-child(4)){grid-template-columns:repeat(4,1fr)}.chord-container:has(.chord-item:nth-last-child(5)),.chord-container:has(.chord-item:nth-last-child(6)){grid-template-columns:repeat(3,1fr)}.chord-container:has(.chord-item:nth-last-child(7)),.chord-container:has(.chord-item:nth-last-child(8)){grid-template-columns:repeat(4,1fr)}.chord-container:has(.chord-item:nth-last-child(9)){grid-template-columns:repeat(3,1fr)}.chord-container:has(.chord-item:nth-last-child(10)){grid-template-columns:repeat(4,1fr)}.chord-container:has(.chord-item:nth-last-child(1))>.chord-item{width:33%}.chord-container:has(.chord-item:nth-last-child(2))>.chord-item{width:50%}.chord-container:has(.chord-item:nth-last-child(3))>.chord-item{width:100%};' +
    '</style></head><body>';
  out += `<header><h1>${displayTitle}</h1><p class="meta">Chord Export by Drop voicings visualizer: ${window.location.origin + window.location.pathname}</p></header>`;
  out += '<div class="chord-container">';
  for (const svg of svgStrings) {
    out += `<section class="chord-item">${svg}</section>`;
  }
  out += '</div></body></html>';
  return out;
}

if (cartDownloadHtmlBtn) {
  cartDownloadHtmlBtn.addEventListener('click', () => {
    const entries = loadCart();
    if (!entries.length) return;
    showTitleModal();
  });
}

// Title modal event handlers
if (htmlTitleInput && charCount) {
  htmlTitleInput.addEventListener('input', () => {
    const remaining = 50 - htmlTitleInput.value.length;
    charCount.textContent = String(remaining);
  });
}

if (titleModalClose) {
  titleModalClose.addEventListener('click', closeTitleModal);
}

if (titleModalCancel) {
  titleModalCancel.addEventListener('click', closeTitleModal);
}

if (titleModalExport && htmlTitleInput) {
  titleModalExport.addEventListener('click', async () => {
    const entries = loadCart();
    if (!entries.length) return;
    
    const title = htmlTitleInput.value.trim();
    const filename = slugify(title) + '.html';
    
    closeTitleModal();
    
    const svgStrings = await Promise.all(entries.map((c) => getSVGFromFingering(cartEntryToChord(c))));
    const html = buildCartHtmlFromSvgs(svgStrings, title);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// Focus trap for title modal
if (titleModal) {
  titleModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTitleModal();
      return;
    }
    
    if (e.key === 'Tab') {
      const focusableElements = titleModal.querySelectorAll(
        'button:not([disabled]), input:not([disabled])'
      );
      const firstElement = /** @type {HTMLElement} */(focusableElements[0]);
      const lastElement = /** @type {HTMLElement} */(focusableElements[focusableElements.length - 1]);
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  });
}

updateCartCount();

// ---- Cart action state helper ----
function refreshCartActionStates() {
  const len = loadCart().length;
  if (cartEmptyBtn) cartEmptyBtn.disabled = len === 0;
  if (cartDownloadHtmlBtn) cartDownloadHtmlBtn.disabled = len === 0;
  if (showAsBtn) showAsBtn.disabled = len === 0;
}

// Initialize gallery and actions
updateCartCount();
renderCartGallery();
refreshCartActionStates();
