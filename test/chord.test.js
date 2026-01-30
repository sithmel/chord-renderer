//@ts-check
import { test, describe, beforeEach } from "node:test";
import { strict as assert } from "node:assert";
import {
  Interval,
  fretNormalizer,
  generateInversions,
  notesToChord,
  intervalDistanceFromNotes,
  getStringSets,
  VOICING,
  ALLOWED_VOICING_2,
  ALLOWED_VOICING_3,
  ALLOWED_VOICING_4,
  ALLOWED_VOICING_5,
  getAllInversions,
  closeChordPosition,
  getNameFromInterval,
 } from "../lib/chord.js";

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
    /** @type {Array<number | null>} */
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
    const frets = chord.map(p => /** @type {number} */ (p[1]));
    const minFret = Math.min(...frets);
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
    /** @type {Record<number, string>} */
    const labelMap = {
      [Interval.UNISON]: 'R',
      [Interval.MAJOR_THIRD]: '3',
      [Interval.PERFECT_FIFTH]: '5',
    };
    const chord = notesToChord([...notes], [...stringSet], (interval) => ({ text: labelMap[interval ?? -1] }));
    assert.equal(chord.length, 3);
    // Implementation passes original notes mutated via shift; we can't rely on mapping, only presence of option keys
    assert.ok(chord.every(p => p[2] && typeof p[2] === 'object' && 'text' in p[2]));
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

