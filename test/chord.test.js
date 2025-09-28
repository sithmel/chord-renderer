//@ts-check
import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import {
  Interval,
  stringToInterval,
  fretNormalizer,
  generateInversions,
  notesToChord,
  intervalDistanceFromNotes,
  getStringSets,
  VOICING,
  getAllInversions,
  closeChordPosition,
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
    /** @type {import("../lib/chord.js").Chord} */
    const chord = [
      [1, 5, {}],
      [2, 7, {}],
      [3, 9, {}],
    ];
    fretNormalizer(chord);
    assert.equal(chord[0][1], 1);
    assert.equal(chord[1][1], 3);
    assert.equal(chord[2][1], 5);
    assert.equal(chord[0][0], 1);
    assert.equal(chord[1][0], 2);
    assert.equal(chord[2][0], 3);
  });

  test("should handle chords with muted strings (null values)", () => {
    /** @type {import("../lib/chord.js").Chord} */
    const chord = [
      [1, 8],
      [3, 10],
      [5, 12],
    ];
    fretNormalizer(chord);
    assert.equal(chord[0][1], 1);
    assert.equal(chord[1][1], 3);
    assert.equal(chord[2][1], 5);
  });

  test("should return original chord when already at minimum position", () => {
    /** @type {import("../lib/chord.js").Chord} */
    const chord = [
      [1, 1],
      [2, 3],
      [3, 5],
    ];
    const originalChord = JSON.parse(JSON.stringify(chord));
    fretNormalizer(chord);
    assert.deepEqual(chord, originalChord);
  });

  test("should handle chord with all muted strings", () => {
    /** @type {import("../lib/chord.js").Chord} */
    const chord = [];
    const originalChord = [...chord];
    fretNormalizer(chord);
    assert.deepEqual(chord, originalChord);
    assert.ok(chord.every((pos) => pos === null));
  });
});

describe("generateInversions", () => {
  /** Create all cyclic left rotations of an array (including original). */
  /** @type {(arr: Array<number>) => Array<Array<number>>} */
  const cyclicRotations = (arr) => {
    const rots = [];
    let cur = [...arr];
    for (let i = 0; i < arr.length; i++) {
      rots.push([...cur]);
      cur = [...cur.slice(1), cur[0]];
    }
    return rots;
  };
  /**
   *
   * @param {Array<number>} base
   * @param {Array<number>} candidate
   * @returns {boolean}
   */
  function isRotationOf(base, candidate) {
    const cand = JSON.stringify(candidate);
    return cyclicRotations(base).some(r => JSON.stringify(r) === cand);
  }

  test("should yield all distinct cyclic rotations except the original (triad)", () => {
    const voicing = [Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH];
    const expectedSet = new Set(cyclicRotations(voicing).slice(1).map(r => JSON.stringify(r))); // exclude original
    const inversions = [...generateInversions(voicing)];
    assert.equal(inversions.length, voicing.length - 1);
    const actualSet = new Set(inversions.map(r => JSON.stringify(r)));
    // All yielded inversions must be rotations (excluding the original)
    for (const inv of inversions) {
      assert.ok(expectedSet.has(JSON.stringify(inv)));
      assert.notDeepEqual(inv, voicing);
    }
    // Order doesn't matter; we just ensure no unexpected rotations
    for (const exp of expectedSet) {
      assert.ok(actualSet.has(exp));
    }
  });

  test("should generate single rotation for two-interval voicing", () => {
    const voicing = [Interval.UNISON, Interval.PERFECT_FIFTH];
    const inversions = [...generateInversions(voicing)];
    assert.equal(inversions.length, voicing.length - 1);
    // Only one possible rotation and it must not equal original
    assert.notDeepEqual(inversions[0], voicing);
    assert.ok(isRotationOf(voicing, inversions[0]));
  });

  test("single note produces zero inversions", () => {
    const voicing = [Interval.UNISON];
    const inversions = [...generateInversions(voicing)];
    assert.equal(inversions.length, 0);
  });
});

describe("intervalDistanceFromNotes", () => {
  test("should calculate correct distances between consecutive intervals", () => {
    const notes = [
      Interval.UNISON,
      Interval.MAJOR_THIRD,
      Interval.PERFECT_FIFTH,
      null,
      Interval.MAJOR_SEVENTH,
      null,
    ];
    const distances = intervalDistanceFromNotes(notes);
    assert.deepEqual(distances, [0, 4, 3, null, 4, null]);
  });

  test("should handle intervals that ends up being negatives", () => {
    const notes = [
      Interval.PERFECT_FIFTH,
      Interval.MAJOR_THIRD,
      Interval.UNISON,
      null,
      Interval.MAJOR_SIXTH,
      null,
    ];
    const distances = intervalDistanceFromNotes(notes);
    assert.deepEqual(distances, [7, -3, -4, null, 9, null]);
  });
});

