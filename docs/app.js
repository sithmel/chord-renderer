//@ts-check
// NEW LAYOUT: Main page displays saved individual chords gallery with inline previews.
// Click "Create New Chord" to open slide-out builder panel for interval/voicing selection.
import { Interval, VOICING, getStringSets, getAllInversions, notesToChord, Interval_labels, EXTENDED_INTERVAL_LABELS } from '../lib/chord.js';
import { SVGuitarChord } from 'svguitar';
import { EditableSVGuitarChord, DOT_COLORS, fingeringToString, layoutChordStrings, splitStringInRectangles, stringToFingering } from 'text-guitar-chart';
import isChordDoable from '../lib/isChordDoable.js';

const intervalBox = /** @type {HTMLElement} */(document.getElementById('interval-box'));
const keyBox = /** @type {HTMLElement} */(document.getElementById('key-box'));
const stringSetBox = /** @type {HTMLElement} */(document.getElementById('stringset-box'));
const voicingBox = /** @type {HTMLElement} */(document.getElementById('voicing-box'));
const form = /** @type {HTMLFormElement} */(document.getElementById('voicing-form'));
const results = /** @type {HTMLElement} */(document.getElementById('results'));
const message = /** @type {HTMLElement} */(document.getElementById('message'));
const stringsHint = /** @type {HTMLElement} */(document.getElementById('strings-hint'));

const intervalLabelOptionsBox = /** @type {HTMLElement} */(document.getElementById('interval-label-options'));
const intervalPresetSelect = /** @type {HTMLSelectElement} */(document.getElementById('interval-preset'));
const filterDoableCheckbox = /** @type {HTMLInputElement} */(document.getElementById('filter-doable-checkbox'));
const lowIntervalBox = /** @type {HTMLElement} */(document.getElementById('low-interval-box'));
const highIntervalBox = /** @type {HTMLElement} */(document.getElementById('high-interval-box'));
const lowIntervalFilter = /** @type {HTMLElement} */(document.getElementById('low-interval-filter'));
const highIntervalFilter = /** @type {HTMLElement} */(document.getElementById('high-interval-filter'));

// New DOM references for gallery layout
const cartGallery = /** @type {HTMLElement|null} */(document.getElementById('cart-gallery'));
const cartItems = /** @type {HTMLElement|null} */(document.getElementById('cart-items'));
const cartCount = /** @type {HTMLElement|null} */(document.getElementById('cart-count'));
const cartEmptyBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('cart-empty'));
const cartDownloadHtmlBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('cart-download-html'));

// Show as menu references
const showAsBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('show-as-btn'));
const showAsMenu = /** @type {HTMLElement|null} */(document.getElementById('show-as-menu'));

// Import from menu references
const importFromBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('import-from-btn'));
const importFromMenu = /** @type {HTMLElement|null} */(document.getElementById('import-from-menu'));

// Export overlay references
const exportOverlay = /** @type {HTMLElement|null} */(document.getElementById('export-overlay'));
const exportOverlayText = /** @type {HTMLElement|null} */(document.getElementById('export-overlay-text'));
const exportOverlayClose = /** @type {HTMLButtonElement|null} */(document.getElementById('export-overlay-close'));
const exportOverlayCopy = /** @type {HTMLButtonElement|null} */(document.getElementById('export-overlay-copy'));
const exportColumnCount = /** @type {HTMLElement|null} */(document.getElementById('export-column-count'));
const exportColumnDecrement = /** @type {HTMLButtonElement|null} */(document.getElementById('export-column-decrement'));
const exportColumnIncrement = /** @type {HTMLButtonElement|null} */(document.getElementById('export-column-increment'));

// Title modal references
const titleModal = /** @type {HTMLElement|null} */(document.getElementById('title-modal'));
const titleModalClose = /** @type {HTMLButtonElement|null} */(document.getElementById('title-modal-close'));
const titleModalCancel = /** @type {HTMLButtonElement|null} */(document.getElementById('title-modal-cancel'));
const titleModalExport = /** @type {HTMLButtonElement|null} */(document.getElementById('title-modal-export'));
const htmlTitleInput = /** @type {HTMLInputElement|null} */(document.getElementById('html-title-input'));
const charCount = /** @type {HTMLElement|null} */(document.getElementById('char-count'));

// Import overlay references
const importOverlay = /** @type {HTMLElement|null} */(document.getElementById('import-overlay'));
const importOverlayClose = /** @type {HTMLButtonElement|null} */(document.getElementById('import-overlay-close'));
const importOverlayImport = /** @type {HTMLButtonElement|null} */(document.getElementById('import-overlay-import'));
const importTextarea = /** @type {HTMLTextAreaElement|null} */(document.getElementById('import-textarea'));
const importMessage = /** @type {HTMLElement|null} */(document.getElementById('import-message'));

// Builder panel references
const builderPanel = /** @type {HTMLElement|null} */(document.getElementById('builder-panel'));
const openBuilderBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('open-builder'));
const closeBuilderBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('close-builder'));
const addEmptyChordBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('add-empty-chord'));

if (!intervalBox || !keyBox || !stringSetBox || !voicingBox || !form || !results || !message || !intervalLabelOptionsBox || !intervalPresetSelect || !filterDoableCheckbox || !lowIntervalBox || !highIntervalBox || !lowIntervalFilter || !highIntervalFilter) {
  throw new Error('Required DOM elements not found');
}

// Interval presets for quick selection
/**
 * @typedef {Object} IntervalPreset
 * @property {string} name - Display name of the preset
 * @property {string[]} intervals - Array of interval constant names
 * @property {string} notation - Human-readable interval notation
 */

/**
 * @typedef {Object} SerializedIntervalOverride
 * @property {string} [t] - Text override for interval label
 * @property {string} [c] - Color override for interval dot
 */

/**
 * @typedef {Object} SerializedState
 * @property {Array<string|number>} [i] - Selected intervals (names or semitone values for backward compat)
 * @property {number} [k] - Selected key as semitone (0-11)
 * @property {string|string[]} [v] - Voicing key(s)
 * @property {string|string[]} [s] - String set key(s)
 * @property {Record<string, SerializedIntervalOverride>} [o] - Interval overrides map
 * @property {boolean} [f] - Filter doable checkbox state
 * @property {number[]} [l] - Low interval filter (allowed intervals for lowest pitch note)
 * @property {number[]} [h] - High interval filter (allowed intervals for highest pitch note)
 */

