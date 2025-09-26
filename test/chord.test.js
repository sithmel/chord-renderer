import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import {
  Interval,
  stringToInterval,
  fretNormalizer,
  generateInversions,
  voicingToChord,
  intervalDistanceFromVoicing,
} from "../lib/chord.js";

describe("stringToInterval", () => {
  test("should return correct intervals for basic numeric patterns", () => {
    assert.equal(stringToInterval("1"), Interval.UNISON);
    assert.equal(stringToInterval("2"), Interval.MAJOR_SECOND);
    assert.equal(stringToInterval("3"), Interval.MAJOR_THIRD);
    assert.equal(stringToInterval("4"), Interval.PERFECT_FOURTH);
    assert.equal(stringToInterval("5"), Interval.PERFECT_FIFTH);
    assert.equal(stringToInterval("6"), Interval.MAJOR_SIXTH);
    assert.equal(stringToInterval("7"), Interval.MAJOR_SEVENTH);
  });

  test("should return correct intervals for flat/sharp patterns", () => {
    assert.equal(stringToInterval("b2"), Interval.MINOR_SECOND);
    assert.equal(stringToInterval("b3"), Interval.MINOR_THIRD);
    assert.equal(stringToInterval("b5"), Interval.TRITONE);
    assert.equal(stringToInterval("#4"), Interval.TRITONE);
    assert.equal(stringToInterval("b6"), Interval.MINOR_SIXTH);
    assert.equal(stringToInterval("b7"), Interval.MINOR_SEVENTH);
    assert.equal(stringToInterval("#2"), Interval.MINOR_THIRD);
    assert.equal(stringToInterval("#9"), Interval.MINOR_THIRD);
    assert.equal(stringToInterval("#11"), Interval.TRITONE);
  });

  test("should return correct intervals for Roman numeral patterns", () => {
    assert.equal(stringToInterval("i"), Interval.UNISON);
    assert.equal(stringToInterval("ii"), Interval.MAJOR_SECOND);
    assert.equal(stringToInterval("iii"), Interval.MAJOR_THIRD);
    assert.equal(stringToInterval("iv"), Interval.PERFECT_FOURTH);
    assert.equal(stringToInterval("v"), Interval.PERFECT_FIFTH);
    assert.equal(stringToInterval("vi"), Interval.MAJOR_SIXTH);
    assert.equal(stringToInterval("vii"), Interval.MAJOR_SEVENTH);

    // Flat Roman numerals
    assert.equal(stringToInterval("bii"), Interval.MINOR_SECOND);
    assert.equal(stringToInterval("biii"), Interval.MINOR_THIRD);
    assert.equal(stringToInterval("bvi"), Interval.MINOR_SIXTH);
    assert.equal(stringToInterval("bvii"), Interval.MINOR_SEVENTH);
  });

  test("should return correct intervals for extended chord patterns", () => {
    assert.equal(stringToInterval("13"), Interval.MAJOR_SIXTH);
    assert.equal(stringToInterval("b13"), Interval.MINOR_SIXTH);
    assert.equal(stringToInterval("bb7"), Interval.MAJOR_SIXTH);
    assert.equal(stringToInterval("bbvii"), Interval.MAJOR_SIXTH);
  });

  test("should be case insensitive", () => {
    assert.equal(stringToInterval("I"), Interval.UNISON);
    assert.equal(stringToInterval("II"), Interval.MAJOR_SECOND);
    assert.equal(stringToInterval("III"), Interval.MAJOR_THIRD);
    assert.equal(stringToInterval("IV"), Interval.PERFECT_FOURTH);
    assert.equal(stringToInterval("V"), Interval.PERFECT_FIFTH);
    assert.equal(stringToInterval("VI"), Interval.MAJOR_SIXTH);
    assert.equal(stringToInterval("VII"), Interval.MAJOR_SEVENTH);

    // Mixed case
    assert.equal(stringToInterval("B2"), Interval.MINOR_SECOND);
    assert.equal(stringToInterval("B3"), Interval.MINOR_THIRD);
    assert.equal(stringToInterval("BiI"), Interval.MINOR_SECOND);
    assert.equal(stringToInterval("BvI"), Interval.MINOR_SIXTH);
  });

  test("should return null for invalid patterns", () => {
    assert.equal(stringToInterval("8"), null);
    assert.equal(stringToInterval("9"), null);
    assert.equal(stringToInterval("invalid"), null);
    assert.equal(stringToInterval(""), null);
    assert.equal(stringToInterval("x"), null);
    assert.equal(stringToInterval("123"), null);
    assert.equal(stringToInterval("#"), null);
    assert.equal(stringToInterval("b"), null);
  });

  test("should handle edge cases", () => {
    assert.equal(stringToInterval("11"), null); // Should not match #11
    assert.equal(stringToInterval("#iv"), Interval.TRITONE);
    assert.equal(stringToInterval("#II"), Interval.MINOR_THIRD);
    assert.equal(stringToInterval("b5"), Interval.TRITONE);
    assert.equal(stringToInterval("#4"), Interval.TRITONE);
  });

  test("should handle exact pattern matching", () => {
    // These should not match because they don't match the exact pattern
    assert.equal(stringToInterval("12"), null); // Not just '1'
    assert.equal(stringToInterval("b23"), null); // Not just 'b2'
    assert.equal(stringToInterval("iii4"), null); // Not just 'iii'

    // These should match because they match the exact pattern (anchored with ^ and $)
    assert.equal(stringToInterval("1"), Interval.UNISON);
    assert.equal(stringToInterval("b2"), Interval.MINOR_SECOND);
    assert.equal(stringToInterval("iii"), Interval.MAJOR_THIRD);
  });
});

