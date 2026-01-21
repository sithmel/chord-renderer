//@ts-check


/**
 * This function returns true if a chord is doable
 * @param {Array<import("svguitar").Finger>} chord
 * @return {boolean}
 */
export default function isChordDoable(chord) {
  // Step 1: Extract only fretted positions (exclude 0, 'x', null/undefined)
  const frettedPositions = chord
    .filter(finger => {
      if (!finger) return false;
      const fret = finger[1];
      return fret !== 0 && fret !== 'x' && typeof fret === 'number';
    })
    .map(finger => /** @type {number} */ (finger[1]));

  // Step 2: Edge cases - empty or single note is always doable
  if (frettedPositions.length <= 1) {
    return true;
  }

  // Step 3: Rule 1 - Check fret span (≤ 5 frets)
  const minFret = Math.min(...frettedPositions);
  const maxFret = Math.max(...frettedPositions);
  const fretSpan = maxFret - minFret;

  if (fretSpan >= 5) {
    return false;
  }

  // Step 4: Rule 2 - Check unique fret count (≤ 4 different frets)
  const uniqueFrets = new Set(frettedPositions);

  if (uniqueFrets.size > 4) {
    return false;
  }

  // Step 5: Both rules passed
  return true;
}