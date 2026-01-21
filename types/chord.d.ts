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
/** @type {Array<{full: string, fingerOptions: import('svguitar').FingerOptions}>} */
export const Interval_labels: Array<{
    full: string;
    fingerOptions: import("svguitar").FingerOptions;
}>;
/** @type {Record<string, {full: string, fingerOptions: import('svguitar').FingerOptions}>} */
export const EXTENDED_INTERVAL_LABELS: Record<string, {
    full: string;
    fingerOptions: import("svguitar").FingerOptions;
}>;
/**
 * @typedef {Object} IntervalLabel
 * @property {string} full - Full display name of the interval
 * @property {import('svguitar').FingerOptions} fingerOptions - Finger display options
 */
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
export type IntervalLabel = {
    /**
     * - Full display name of the interval
     */
    full: string;
    /**
     * - Finger display options
     */
    fingerOptions: import("svguitar").FingerOptions;
};