describe("fretNormalizer", () => {
  test("should normalize chord frets to lowest position", () => {
    // Create a chord with frets 5, 7, 9
    const chord = [
      [1, 5], // String 1, fret 5
      [2, 7], // String 2, fret 7
      [3, 9], // String 3, fret 9
    ];

    // After normalization, should be 0, 2, 4 (all reduced by 5)
    fretNormalizer(chord);

    assert.equal(chord[0][1], 1); // First fret should be 1
    assert.equal(chord[1][1], 3); // Second fret should be 3
    assert.equal(chord[2][1], 5); // Third fret should be 5

    // String numbers should remain unchanged
    assert.equal(chord[0][0], 1);
    assert.equal(chord[1][0], 2);
    assert.equal(chord[2][0], 3);
  });

  test("should handle chords with muted strings (null values)", () => {
    // Create a chord with some muted strings
    const chord = [
      [1, 8], // String 1, fret 8
      null, // String 2, muted
      [3, 10], // String 3, fret 10
      null, // String 4, muted
      [5, 12], // String 5, fret 12
    ];

    // After normalization, frets should be reduced by (8-1) = 7
    fretNormalizer(chord);

    assert.equal(chord[0][1], 1); // 8 - 7 = 1
    assert.equal(chord[1], null); // Should remain null
    assert.equal(chord[2][1], 3); // 10 - 7 = 3
    assert.equal(chord[3], null); // Should remain null
    assert.equal(chord[4][1], 5); // 12 - 7 = 5
  });

  test("should return original chord when already at minimum position", () => {
    // Create a chord that's already normalized (starts at fret 1)
    const chord = [
      [1, 1], // String 1, fret 1
      [2, 3], // String 2, fret 3
      [3, 5], // String 3, fret 5
    ];

    // Store original values for comparison
    const originalChord = JSON.parse(JSON.stringify(chord));

    fretNormalizer(chord);

    // Should remain unchanged since it's already at minimum
    assert.deepEqual(chord, originalChord);
  });

  test("should handle chord with all muted strings", () => {
    // Create a chord with all muted strings
    const chord = [null, null, null, null, null, null];

    // Store original for comparison
    const originalChord = [...chord];

    fretNormalizer(chord);

    // Should remain unchanged
    assert.deepEqual(chord, originalChord);
    assert.ok(chord.every((pos) => pos === null));
  });
});

