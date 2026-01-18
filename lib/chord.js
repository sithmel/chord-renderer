//@ts-check

import { bunchByPeriod } from "./bunchByPeriod.js";

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
    MAJOR_SEVENTH: 11,
    // Extended intervals (jazz voicings) - appear after basic intervals
    FLAT_NINTH: 1,
    NINTH: 2,
    SHARP_NINTH: 3,
    ELEVENTH: 5,
    SHARP_ELEVENTH: 6,
    FLAT_THIRTEENTH: 8,
    THIRTEENTH: 9,
};

export const Interval_labels = [
  {full: 'root', fingerOptions: {className: 'root'}},
  // Seconds (blue hues)
  {full: 'minor second', fingerOptions: {className: 'minor-second'}},
  {full: 'major second', fingerOptions: {className: 'major-second'}},
  // Thirds (green hues)
  {full: 'minor third', fingerOptions: {className: 'minor-third'}},
  {full: 'major third', fingerOptions: {className: 'major-third'}},
  // Fourth & Tritone (purple hues)
  {full: 'perfect fourth', fingerOptions: {className: 'perfect-fourth'}},
  {full: 'diminished fifth', fingerOptions: {className: 'diminished-fifth'}},
  {full: 'perfect fifth', fingerOptions: {className: 'perfect-fifth'}},
  // Sixths (olive / yellow-green hues)
  {full: 'minor sixth', fingerOptions: {className: 'minor-sixth'}},
  {full: 'major sixth', fingerOptions: {className: 'major-sixth'}},
  // Sevenths (brown / earth tones)
  {full: 'minor seventh', fingerOptions: {className: 'minor-seventh'}},
  {full: 'major seventh', fingerOptions: {className: 'major-seventh'}},
];

// Labels for extended intervals (jazz notation)
export const EXTENDED_INTERVAL_LABELS = {
  'FLAT_NINTH': {full: 'flat ninth', fingerOptions: {className: 'flat-ninth'}},
  'NINTH': {full: 'ninth', fingerOptions: {className: 'ninth'}},
  'SHARP_NINTH': {full: 'sharp ninth', fingerOptions: {className: 'sharp-ninth'}},
  'ELEVENTH': {full: 'eleventh', fingerOptions: {className: 'eleventh'}},
  'SHARP_ELEVENTH': {full: 'sharp eleventh', fingerOptions: {className: 'sharp-eleventh'}},
  'FLAT_THIRTEENTH': {full: 'flat thirteenth', fingerOptions: {className: 'flat-thirteenth'}},
  'THIRTEENTH': {full: 'thirteenth', fingerOptions: {className: 'thirteenth'}},
};

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
 * @typedef {Array<import("svguitar").Finger>} Chord
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
    ...chord.map((pos) => (pos ? (pos[1] === 'x' ? Infinity : pos[1]) : Infinity))
  );

  // If all strings are muted, return the original chord
  if (minFret === Infinity) return chord;

  
  // Normalize the chord by subtracting the lowest fret from each fret
  chord.forEach((pos) => {
    if (!pos) return;
    if (pos[1] === 'x') return;
    pos[1] = pos[1] - (minFret - 1);
  });
}


/**
 * This function moves the chord frets so that they are the closest possible to each other.
 * It does that by increasing or decreasing fret position by 12 (1 octave) until the midpoint is within 6 frets. 
 * @param {Chord} chord
 */
export function closeChordPosition(chord) {
  // step 1 map position
  const mapped = chord.map(([string, fret, options]) => ({position: fret, item: [string, fret, options]}));
  // step 2 bunch by period
  const bunched = bunchByPeriod(mapped);
  // step 3 write back
  for (let i = 0; i < chord.length; i++) {
    chord[i][1] = bunched[i].position; // Update the fret position in place
  }
  return chord;
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
 * @param {(interval: number | null) => import("svguitar").FingerOptions} intervalToFingerOptions - Function to get finger options for a given interval
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
 * The input order of notes is preserved (not sorted by pitch).
 * An inversion is created by moving the first note up an octave.
 * The voicing is represented as an array of 6 elements (one for each string), starting from the high E string (1st string) to the low E string (6th string),
 * where each element is either an Interval object or unused (for muted strings).
 * @param {Notes} notes
 * @param {VOICING} voicing
 * @returns {Generator<Notes>} - Array of chords with all inversions
 */
export function * getAllInversions(notes, voicing = VOICING.CLOSE) {
  // Apply voicing (preserve input order)
  yield voicing(notes);
  for (const inversion of generateInversions(notes)) {
    yield voicing(inversion);
  }
}