/** @type {IntervalPreset[]} */
const INTERVAL_PRESETS = [
  // Triads
  { name: 'Major triad', intervals: ['UNISON', 'MAJOR_THIRD', 'PERFECT_FIFTH'], notation: '1 3 5' },
  { name: 'Minor triad', intervals: ['UNISON', 'MINOR_THIRD', 'PERFECT_FIFTH'], notation: '1 ♭3 5' },
  { name: 'Diminished triad', intervals: ['UNISON', 'MINOR_THIRD', 'TRITONE'], notation: '1 ♭3 ♭5' },
  { name: 'Augmented triad', intervals: ['UNISON', 'MAJOR_THIRD', 'MINOR_SIXTH'], notation: '1 3 ♯5' },
  
  // Seventh chords
  { name: 'Major seventh', intervals: ['UNISON', 'MAJOR_THIRD', 'PERFECT_FIFTH', 'MAJOR_SEVENTH'], notation: '1 3 5 7' },
  { name: 'Minor seventh', intervals: ['UNISON', 'MINOR_THIRD', 'PERFECT_FIFTH', 'MINOR_SEVENTH'], notation: '1 ♭3 5 ♭7' },
  { name: 'Dominant seventh', intervals: ['UNISON', 'MAJOR_THIRD', 'PERFECT_FIFTH', 'MINOR_SEVENTH'], notation: '1 3 5 ♭7' },
  { name: 'Half-diminished seventh', intervals: ['UNISON', 'MINOR_THIRD', 'TRITONE', 'MINOR_SEVENTH'], notation: '1 ♭3 ♭5 ♭7' },
  { name: 'Diminished seventh', intervals: ['UNISON', 'MINOR_THIRD', 'TRITONE', 'MAJOR_SIXTH'], notation: '1 ♭3 ♭5 ♭♭7' },
  
  // Sixth chords
  { name: 'Major sixth', intervals: ['UNISON', 'MAJOR_THIRD', 'PERFECT_FIFTH', 'MAJOR_SIXTH'], notation: '1 3 5 6' },
  { name: 'Minor sixth', intervals: ['UNISON', 'MINOR_THIRD', 'PERFECT_FIFTH', 'MAJOR_SIXTH'], notation: '1 ♭3 5 6' },
  
  // Jazz/Extended chords
  { name: 'Major ninth', intervals: ['UNISON', 'MAJOR_THIRD', 'PERFECT_FIFTH', 'MAJOR_SEVENTH', 'NINTH'], notation: '1 3 5 7 9' },
  { name: 'Minor ninth', intervals: ['UNISON', 'MINOR_THIRD', 'PERFECT_FIFTH', 'MINOR_SEVENTH', 'NINTH'], notation: '1 ♭3 5 ♭7 9' },
  { name: 'Dominant ninth', intervals: ['UNISON', 'MAJOR_THIRD', 'PERFECT_FIFTH', 'MINOR_SEVENTH', 'NINTH'], notation: '1 3 5 ♭7 9' },
  { name: 'Dominant sharp ninth', intervals: ['UNISON', 'MAJOR_THIRD', 'PERFECT_FIFTH', 'MINOR_SEVENTH', 'SHARP_NINTH'], notation: '1 3 5 ♭7 ♯9' },
  { name: 'Dominant flat ninth', intervals: ['UNISON', 'MAJOR_THIRD', 'PERFECT_FIFTH', 'MINOR_SEVENTH', 'FLAT_NINTH'], notation: '1 3 5 ♭7 ♭9' },
  { name: 'Major eleventh', intervals: ['UNISON', 'MAJOR_THIRD', 'PERFECT_FIFTH', 'MAJOR_SEVENTH', 'ELEVENTH'], notation: '1 3 5 7 11' },
  { name: 'Dominant sharp eleventh', intervals: ['UNISON', 'MAJOR_THIRD', 'PERFECT_FIFTH', 'MINOR_SEVENTH', 'SHARP_ELEVENTH'], notation: '1 3 5 ♭7 ♯11' },
  { name: 'Major thirteenth', intervals: ['UNISON', 'MAJOR_THIRD', 'PERFECT_FIFTH', 'MAJOR_SEVENTH', 'THIRTEENTH'], notation: '1 3 5 7 13' },
  { name: 'Dominant thirteenth', intervals: ['UNISON', 'MAJOR_THIRD', 'PERFECT_FIFTH', 'MINOR_SEVENTH', 'THIRTEENTH'], notation: '1 3 5 ♭7 13' },
];

// Note names for key selection and display
// Using common enharmonic spellings (prefer sharps for most, flats for some keys)
const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Standard guitar tuning: E A D G B E (strings 6 to 1, semitones from C)
const STRING_OPEN_NOTES = [4, 9, 2, 7, 11, 4]; // E=4, A=9, D=2, G=7, B=11, E=4

// Keys available for selection (using common spellings)
/** @type {Array<{name: string, semitone: number}>} */
const AVAILABLE_KEYS = [
  { name: 'C', semitone: 0 },
  { name: 'C#/Db', semitone: 1 },
  { name: 'D', semitone: 2 },
  { name: 'D#/Eb', semitone: 3 },
  { name: 'E', semitone: 4 },
  { name: 'F', semitone: 5 },
  { name: 'F#/Gb', semitone: 6 },
  { name: 'G', semitone: 7 },
  { name: 'G#/Ab', semitone: 8 },
  { name: 'A', semitone: 9 },
  { name: 'A#/Bb', semitone: 10 },
  { name: 'B', semitone: 11 },
];

// Build list of Interval entries (constant uppercase keys only)
// Preserve insertion order - extended intervals come after basic ones
const intervalEntries = Object.entries(Interval).filter(([k]) => k === k.toUpperCase());

/** @type {Map<string, number>} - Maps interval name to semitone value */
const selectedIntervals = new Map();

/** @type {number | null} - Selected key as semitone value (0-11), null if no key selected */
let selectedKey = null;

/** @type {Set<string>} - Tracks selected voicing names */
const selectedVoicings = new Set();

/** @type {Set<string>} - Tracks selected string set values */
const selectedStringSets = new Set();

/**
 * Store user overrides for interval display.
 * key: interval number
 * value: { text?: string, color?: string }
 * @type {Map<number,{text?: string, color?: string}>}
 */
const userIntervalOptions = new Map();

/** @type {Set<number>} - Tracks allowed intervals for lowest pitch note */
const selectedLowIntervals = new Set();

