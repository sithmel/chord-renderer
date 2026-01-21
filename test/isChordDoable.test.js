//@ts-check
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import isChordDoable from '../lib/isChordDoable.js';

describe('isChordDoable', () => {
  // Basic doable chords
  test('should return true for simple 3-note chord within span', () => {
    /** @type {Array<import("svguitar").Finger>} */
    const chord = [[1, 1], [2, 2], [3, 3]];
    assert.equal(isChordDoable(chord), true);
  });

  test('should return true for chord at exactly 5 fret span', () => {
    const chord = [[1, 5], [2, 7], [3, 9], [4, 10]];
    // Span: 10-5 = 5 frets, Positions: 4 unique (5,7,9,10)
    assert.equal(isChordDoable(chord), true);
  });

  test('should return true for barre chord (same fret multiple times)', () => {
    const chord = [[1, 3], [2, 3], [3, 3], [4, 3]];
    // Span: 0 frets, Positions: 1 unique
    assert.equal(isChordDoable(chord), true);
  });

  test('should return true for realistic G major barre chord', () => {
    const chord = [[1, 3], [2, 3], [3, 4], [4, 5], [5, 5], [6, 3]];
    // Span: 5-3 = 2 frets, Positions: 3 unique (3,4,5)
    assert.equal(isChordDoable(chord), true);
  });

  // Not doable - fret span too wide
  test('should return false for chord with span > 5 frets', () => {
    const chord = [[1, 1], [2, 7]];
    // Span: 7-1 = 6 frets
    assert.equal(isChordDoable(chord), false);
  });

  test('should return false for chord with span of 8 frets', () => {
    const chord = [[1, 5], [2, 13]];
    // Span: 13-5 = 8 frets
    assert.equal(isChordDoable(chord), false);
  });

  // Not doable - too many fingers
  test('should return false for chord requiring 5 different frets', () => {
    const chord = [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]];
    // Span: 5-1 = 4 frets, Positions: 5 unique
    assert.equal(isChordDoable(chord), false);
  });

  test('should return false for chord with 6 different fret positions', () => {
    const chord = [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6]];
    // Span: 6-1 = 5 frets, Positions: 6 unique
    assert.equal(isChordDoable(chord), false);
  });

  // Edge cases with open strings
  test('should return true for chord with open strings (not counted in span)', () => {
    const chord = [[1, 0], [2, 3], [3, 5]];
    // Span: 5-3 = 2 frets (0 not counted), Positions: 2 unique
    assert.equal(isChordDoable(chord), true);
  });

  test('should return true for all open strings', () => {
    const chord = [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0]];
    // No fretted positions
    assert.equal(isChordDoable(chord), true);
  });

  test('should return true for C major chord shape with open strings', () => {
    const chord = [[1, 0], [2, 1], [3, 0], [4, 2], [5, 3]];
    // Span: 3-1 = 2 frets, Positions: 3 unique (1,2,3)
    assert.equal(isChordDoable(chord), true);
  });

  test('should return false when open string + 5 fretted positions', () => {
    const chord = [[1, 0], [2, 1], [3, 2], [4, 3], [5, 4], [6, 5]];
    // Span: 5-1 = 4 frets, Positions: 5 unique (1,2,3,4,5)
    assert.equal(isChordDoable(chord), false);
  });

  // Edge cases with muted strings
  test('should return true for chord with muted strings', () => {
    const chord = [[1, 'x'], [2, 3], [3, 5], [4, 'x']];
    // Span: 5-3 = 2 frets, Positions: 2 unique
    assert.equal(isChordDoable(chord), true);
  });

  test('should return true for all muted strings', () => {
    const chord = [[1, 'x'], [2, 'x'], [3, 'x']];
    // No fretted positions
    assert.equal(isChordDoable(chord), true);
  });

  // Edge cases - empty or single note
  test('should return true for empty chord', () => {
    const chord = [];
    assert.equal(isChordDoable(chord), true);
  });

  test('should return true for single fretted note', () => {
    const chord = [[1, 5]];
    assert.equal(isChordDoable(chord), true);
  });

  test('should return true for single note with options object', () => {
    const chord = [[1, 5, { text: '1', color: 'red' }]];
    assert.equal(isChordDoable(chord), true);
  });

  // Complex realistic scenarios
  test('should handle chord with mixed open, muted, and fretted strings', () => {
    const chord = [[1, 0], [2, 'x'], [3, 5], [4, 7], [5, 0], [6, 'x']];
    // Span: 7-5 = 2 frets, Positions: 2 unique (5,7)
    assert.equal(isChordDoable(chord), true);
  });

  test('should return false for unrealistic stretch with many positions', () => {
    const chord = [[1, 3], [2, 5], [3, 7], [4, 9], [5, 11]];
    // Span: 11-3 = 8 frets, Positions: 5 unique
    assert.equal(isChordDoable(chord), false);
  });

  test('should return true for 4 different frets within 5 fret span', () => {
    const chord = [[1, 5], [2, 6], [3, 8], [4, 10]];
    // Span: 10-5 = 5 frets, Positions: 4 unique (5,6,8,10)
    assert.equal(isChordDoable(chord), true);
  });

  test('should return true for repeating fret patterns', () => {
    const chord = [[1, 3], [2, 5], [3, 3], [4, 5], [5, 3]];
    // Span: 5-3 = 2 frets, Positions: 2 unique (3,5)
    assert.equal(isChordDoable(chord), true);
  });
});