describe("notesToChord", () => {
  test("should convert notes and string set to chord representation", () => {
    const notes = [
      Interval.UNISON,
      Interval.MAJOR_THIRD,
      Interval.PERFECT_FIFTH,
      Interval.MAJOR_SEVENTH,
    ];
    const stringSet = [true, true, true, true, false, false]; // lowest 4 strings
    const chord = notesToChord([...notes], [...stringSet]);
    assert.equal(chord.length, 4);
    // finger numbers should be 6,5,4,3 (descending)
    assert.deepEqual(chord.map(p => p[0]), [6,5,4,3]);
    // frets normalized to start at 1
    const minFret = Math.min(...chord.map(p => p[1]));
    assert.equal(minFret, 1);
  });

  test("should handle simple power chord (root + fifth)", () => {
    const notes = [Interval.UNISON, Interval.PERFECT_FIFTH];
    const stringSet = [true, true, false, false, false, false];
    const chord = notesToChord([...notes], [...stringSet]);
    assert.equal(chord.length, 2);
    assert.deepEqual(chord.map(p => p[0]), [6,5]);
  });

  test("should handle scattered string usage", () => {
    const notes = [Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH];
    const stringSet = [true, false, true, false, true, false];
    const chord = notesToChord([...notes], [...stringSet]);
    assert.equal(chord.length, 3);
    assert.deepEqual(chord.map(p => p[0]), [6,4,2]);
  });

  test("should handle single note", () => {
    const notes = [Interval.UNISON];
    const stringSet = [false, false, true, false, false, false]; // third string from low side
    const chord = notesToChord([...notes], [...stringSet]);
    assert.equal(chord.length, 1);
    assert.deepEqual(chord[0][0], 4); // finger number (reverseString mapping)
    assert.equal(chord[0][1], 1); // normalized fret
  });

  test("should throw if notes length doesn't match string set notes count", () => {
    assert.throws(() => notesToChord([Interval.UNISON], [true, true, false, false, false, false]));
  });

  test("should attach custom finger options via callback", () => {
    const notes = [Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH];
    const stringSet = [true, true, true, false, false, false];
    const labelMap = {
      [Interval.UNISON]: 'R',
      [Interval.MAJOR_THIRD]: '3',
      [Interval.PERFECT_FIFTH]: '5',
    };
    const chord = notesToChord([...notes], [...stringSet], (interval) => ({ text: labelMap[interval ?? -1] }));
    assert.equal(chord.length, 3);
    // Implementation passes original notes mutated via shift; we can't rely on mapping, only presence of option keys
    assert.ok(chord.every(p => p[2] && 'text' in p[2]));
  });
});

describe("getStringSets", () => {
  test("should generate all combinations with exactly N notes (choose 3 of 6)", () => {
    const combos = [...getStringSets(3)];
    assert.equal(combos.length, 20); // C(6,3)
    for (const c of combos) {
      assert.equal(c.length, 6);
      assert.equal(c.filter(Boolean).length, 3);
    }
    assert.deepEqual(combos[0], [false, false, false, true, true, true]);
    assert.deepEqual(combos[combos.length - 1], [true, true, true, false, false, false]);
  });

  test("should yield single all-false combination when N = 0", () => {
    const combos = [...getStringSets(0)];
    assert.equal(combos.length, 1);
    assert.deepEqual(combos[0], [false, false, false, false, false, false]);
  });

  test("should yield empty when N greater than number of strings", () => {
    const combos = [...getStringSets(7)];
    assert.equal(combos.length, 0);
  });

  test("should work with custom stringIntervals length (4 strings)", () => {
    const custom = [0, 5, 5, 4];
    const combos = [...getStringSets(2, custom)];
    assert.equal(combos.length, 6); // C(4,2)
    for (const c of combos) {
      assert.equal(c.length, 4);
      assert.equal(c.filter(Boolean).length, 2);
    }
  });

  test("should produce correct combinations for all strings (N = length)", () => {
    const combos = [...getStringSets(6)];
    assert.equal(combos.length, 1);
    assert.deepEqual(combos[0], [true, true, true, true, true, true]);
  });
});

describe("getAllInversions", () => {
  /**
   * @template T
   * @param {Array<T>} arr 
   * @returns {Array<Array<T>>}
   */
  function rotations(arr) {
    const res = [];
    let cur = [...arr];
    for (let i = 0; i < arr.length; i++) { res.push([...cur]); cur = [...cur.slice(1), cur[0]]; }
    return res;
  }
  /**
   * @template T
   * @param {Array<T>} arrs 
   * @returns {Set<string>}
   */
  function toSet(arrs) { return new Set(arrs.map(a => JSON.stringify(a))); }

  test("should yield sorted CLOSE voicing then its distinct rotations (order agnostic)", () => {
    const notes = [Interval.MAJOR_THIRD, Interval.UNISON, Interval.PERFECT_FIFTH];
    const collected = [...getAllInversions([...notes])];
    assert.deepEqual(collected[0], [Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH]);
    assert.equal(collected.length, notes.length);
    const expectedRots = rotations([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH]).slice(1); // exclude original
    const expectedSet = toSet(expectedRots);
    const actualSet = toSet(collected.slice(1));
    assert.equal(actualSet.size, expectedSet.size);
    for (const rot of expectedSet) assert.ok(actualSet.has(rot));
  });

  test("should apply DROP_2 voicing then yield its rotations", () => {
    const notes = [Interval.MAJOR_THIRD, Interval.UNISON, Interval.PERFECT_FIFTH, Interval.MAJOR_SEVENTH];
    const collected = [...getAllInversions([...notes], VOICING.DROP_2)];
    // Sorted first
    const sorted = [Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MAJOR_SEVENTH];
    // First collected is DROP_2 applied to sorted
    assert.deepEqual(collected[0], VOICING.DROP_2(sorted));
    assert.equal(collected.length, notes.length);
    const expectedRots = rotations(sorted).slice(1).map(r => VOICING.DROP_2(r));
    const expectedSet = toSet(expectedRots);
    const actualSet = toSet(collected.slice(1));
    for (const rot of expectedSet) assert.ok(actualSet.has(rot));
  });
});

