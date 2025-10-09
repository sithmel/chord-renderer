/**
 *
 * @param {string} str
 * @returns {Interval | null} - The corresponding Interval or null if not found
 */
export function stringToInterval(str: string): Interval | null;
/**
 * Get all possible combinations of string intervals for a given set of string intervals.
 * @param {number} numberOfNNotes - The number of notes in the chord (e.g., 3 for triads)
 * @param {Array<number>} stringIntervals
 * @returns {Generator<Array<boolean>>} - An array of all possible string interval combinations
 */
export function getStringSets(numberOfNNotes: number, stringIntervals?: Array<number>): Generator<Array<boolean>>;
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
 * @param {(interval: number | null) => FingerOptions} intervalToFingerOptions - Function to get finger options for a given interval
 * @returns {Chord} - The chord representation of the voicing
 */
export function notesToChord(notes: Notes, stringSet: Array<boolean>, intervalToFingerOptions?: (interval: number | null) => FingerOptions, stringIntervals?: Array<number>): Chord;
/**
 * Get all inversions of a given voicing.
 * An inversion is created by moving the lowest note up an octave.
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
}
export const Interval_labels: {
    full: string;
    fingerOptions: {
        className: string;
        color: string;
        text: string;
    };
}[];
export namespace INVERSIONS {
    let UNISON_1: string;
    export { UNISON_1 as UNISON };
    let MINOR_SECOND_1: string;
    export { MINOR_SECOND_1 as MINOR_SECOND };
    let MAJOR_SECOND_1: string;
    export { MAJOR_SECOND_1 as MAJOR_SECOND };
    let MINOR_THIRD_1: string;
    export { MINOR_THIRD_1 as MINOR_THIRD };
    let MAJOR_THIRD_1: string;
    export { MAJOR_THIRD_1 as MAJOR_THIRD };
    let PERFECT_FOURTH_1: string;
    export { PERFECT_FOURTH_1 as PERFECT_FOURTH };
    let TRITONE_1: string;
    export { TRITONE_1 as TRITONE };
    let PERFECT_FIFTH_1: string;
    export { PERFECT_FIFTH_1 as PERFECT_FIFTH };
    let MINOR_SIXTH_1: string;
    export { MINOR_SIXTH_1 as MINOR_SIXTH };
    let MAJOR_SIXTH_1: string;
    export { MAJOR_SIXTH_1 as MAJOR_SIXTH };
    let MINOR_SEVENTH_1: string;
    export { MINOR_SEVENTH_1 as MINOR_SEVENTH };
    let MAJOR_SEVENTH_1: string;
    export { MAJOR_SEVENTH_1 as MAJOR_SEVENTH };
}
/**
 * @type {Array<[RegExp, Interval]>}
 */
export const INTERVAL_ALIASES: Array<[RegExp, Interval]>;
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
export type Fret = number;
export type FingerOptions = {
    text?: string;
    color?: string;
    className?: string;
};
export type FingerPosition = [Finger, Fret, FingerOptions?];
export type Chord = Array<FingerPosition>;
export type Notes = Array<Interval>;