describe("generateInversions", () => {
  test("should generate correct inversions for a simple triad voicing", () => {
    // Create a C major triad voicing: C(root), E(major third), G(perfect fifth)
    const voicing = [
      Interval.UNISON, // String 0: Root (C)
      Interval.MAJOR_THIRD, // String 1: Major third (E)
      Interval.PERFECT_FIFTH, // String 2: Perfect fifth (G)
      null, // String 3: Muted
      null, // String 4: Muted
      null, // String 5: Muted
    ];

    // Generate inversions using the generator
    const inversions = [...generateInversions(voicing)];

    // Should generate 2 inversions
    assert.equal(inversions.length, 2);
    console.log(inversions);
    // Both inversions are currently the same due to implementation
    assert.deepEqual(inversions[0], [
      Interval.MAJOR_THIRD,
      Interval.PERFECT_FIFTH,
      Interval.UNISON,
      null,
      null,
      null,
    ]);
    assert.deepEqual(inversions[1], [
      Interval.PERFECT_FIFTH,
      Interval.UNISON,
      Interval.MAJOR_THIRD,
      null,
      null,
      null,
    ]);
  });

  test("should handle voicing with only two intervals", () => {
    // Create a simple two-note voicing: C and G (power chord)
    const voicing = [
      Interval.UNISON, // String 0: Root (C)
      null, // String 1: Muted
      Interval.PERFECT_FIFTH, // String 2: Perfect fifth (G)
      null, // String 3: Muted
      null, // String 4: Muted
      null, // String 5: Muted
    ];

    const inversions = [...generateInversions(voicing)];

    // Should generate 1 inversion (2 intervals - 1 = 1)
    assert.equal(inversions.length, 1);

    // First inversion: G, C
    assert.deepEqual(inversions[0], [
      Interval.PERFECT_FIFTH, // G on string 0
      null, // String 1: Muted
      Interval.UNISON, // C on string 2
      null, // String 3: Muted
      null, // String 4: Muted
      null, // String 5: Muted
    ]);
  });

  test("should handle voicing with different string positions", () => {
    // Create a voicing on different strings: strings 1, 3, 5
    const voicing = [
      null, // String 0: Muted
      Interval.UNISON, // String 1: Root (C)
      null, // String 2: Muted
      Interval.MAJOR_THIRD, // String 3: Major third (E)
      null, // String 4: Muted
      Interval.PERFECT_FIFTH, // String 5: Perfect fifth (G)
    ];

    const inversions = [...generateInversions(voicing)];

    // Should generate 2 inversions
    assert.equal(inversions.length, 2);

    // First inversion: E, G, C (on strings 1, 3, 5)
    assert.deepEqual(inversions[0], [
      null, // String 0: Muted
      Interval.MAJOR_THIRD, // E on string 1
      null, // String 2: Muted
      Interval.PERFECT_FIFTH, // G on string 3
      null, // String 4: Muted
      Interval.UNISON, // C on string 5
    ]);

    // Second inversion: G, C, E (on strings 1, 3, 5)
    assert.deepEqual(inversions[1], [
      null, // String 0: Muted
      Interval.PERFECT_FIFTH, // G on string 1
      null, // String 2: Muted
      Interval.UNISON, // C on string 3
      null, // String 4: Muted
      Interval.MAJOR_THIRD, // E on string 5
    ]);
  });

  test("should return empty generator for single interval voicing", () => {
    // Create a voicing with only one interval
    const voicing = [
      Interval.UNISON, // String 0: Root (C)
      null, // String 1: Muted
      null, // String 2: Muted
      null, // String 3: Muted
      null, // String 4: Muted
      null, // String 5: Muted
    ];

    const inversions = [...generateInversions(voicing)];

    // Should generate 0 inversions (1 interval - 1 = 0)
    assert.equal(inversions.length, 0);
  });
});

