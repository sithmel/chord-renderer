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

/** @type {Array<{full: string, fingerOptions: import('svguitar').FingerOptions}>} */
export const Interval_labels = [
  {full: 'root', fingerOptions: {className: 'root'}},
  // Seconds (blue hues)
  {full: 'minor 2nd', fingerOptions: {className: 'minor-second'}},
  {full: 'major 2nd', fingerOptions: {className: 'major-second'}},
  // Thirds (green hues)
  {full: 'minor 3rd', fingerOptions: {className: 'minor-third'}},
  {full: 'major 3rd', fingerOptions: {className: 'major-third'}},
  // Fourth & Tritone (purple hues)
  {full: 'perfect 4th', fingerOptions: {className: 'perfect-fourth'}},
  {full: 'dim 5th / aug 4th', fingerOptions: {className: 'diminished-fifth'}},
  {full: 'perfect 5th', fingerOptions: {className: 'perfect-fifth'}},
  // Sixths (olive / yellow-green hues)
  {full: 'minor 6th / aug 5th', fingerOptions: {className: 'minor-sixth'}},
  {full: 'major 6th / dim 7th', fingerOptions: {className: 'major-sixth'}},
  // Sevenths (brown / earth tones)
  {full: 'minor 7th', fingerOptions: {className: 'minor-seventh'}},
  {full: 'major 7th', fingerOptions: {className: 'major-seventh'}},
];

// Labels for extended intervals (jazz notation)
/** @type {Record<string, {full: string, fingerOptions: import('svguitar').FingerOptions}>} */
export const EXTENDED_INTERVAL_LABELS = {
  'FLAT_NINTH': {full: 'flat 9th', fingerOptions: {className: 'flat-ninth'}},
  'NINTH': {full: '9th', fingerOptions: {className: 'ninth'}},
  'SHARP_NINTH': {full: 'sharp 9th', fingerOptions: {className: 'sharp-ninth'}},
  'ELEVENTH': {full: '11th', fingerOptions: {className: 'eleventh'}},
  'SHARP_ELEVENTH': {full: 'sharp 11th', fingerOptions: {className: 'sharp-eleventh'}},
  'FLAT_THIRTEENTH': {full: 'flat 13th', fingerOptions: {className: 'flat-thirteenth'}},
  'THIRTEENTH': {full: '13th', fingerOptions: {className: 'thirteenth'}},
};

/**
 * @typedef {Object} IntervalLabel
 * @property {string} full - Full display name of the interval
 * @property {import('svguitar').FingerOptions} fingerOptions - Finger display options
 */

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
 * @param  {number[]} intervalsToDrop 
 * @returns {(intervals: Array<Interval>) => Array<Interval>}
 */
function drop(...intervalsToDrop) {
  /**
   * Apply drop 2 voicing to a set of intervals.
   * @param {Array<Interval>} intervals 
   * @returns {Array<Interval>} - The intervals after applying drop 2 voicing
   */
  return (intervals) => {
    // extract the intervals to drop
    const indicesToDrop = intervalsToDrop.map(num => intervals.length - num);
    const indicesToDropSet = new Set(indicesToDrop);
    /** @type {Array<Interval>} */
    const toDrop = [];
    for (const idx of indicesToDrop) {
      toDrop.push(intervals[idx]);
    }
    return [...toDrop.reverse(), ...intervals.filter((_, idx) => !indicesToDropSet.has(idx))] 
  };
}

/**
 * @enum {function} 
 * @type {Object<string, Function>}
 */
export const VOICING = {
  CLOSE: drop(),
  DROP_2: drop(2),
  DROP_3: drop(3),
  DROP_4: drop(4), 
  DROP_2_AND_3: drop(2, 3),
  DROP_2_AND_4: drop(2, 4),
  DROP_3_AND_2: drop(3, 2),
  DROP_2_AND_5: drop(2, 5),
  DROP_3_AND_4: drop(3, 4),
  DROP_3_AND_5: drop(3, 5),
  DROP_4_AND_3: drop(4, 3),
  DROP_4_AND_2: drop(4, 2),
  DROP_2_AND_3_AND_4: drop(2, 3, 4),
  DROP_2_AND_3_AND_5: drop(2, 3, 5),
  DROP_2_AND_4_AND_3: drop(2, 4, 3),
  DROP_2_AND_4_AND_5: drop(2, 4, 5),
  DROP_2_AND_5_AND_3: drop(2, 5, 3),
  DROP_2_AND_5_AND_4: drop(2, 5, 4),
  DROP_3_AND_2_AND_4: drop(3, 2, 4),
  DROP_3_AND_2_AND_5: drop(3, 2, 5),
  DROP_3_AND_4_AND_2: drop(3, 4, 2),
  DROP_3_AND_5_AND_2: drop(3, 5, 2),
  DROP_4_AND_2_AND_3: drop(4, 2, 3),
  DROP_4_AND_3_AND_2: drop(4, 3, 2),
}