describe("getAllInversions VOICING", () => {
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

  test("should yield CLOSE voicing then its distinct rotations (preserves input order)", () => {
    const notes = [Interval.MAJOR_THIRD, Interval.UNISON, Interval.PERFECT_FIFTH];
    const collected = [...getAllInversions([...notes])];
    // First collected should preserve input order (not sorted)
    assert.deepEqual(collected[0], [Interval.MAJOR_THIRD, Interval.UNISON, Interval.PERFECT_FIFTH]);
    assert.equal(collected.length, notes.length);
    // Expected rotations based on original input order
    const expectedRots = rotations([Interval.MAJOR_THIRD, Interval.UNISON, Interval.PERFECT_FIFTH]).slice(1); // exclude original
    const expectedSet = toSet(expectedRots);
    const actualSet = toSet(collected.slice(1));
    assert.equal(actualSet.size, expectedSet.size);
    for (const rot of expectedSet) assert.ok(actualSet.has(rot));
  });

  test("should apply DROP_2 voicing then yield its rotations (preserves input order)", () => {
    const notes = [Interval.MAJOR_THIRD, Interval.UNISON, Interval.PERFECT_FIFTH, Interval.MAJOR_SEVENTH];
    const collected = [...getAllInversions([...notes], VOICING.DROP_2)];
    // First collected is DROP_2 applied to input order (not sorted)
    assert.deepEqual(collected[0], VOICING.DROP_2([...notes]));
    assert.equal(collected.length, notes.length);
    const expectedRots = rotations([...notes]).slice(1).map(r => VOICING.DROP_2(r));
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

  test("DROP_3_AND_2 should apply drop3 then drop2", () => {
    const res = VOICING.DROP_3_AND_2(baseIntervals);
    assert.deepEqual(res, [
      Interval.PERFECT_FIFTH,
      Interval.MAJOR_THIRD,
      Interval.UNISON,
      Interval.MAJOR_SEVENTH,
    ]);
  });
});

describe("VOICING with 5-interval arrays", () => {
  const baseIntervals5 = [
    Interval.UNISON,
    Interval.MAJOR_THIRD,
    Interval.PERFECT_FIFTH,
    Interval.MAJOR_SEVENTH,
    Interval.NINTH
  ];

  test("CLOSE should return a shallow copy of intervals", () => {
    const res = VOICING.CLOSE(baseIntervals5);
    assert.deepEqual(res, baseIntervals5);
    assert.notStrictEqual(res, baseIntervals5);
  });

  test("DROP_2 should move the 2nd from last to front", () => {
    const res = VOICING.DROP_2(baseIntervals5);
    assert.deepEqual(res, [
      Interval.MAJOR_SEVENTH,
      Interval.UNISON,
      Interval.MAJOR_THIRD,
      Interval.PERFECT_FIFTH,
      Interval.NINTH,
    ]);
  });

  test("DROP_3 should move the 3rd from last to front", () => {
    const res = VOICING.DROP_3(baseIntervals5);
    assert.deepEqual(res, [
      Interval.PERFECT_FIFTH,
      Interval.UNISON,
      Interval.MAJOR_THIRD,
      Interval.MAJOR_SEVENTH,
      Interval.NINTH,
    ]);
  });

  test("DROP_2_AND_3 should apply drop2 then drop3", () => {
    const res = VOICING.DROP_2_AND_3(baseIntervals5);
    assert.deepEqual(res, [
      Interval.PERFECT_FIFTH,
      Interval.MAJOR_SEVENTH,
      Interval.UNISON,
      Interval.MAJOR_THIRD,
      Interval.NINTH,
    ]);
  });

  test("DROP_3_AND_2 should apply drop3 then drop2", () => {
    const res = VOICING.DROP_3_AND_2(baseIntervals5);
    assert.deepEqual(res, [
      Interval.MAJOR_SEVENTH,
      Interval.PERFECT_FIFTH,
      Interval.UNISON,
      Interval.MAJOR_THIRD,
      Interval.NINTH,
    ]);
  });

  test("DROP_2_AND_5 should move the 2nd and 5th from last to front", () => {
    const res = VOICING.DROP_2_AND_5(baseIntervals5);
    assert.deepEqual(res, [
      Interval.UNISON,
      Interval.MAJOR_SEVENTH,
      Interval.MAJOR_THIRD,
      Interval.PERFECT_FIFTH,
      Interval.NINTH,
    ]);
  });

  test("DROP_3_AND_4 should move the 3rd and 4th from last to front", () => {
    const res = VOICING.DROP_3_AND_4(baseIntervals5);
    assert.deepEqual(res, [
      Interval.MAJOR_THIRD,
      Interval.PERFECT_FIFTH,
      Interval.UNISON,
      Interval.MAJOR_SEVENTH,
      Interval.NINTH,
    ]);
  });

  test("DROP_3_AND_5 should move the 3rd and 5th from last to front", () => {
    const res = VOICING.DROP_3_AND_5(baseIntervals5);
    assert.deepEqual(res, [
      Interval.UNISON,
      Interval.PERFECT_FIFTH,
      Interval.MAJOR_THIRD,
      Interval.MAJOR_SEVENTH,
      Interval.NINTH,
    ]);
  });

  test("DROP_4_AND_3 should move the 4th and 3rd from last to front", () => {
    const res = VOICING.DROP_4_AND_3(baseIntervals5);
    assert.deepEqual(res, [
      Interval.PERFECT_FIFTH,
      Interval.MAJOR_THIRD,
      Interval.UNISON,
      Interval.MAJOR_SEVENTH,
      Interval.NINTH,
    ]);
  });

  test("DROP_4_AND_2 should move the 4th and 2nd from last to front", () => {
    const res = VOICING.DROP_4_AND_2(baseIntervals5);
    assert.deepEqual(res, [
      Interval.MAJOR_SEVENTH,
      Interval.MAJOR_THIRD,
      Interval.UNISON,
      Interval.PERFECT_FIFTH,
      Interval.NINTH,
    ]);
  });

  test("DROP_2_AND_3_AND_4 should move the 2nd, 3rd, and 4th from last to front", () => {
    const res = VOICING.DROP_2_AND_3_AND_4(baseIntervals5);
    assert.deepEqual(res, [
      Interval.MAJOR_THIRD,
      Interval.PERFECT_FIFTH,
      Interval.MAJOR_SEVENTH,
      Interval.UNISON,
      Interval.NINTH,
    ]);
  });

  test("DROP_2_AND_3_AND_5 should move the 2nd, 3rd, and 5th from last to front", () => {
    const res = VOICING.DROP_2_AND_3_AND_5(baseIntervals5);
    assert.deepEqual(res, [
      Interval.UNISON,
      Interval.PERFECT_FIFTH,
      Interval.MAJOR_SEVENTH,
      Interval.MAJOR_THIRD,
      Interval.NINTH,
    ]);
  });

  test("DROP_2_AND_4_AND_3 should move the 2nd, 4th, and 3rd from last to front", () => {
    const res = VOICING.DROP_2_AND_4_AND_3(baseIntervals5);
    assert.deepEqual(res, [
      Interval.PERFECT_FIFTH,
      Interval.MAJOR_THIRD,
      Interval.MAJOR_SEVENTH,
      Interval.UNISON,
      Interval.NINTH,
    ]);
  });

  test("DROP_2_AND_4_AND_5 should move the 2nd, 4th, and 5th from last to front", () => {
    const res = VOICING.DROP_2_AND_4_AND_5(baseIntervals5);
    assert.deepEqual(res, [
      Interval.UNISON,
      Interval.MAJOR_THIRD,
      Interval.MAJOR_SEVENTH,
      Interval.PERFECT_FIFTH,
      Interval.NINTH,
    ]);
  });

  test("DROP_2_AND_5_AND_3 should move the 2nd, 5th, and 3rd from last to front", () => {
    const res = VOICING.DROP_2_AND_5_AND_3(baseIntervals5);
    assert.deepEqual(res, [
      Interval.PERFECT_FIFTH,
      Interval.UNISON,
      Interval.MAJOR_SEVENTH,
      Interval.MAJOR_THIRD,
      Interval.NINTH,
    ]);
  });

  test("DROP_2_AND_5_AND_4 should move the 2nd, 5th, and 4th from last to front", () => {
    const res = VOICING.DROP_2_AND_5_AND_4(baseIntervals5);
    assert.deepEqual(res, [
      Interval.MAJOR_THIRD,
      Interval.UNISON,
      Interval.MAJOR_SEVENTH,
      Interval.PERFECT_FIFTH,
      Interval.NINTH,
    ]);
  });

  test("DROP_3_AND_2_AND_4 should move the 3rd, 2nd, and 4th from last to front", () => {
    const res = VOICING.DROP_3_AND_2_AND_4(baseIntervals5);
    assert.deepEqual(res, [
      Interval.MAJOR_THIRD,
      Interval.MAJOR_SEVENTH,
      Interval.PERFECT_FIFTH,
      Interval.UNISON,
      Interval.NINTH,
    ]);
  });

  test("DROP_3_AND_2_AND_5 should move the 3rd, 2nd, and 5th from last to front", () => {
    const res = VOICING.DROP_3_AND_2_AND_5(baseIntervals5);
    assert.deepEqual(res, [
      Interval.UNISON,
      Interval.MAJOR_SEVENTH,
      Interval.PERFECT_FIFTH,
      Interval.MAJOR_THIRD,
      Interval.NINTH,
    ]);
  });

  test("DROP_3_AND_4_AND_2 should move the 3rd, 4th, and 2nd from last to front", () => {
    const res = VOICING.DROP_3_AND_4_AND_2(baseIntervals5);
    assert.deepEqual(res, [
      Interval.MAJOR_SEVENTH,
      Interval.MAJOR_THIRD,
      Interval.PERFECT_FIFTH,
      Interval.UNISON,
      Interval.NINTH,
    ]);
  });

  test("DROP_4_AND_2_AND_3 should move the 4th, 2nd, and 3rd from last to front", () => {
    const res = VOICING.DROP_4_AND_2_AND_3(baseIntervals5);
    assert.deepEqual(res, [
      Interval.PERFECT_FIFTH,
      Interval.MAJOR_SEVENTH,
      Interval.MAJOR_THIRD,
      Interval.UNISON,
      Interval.NINTH,
    ]);
  });

  test("DROP_4_AND_3_AND_2 should move the 4th, 3rd, and 2nd from last to front", () => {
    const res = VOICING.DROP_4_AND_3_AND_2(baseIntervals5);
    assert.deepEqual(res, [
      Interval.MAJOR_SEVENTH,
      Interval.PERFECT_FIFTH,
      Interval.MAJOR_THIRD,
      Interval.UNISON,
      Interval.NINTH,
    ]);
  });
});

describe("Inversions and Voicings Coverage", () => {

  /**
   * @param {Array<Interval>} baseIntervals
   * @param {Array<string>} voicingNames
   * @returns {Set<string>}
   */
  function getAllVoicings(baseIntervals, voicingNames) {
    
    const voicings = voicingNames.map((/** @type {string | number} */ name) => VOICING[name]);
    // Step 3: For each voicing, get all inversions and verify they are permutations
    const generatedSet = new Set();
    for (const voicing of voicings) {
      const inversions = [...getAllInversions([...baseIntervals], voicing)];
      
      for (const inversion of inversions) {
        const key = JSON.stringify(inversion);
        generatedSet.add(key);
      }
    }
    return generatedSet;
  }

  test("all voicings of all inversions produce valid permutations with 2 notes", () => {
    const baseIntervals = [
      Interval.UNISON, 
      Interval.MAJOR_THIRD,
    ];
        
    const generatedSet = getAllVoicings(baseIntervals, ALLOWED_VOICING_2);

    // Verify we generated all 24 unique permutations
    // With the current voicing system, all permutations are covered
    assert.equal(generatedSet.size, 2, 
      'Voicings and inversions should produce 2 unique permutations (all possible)');
  });

  test("all voicings of all inversions produce valid permutations with 3 notes", () => {
    const baseIntervals = [
      Interval.UNISON, 
      Interval.MAJOR_THIRD, 
      Interval.PERFECT_FIFTH
    ];
        
    const generatedSet = getAllVoicings(baseIntervals, ALLOWED_VOICING_3);

    // Verify we generated all 24 unique permutations
    // With the current voicing system, all permutations are covered
    assert.equal(generatedSet.size, 6, 
      'Voicings and inversions should produce 6 unique permutations (all possible)');
  });

  test("all voicings of all inversions produce valid permutations with 4 notes", () => {
    const baseIntervals = [
      Interval.UNISON, 
      Interval.MAJOR_THIRD, 
      Interval.PERFECT_FIFTH, 
      Interval.MAJOR_SEVENTH
    ];
        
    const generatedSet = getAllVoicings(baseIntervals, ALLOWED_VOICING_4);

    // Verify we generated all 24 unique permutations
    // With the current voicing system, all permutations are covered
    assert.equal(generatedSet.size, 24, 
      'Voicings and inversions should produce 24 unique permutations (all possible)');
  });

  test("all voicings of all inversions produce valid permutations with 5 notes", () => {
    const baseIntervals = [
      Interval.UNISON, 
      Interval.MAJOR_THIRD, 
      Interval.PERFECT_FIFTH, 
      Interval.MAJOR_SEVENTH,
      Interval.FLAT_NINTH,
    ];
        
    const generatedSet = getAllVoicings(baseIntervals, ALLOWED_VOICING_5);

    // Verify we generated all unique permutations from valid voicings
    // 24 voicings × 5 inversions each = 120 unique permutations
    assert.equal(generatedSet.size, 120, 
      'Voicings and inversions should produce 120 unique permutations from valid voicings');
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
    const frets = chord.map(c => /** @type {number} */ (c[1]));
    const max = Math.max(...frets);
    const min = Math.min(...frets);
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

describe("getNameFromInterval", () => {
  describe("Basic Triads", () => {
    test("should name major triad", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH], "C"), "C triad");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH], "D"), "D triad");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH], "F#"), "F# triad");
    });

    test("should name minor triad", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD, Interval.PERFECT_FIFTH], "C"), "Cm triad");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD, Interval.PERFECT_FIFTH], "A"), "Am triad");
    });

    test("should name diminished triad", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD, Interval.TRITONE], "B"), "Bdim triad");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD, Interval.TRITONE], "C"), "Cdim triad");
    });

    test("should name augmented triad", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.MINOR_SIXTH], "C"), "Caug triad");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.MINOR_SIXTH], "G"), "Gaug triad");
    });

    test("should handle triads without perfect 5th", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD], "C"), "");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD], "C"), "");
    });
  });

  describe("Seventh Chords", () => {
    test("should name major 7th chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MAJOR_SEVENTH], "C"), "Cmaj7");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MAJOR_SEVENTH], "F"), "Fmaj7");
    });

    test("should name dominant 7th chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH], "C"), "C7");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH], "G"), "G7");
    });

    test("should name minor 7th chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH], "C"), "Cm7");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH], "D"), "Dm7");
    });

    test("should name half-diminished chord (m7b5)", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD, Interval.TRITONE, Interval.MINOR_SEVENTH], "B"), "Bm7b5");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD, Interval.TRITONE, Interval.MINOR_SEVENTH], "C"), "Cm7b5");
    });

    test("should name diminished 7th chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD, Interval.TRITONE, Interval.MAJOR_SIXTH], "B"), "Bdim7");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD, Interval.TRITONE, Interval.MAJOR_SIXTH], "G#"), "G#dim7");
    });

    test("should handle 7th chords without perfect 5th", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.MAJOR_SEVENTH], "C"), "Cmaj7");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.MINOR_SEVENTH], "C"), "C7");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD, Interval.MINOR_SEVENTH], "C"), "Cm7");
    });
  });

  describe("Suspended Chords", () => {
    test("should name sus2 chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_SECOND, Interval.PERFECT_FIFTH], "C"), "Csus2");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_SECOND, Interval.PERFECT_FIFTH], "D"), "Dsus2");
    });

    test("should name sus4 chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.PERFECT_FOURTH, Interval.PERFECT_FIFTH], "C"), "Csus4");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.PERFECT_FOURTH, Interval.PERFECT_FIFTH], "G"), "Gsus4");
    });

    test("should name 7sus4 chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.PERFECT_FOURTH, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH], "C"), "C7sus4");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.PERFECT_FOURTH, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH], "F"), "F7sus4");
    });

    test("should handle sus chords without perfect 5th", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_SECOND], "C"), "");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.PERFECT_FOURTH], "C"), "");
    });
  });

  describe("Add Chords", () => {
    test("should name add9 chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.NINTH], "C"), "Cadd9");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.NINTH, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH], "G"), "Gadd9");
    });

    test("should name minor add9 chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD, Interval.PERFECT_FIFTH, Interval.NINTH], "C"), "Cmadd9");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.NINTH, Interval.MINOR_THIRD, Interval.PERFECT_FIFTH], "A"), "Amadd9");
    });

    test("should name add11 chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.ELEVENTH], "C"), "Cadd11");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.ELEVENTH, Interval.PERFECT_FIFTH], "F"), "Fadd11");
    });

    test("should name add13 chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.THIRTEENTH], "C"), "Cadd13");
    });
  });

  describe("Extended Chords (9th, 11th, 13th)", () => {
    test("should name dominant 9th chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH, Interval.NINTH], "C"), "C9");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.NINTH, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH], "G"), "G9");
    });

    test("should name minor 9th chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH, Interval.NINTH], "C"), "Cm9");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.NINTH, Interval.MINOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH], "D"), "Dm9");
    });

    test("should name major 9th chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MAJOR_SEVENTH, Interval.NINTH], "C"), "Cmaj9");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.NINTH, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MAJOR_SEVENTH], "F"), "Fmaj9");
    });

    test("should name 11th chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH, Interval.NINTH, Interval.ELEVENTH], "C"), "C11");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH, Interval.NINTH, Interval.ELEVENTH], "D"), "Dm11");
    });

    test("should name major 11th chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MAJOR_SEVENTH, Interval.NINTH, Interval.ELEVENTH], "C"), "Cmaj11");
    });

    test("should name 13th chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH, Interval.NINTH, Interval.THIRTEENTH], "C"), "C13");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.NINTH, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.THIRTEENTH, Interval.MINOR_SEVENTH], "G"), "G13");
    });

    test("should name major 13th chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MAJOR_SEVENTH, Interval.NINTH, Interval.THIRTEENTH], "C"), "Cmaj13");
    });

    test("should name minor 13th chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH, Interval.NINTH, Interval.THIRTEENTH], "C"), "Cm13");
    });

    test("should prioritize highest extension", () => {
      // With both 9 and 11, should use 11
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH, Interval.NINTH, Interval.ELEVENTH], "C"), "C11");
      // With 9, 11, and 13, should use 13
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH, Interval.NINTH, Interval.ELEVENTH, Interval.THIRTEENTH], "C"), "C13");
    });
  });

  describe("Altered Dominant Chords", () => {
    test("should name 7b9 chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH, Interval.FLAT_NINTH], "C"), "C7b9");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.FLAT_NINTH, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH], "G"), "G7b9");
    });

    test("should name 7#9 chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH, Interval.SHARP_NINTH], "C"), "C7#9");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.SHARP_NINTH, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH], "G"), "G7#9");
    });

    test("should name 7b5 chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.TRITONE, Interval.MINOR_SEVENTH], "C"), "C7b5");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.TRITONE, Interval.MINOR_SEVENTH], "G"), "G7b5");
    });

    test("should name 7#5 chord", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.MINOR_SIXTH, Interval.MINOR_SEVENTH], "C"), "C7#5");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.MINOR_SIXTH, Interval.MINOR_SEVENTH], "D"), "D7#5");
    });

    test("should handle combinations of alterations", () => {
      // 7b5b9
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.TRITONE, Interval.MINOR_SEVENTH, Interval.FLAT_NINTH], "C"), "C7b9");
      // 7#5#9
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.MINOR_SIXTH, Interval.MINOR_SEVENTH, Interval.SHARP_NINTH], "C"), "C7#9");
    });
  });

  describe("Complex Chord Structures", () => {
    test("should handle chords with missing 5th", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.MINOR_SEVENTH], "C"), "C7");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD, Interval.MINOR_SEVENTH], "C"), "Cm7");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.MAJOR_SEVENTH], "C"), "Cmaj7");
    });

    test("should handle chords with doubled notes", () => {
      // Doubled root
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH], "C"), "C");
      // Should still work with sets
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.PERFECT_FIFTH], "C"), "C");
    });

    test("should handle inversions (different bass note)", () => {
      // These tests verify the function works regardless of order
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH], "C"), "C triad");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.PERFECT_FIFTH, Interval.MAJOR_THIRD], "C"), "C triad");
    });

    test("should handle wide voicings", () => {
      // All intervals present, just checking it works
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.NINTH, Interval.MAJOR_THIRD, Interval.ELEVENTH, Interval.PERFECT_FIFTH, Interval.THIRTEENTH, Interval.MINOR_SEVENTH], "C"), "C13");
    });
  });

  describe("Edge Cases", () => {
    test("should return name for empty intervals", () => {
      assert.equal(getNameFromInterval([], "C"), "");
      assert.equal(getNameFromInterval([], "F#"), "");
    });

    test("should return name for root only", () => {
      assert.equal(getNameFromInterval([Interval.UNISON], "C"), "");
      assert.equal(getNameFromInterval([Interval.UNISON], "Bb"), "");
    });

    test("should handle different note names", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH], "C#"), "C# triad");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH], "Db"), "Db triad");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH], "C#/Db"), "C#/Db triad");
    });
  });

  describe("Special Cases from Music Theory", () => {
    test("should differentiate major 3rd with both intervals 3 and 4", () => {
      // When both minor 3rd and major 3rd are present, 
      // treat as major chord with #9
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.SHARP_NINTH, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH], "C"), "C7#9");
    });

    test("should handle power chords (no 3rd)", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.PERFECT_FIFTH], "C"), "C5");
    });

    test("should handle 6th chords as add13", () => {
      // Major 6th without 7th is add13
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.THIRTEENTH], "C"), "Cadd13");
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_THIRD, Interval.PERFECT_FIFTH, Interval.THIRTEENTH], "C"), "Cmadd13");
    });

    test("should handle 6/9 chord", () => {
      // With both 9 and 13 but no 7th, highest extension takes precedence
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.NINTH, Interval.THIRTEENTH], "C"), "Cadd13");
    });
  });

  describe("Interval Order Independence", () => {
    test("should produce same result regardless of interval order", () => {
      const intervals1 = [Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH];
      const intervals2 = [Interval.UNISON, Interval.MINOR_SEVENTH, Interval.PERFECT_FIFTH, Interval.MAJOR_THIRD];
      const intervals3 = [Interval.PERFECT_FIFTH, Interval.UNISON, Interval.MINOR_SEVENTH, Interval.MAJOR_THIRD];
      
      assert.equal(getNameFromInterval(intervals1, "C"), "C7");
      assert.equal(getNameFromInterval(intervals2, "C"), "C7");
      assert.equal(getNameFromInterval(intervals3, "C"), "C7");
    });

    test("should handle scattered intervals in extensions", () => {
      assert.equal(getNameFromInterval([Interval.UNISON, Interval.MINOR_SEVENTH, Interval.NINTH, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH], "C"), "C9");
      assert.equal(getNameFromInterval([Interval.NINTH, Interval.UNISON, Interval.PERFECT_FIFTH, Interval.MINOR_SEVENTH, Interval.MAJOR_THIRD], "C"), "C9");
    });
  });
});