describe("intervalDistanceFromVoicing", () => {
  test("should calculate correct distances between consecutive intervals", () => {
    // Create a voicing with intervals: C, E, G (0, 4, 7)
    const voicing = [
      Interval.UNISON, // String 0: 0
      Interval.MAJOR_THIRD, // String 1: 4 
      Interval.PERFECT_FIFTH, // String 2: 7
      null, // String 3: Muted
      Interval.MAJOR_SEVENTH, // String 4: 11
      null, // String 5: Muted
    ];

    const distances = intervalDistanceFromVoicing(voicing);

    // Expected distances:
    // String 0: 0 - 0 = 0 (first interval, distance from previous 0)
    // String 1: 4 - 0 = 4 (distance from 0 to 4)
    // String 2: 7 - 4 = 3 (distance from 4 to 7)
    // String 3: null (muted string)
    // String 4: 11 - 7 = 4 (distance from 7 to 11)
    // String 5: null (muted string)
    assert.deepEqual(distances, [0, 4, 3, null, 4, null]);
  });

  test("should handle intervals that require octave adjustment", () => {
    // Create a voicing where intervals go down and need octave adjustment
    const voicing = [
      Interval.PERFECT_FIFTH, // String 0: 7
      Interval.MAJOR_THIRD, // String 1: 4 (lower than previous, should become 4 + 12 = 16)
      Interval.UNISON, // String 2: 0 (lower than previous, should become 0 + 12 = 12)
      null, // String 3: Muted
      Interval.MAJOR_SIXTH, // String 4: 9 (lower than previous 16, should become 9 + 12 = 21)
      null, // String 5: Muted
    ];

    const distances = intervalDistanceFromVoicing(voicing);

    // Expected distances:
    // String 0: 7 - 0 = 7 (first interval)
    // String 1: 16 - 7 = 9 (4 + 12 - 7)
    // String 2: 12 - 16 = -4, but actually 12 + 12 - 16 = 8 (0 + 12 - 16, then +12 again)
    // String 3: null (muted)
    // String 4: 21 - 24 = -3, but actually 21 - 12 = 9 (9 + 12 - 12)
    // String 5: null (muted)
    assert.deepEqual(distances, [7, 9, 8, null, 9, null]);
  });

  test("should handle voicing with scattered intervals across strings", () => {
    // Create a voicing with intervals on non-consecutive strings
    const voicing = [
      null, // String 0: Muted
      Interval.MINOR_THIRD, // String 1: 3
      null, // String 2: Muted
      null, // String 3: Muted
      Interval.PERFECT_FIFTH, // String 4: 7
      Interval.MAJOR_SEVENTH, // String 5: 11
    ];

    const distances = intervalDistanceFromVoicing(voicing);

    // Expected distances:
    // String 0: null (muted)
    // String 1: 3 - 0 = 3 (first non-null interval)
    // String 2: null (muted)
    // String 3: null (muted)
    // String 4: 7 - 3 = 4 (distance from 3 to 7)
    // String 5: 11 - 7 = 4 (distance from 7 to 11)
    assert.deepEqual(distances, [null, 3, null, null, 4, 4]);
  });

  test("should handle ascending intervals in reverse string order", () => {
    // Create a voicing where intervals ascend but are placed on strings in reverse order
    const voicing = [
      Interval.MAJOR_SEVENTH, // String 0: 11
      Interval.PERFECT_FIFTH, // String 1: 7 (lower, should become 7 + 12 = 19)
      Interval.MAJOR_THIRD, // String 2: 4 (lower, should become 4 + 12 = 16)
      Interval.UNISON, // String 3: 0 (lower, should become 0 + 12 = 12)
      null, // String 4: Muted
      null, // String 5: Muted
    ];

    const distances = intervalDistanceFromVoicing(voicing);

    // Expected distances:
    // String 0: 11 - 0 = 11 (first interval)
    // String 1: 19 - 11 = 8 (7 + 12 - 11)
    // String 2: 16 - 19 = -3, but should be 16 + 12 - 19 = 9
    // String 3: 12 - 28 = -16, but should be 12 + 12 - 28 = -4, then +12 = 8
    // String 4: null (muted)
    // String 5: null (muted)
    assert.deepEqual(distances, [11, 8, 9, 8, null, null]);
  });
});

describe.only("voicingToChord", () => {
  test("should convert voicing to chord representation correctly", () => {
    // Create a voicing: C, E, G (root position)
    const voicing = [
      Interval.PERFECT_FIFTH, // String 0: Fifth (G)
      Interval.UNISON, // String 1: Root (C)
      Interval.MAJOR_THIRD, // String 2: Major third (E)
      Interval.MAJOR_SEVENTH, // String 3: Major seventh (B)
      null, // String 4: Muted
      null, // String 5: Muted
    ];

    const chord = voicingToChord(voicing);

    // Assert the chord representation
    assert.deepEqual(chord, [
      [6, 2, {}], // String 1 (7-6), fret 2
      [5, 2, {}], // String 2 (7-5), fret 2
      [4, 1, {}], // String 3 (7-4), fret 1
      [3, 3, {}], // String 4 (7-3), fret 3
    ]);
  });
});