export const ALLOWED_VOICING_2 = ["CLOSE"];
export const ALLOWED_VOICING_3 = ["CLOSE", "DROP_2"];
export const ALLOWED_VOICING_4 = ["CLOSE", "DROP_2", "DROP_3", "DROP_2_AND_3", "DROP_2_AND_4", "DROP_3_AND_2"];
export const ALLOWED_VOICING_5 = [
  "CLOSE",
  "DROP_2",
  "DROP_3",
  "DROP_4",
  "DROP_2_AND_3",
  "DROP_2_AND_4",
  "DROP_2_AND_5",
  "DROP_2_AND_3_AND_4",
  "DROP_2_AND_3_AND_5",
  "DROP_2_AND_4_AND_3",
  "DROP_2_AND_4_AND_5",
  "DROP_2_AND_5_AND_3",
  "DROP_2_AND_5_AND_4",
  "DROP_3_AND_2",
  "DROP_3_AND_4",
  "DROP_3_AND_5",
  "DROP_3_AND_2_AND_4",
  "DROP_3_AND_2_AND_5",
  "DROP_3_AND_4_AND_2",
  "DROP_3_AND_5_AND_2",
  "DROP_4_AND_3",
  "DROP_4_AND_2",
  "DROP_4_AND_2_AND_3",
  "DROP_4_AND_3_AND_2",
];

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

/**
 * This function returns the name of the chord. Here are some rules:
 * name can be one note "C" or "C#/Dd"
 * 
 * @param {Array<Interval>} intervals 
 * @param {string} name
 * @returns {string}
 */
