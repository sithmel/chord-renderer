//@ts-check
import { EditableSVGuitarChord } from '../lib/editableSVGuitar.js';
import { SVGuitarChord } from 'svguitar';

/** @type {HTMLElement} */
const editor = /** @type {HTMLElement} */(document.getElementById('editor'));
/** @type {HTMLElement} */
const output = /** @type {HTMLElement} */(document.getElementById('output'));

if (!editor || !output) {
  throw new Error('Required DOM elements not found');
}

const editable = new EditableSVGuitarChord(editor, SVGuitarChord)
  .chord({ fingers: [], barres: [] })
  .configure({ frets: 5, noPosition: true })
  .draw();

/** Update JSON panel */
function updateJSON() {
  output.textContent = JSON.stringify(editable.getChord(), null, 2);
}

/**
 * Deep clone utility (structuredClone fallback)
 * @param {any} obj
 * @returns {any}
 */
function clone(obj) {
  return typeof structuredClone === 'function'
    ? structuredClone(obj)
    : JSON.parse(JSON.stringify(obj));
}

const SAMPLE = {
  C: {
    fingers: [
      [2, 1, { text: 'C', color: '#d62828' }],
      [4, 2, { text: 'E', color: '#047857' }],
      [5, 3, { text: 'C', color: '#d62828' }],
    ],
    barres: [],
  },
  G: {
    fingers: [
      [1, 3, { text: 'G', color: '#8d52c0' }],
      [5, 2, { text: 'B', color: '#4a52c9' }],
      [6, 3, { text: 'G', color: '#8d52c0' }],
    ],
    barres: [],
  },
};

/**
 * Load sample chord
 * @param {any} sample
 */
function loadSample(sample) {
  editable.chord(clone(sample));
  editable.redraw();
  updateJSON();
}

document.getElementById('sample-c')?.addEventListener('click', () => loadSample(SAMPLE.C));
document.getElementById('sample-g')?.addEventListener('click', () => loadSample(SAMPLE.G));
document.getElementById('clear')?.addEventListener('click', () => {
  editable.chord({ fingers: [], barres: [] }).redraw();
  updateJSON();
});
document.getElementById('refresh-json')?.addEventListener('click', updateJSON);
document.getElementById('export-json')?.addEventListener('click', () => {
  const blob = new Blob([output.textContent], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'editable-chord.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
});

// Initial panel fill
updateJSON();