//@ts-check

/**
 * @enum {number}
 */
export const Interval = {
    UNISON: 0,
    MINOR_SECOND: 1,
    MAJOR_SECOND: 2,
    MINOR_THIRD: 3,
    MAJOR_THIRD: 4,
    PERFECT_FOURTH: 5,
    TRITONE: 6,
    PERFECT_FIFTH: 7,
    MINOR_SIXTH: 8,
    MAJOR_SIXTH: 9,
    MINOR_SEVENTH: 10,
    MAJOR_SEVENTH: 11
};

export const Interval_labels = [
  {full: 'root', fingerOptions: {className: 'root', color: '#d62828', text: 'R'}},
  // Seconds (blue hues)
  {full: 'minor second', fingerOptions: {className: 'minor-second', color: '#696FC7', text: 'b2'}},
  {full: 'major second', fingerOptions: {className: 'major-second', color: '#4a52c9', text: '2'}},
  // Thirds (green hues)
  {full: 'minor third', fingerOptions: {className: 'minor-third', color: '#047857', text: 'b3'}},
  {full: 'major third', fingerOptions: {className: 'major-third', color: '#059669', text: '3'}},
  // Fourth & Tritone (purple hues)
  {full: 'perfect fourth', fingerOptions: {className: 'perfect-fourth', color: '#6d28d9', text: '4'}},
  {full: 'diminished fifth', fingerOptions: {className: 'diminished-fifth', color: '#7e22ce', text: 'b5'}},
  {full: 'perfect fifth', fingerOptions: {className: 'perfect-fifth', color: '#8d52c0', text: '5'}},
  // Sixths (olive / yellow-green hues)
  {full: 'minor sixth', fingerOptions: {className: 'minor-sixth', color: '#4d7c0f', text: 'b6'}},
  {full: 'major sixth', fingerOptions: {className: 'major-sixth', color: '#65a30d', text: '6'}},
  // Sevenths (brown / earth tones)
  {full: 'minor seventh', fingerOptions: {className: 'minor-seventh', color: '#c46a33', text: 'b7'}},
  {full: 'major seventh', fingerOptions: {className: 'major-seventh', color: '#c25e12', text: '7'}},
];

export const INVERSIONS = {
    UNISON: 'UNISON',
    MINOR_SECOND: 'MAJOR_SEVENTH',
    MAJOR_SECOND: 'MINOR_SEVENTH',
    MINOR_THIRD: 'MAJOR_SIXTH',
    MAJOR_THIRD: 'MINOR_SIXTH',
    PERFECT_FOURTH: 'PERFECT_FIFTH',
    TRITONE: 'TRITONE',
    PERFECT_FIFTH: 'PERFECT_FOURTH',
    MINOR_SIXTH: 'MAJOR_THIRD',
    MAJOR_SIXTH: 'MINOR_THIRD',
    MINOR_SEVENTH: 'MAJOR_SECOND',
    MAJOR_SEVENTH: 'MINOR_SECOND',
}


/**
 * @type {Array<[RegExp, Interval]>}
 */
export const INTERVAL_ALIASES = [
  [new RegExp('^1$|^i$', 'i'), Interval.UNISON],
  [new RegExp('^b2$|^bii$', 'i'), Interval.MINOR_SECOND],
  [new RegExp('^2$|^ii$', 'i'), Interval.MAJOR_SECOND],
  [new RegExp('^b3$|^biii$|^#2$|^#ii$|^#9$', 'i'), Interval.MINOR_THIRD],
  [new RegExp('^3$|^iii$', 'i'), Interval.MAJOR_THIRD],
  [new RegExp('^4$|^iv$', 'i'), Interval.PERFECT_FOURTH],
  [new RegExp('^b5$|^#4$|^#iv$|^#11$', 'i'), Interval.TRITONE],
  [new RegExp('^5$|^v$', 'i'), Interval.PERFECT_FIFTH],
  [new RegExp('^b6$|^bvi$|^b13$', 'i'), Interval.MINOR_SIXTH],
  [new RegExp('^6$|^vi$|^13$|^bbvii$|^bb7$', 'i'), Interval.MAJOR_SIXTH],
  [new RegExp('^b7$|^bvii$', 'i'), Interval.MINOR_SEVENTH],
  [new RegExp('^7$|^vii$', 'i'), Interval.MAJOR_SEVENTH],
]

/**
 * 
 * @param {string} str 
 * @returns {Interval | null} - The corresponding Interval or null if not found
 */
export function stringToInterval(str) {
  const match = INTERVAL_ALIASES.find(([regex]) => regex.test(str));
  return match ? match[1] : null;
}

export const GUITAR_STANDARD_TUNING_INTERVALS = [
  0,
  5,
  5,
  5,
  4,
  5
];