/** @type {Set<number>} - Tracks allowed intervals for highest pitch note */
const selectedHighIntervals = new Set();

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
 * Convert semitone value to note name
 * @param {number} semitone - Semitone value (0-11, where 0 = C)
 * @param {boolean} preferSharps - If true, use sharps (C#), if false use flats (Db)
 * @returns {string}
 */
function semitoneToNoteName(semitone, preferSharps = true) {
  const normalized = ((semitone % 12) + 12) % 12; // Handle negative and >11 values
  return preferSharps ? NOTE_NAMES_SHARP[normalized] : NOTE_NAMES_FLAT[normalized];
}

/**
 * Get note name for a given interval relative to a key
 * @param {number} keySemitone - Key as semitone (0-11)
 * @param {number} intervalSemitone - Interval as semitone (0-11)
 * @returns {string}
 */
function getNoteForInterval(keySemitone, intervalSemitone) {
  const noteSemitone = (keySemitone + intervalSemitone) % 12;
  // Use sharps for keys with sharps (G, D, A, E, B, F#, C#)
  // Use flats for keys with flats (F, Bb, Eb, Ab, Db, Gb, Cb)
  const useFlats = [1, 3, 6, 8, 10].includes(keySemitone); // C#/Db, Eb, F#/Gb, Ab, Bb
  return semitoneToNoteName(noteSemitone, !useFlats);
}

/**
 * Get display name for an interval
 * @param {string} intervalName - Interval constant name (e.g., 'FLAT_NINTH')
 * @param {number} semitoneValue - Semitone value (0-11)
 * @returns {string}
 */
function getIntervalDisplayName(intervalName, semitoneValue) {
  return EXTENDED_INTERVAL_LABELS[intervalName]?.full || Interval_labels[semitoneValue]?.full || 'unknown';
}

/**
 * Get finger options for an interval
 * @param {string} intervalName - Interval constant name
 * @param {number} semitoneValue - Semitone value (0-11)
 * @returns {import('svguitar').FingerOptions}
 */
function getIntervalFingerOptions(intervalName, semitoneValue) {
  const extended = EXTENDED_INTERVAL_LABELS[intervalName];
  if (extended) return extended.fingerOptions;
  return Interval_labels[semitoneValue]?.fingerOptions || {};
}

/**
 * Set the lowest interval to red by default, clearing all other color overrides.
 * This is called whenever the interval selection changes.
 */
function setDefaultLowestIntervalColor() {
  // Clear all existing color overrides
  userIntervalOptions.clear();
  
  // If no intervals selected, nothing to do
  if (selectedIntervals.size === 0) return;
  
  // Get intervals in enum definition order (display order)
  const sortedEntries = intervalEntries.filter(([name, _]) => selectedIntervals.has(name));
  
  // Get the first (lowest) interval's semitone value
  if (sortedEntries.length > 0) {
    const [_, lowestSemitone] = sortedEntries[0];
    
    // Set it to red
    userIntervalOptions.set(lowestSemitone, { color: DOT_COLORS.RED, text: '' });
  }
}

/**
 * Build current UI state for URL.
 */
function buildState() {
  const intervalsArray = Array.from(selectedIntervals.keys()); // Store interval names
  const voicingsArray = Array.from(selectedVoicings);
  const stringSetsArray = Array.from(selectedStringSets);
  /** @type {Record<string, SerializedIntervalOverride>} */
  const o = {};
  for (const [interval, opts] of userIntervalOptions) {
    /** @type {SerializedIntervalOverride} */
    const rec = {};
    if (opts.text !== undefined) rec.t = opts.text; // explicit empty string allowed
    if (opts.color) rec.c = opts.color;
    if (Object.keys(rec).length) o[String(interval)] = rec;
  }
  
  // Only serialize filter arrays if they differ from "all selected" (default)
  const sortedEntries = intervalEntries.filter(([name, _]) => selectedIntervals.has(name));
  const allIntervalValues = sortedEntries.map(([_, val]) => val);
  
  const lowArray = Array.from(selectedLowIntervals).sort((a, b) => a - b);
  const highArray = Array.from(selectedHighIntervals).sort((a, b) => a - b);
  
  // Check if filters are in default state (all selected)
  const lowIsDefault = lowArray.length === allIntervalValues.length && 
                       lowArray.every(val => allIntervalValues.includes(val));
  const highIsDefault = highArray.length === allIntervalValues.length && 
                        highArray.every(val => allIntervalValues.includes(val));
  
  return {
    i: intervalsArray,
    k: selectedKey,
    v: voicingsArray.length > 0 ? voicingsArray : undefined,
    s: stringSetsArray.length > 0 ? stringSetsArray : undefined,
    o,
    f: filterDoableCheckbox.checked,
    l: lowIsDefault ? undefined : lowArray,
    h: highIsDefault ? undefined : highArray,
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
 * @param {unknown} state - Untrusted state from URL
 */
function applyState(state) {
  if (!state || typeof state !== 'object') return;
  
  // Type assertion after validation - state is object at this point
  /** @type {SerializedState} */
  const s = /** @type {SerializedState} */ (state);

  /** @type {Array<string|number>} */
  const intervals = Array.isArray(s.i) ? s.i : [];
  selectedIntervals.clear();
  for (const nameOrValue of intervals) {
    if (selectedIntervals.size >= 6) break; // enforce limit
    
    // Backward compatibility: if it's a number, convert to interval name
    if (typeof nameOrValue === 'number') {
      // Find first matching interval name for this semitone value (prefer basic intervals)
      const entry = intervalEntries.find(([_, val]) => val === nameOrValue);
      if (entry) selectedIntervals.set(entry[0], entry[1]);
    } else if (typeof nameOrValue === 'string') {
      // New format: interval name
      const entry = intervalEntries.find(([name, _]) => name === nameOrValue);
      if (entry) selectedIntervals.set(entry[0], entry[1]);
    }
  }
  userIntervalOptions.clear();
  if (s.o && typeof s.o === 'object') {
    for (const [k, v] of Object.entries(s.o)) {
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
  
  // Apply key selection
  if (typeof s.k === 'number' && s.k >= 0 && s.k <= 11) {
    selectedKey = s.k;
  } else {
    selectedKey = null;
  }
  renderKeys();
  
  updateStringSets();
  renderVoicings();
  renderIntervalLabelOptions();
  
  // Apply voicing(s) - backward compatibility for single string or new array format
  selectedVoicings.clear();
  if (s.v) {
    const voicings = Array.isArray(s.v) ? s.v : (s.v === 'ALL' ? [] : [s.v]);
    for (const voicing of voicings) {
      if (typeof voicing === 'string' && voicing !== 'ALL') {
        selectedVoicings.add(voicing);
      }
    }
  }
  
  // Apply string set(s) - backward compatibility for single string or new array format
  selectedStringSets.clear();
  if (s.s) {
    const stringSets = Array.isArray(s.s) ? s.s : (s.s === 'ALL' ? [] : [s.s]);
    for (const stringSet of stringSets) {
      if (typeof stringSet === 'string' && stringSet !== 'ALL') {
        selectedStringSets.add(stringSet);
      }
    }
  }
  
  // Re-render to reflect the restored selections
  updateStringSets();
  renderVoicings();
  
  // After applying all, ensure label options reflect overrides
  renderIntervalLabelOptions();
  // Apply filter checkbox (default to true if not specified)
  if (typeof s.f === 'boolean') {
    filterDoableCheckbox.checked = s.f;
  } else {
    filterDoableCheckbox.checked = true;
  }
  
  // Apply low interval filter
  selectedLowIntervals.clear();
  if (Array.isArray(s.l)) {
    for (const val of s.l) {
      if (typeof val === 'number') {
        selectedLowIntervals.add(val);
      }
    }
  }
  // If no filter state, defaults will be applied in render functions
  
  // Apply high interval filter
  selectedHighIntervals.clear();
  if (Array.isArray(s.h)) {
    for (const val of s.h) {
      if (typeof val === 'number') {
        selectedHighIntervals.add(val);
      }
    }
  }
  // If no filter state, defaults will be applied in render functions
  
  // Render the filter UI
  renderLowIntervalFilters();
  renderHighIntervalFilters();
}

function renderIntervals() {
  intervalBox.innerHTML = '';
  for (const [name, val] of intervalEntries) {
    const id = `int-${name}`;
    const label = document.createElement('label');
    label.className = 'check-wrap';
    const displayName = getIntervalDisplayName(name, val);
    label.innerHTML = `<input type="checkbox" value="${name}" id="${id}"><span>${displayName}</span>`;
    const input = /** @type {HTMLInputElement} */(label.querySelector('input'));
    input.checked = selectedIntervals.has(name);
    input.addEventListener('change', () => {
      if (input.checked) {
        if (selectedIntervals.size >= 6) {
          input.checked = false;
          setMessage('Max 6 intervals.', 'error');
          return;
        }
        selectedIntervals.set(name, val);
        setDefaultLowestIntervalColor();
      } else {
        selectedIntervals.delete(name);
        setDefaultLowestIntervalColor();
      }
      updateStringSets();
      renderVoicings();
      renderIntervalLabelOptions();
      renderLowIntervalFilters();
      renderHighIntervalFilters();
      pushState();
      tryAutoGenerate();
    });
    intervalBox.appendChild(label);
  }
}

/**
 * Render key selection buttons
 */
function renderKeys() {
  keyBox.innerHTML = '';
  
  // Add "None" button first
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'key-button' + (selectedKey === null ? ' active' : '');
  clearBtn.textContent = 'None';
  clearBtn.setAttribute('aria-label', 'Clear key selection');
  clearBtn.addEventListener('click', () => {
    selectedKey = null;
    renderKeys();
    renderIntervalLabelOptions();
    pushState();
    tryAutoGenerate();
  });
  keyBox.appendChild(clearBtn);
  
  // Add key buttons
  for (const key of AVAILABLE_KEYS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'key-button' + (selectedKey === key.semitone ? ' active' : '');
    btn.textContent = key.name;
    btn.setAttribute('aria-label', `Select key ${key.name}`);
    btn.addEventListener('click', () => {
      selectedKey = key.semitone;
      renderKeys();
      renderIntervalLabelOptions();
      pushState();
      tryAutoGenerate();
    });
    keyBox.appendChild(btn);
  }
}

/**
 * Render the preset dropdown options.
 */
function renderPresetDropdown() {
  // Clear existing options except the first (placeholder)
  while (intervalPresetSelect.options.length > 1) {
    intervalPresetSelect.remove(1);
  }
  
  // Add options for each preset
  INTERVAL_PRESETS.forEach((preset, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${preset.name} - ${preset.notation}`;
    intervalPresetSelect.appendChild(option);
  });
}

/**
 * Apply a preset to the interval selection.
 * @param {number} presetIndex - Index of the preset in INTERVAL_PRESETS
 */
function applyPreset(presetIndex) {
  if (presetIndex < 0 || presetIndex >= INTERVAL_PRESETS.length) {
    return;
  }
  
  const preset = INTERVAL_PRESETS[presetIndex];
  
  // Clear current state
  selectedIntervals.clear();
  userIntervalOptions.clear();
  
  // Apply preset intervals
  for (const intervalName of preset.intervals) {
    const entry = intervalEntries.find(([name, _]) => name === intervalName);
    if (entry) {
      selectedIntervals.set(entry[0], entry[1]);
    }
  }
  
  // Set default color for lowest interval
  setDefaultLowestIntervalColor();
  
  // Update all dependent UI
  renderIntervals();
  updateStringSets();
  renderVoicings();
  renderIntervalLabelOptions();
  renderLowIntervalFilters();
  renderHighIntervalFilters();
  pushState();
  tryAutoGenerate();
  
  // Reset dropdown to placeholder
  intervalPresetSelect.value = '';
}

function updateStringSets() {
  stringSetBox.innerHTML = '';
  const count = selectedIntervals.size;
  if (count === 0) {
    stringsHint.textContent = 'Select intervals first to see valid string sets.';
    selectedStringSets.clear();
    return;
  }
  stringsHint.textContent = `${count} interval${count>1?'s':''} selected.`;
  
  // Get all valid string sets for current interval count
  const allSets = Array.from(getStringSets(count));
  const allSetValues = allSets.map(set => set.map(b=>b?1:0).join(''));
  
  // Preserve previous selections if still valid, otherwise select all
  const previousSelections = Array.from(selectedStringSets);
  selectedStringSets.clear();
  
  if (previousSelections.length > 0) {
    // Keep only selections that are still valid
    for (const prevSet of previousSelections) {
      if (allSetValues.includes(prevSet)) {
        selectedStringSets.add(prevSet);
      }
    }
  }
  
  // If no valid selections remain, select all
  if (selectedStringSets.size === 0) {
    allSetValues.forEach(val => selectedStringSets.add(val));
  }
  
  // Add Select All/Deselect All toggle
  const toggleLink = document.createElement('a');
  toggleLink.href = '#';
  toggleLink.className = 'toggle-all-link';
  const allSelected = selectedStringSets.size === allSetValues.length;
  toggleLink.textContent = allSelected ? 'Deselect All' : 'Select All';
  toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    const currentlyAllSelected = selectedStringSets.size === allSetValues.length;
    if (currentlyAllSelected) {
      // Deselect all except first one
      selectedStringSets.clear();
      selectedStringSets.add(allSetValues[0]);
    } else {
      // Select all
      allSetValues.forEach(val => selectedStringSets.add(val));
    }
    updateStringSets(); // Re-render
    pushState();
    tryAutoGenerate();
  });
  stringSetBox.appendChild(toggleLink);
  
  let index = 0;
  for (const set of allSets) {
    const setValue = set.map(b=>b?1:0).join('');
    const id = `ss-${index}`;
    const label = document.createElement('label');
    label.className = 'check-wrap';
    const visual = set.map(b => b ? '●' : '○').join('');
    label.innerHTML = `<input type="checkbox" value="${setValue}" id="${id}"><span>${visual}</span>`;
    const input = /** @type {HTMLInputElement} */(label.querySelector('input'));
    input.checked = selectedStringSets.has(setValue);
    input.addEventListener('change', () => {
      if (input.checked) {
        selectedStringSets.add(setValue);
      } else {
        // Prevent unchecking the last checkbox
        if (selectedStringSets.size === 1) {
          input.checked = true;
          return;
        }
        selectedStringSets.delete(setValue);
      }
      // Update toggle link text
      const allSelected = selectedStringSets.size === allSetValues.length;
      toggleLink.textContent = allSelected ? 'Deselect All' : 'Select All';
      pushState();
      tryAutoGenerate();
    });
    stringSetBox.appendChild(label);
    index++;
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
  const allowed = getAllowedVoicingNames(count);
  voicingBox.innerHTML = '';
  
  if (allowed.length === 0) {
    selectedVoicings.clear();
    return; // nothing selectable yet
  }
  
  // Preserve previous selections if still valid, otherwise select all
  const previousSelections = Array.from(selectedVoicings);
  selectedVoicings.clear();
  
  if (previousSelections.length > 0) {
    // Keep only selections that are still allowed
    for (const prevVoicing of previousSelections) {
      if (allowed.includes(prevVoicing)) {
        selectedVoicings.add(prevVoicing);
      }
    }
  }
  
  // If no valid selections remain, select all
  if (selectedVoicings.size === 0) {
    allowed.forEach(name => selectedVoicings.add(name));
  }
  
  // Add Select All/Deselect All toggle
  const toggleLink = document.createElement('a');
  toggleLink.href = '#';
  toggleLink.className = 'toggle-all-link';
  const allSelected = selectedVoicings.size === allowed.length;
  toggleLink.textContent = allSelected ? 'Deselect All' : 'Select All';
  toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    const currentlyAllSelected = selectedVoicings.size === allowed.length;
    if (currentlyAllSelected) {
      // Deselect all except first one
      selectedVoicings.clear();
      selectedVoicings.add(allowed[0]);
    } else {
      // Select all
      allowed.forEach(name => selectedVoicings.add(name));
    }
    renderVoicings(); // Re-render
    pushState();
    tryAutoGenerate();
  });
  voicingBox.appendChild(toggleLink);
  
  allowed.forEach((name) => {
    const id = `voi-${name}`;
    const label = document.createElement('label');
    label.className = 'check-wrap';
    label.innerHTML = `<input type="checkbox" value="${name}" id="${id}"><span>${name.replace(/_/g,' ')}</span>`;
    const input = /** @type {HTMLInputElement} */(label.querySelector('input'));
    input.checked = selectedVoicings.has(name);
    input.addEventListener('change', () => {
      if (input.checked) {
        selectedVoicings.add(name);
      } else {
        // Prevent unchecking the last checkbox
        if (selectedVoicings.size === 1) {
          input.checked = true;
          return;
        }
        selectedVoicings.delete(name);
      }
      // Update toggle link text
      const allSelected = selectedVoicings.size === allowed.length;
      toggleLink.textContent = allSelected ? 'Deselect All' : 'Select All';
      pushState();
      tryAutoGenerate();
    });
    voicingBox.appendChild(label);
  });
}

function renderIntervalLabelOptions() {
  intervalLabelOptionsBox.innerHTML = '';
  if (selectedIntervals.size === 0) return;
  // Use intervalEntries order (enum definition order), not Map insertion order
  const sortedEntries = intervalEntries.filter(([name, _]) => selectedIntervals.has(name));
  for (const [intervalName, semitoneValue] of sortedEntries) {
    const baseLabel = getIntervalFingerOptions(intervalName, semitoneValue);
    const displayName = getIntervalDisplayName(intervalName, semitoneValue);
    const existing = userIntervalOptions.get(semitoneValue) || {};
    const row = document.createElement('div');
    row.className = 'interval-label-row';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'interval-name';
    // Display interval name only
    nameSpan.textContent = displayName;
    
    // Text input (only visible when BLACK is selected)
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 1;
    input.value = existing.text !== undefined ? existing.text : '';
    input.setAttribute('aria-label', displayName + ' label');
    input.addEventListener('input', () => {
      const val = input.value;
      if (val.length > 2) input.value = val.slice(0, 2);
      const record = userIntervalOptions.get(semitoneValue) || {};
      // Preserve empty string to explicitly clear default label
      record.text = input.value;
      userIntervalOptions.set(semitoneValue, record);
      pushState();
      tryAutoGenerate();
    });
    
    // Color picker: Show checkbox for red color
    const colorContainer = document.createElement('div');
    colorContainer.className = 'color-presets';
    const currentColor = existing.color;
    
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
        const record = userIntervalOptions.get(semitoneValue) || {};
        record.text = '';
        userIntervalOptions.set(semitoneValue, record);
      }
    };
    
    redCheckbox.addEventListener('change', () => {
      const record = userIntervalOptions.get(semitoneValue) || {};
      if (redCheckbox.checked) {
        record.color = DOT_COLORS.RED;
      } else {
        record.color = DOT_COLORS.BLACK;
      }
      userIntervalOptions.set(semitoneValue, record);
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

/**
 * Render checkboxes for low interval filter.
 * Shows which intervals can appear as the lowest pitch note.
 */
function renderLowIntervalFilters() {
  lowIntervalBox.innerHTML = '';
  
  if (selectedIntervals.size === 0) {
    lowIntervalFilter.style.display = 'none';
    return;
  }
  
  lowIntervalFilter.style.display = '';
  
  // Get selected intervals in display order
  const sortedEntries = intervalEntries.filter(([name, _]) => selectedIntervals.has(name));
  const allIntervalValues = sortedEntries.map(([_, val]) => val);
  
  // Initialize selected set if empty (default: all selected)
  if (selectedLowIntervals.size === 0) {
    allIntervalValues.forEach(val => selectedLowIntervals.add(val));
  }
  
  // Remove any intervals that are no longer selected
  for (const val of Array.from(selectedLowIntervals)) {
    if (!allIntervalValues.includes(val)) {
      selectedLowIntervals.delete(val);
    }
  }
  
  // Add Select All/Deselect All toggle
  const toggleLink = document.createElement('a');
  toggleLink.href = '#';
  toggleLink.className = 'toggle-all-link';
  const allSelected = selectedLowIntervals.size === allIntervalValues.length;
  toggleLink.textContent = allSelected ? 'Deselect All' : 'Select All';
  toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    const currentlyAllSelected = selectedLowIntervals.size === allIntervalValues.length;
    if (currentlyAllSelected) {
      // Deselect all except first one
      selectedLowIntervals.clear();
      selectedLowIntervals.add(allIntervalValues[0]);
    } else {
      // Select all
      allIntervalValues.forEach(val => selectedLowIntervals.add(val));
    }
    renderLowIntervalFilters();
    pushState();
    tryAutoGenerate();
  });
  lowIntervalBox.appendChild(toggleLink);
  
  // Render checkboxes
  for (const [intervalName, semitoneValue] of sortedEntries) {
    const id = `low-int-${intervalName}`;
    const label = document.createElement('label');
    label.className = 'check-wrap';
    const displayName = getIntervalDisplayName(intervalName, semitoneValue);
    label.innerHTML = `<input type="checkbox" value="${semitoneValue}" id="${id}"><span>${displayName}</span>`;
    const input = /** @type {HTMLInputElement} */(label.querySelector('input'));
    input.checked = selectedLowIntervals.has(semitoneValue);
    input.addEventListener('change', () => {
      if (input.checked) {
        selectedLowIntervals.add(semitoneValue);
      } else {
        // Prevent unchecking the last checkbox
        if (selectedLowIntervals.size === 1) {
          input.checked = true;
          return;
        }
        selectedLowIntervals.delete(semitoneValue);
      }
      // Update toggle link text
      const allSelected = selectedLowIntervals.size === allIntervalValues.length;
      toggleLink.textContent = allSelected ? 'Deselect All' : 'Select All';
      pushState();
      tryAutoGenerate();
    });
    lowIntervalBox.appendChild(label);
  }
}

/**
 * Render checkboxes for high interval filter.
 * Shows which intervals can appear as the highest pitch note.
 */
function renderHighIntervalFilters() {
  highIntervalBox.innerHTML = '';
  
  if (selectedIntervals.size === 0) {
    highIntervalFilter.style.display = 'none';
    return;
  }
  
  highIntervalFilter.style.display = '';
  
  // Get selected intervals in display order
  const sortedEntries = intervalEntries.filter(([name, _]) => selectedIntervals.has(name));
  const allIntervalValues = sortedEntries.map(([_, val]) => val);
  
  // Initialize selected set if empty (default: all selected)
  if (selectedHighIntervals.size === 0) {
    allIntervalValues.forEach(val => selectedHighIntervals.add(val));
  }
  
  // Remove any intervals that are no longer selected
  for (const val of Array.from(selectedHighIntervals)) {
    if (!allIntervalValues.includes(val)) {
      selectedHighIntervals.delete(val);
    }
  }
  
  // Add Select All/Deselect All toggle
  const toggleLink = document.createElement('a');
  toggleLink.href = '#';
  toggleLink.className = 'toggle-all-link';
  const allSelected = selectedHighIntervals.size === allIntervalValues.length;
  toggleLink.textContent = allSelected ? 'Deselect All' : 'Select All';
  toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    const currentlyAllSelected = selectedHighIntervals.size === allIntervalValues.length;
    if (currentlyAllSelected) {
      // Deselect all except first one
      selectedHighIntervals.clear();
      selectedHighIntervals.add(allIntervalValues[0]);
    } else {
      // Select all
      allIntervalValues.forEach(val => selectedHighIntervals.add(val));
    }
    renderHighIntervalFilters();
    pushState();
    tryAutoGenerate();
  });
  highIntervalBox.appendChild(toggleLink);
  
  // Render checkboxes
  for (const [intervalName, semitoneValue] of sortedEntries) {
    const id = `high-int-${intervalName}`;
    const label = document.createElement('label');
    label.className = 'check-wrap';
    const displayName = getIntervalDisplayName(intervalName, semitoneValue);
    label.innerHTML = `<input type="checkbox" value="${semitoneValue}" id="${id}"><span>${displayName}</span>`;
    const input = /** @type {HTMLInputElement} */(label.querySelector('input'));
    input.checked = selectedHighIntervals.has(semitoneValue);
    input.addEventListener('change', () => {
      if (input.checked) {
        selectedHighIntervals.add(semitoneValue);
      } else {
        // Prevent unchecking the last checkbox
        if (selectedHighIntervals.size === 1) {
          input.checked = true;
          return;
        }
        selectedHighIntervals.delete(semitoneValue);
      }
      // Update toggle link text
      const allSelected = selectedHighIntervals.size === allIntervalValues.length;
      toggleLink.textContent = allSelected ? 'Deselect All' : 'Select All';
      pushState();
      tryAutoGenerate();
    });
    highIntervalBox.appendChild(label);
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
  if (selectedVoicings.size === 0) return false;
  if (selectedStringSets.size === 0) return false;
  return true;
}

/**
 * Calculate the position parameter for a chord based on the selected key.
 * The position indicates where on the fretboard the chord diagram starts.
 * 
 * @param {import('../lib/chord.js').Chord} chord - The chord fingering
 * @param {number[]} inversion - The intervals in this inversion
 * @param {boolean[]} stringSetBits - Which strings are active
 * @param {number} keySemitone - The selected key as semitone (0-11)
 * @returns {number | undefined} - The position value, or undefined if cannot calculate
 */
function calculateChordPosition(chord, inversion, stringSetBits, keySemitone) {
  // Map string active status to intervals (matches notesToChord logic)
  const stringToInterval = [];
  let inversionIndex = 0;
  for (let i = 0; i < stringSetBits.length; i++) {
    if (stringSetBits[i]) {
      stringToInterval[i] = inversion[inversionIndex++];
    } else {
      stringToInterval[i] = null;
    }
  }
  
  // Find the finger that plays the root (interval = 0)
  let rootStringIndex = -1;
  for (let i = 0; i < stringToInterval.length; i++) {
    if (stringToInterval[i] === 0) {
      rootStringIndex = i;
      break;
    }
  }
  
  if (rootStringIndex === -1) return undefined;
  
  // Find the corresponding finger in the chord
  const stringNumber = 6 - rootStringIndex; // Convert index to string number
  const rootFinger = chord.find(f => f[0] === stringNumber);
  
  if (!rootFinger || rootFinger[1] === 'x') return undefined;
  
  const fret = rootFinger[1];
  if (typeof fret !== 'number') return undefined;
  
  // Get the open note for this string (in semitones from C)
  const openNote = STRING_OPEN_NOTES[rootStringIndex];
  
  // Calculate what note this finger produces at position 1
  // At position 1, fret numbers are as-is
  const noteAtPos1 = (openNote + fret) % 12;
  
  // Calculate offset needed to shift noteAtPos1 to keySemitone
  let offset = (keySemitone - noteAtPos1 + 12) % 12;
  
  return 1 + offset;
}

/**
 * Get the interval played on the lowest fretted string (by pitch).
 * String index 0 = lowest pitch (low E), index 5 = highest pitch (high E).
 * 
 * @param {number[]} inversion - The intervals in this inversion
 * @param {boolean[]} stringSetBits - Which strings are active
 * @returns {number | null} - The interval of the lowest fretted string, or null if none
 */
function getChordLowInterval(inversion, stringSetBits) {
  // Map string active status to intervals (matches notesToChord logic)
  const stringToInterval = [];
  let inversionIndex = 0;
  for (let i = 0; i < stringSetBits.length; i++) {
    if (stringSetBits[i]) {
      stringToInterval[i] = inversion[inversionIndex++];
    } else {
      stringToInterval[i] = null;
    }
  }
  
  // Find the first active string (lowest pitch)
  for (let i = 0; i < stringToInterval.length; i++) {
    if (stringToInterval[i] !== null) {
      return stringToInterval[i];
    }
  }
  
  return null;
}

/**
 * Get the interval played on the highest fretted string (by pitch).
 * String index 0 = lowest pitch (low E), index 5 = highest pitch (high E).
 * 
 * @param {number[]} inversion - The intervals in this inversion
 * @param {boolean[]} stringSetBits - Which strings are active
 * @returns {number | null} - The interval of the highest fretted string, or null if none
 */
function getChordHighInterval(inversion, stringSetBits) {
  // Map string active status to intervals (matches notesToChord logic)
  const stringToInterval = [];
  let inversionIndex = 0;
  for (let i = 0; i < stringSetBits.length; i++) {
    if (stringSetBits[i]) {
      stringToInterval[i] = inversion[inversionIndex++];
    } else {
      stringToInterval[i] = null;
    }
  }
  
  // Find the last active string (highest pitch)
  for (let i = stringToInterval.length - 1; i >= 0; i--) {
    if (stringToInterval[i] !== null) {
      return stringToInterval[i];
    }
  }
  
  return null;
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
  if (selectedVoicings.size === 0) {
    setMessage('Select at least one voicing.', 'error');
    return;
  }
  if (selectedStringSets.size === 0) {
    setMessage('Select at least one string set.', 'error');
    return;
  }
  
  // Extract semitone values in enum definition order (not selection order, not sorted by value)
  const intervalsArray = intervalEntries
    .filter(([name, _]) => selectedIntervals.has(name))
    .map(([_, value]) => value);
  
  // Create reverse mapping: semitone value -> interval name (for label lookup)
  // Use the same filtering to maintain correct interval name association
  const semitoneToIntervalName = new Map();
  for (const [name, value] of intervalEntries) {
    if (selectedIntervals.has(name)) {
      semitoneToIntervalName.set(value, name);
    }
  }
  
  // Use selected voicings
  const voicingNames = Array.from(selectedVoicings);
  
  // Use selected string sets
  const stringSets = Array.from(selectedStringSets).map(value => 
    value.split('').map(c => c === '1')
  );

  /** @type {{chord: import('../lib/chord.js').Chord, position: number | undefined, inversion: number[], stringSetBits: boolean[]}[]} */
  const chordShapes = [];
  
  // Nested loops to generate all combinations
  for (const voicingName of voicingNames) {
    const voicingFn = /** @type {(x:number[])=>number[]} */(VOICING[voicingName]);
    
    for (const stringSetBits of stringSets) {
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
          const intervalName = semitoneToIntervalName.get(interval);
          const base = intervalName 
            ? getIntervalFingerOptions(intervalName, interval)
            : (Interval_labels[interval]?.fingerOptions ?? {});
          const override = userIntervalOptions.get(interval) || {};
          return {
            className: base.className || '',
            text: override.text !== undefined ? override.text : (base.text || ''),
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
        
        // Calculate position if key is selected
        let position = undefined;
        if (selectedKey !== null) {
          position = calculateChordPosition(chord, inversion, stringSetBits, selectedKey);
        }
        chordShapes.push({ chord, position, inversion, stringSetBits });
      }
    }
  }
  
  // Apply interval filters (low/high pitch note filters)
  let shapesToRender = chordShapes;
  if (selectedLowIntervals.size > 0 || selectedHighIntervals.size > 0) {
    shapesToRender = chordShapes.filter(item => {
      // Check low interval filter
      if (selectedLowIntervals.size > 0) {
        const lowInterval = getChordLowInterval(item.inversion, item.stringSetBits);
        if (lowInterval !== null && !selectedLowIntervals.has(lowInterval)) {
          return false;
        }
      }
      
      // Check high interval filter
      if (selectedHighIntervals.size > 0) {
        const highInterval = getChordHighInterval(item.inversion, item.stringSetBits);
        if (highInterval !== null && !selectedHighIntervals.has(highInterval)) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  // Apply doable filter if checkbox is checked
  if (filterDoableCheckbox.checked) {
    shapesToRender = shapesToRender.filter(item => isChordDoable(item.chord));
  }
  
  // Render filtered chords
  let count = 0;
  for (const item of shapesToRender) {
    // Use first voicing name for label (could be improved to track actual voicing per chord)
    renderChord(item.chord, count, voicingNames[0] || '', item.position);
    count++;
  }
  
  if (count === 0) {
    if (chordShapes.length === 0) {
      setMessage('No chords produced (unexpected).', 'error');
    } else {
      setMessage('No doable chords found. Try unchecking the filter.', 'error');
    }
  } else {
    const totalCount = chordShapes.length;
    if (filterDoableCheckbox.checked && count < totalCount) {
      setMessage(`${count} chord${count > 1 ? 's' : ''} rendered (${count} doable out of ${totalCount} total).`);
    } else {
      setMessage(`${count} chord${count > 1 ? 's' : ''} rendered.`);
    }
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
      if (selectedVoicings.size === 0) setMessage('Select at least one voicing.', 'error');
      else if (selectedStringSets.size === 0) setMessage('Select at least one string set.', 'error');
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
 * @param {number | undefined} position
 */
function renderChord(chord, index, voicingName, position) {
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
      position,
      created: Date.now(),
      title: '',
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
    const noPosition = position === undefined || position === null;
    const config = { frets, noPosition, fingerSize: 0.75, fingerTextSize: 20 };
    
    // Render the SVG for the current results display
    new SVGuitarChord(svgContainer)
      .chord({ fingers: chord, barres: [], title: '', position })
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


// Preset dropdown change handler
intervalPresetSelect.addEventListener('change', () => {
  const presetIndex = parseInt(intervalPresetSelect.value, 10);
  if (!isNaN(presetIndex)) {
    applyPreset(presetIndex);
  }
});

// Filter checkbox change handler
filterDoableCheckbox.addEventListener('change', () => {
  pushState();
  tryAutoGenerate();
});

// Initial render
renderPresetDropdown();
renderIntervals();
renderKeys();
renderVoicings();
updateStringSets();
renderIntervalLabelOptions();
renderLowIntervalFilters();
renderHighIntervalFilters();
// Apply state from URL if present
const initialState = readStateFromURL();
if (initialState) {
  applyState(initialState);
  // Ensure URL normalized (in case of trimming invalid data)
  pushState();
  // Auto-generate chords if state is complete
  tryAutoGenerate();
} else {
  // No URL state, ensure default colors are applied if intervals exist
  setDefaultLowestIntervalColor();
  renderIntervalLabelOptions();
}

// ---- Cart + selection logic ----

/** @type {string} */
const CART_KEY = 'chordRendererCartV2';

/**
 * @typedef {import('svguitar').Finger} FingerPosition
 * @typedef {Object} CartEntry
 * @property {string} id - Unique identifier for the cart entry
 * @property {number} created - Timestamp when entry was created
 * @property {FingerPosition[]} fingers - Array of finger positions on the fretboard
 * @property {import('svguitar').Barre[]} barres - Array of barre chord definitions
 * @property {number} frets - Number of frets to display
 * @property {number} [position] - Optional fret position (starting fret)
 * @property {string} [title] - Optional chord title/name
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
  // Hide column controls for non-text exports (e.g., JSON)
  const columnControls = /** @type {HTMLElement|null} */(document.querySelector('.column-controls'));
  if (columnControls) columnControls.hidden = true;
}

/**
 * Close the export overlay
 */
function closeExportOverlay() {
  if (!exportOverlay) return;
  exportOverlay.hidden = true;
  exportOverlay.setAttribute('aria-hidden', 'true');
  // Hide format toggle when closing
  const formatToggle = /** @type {HTMLElement|null} */(document.getElementById('format-toggle'));
  if (formatToggle) formatToggle.hidden = true;
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
 * Show text export modal with column controls
 * @param {boolean} useUnicode 
 */
function showTextExport(useUnicode) {
  if (!cartItems || !exportOverlay || !exportOverlayText || !exportColumnCount || !exportColumnDecrement || !exportColumnIncrement) return;
  
  const entries = loadCart();
  if (entries.length === 0) return;
  
  // Track current format (default Unicode)
  let currentFormat = useUnicode;
  
  // Calculate default columns based on number of chords
  let currentColumns = [1, 2, 3, 5, 6, 9].includes(entries.length) ? 3 : 4;
  
  // Store references for use in closure
  const textElement = exportOverlayText;
  const countElement = exportColumnCount;
  let decrementBtn = exportColumnDecrement;
  let incrementBtn = exportColumnIncrement;
  
  // Get format toggle elements
  const formatToggle = /** @type {HTMLElement|null} */(document.getElementById('format-toggle'));
  const formatAsciiBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('format-ascii'));
  const formatUnicodeBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('format-unicode'));
  
  // Show format toggle for text exports
  if (formatToggle) formatToggle.hidden = false;
  
  // Show column controls for text exports
  const columnControls = /** @type {HTMLElement|null} */(document.querySelector('.column-controls'));
  if (columnControls) columnControls.hidden = false;
  
  // Function to regenerate and display the text with current settings
  function updateExport() {
    const strings = entries.map((e) => fingeringToString(cartEntryToChord(e), {useUnicode: currentFormat}));
    const full = layoutChordStrings(strings, currentColumns, 2);
    textElement.textContent = full;
    countElement.textContent = String(currentColumns);
    
    // Update button states
    decrementBtn.disabled = currentColumns <= 1;
    incrementBtn.disabled = currentColumns >= 12;
    
    // Update format button active states
    if (formatAsciiBtn && formatUnicodeBtn) {
      if (currentFormat) {
        formatAsciiBtn.classList.remove('active');
        formatUnicodeBtn.classList.add('active');
      } else {
        formatAsciiBtn.classList.add('active');
        formatUnicodeBtn.classList.remove('active');
      }
    }
  }
  
  // Initial display
  updateExport();
  exportOverlay.hidden = false;
  exportOverlay.setAttribute('aria-hidden', 'false');
  
  // Reset copy button state
  if (exportOverlayCopy) {
    exportOverlayCopy.textContent = 'Copy to Clipboard';
    exportOverlayCopy.classList.remove('copied');
  }
    
  if (formatAsciiBtn && formatUnicodeBtn) {  
    // Add format toggle listeners
    formatAsciiBtn.addEventListener('click', () => {
      currentFormat = false;
      updateExport();
    });
    
    formatUnicodeBtn.addEventListener('click', () => {
      currentFormat = true;
      updateExport();
    });
  }
  
  // Add event listeners for column controls
  decrementBtn.addEventListener('click', () => {
    if (currentColumns > 1) {
      currentColumns--;
      updateExport();
    }
  });
  
  incrementBtn.addEventListener('click', () => {
    if (currentColumns < 12) {
      currentColumns++;
      updateExport();
    }
  });
}

/**
 * 
 * @param {boolean} useUnicode 
 * @returns {() => void}
 */
function exportCartAsText(useUnicode) {
  return () => showTextExport(useUnicode);
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
      
      if (format === 'text') {
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

// Import from menu handlers
if (importFromBtn && importFromMenu) {
  // Toggle menu on button click
  importFromBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = importFromBtn.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      closeImportFromMenu();
    } else {
      openImportFromMenu();
    }
  });

  // Handle menu item clicks
  const menuItems = importFromMenu.querySelectorAll('[role="menuitem"]');
  menuItems.forEach((item) => {
    item.addEventListener('click', () => {
      const format = item.getAttribute('data-format');
      closeImportFromMenu();
      if (format === 'text' || format === 'json') {
        showImportOverlay(format);
      }
    });
  });

  // Keyboard navigation
  importFromMenu.addEventListener('keydown', (e) => {
    const items = Array.from(importFromMenu.querySelectorAll('[role="menuitem"]'));
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
      closeImportFromMenu();
      if (importFromBtn) importFromBtn.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      /** @type {HTMLElement} */(document.activeElement)?.click();
    }
  });

  // Close menu on outside click
  document.addEventListener('click', (e) => {
    if (importFromMenu && !importFromMenu.hidden && importFromBtn) {
      const target = /** @type {Node} */(e.target);
      if (!importFromMenu.contains(target) && !importFromBtn.contains(target)) {
        closeImportFromMenu();
      }
    }
  });
}

// Import overlay event handlers
if (importOverlayClose) {
  importOverlayClose.addEventListener('click', closeImportOverlay);
}

if (importOverlayImport && importOverlay) {
  importOverlayImport.addEventListener('click', () => {
    const format = importOverlay.getAttribute('data-import-format');
    if (format === 'json') {
      importFromJson();
    } else if (format === 'text') {
      importFromText();
    }
  });
}

// Import overlay keyboard handlers
if (importOverlay) {
  importOverlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeImportOverlay();
      return;
    }
  });

  // Close overlay on backdrop click
  const importBackdrop = importOverlay.querySelector('.import-overlay-backdrop');
  if (importBackdrop) {
    importBackdrop.addEventListener('click', closeImportOverlay);
  }
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

// ---- Import from menu functions ----

/**
 * Open the Import from menu
 */
function openImportFromMenu() {
  if (!importFromBtn || !importFromMenu) return;
  importFromMenu.hidden = false;
  importFromBtn.setAttribute('aria-expanded', 'true');
  const firstItem = /** @type {HTMLElement|null} */(importFromMenu.querySelector('[role="menuitem"]'));
  if (firstItem) firstItem.focus();
}

/**
 * Close the Import from menu
 */
function closeImportFromMenu() {
  if (!importFromBtn || !importFromMenu) return;
  importFromMenu.hidden = true;
  importFromBtn.setAttribute('aria-expanded', 'false');
}

/**
 * Show the import overlay with given format
 * @param {'text'|'json'} format
 */
function showImportOverlay(format) {
  if (!importOverlay || !importTextarea || !importMessage) return;
  importOverlay.setAttribute('data-import-format', format);
  importTextarea.value = '';
  importMessage.textContent = '';
  importMessage.className = 'import-message';
  if (format === 'json') {
    importTextarea.placeholder = 'Paste JSON array here...';
  } else {
    importTextarea.placeholder = 'Paste ASCII or Unicode chord charts here...';
  }
  importOverlay.hidden = false;
  importOverlay.setAttribute('aria-hidden', 'false');
  importTextarea.focus();
}

/**
 * Close the import overlay
 */
function closeImportOverlay() {
  if (!importOverlay) return;
  importOverlay.hidden = true;
  importOverlay.setAttribute('aria-hidden', 'true');
  if (importFromBtn) importFromBtn.focus();
}

/**
 * Import chords from JSON format
 */
function importFromJson() {
  if (!importTextarea || !importMessage) return;
  const text = importTextarea.value.trim();
  if (!text) {
    importMessage.textContent = 'Please paste JSON data to import.';
    importMessage.className = 'import-message error';
    return;
  }
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      importMessage.textContent = 'Invalid format: expected a JSON array.';
      importMessage.className = 'import-message error';
      return;
    }
    const entries = loadCart();
    let imported = 0;
    let skipped = 0;
    for (const item of parsed) {
      if (!item || typeof item !== 'object') {
        skipped++;
        continue;
      }
      if (!Array.isArray(item.fingers) || !Array.isArray(item.barres) || typeof item.frets !== 'number') {
        skipped++;
        continue;
      }
      const newEntry = {
        id: String(Date.now()) + Math.random().toString(36).slice(2),
        created: Date.now(),
        fingers: item.fingers,
        barres: item.barres || [],
        frets: item.frets,
        position: item.position,
        title: item.title || ''
      };
      entries.push(newEntry);
      imported++;
    }
    if (imported === 0) {
      importMessage.textContent = 'No valid chords found in JSON data.';
      importMessage.className = 'import-message error';
      return;
    }
    saveCart(entries);
    updateCartCount();
    renderCartGallery();
    const msg = skipped > 0
      ? `Imported ${imported} chord${imported > 1 ? 's' : ''} successfully (${skipped} invalid).`
      : `Imported ${imported} chord${imported > 1 ? 's' : ''} successfully.`;
    importMessage.textContent = msg;
    importMessage.className = 'import-message success';
    setTimeout(() => {
      closeImportOverlay();
    }, 1500);
  } catch (err) {
    importMessage.textContent = 'Invalid JSON format: ' + (err instanceof Error ? err.message : String(err));
    importMessage.className = 'import-message error';
  }
}

/**
 * Import chords from text format (ASCII/Unicode)
 */
function importFromText() {
  if (!importTextarea || !importMessage) return;
  const text = importTextarea.value.trimEnd();
  if (!text) {
    importMessage.textContent = 'Please paste text chord diagrams to import.';
    importMessage.className = 'import-message error';
    return;
  }
  try {
    const chordStrings = splitStringInRectangles(text);
    if (chordStrings.length === 0) {
      importMessage.textContent = 'No chord diagrams found in text.';
      importMessage.className = 'import-message error';
      return;
    }
    const entries = loadCart();
    let imported = 0;
    let skipped = 0;
    for (const chordStr of chordStrings) {
      const chord = stringToFingering(chordStr);
      if (!chord) {
        skipped++;
        continue;
      }
      const frets = Math.max(3, ...chord.fingers.map(f => (typeof f[1] === 'number' ? f[1] : 0)));
      const newEntry = {
        id: String(Date.now()) + Math.random().toString(36).slice(2),
        created: Date.now(),
        fingers: chord.fingers,
        barres: chord.barres || [],
        frets,
        position: chord.position,
        title: chord.title || ''
      };
      entries.push(newEntry);
      imported++;
    }
    if (imported === 0) {
      importMessage.textContent = 'No valid chords could be parsed from text.';
      importMessage.className = 'import-message error';
      return;
    }
    saveCart(entries);
    updateCartCount();
    renderCartGallery();
    const msg = skipped > 0
      ? `Imported ${imported} chord${imported > 1 ? 's' : ''} successfully (${skipped} invalid).`
      : `Imported ${imported} chord${imported > 1 ? 's' : ''} successfully.`;
    importMessage.textContent = msg;
    importMessage.className = 'import-message success';
    setTimeout(() => {
      closeImportOverlay();
    }, 1500);
  } catch (err) {
    importMessage.textContent = 'Error parsing text: ' + (err instanceof Error ? err.message : String(err));
    importMessage.className = 'import-message error';
  }
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
