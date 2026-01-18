/**
 * Get all possible combinations of string intervals for a given set of string intervals.
 * @param {number} numberOfNNotes - The number of notes in the chord (e.g., 3 for triads)
 * @param {Array<number>} stringIntervals
 * @returns {Generator<Array<boolean>>} - An array of all possible string interval combinations
 */
export function getStringSets(numberOfNNotes: number, stringIntervals?: Array<number>): Generator<Array<boolean>>;
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
export function fretNormalizer(chord: Chord): Chord;
/**
 * This function moves the chord frets so that they are the closest possible to each other.
 * It does that by increasing or decreasing fret position by 12 (1 octave) until the midpoint is within 6 frets.
 * @param {Chord} chord
 */
export function closeChordPosition(chord: Chord): Chord;
/**
 * Generate a new inversion of a given voicing.
 * @param {Notes} notes
 * @returns {Generator<Notes>} - A generator that yields all inversions
 */
export function generateInversions(notes: Notes): Generator<Notes>;
/**
 * Get the distance between intervals in a voicing.
 * @param {Array<number | null>} notes
 * @returns {Array<number | null>} - An array of distances between intervals
 */
export function intervalDistanceFromNotes(notes: Array<number | null>): Array<number | null>;
/**
 * @param {Notes} notes
 * @param {Array<boolean>} stringSet
 * @param {Array<number>} stringIntervals - Intervals of the open strings from the lowest string to the highest string
 * @param {(interval: number | null) => import("svguitar").FingerOptions} intervalToFingerOptions - Function to get finger options for a given interval
 * @returns {Chord} - The chord representation of the voicing
 */
export function notesToChord(notes: Notes, stringSet: Array<boolean>, intervalToFingerOptions?: (interval: number | null) => import("svguitar").FingerOptions, stringIntervals?: Array<number>): Chord;
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
export function getAllInversions(notes: Notes, voicing?: VOICING): Generator<Notes>;
export type Interval = number;
export namespace Interval {
    let UNISON: number;
    let MINOR_SECOND: number;
    let MAJOR_SECOND: number;
    let MINOR_THIRD: number;
    let MAJOR_THIRD: number;
    let PERFECT_FOURTH: number;
    let TRITONE: number;
    let PERFECT_FIFTH: number;
    let MINOR_SIXTH: number;
    let MAJOR_SIXTH: number;
    let MINOR_SEVENTH: number;
    let MAJOR_SEVENTH: number;
    let FLAT_NINTH: number;
    let NINTH: number;
    let SHARP_NINTH: number;
    let ELEVENTH: number;
    let SHARP_ELEVENTH: number;
    let FLAT_THIRTEENTH: number;
    let THIRTEENTH: number;
}
export const Interval_labels: {
    full: string;
    fingerOptions: {
        className: string;
    };
}[];
export namespace EXTENDED_INTERVAL_LABELS {
    export namespace FLAT_NINTH_1 {
        let full: string;
        namespace fingerOptions {
            let className: string;
        }
    }
    export { FLAT_NINTH_1 as FLAT_NINTH };
    export namespace NINTH_1 {
        let full_1: string;
        export { full_1 as full };
        export namespace fingerOptions_1 {
            let className_1: string;
            export { className_1 as className };
        }
        export { fingerOptions_1 as fingerOptions };
    }
    export { NINTH_1 as NINTH };
    export namespace SHARP_NINTH_1 {
        let full_2: string;
        export { full_2 as full };
        export namespace fingerOptions_2 {
            let className_2: string;
            export { className_2 as className };
        }
        export { fingerOptions_2 as fingerOptions };
    }
    export { SHARP_NINTH_1 as SHARP_NINTH };
    export namespace ELEVENTH_1 {
        let full_3: string;
        export { full_3 as full };
        export namespace fingerOptions_3 {
            let className_3: string;
            export { className_3 as className };
        }
        export { fingerOptions_3 as fingerOptions };
    }
    export { ELEVENTH_1 as ELEVENTH };
    export namespace SHARP_ELEVENTH_1 {
        let full_4: string;
        export { full_4 as full };
        export namespace fingerOptions_4 {
            let className_4: string;
            export { className_4 as className };
        }
        export { fingerOptions_4 as fingerOptions };
    }
    export { SHARP_ELEVENTH_1 as SHARP_ELEVENTH };
    export namespace FLAT_THIRTEENTH_1 {
        let full_5: string;
        export { full_5 as full };
        export namespace fingerOptions_5 {
            let className_5: string;
            export { className_5 as className };
        }
        export { fingerOptions_5 as fingerOptions };
    }
    export { FLAT_THIRTEENTH_1 as FLAT_THIRTEENTH };
    export namespace THIRTEENTH_1 {
        let full_6: string;
        export { full_6 as full };
        export namespace fingerOptions_6 {
            let className_6: string;
            export { className_6 as className };
        }
        export { fingerOptions_6 as fingerOptions };
    }
    export { THIRTEENTH_1 as THIRTEENTH };
}
export const GUITAR_STANDARD_TUNING_INTERVALS: number[];
/**
 * *
 */
export type VOICING = Function;
/**
 * @enum {function}
 * @type {Object<string, Function>}
 */
export const VOICING: {
    [x: string]: Function;
};
/**
 * - 1 to 6 (1 is high E)
 */
export type Finger = number;
export type Chord = Array<import("svguitar").Finger>;
export type Notes = Array<Interval>;