export function getNameFromInterval(intervals, name = "") {
  // Edge case: chords need at least 3 intervals to be named
  // Exception: power chords (root + fifth) with exactly 2 intervals
  if (intervals.length < 2) return "";
  
  if (intervals.length === 2) {
    // Check for power chord: unison (root) + perfect fifth (order doesn't matter)
    const intervalSet = new Set(intervals);
    const hasPowerChord = intervalSet.has(Interval.UNISON) && intervalSet.has(Interval.PERFECT_FIFTH);
    
    if (hasPowerChord) {
      return name + "5";
    }
    
    // Any other 2-interval combination returns empty string
    return "";
  }
  
  // Create interval set for fast lookup
  const intervalSet = new Set(intervals);
  
  // Remove root if present
  intervalSet.delete(Interval.UNISON);
  
  // Detect all intervals (boolean flags)
  const has3 = intervalSet.has(Interval.MAJOR_THIRD);      // major 3rd
  const hasb3 = intervalSet.has(Interval.MINOR_THIRD);     // minor 3rd
  const has5 = intervalSet.has(Interval.PERFECT_FIFTH);      // perfect 5th
  const hasb5 = intervalSet.has(Interval.TRITONE);     // diminished 5th
  const hasSharp5 = intervalSet.has(Interval.MINOR_SIXTH); // augmented 5th
  const has7 = intervalSet.has(Interval.MAJOR_SEVENTH);     // major 7th
  const hasb7 = intervalSet.has(Interval.MINOR_SEVENTH);    // minor 7th
  const hasdim7 = intervalSet.has(Interval.MAJOR_SIXTH);   // diminished 7th (or major 6th/13th)
  const has2 = intervalSet.has(Interval.MAJOR_SECOND);      // major 2nd
  const has4 = intervalSet.has(Interval.PERFECT_FOURTH);      // perfect 4th
  const hasb9 = intervalSet.has(Interval.FLAT_NINTH);     // flat 9th
  
  // Check if this is a triad (3 notes with root, third, and fifth)
  const hasRoot = intervals.includes(Interval.UNISON);
  const hasThird = hasb3 || has3;
  const hasFifth = hasb5 || has5 || hasSharp5;
  const isTriad = intervals.length === 3 && hasRoot && hasThird && hasFifth;
  
  // Build chord name string
  let chordName = name;
  
  // Determine base quality (priority order)
  
  // 1. Diminished 7: minor 3rd + dim 5th + dim 7th
  if (hasb3 && hasb5 && hasdim7 && !hasb7 && !has7) {
    return chordName + "dim7";
  }
  
  // 2. Half-Diminished: minor 3rd + dim 5th + minor 7th
  if (hasb3 && hasb5 && hasb7) {
    return chordName + "m7b5";
  }
  
  // 3. Diminished triad: minor 3rd + dim 5th (no 7th)
  if (hasb3 && hasb5 && !hasb7 && !has7 && !hasdim7) {
    chordName += "dim";
    // Add triad suffix if applicable
    if (isTriad) {
      chordName += " triad";
    }
    return chordName;
  }
  
  // 4. Suspended chords (no 3rd)
  if (!has3 && !hasb3) {
    if (has4 && hasb7) {
      // Special case: 7sus4
      return chordName + "7sus4";
    }
    if (has2 && !hasb7 && !has7) {
      return chordName + "sus2";
    } else if (has4 && !hasb7 && !has7) {
      return chordName + "sus4";
    }
    // If has 7th but no clear sus pattern, just return name
    return chordName;
  }
  
  // Determine base quality
  let quality = "";
  
  // If we have both major 3rd and minor 3rd, prioritize major 3rd
  // (the minor 3rd is likely a #9)
  if (has3 && hasb3) {
    quality = "";  // Major
  } else if (hasb3) {
    quality = "m";
  } else if (has3) {
    quality = "";
  }
  
  // Check if we have a seventh
  const hasSeventh = has7 || hasb7;
  
  // Determine highest extension
  let extension = "";
  let extensionPrefix = "";
  
  // Check for 13th (interval 9, but only as extension, not as dim7)
  if (hasdim7 && hasSeventh && (has3 || hasb3)) {
    extension = "13";
    extensionPrefix = has7 ? "maj" : "";
  }
  // Check for 11th (interval 5, but only if we have a 3rd)
  else if (has4 && (has3 || hasb3) && hasSeventh) {
    extension = "11";
    extensionPrefix = has7 ? "maj" : "";
  }
  // Check for 9th (interval 2)
  else if (has2 && hasSeventh) {
    extension = "9";
    extensionPrefix = has7 ? "maj" : "";
  }
  
  // If we have an extension, build the name with it
  if (extension) {
    chordName += quality + extensionPrefix + extension;
    
    // Add alterations
    if (hasb9) {
      chordName += "b9";
    } else if (hasb5 && quality !== "m") {
      chordName += "b5";
    } else if (hasSharp5) {
      chordName += "#5";
    } else if (intervalSet.has(Interval.SHARP_NINTH) && has3 && !hasb3) {
      // #9 only if we have major 3rd and interval 3 (and NOT minor 3rd)
      chordName += "#9";
    }
    
    return chordName;
  }
  
  // No extension, so build with base quality and 7th
  chordName += quality;
  
  // Add 7th
  if (has7) {
    chordName += "maj7";
  } else if (hasb7) {
    chordName += "7";
  }
  
  // Add alterations for 7th chords or triads
  if (hasb7) {
    if (hasb9) {
      chordName += "b9";
    } else if (intervalSet.has(Interval.SHARP_NINTH) && has3) {
      // #9 for dominant chords
      chordName += "#9";
    } else if (hasb5 && quality !== "m") {
      chordName += "b5";
    } else if (hasSharp5 && quality !== "aug") {
      chordName += "#5";
    }
  } else if (!hasSeventh) {
    // Triads with alterations or additions
    if (hasSharp5 && has3) {
      chordName += "aug";
      // Add triad suffix if applicable
      if (isTriad) {
        chordName += " triad";
      }
      return chordName;
    }
    // Prioritize highest extension (13 > 11 > 9)
    if (hasdim7 && !hasb5) {
      chordName += "add13";
    } else if (has4 && (has3 || hasb3)) {
      chordName += "add11";
    } else if (has2) {
      chordName += "add9";
    }
  }
  
  // Add "triad" suffix for 3-note chords with 1-3-5 structure
  if (isTriad) {
    chordName += " triad";
  }
  
  return chordName;
}