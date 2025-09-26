//@ts-check
import { Interval, getAllInversions } from '../lib/chord.js';
import { SVGuitarChord } from 'svguitar';

const selectorsContainer = /** @type {HTMLElement} */(document.getElementById('selectors'));
const form = /** @type {HTMLFormElement} */(document.getElementById('voicing-form'));
const results = /** @type {HTMLElement} */(document.getElementById('results'));
const message = /** @type {HTMLElement} */(document.getElementById('message'));
const resetBtn = /** @type {HTMLButtonElement} */(document.getElementById('reset-btn'));
const jsonOutput = /** @type {HTMLTextAreaElement} */(document.getElementById('json-output'));
const copyBtn = /** @type {HTMLButtonElement} */(document.getElementById('copy-json'));

if (!selectorsContainer || !form || !results || !message || !resetBtn || !jsonOutput || !copyBtn) {
  throw new Error('Required DOM elements not found');
}

// Build a list of Interval entries (name -> numeric value)
const intervalEntries = Object.entries(Interval).filter(([k]) => k === k.toUpperCase());

/** @type {HTMLSelectElement[]} */
const selects = [];
for (let i = 0; i < 6; i++) {
  const wrapper = document.createElement('label');
  wrapper.className = 'select-wrap';
  wrapper.innerHTML = `<span class="lbl">String ${i + 1}</span>`;
  const sel = document.createElement('select');
  sel.setAttribute('aria-label', `String ${i + 1} interval`);
  sel.innerHTML = `<option value="">(muted)</option>` + intervalEntries
    .map(([name, val]) => `<option value="${val}">${name} (${val})</option>`)
    .join('');
  wrapper.appendChild(sel);
  selectorsContainer.appendChild(wrapper);
  selects.push(sel);
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
  selects.forEach(s => { s.value = ''; });
  clearResults();
  setMessage('Form reset');
  selects[0].focus();
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
 */
function renderChord(chord, index) {
  const holder = document.createElement('div');
  holder.className = 'chord-block';
  const title = document.createElement('div');
  title.className = 'chord-title';
  title.textContent = index === 0 ? 'Original' : `Inversion ${index}`;
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
    .chord({
      fingers: chord,
      barres: []
    })
    .configure({
      frets,
    })
    .draw();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  clearResults();
  setMessage('');

  /** @type {(number|null)[]} */
  const voicing = selects.map(sel => sel.value === '' ? null : Number(sel.value));
  if (!voicing.some(v => v != null)) {
    setMessage('Select at least one interval.', 'error');
    return;
  }

  /** @type {Array<import('../lib/chord.js').Chord>} */
  const chords = [];
  let count = 0;
  for (const chord of getAllInversions(/** @type {any} */(voicing))) {
    chords.push(chord);
    renderChord(chord, count);
    count++;
  }
  if (count === 0) {
    setMessage('No chords produced (unexpected).', 'error');
    jsonOutput.value = '';
  } else {
    setMessage(`${count} chord${count > 1 ? 's' : ''} rendered.`);
    jsonOutput.value = JSON.stringify(chords, null, 2);
  }
});
