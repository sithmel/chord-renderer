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

export const GUITAR_STANDARD_TUNING_INTERVALS = [
  0,
  5,
  5,
  5,
  4,
  5
];

/**
 * 
 * @param {string} str 
 * @returns {Interval | null} - The corresponding Interval or null if not found
 */
export function stringToInterval(str) {
  const match = INTERVAL_ALIASES.find(([regex]) => regex.test(str));
  return match ? match[1] : null;
}

/**
 * @typedef {number} Finger - 1 to 6 (1 is high E)
 * @typedef {number} Fret
 * @typedef {{text?: string, color?: string, className?: string}} FingerOptions
 * @typedef {[Finger, Fret, FingerOptions?]} FingerPosition
 * @typedef {Array<FingerPosition>} Chord
 * @typedef {[Interval | null, Interval | null, Interval | null, Interval | null, Interval | null, Interval | null]} Voicing
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
 * extract the notes used in a voicing.
 * @param {Voicing} voicing
 * @returns {{intervals: Array<Interval>, strings: Array<number>}} - Array of notes used in the voicing
 */
function extractInversionNotesAndStrings(voicing) {
  /** @type {Array<number>} */
  const strings = [];
  voicing.forEach((interval, index) => {
    if (interval != null) strings.push(index);
  });
  const intervals = voicing.filter((interval) => interval != null);
  return { intervals, strings };
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
 * Get the voicing of a chord from its intervals and strings.
 * @param {Array<Interval>} intervals 
 * @param {Array<number>} strings 
 * @returns {Voicing} - The voicing of the chord
 */
function getVoicingFromIntervalAndStrings(intervals, strings) {
  /** @type {Voicing} */
  const voicing = [null, null, null, null, null, null];
  for (const [i, s] of zip(intervals, strings)) {
    voicing[s] = i;
  }
  return voicing;
}

/**
 * Generate a new inversion of a given voicing.
 * @param {Voicing} voicing
 * @returns {Generator<Voicing>} - A generator that yields all inversions of the voicing
 */
export function * generateInversions(voicing) {
  const {intervals, strings} = extractInversionNotesAndStrings(voicing);
  let newIntervals = intervals;
  for (let i = 0; i < intervals.length - 1; i++) {
    newIntervals = rotateArray(newIntervals);
    yield getVoicingFromIntervalAndStrings(newIntervals, strings);
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
 * @param {Voicing} voicing
 * @returns {Array<number | null>} - Array of distances between consecutive intervals
 */
export function intervalDistanceFromVoicing(voicing) {
  const distances = [];
  let previousInterval = 0;
  for (const interval of voicing) {
    if (interval == null) {
      distances.push(null);
      continue;
    }
    let realInterval = interval;
      // Keep adding octaves until the interval is greater than the previous one
    while (realInterval < previousInterval) {
      realInterval += 12;
    }
    const distance = realInterval - previousInterval;
    previousInterval = realInterval;
    distances.push(distance);
  }
  return distances;
}

/**
 * @param {Voicing} voicing
 * @param {Array<number>} stringIntervals - Intervals of the open strings from the lowest string to the highest string
 * @param {(interval: number | null) => FingerOptions} intervalToFingerOptions - Function to get finger options for a given interval
 * @returns {Chord} - The chord representation of the voicing
 */
export function voicingToChord(voicing, intervalToFingerOptions = () => ({}), stringIntervals = GUITAR_STANDARD_TUNING_INTERVALS) {
  const intervalDistance = intervalDistanceFromVoicing(voicing);
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
    chord.push([reverseString(stringNumber + 1), intervalOffset, intervalToFingerOptions(voicing[stringNumber])]);
  }
  fretNormalizer(chord);
  return chord;
}

/**
 * Get all inversions of a given voicing.
 * An inversion is created by moving the lowest note up an octave.
 * The voicing is represented as an array of 6 elements (one for each string), starting from the high E string (1st string) to the low E string (6th string),
 * where each element is either an Interval object or unused (for muted strings).
 * @param {Voicing} voicing
 * @returns {Generator<Chord>} - Array of chords with all inversions
 */
export function * getAllInversions(voicing) {
  yield voicingToChord(voicing);
  for (const inversion of generateInversions(voicing)) {
    yield voicingToChord(inversion);
  }
}