/**
 * @template T
 * @param {Array<T>} arr 
 * @param {number} from 
 * @param {number} to 
 */
function moveItem(arr, from, to) {
  arr.splice((to < 0 ? arr.length + to : to), 0, arr.splice((from < 0 ? arr.length + from : from), 1)[0]);
}

/**
 * Apply drop 2 voicing to a set of intervals.
 * @param {Array<Interval>} intervals 
 * @returns {Array<Interval>} - The intervals after applying drop 2 voicing
 */
function drop2(intervals) {
  const clone = [...intervals];
  moveItem(clone, -2, 0);
  return clone;
}

/**
 * Apply drop 3 voicing to a set of intervals.
 * @param {Array<Interval>} intervals 
 * @returns {Array<Interval>} - The intervals after applying drop 3 voicing
 */
function drop3(intervals) {
  const clone = [...intervals];
  moveItem(clone, -3, 0);
  return clone;
}

/**
 * Apply drop 2 + 3 voicing to a set of intervals.
 * @param {Array<Interval>} intervals 
 * @returns {Array<Interval>} - The intervals after applying drop 2 + 3 voicing
 */
function drop2and3(intervals) {
  const clone = [...intervals];
  moveItem(clone, -2, 0); // drop 2
  moveItem(clone, -2, 0); // drop 3
  return clone;
}

/**
 * Apply drop 2 + 4 voicing to a set of intervals.
 * @param {Array<Interval>} intervals 
 * @returns {Array<Interval>} - The intervals after applying drop 2 + 4 voicing
 */
function drop2and4(intervals) {
  const clone = [...intervals];
  moveItem(clone, -2, 0); // drop 2
  moveItem(clone, -3, 0); // drop 4
  return clone;
}

/**
 * Swap last 2 intervals
 * @param {Array<Interval>} intervals 
 * @returns {Array<Interval>}
 */
function swapLastTwo(intervals) {
  const clone = [...intervals];
  moveItem(clone, -1, -2); // swap
  return clone;
}

/**
 * @enum {function} 
 * @type {Object<string, Function>}
 */
export const VOICING = {
  CLOSE: (intervals) => [...intervals],
  DROP_2: drop2,
  DROP_3: drop3,
  DROP_2_AND_3: drop2and3,
  DROP_2_AND_4: drop2and4,
  SWAP_LAST_TWO: swapLastTwo,
}

/**
 * Get all possible combinations of string intervals for a given set of string intervals.
 * @param {number} numberOfNNotes - The number of notes in the chord (e.g., 3 for triads)
 * @param {Array<number>} stringIntervals
 * @returns {Generator<Array<boolean>>} - An array of all possible string interval combinations
 */
export function * getStringSets(numberOfNNotes, stringIntervals = GUITAR_STANDARD_TUNING_INTERVALS) {
  for (let i = 0; i < Math.pow(2, stringIntervals.length); i++) {
    let numberOfStrings = 0;
    const combination = i.toString(2).padStart(stringIntervals.length, '0').split('')
      .map(bit => {
        const isOne = bit === '1';
        if (isOne) numberOfStrings++;
        return isOne;
      });
    if (numberOfStrings === numberOfNNotes) {
      yield combination;
    }
  }
}

/**
 * @typedef {number} Finger - 1 to 6 (1 is high E)
 * @typedef {number} Fret
 * @typedef {{text?: string, color?: string, className?: string}} FingerOptions
 * @typedef {[Finger, Fret, FingerOptions?]} FingerPosition
 * @typedef {Array<FingerPosition>} Chord
 * @typedef {Array<Interval>} Notes
 */

/**
 * Normalize a chord by moving the frets to the lowest possible position.
 * For example, if a chord has frets 5, 7, 9, it can be normalized to 0, 2, 4 by moving all frets down by 5.
 * Muted strings (null) are ignored in the normalization process.
 * @param {Chord} chord
 */
export function fretNormalizer(chord) {
  // Find the lowest fret number
  const minFret = Math.min(
    ...chord.map((pos) => (pos ? pos[1] : Infinity))
  );

  // If all strings are muted, return the original chord
  if (minFret === Infinity) return chord;

  
  // Normalize the chord by subtracting the lowest fret from each fret
  chord.forEach((pos) => {
    if (!pos) return;
    pos[1] = pos[1] - (minFret - 1);
  });
}



/**
 * This function moves the chord frets so that they are the closest possible to each other.
 * It does that by increasing or decreasing fret position by 12 (1 octave) until the midpoint is within 6 frets. 
 * @param {Chord} chord
 */
