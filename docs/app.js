//@ts-check
import { Interval, VOICING, getStringSets, getAllInversions, notesToChord, Interval_labels } from '../lib/chord.js';
import { SVGuitarChord } from 'svguitar';

const intervalBox = /** @type {HTMLElement} */(document.getElementById('interval-box'));
const stringSetBox = /** @type {HTMLElement} */(document.getElementById('stringset-box'));
const voicingBox = /** @type {HTMLElement} */(document.getElementById('voicing-box'));
const form = /** @type {HTMLFormElement} */(document.getElementById('voicing-form'));
const results = /** @type {HTMLElement} */(document.getElementById('results'));
const message = /** @type {HTMLElement} */(document.getElementById('message'));
const resetBtn = /** @type {HTMLButtonElement} */(document.getElementById('reset-btn'));
const jsonOutput = /** @type {HTMLTextAreaElement} */(document.getElementById('json-output'));
const copyBtn = /** @type {HTMLButtonElement} */(document.getElementById('copy-json'));
const generateBtn = /** @type {HTMLButtonElement} */(document.getElementById('generate-btn'));
const stringsHint = /** @type {HTMLElement} */(document.getElementById('strings-hint'));

const intervalLabelOptionsBox = /** @type {HTMLElement} */(document.getElementById('interval-label-options'));

if (!intervalBox || !stringSetBox || !voicingBox || !form || !results || !message || !resetBtn || !jsonOutput || !copyBtn || !generateBtn || !intervalLabelOptionsBox) {
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
      clearResults();
      if (input.checked) {
        if (selectedIntervals.size >= 6) {
          input.checked = false;
          setMessage('Max 6 intervals.', 'error');
          return;
        }
        selectedIntervals.add(Number(val));
      } else {
        selectedIntervals.delete(Number(val));
      }
updateStringSets();
renderIntervalLabelOptions();
      renderIntervalLabelOptions();
      setMessage('');
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

function renderVoicings() {
  voicingBox.innerHTML = '';
  Object.keys(VOICING).forEach((name, i) => {
    const id = `voi-${name}`;
    const label = document.createElement('label');
    label.className = 'radio-wrap';
    label.innerHTML = `<input type="radio" name="voicing" value="${name}" id="${id}" ${i===0?'checked':''}><span>${name.replace(/_/g,' ')}</span>`;
    voicingBox.appendChild(label);
  });
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
      clearResults();
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
      clearResults();
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
}

/**
 * @param {string} text
 * @param {string} [type]
 */
function setMessage(text, type = '') {
  message.textContent = text;
  message.className = 'message ' + type;
}

resetBtn.addEventListener('click', () => {
  selectedIntervals.clear();
  userIntervalOptions.clear();
  renderIntervals();
  updateStringSets();
  renderIntervalLabelOptions();
  clearResults();
  setMessage('Form reset');
});

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

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = chord.map(([string, fret]) => `S${string}:F${fret}`).join(' ');
  holder.appendChild(meta);

  const svgContainer = document.createElement('div');
  holder.appendChild(svgContainer);
  results.appendChild(holder);

  const frets = Math.max(3, ...chord.map(f => f[1]));

  new /** @type {any} */(SVGuitarChord)(svgContainer)
    .chord({ fingers: chord, barres: [] })
    .configure({ frets })
    .draw();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  clearResults();
  setMessage('');
  if (selectedIntervals.size === 0) {
    setMessage('Select at least one interval.', 'error');
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
  }
});

// Clear results anytime a voicing or string set radio changes (after initial population)
voicingBox.addEventListener('change', (e) => {
  if (/** @type {HTMLElement} */(e.target).tagName === 'INPUT') clearResults();
});
stringSetBox.addEventListener('change', (e) => {
  if (/** @type {HTMLElement} */(e.target).tagName === 'INPUT') clearResults();
});

// Initial render
renderIntervals();
renderVoicings();
updateStringSets();
renderIntervalLabelOptions();