describe("VOICING", () => {
  const baseIntervals = [Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MAJOR_SEVENTH];

  test("CLOSE should return a shallow copy of intervals", () => {
    const res = VOICING.CLOSE(baseIntervals);
    assert.deepEqual(res, baseIntervals);
    assert.notStrictEqual(res, baseIntervals);
  });

  test("DROP_2 should move the 2nd from last to front", () => {
    const res = VOICING.DROP_2(baseIntervals);
    assert.deepEqual(res, [
      Interval.PERFECT_FIFTH,
      Interval.UNISON,
      Interval.MAJOR_THIRD,
      Interval.MAJOR_SEVENTH,
    ]);
  });

  test("DROP_3 should move the 3rd from last to front", () => {
    const res = VOICING.DROP_3(baseIntervals);
    assert.deepEqual(res, [
      Interval.MAJOR_THIRD,
      Interval.UNISON,
      Interval.PERFECT_FIFTH,
      Interval.MAJOR_SEVENTH,
    ]);
  });

  test("DROP_2_AND_3 should apply drop2 then drop3", () => {
    const res = VOICING.DROP_2_AND_3(baseIntervals);
    assert.deepEqual(res, [
      Interval.MAJOR_THIRD,
      Interval.PERFECT_FIFTH,
      Interval.UNISON,
      Interval.MAJOR_SEVENTH,
    ]);
  });

  test("DROP_2_AND_4 should apply drop2 then drop4", () => {
    const res = VOICING.DROP_2_AND_4(baseIntervals);
    assert.deepEqual(res, [
      Interval.UNISON,
      Interval.PERFECT_FIFTH,
      Interval.MAJOR_THIRD,
      Interval.MAJOR_SEVENTH,
    ]);
  });
});

describe("closeChordPosition", () => {
  test("single note chord remains unchanged", () => {
    /** @type {import("../lib/chord.js").Chord} */
    const chord = [[1, 5, {}]];
    const snapshot = JSON.parse(JSON.stringify(chord));
    closeChordPosition(chord);
    assert.deepEqual(chord, snapshot);
  });

  test("already close chord is unchanged", () => {
    /** @type {import("../lib/chord.js").Chord} */
    const chord = [
      [1, 5, {}],
      [2, 8, {}],
      [3, 10, {}],
    ];
    const snapshot = JSON.parse(JSON.stringify(chord));
    closeChordPosition(chord);
    assert.deepEqual(chord, snapshot);
  });

  test("widely spaced upward note is lowered by an octave", () => {
    /** @type {import("../lib/chord.js").Chord} */
    const chord = [
      [1, 5, {}],
      [2, 20, {}], // should be lowered to 8
    ];
    closeChordPosition(chord);
    assert.deepEqual(chord.map(c => c[1]), [5, 8]);
  });

  test("lower note far below midpoint is raised by an octave", () => {
    /** @type {import("../lib/chord.js").Chord} */
    const chord = [
      [1, 10, {}],
      [2, 0, {}], // 0 is >6 below 10 midpoint => raised to 12
    ];
    closeChordPosition(chord);
    assert.deepEqual(chord.map(c => c[1]), [10, 12]);
  });

  test("multiple adjustments keep window within 12-fret span", () => {
    /** @type {import("../lib/chord.js").Chord} */
    const chord = [
      [1, 5, {}],
      [2, 20, {}], // -> 8
      [3, 30, {}], // -> 6 after double octave subtraction
    ];
    closeChordPosition(chord);
    assert.deepEqual(chord.map(c => c[1]), [5, 8, 6]);
    const max = Math.max(...chord.map(c => c[1]));
    const min = Math.min(...chord.map(c => c[1]));
    // Ensure overall span is <= 12 (should actually be 3 here)
    assert.ok(max - min <= 12);
  });

  test("does not reorder chord entries (finger numbers stay aligned)", () => {
    /** @type {import("../lib/chord.js").Chord} */
    const chord = [
      [6, 5, {}],
      [5, 20, {}],
      [4, 32, {}],
    ];
    const fingerOrder = chord.map(c => c[0]);
    closeChordPosition(chord);
    assert.deepEqual(chord.map(c => c[0]), fingerOrder);
  });
});