export function closeChordPosition(chord) {
  if (chord.length < 2) return;
  let previous = chord[0];

  let maxFret = previous[1];
  let minFret = previous[1];

  for (let i = 1; i < chord.length; i++) {
    const current = chord[i];
    let currentFret = current[1];

    const midPoint = (maxFret + minFret) / 2;
    // Adjust fret by octaves (12) until within +/-6 of previous fret
    while (currentFret - midPoint > 6) currentFret -= 12;
    while (currentFret - midPoint < -6) currentFret += 12;

    if (currentFret > maxFret) maxFret = currentFret;
    if (currentFret < minFret) minFret = currentFret;

    current[1] = currentFret;
    previous = current;
  }
}

/**
 * @template T, U
 * @param {Array<T>} arr1
 * @param {Array<U>} arr2
 * @returns {Generator<[T, U]>}
 */
function * zip(arr1, arr2) {
  const length = Math.min(arr1.length, arr2.length);
  for (let i = 0; i < length; i++) {
    yield [arr1[i], arr2[i]];
  }
}

/**
 * Rotate the elements of an array to the left by one position.
 * @template T
 * @param {Array<T>} arr
 * @returns {Array<T>}
 */
function rotateArray(arr) {
  return [...arr.slice(1), arr[0]];
}

/**
 * Generate a new inversion of a given voicing.
 * @param {Notes} notes
 * @returns {Generator<Notes>} - A generator that yields all inversions
 */
export function * generateInversions(notes) {
  let inversion = [...notes];
  for (let i = 0; i < notes.length - 1; i++) {
    inversion = rotateArray(inversion);
    yield inversion;
  }
}

/**
 * @template T
 * @param {Generator<T>} array
 * @returns {Generator<[number, T]>}
 */
function * enumerate(array) {
  let c = 0
  for (const item of array) {
    yield [c, item];
    c++;
  }
}

/**
 * Get the distance between intervals in a voicing.
 * @param {Array<number | null>} notes
 * @returns {Array<number | null>} - An array of distances between intervals
 */
export function intervalDistanceFromNotes(notes) {
  /** @type {Array<number | null>} */
  const distances = [];
  let previousInterval = 0;
  for (const interval of notes) {
    if (interval == null) {
      distances.push(null);
      continue;
    }
    const distance = interval - previousInterval;
    previousInterval = interval;
    distances.push(distance);
  }
  return distances;
}

/**
 * @param {Notes} notes
 * @param {Array<boolean>} stringSet
 * @param {Array<number>} stringIntervals - Intervals of the open strings from the lowest string to the highest string
 * @param {(interval: number | null) => FingerOptions} intervalToFingerOptions - Function to get finger options for a given interval
 * @returns {Chord} - The chord representation of the voicing
 */
export function notesToChord(notes, stringSet, intervalToFingerOptions = () => ({}), stringIntervals = GUITAR_STANDARD_TUNING_INTERVALS) {
  // check if number of notes matches number of true in stringSet
  const numberOfNNotes = notes.length;
  const numberOfStrings = stringSet.filter(s => s).length;
  if (numberOfNNotes !== numberOfStrings) {
    throw new Error(`Number of notes (${numberOfNNotes}) does not match number of strings (${numberOfStrings}) in string set.`);
  }
  /** @type {Array<number | null>} */
  const chordIntervals = stringSet.map((usedString) => usedString ? notes.shift() : null);
  // get interval distances
  const intervalDistance = intervalDistanceFromNotes(chordIntervals);

  /**
   * @param {number} stringNumber
   * @returns {number}
   */
  const reverseString = (stringNumber) => stringIntervals.length + 1 - stringNumber;
  /** @type {Chord} */
  const chord = [];

  let intervalOffset = 0;
  for (const [stringNumber, [stringOffset, chordInterval]] of enumerate(zip(stringIntervals, intervalDistance))) {
    if (chordInterval == null)  {
      intervalOffset += 0 - stringOffset;
      continue;
    }
    intervalOffset += chordInterval - stringOffset;
    chord.push([reverseString(stringNumber + 1), intervalOffset, intervalToFingerOptions(chordIntervals[stringNumber])]);
  }
  closeChordPosition(chord);
  fretNormalizer(chord);
  return chord;
}

/**
 * Get all inversions of a given voicing.
 * An inversion is created by moving the lowest note up an octave.
 * The voicing is represented as an array of 6 elements (one for each string), starting from the high E string (1st string) to the low E string (6th string),
 * where each element is either an Interval object or unused (for muted strings).
 * @param {Notes} notes
 * @param {VOICING} voicing
 * @returns {Generator<Notes>} - Array of chords with all inversions
 */
export function * getAllInversions(notes, voicing = VOICING.CLOSE) {
  // 1 - sort notes in place
  notes.sort((a, b) => a - b);
  // 2 - apply voicing
  yield voicing(notes);
  for (const inversion of generateInversions(notes)) {
    yield voicing(inversion);
  }
}