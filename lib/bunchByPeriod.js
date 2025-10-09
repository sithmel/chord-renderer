/**
 * Make numbers as close as possible by adding/subtracting multiples of `period` (default 12).
 * Works for any array length >= 1.
 *
 * @template T
 * @param {{position: number, item: T}[]} xs - original numbers (assumed > 0)
 * @returns {{position: number, item: T}[]}
 */
export function bunchByPeriod(xs) {
  if (!Array.isArray(xs) || xs.length === 0) {
    throw new Error("Provide a non-empty array of numbers.");
  }
  const n = xs.length;
  if (n === 1) {
    return xs;
  }

  // Normalize to remainders in [0, 12)
  const rem = xs.map((x, index) => {
    const remainder = ((x.position % 12) + 12) % 12; // handles any sign robustly
    return { remainder, index, x };
  });

  // Sort by remainder
  const sorted = rem.slice().sort((a, b) => a.remainder - b.remainder);

  // Compute circular gaps between consecutive remainders
  const gaps = [];
  for (let j = 0; j < n - 1; j++) {
    gaps.push({ size: sorted[j + 1].remainder - sorted[j].remainder, idxAfter: j + 1 });
  }
  // wrap-around gap from last to first (+ 12)
  gaps.push({
    size: (sorted[0].remainder + 12) - sorted[n - 1].remainder,
    idxAfter: 0
  });

  // Find the largest gap; the optimal window is the complement of this gap
  let maxGap = gaps[0].size;
  let startIdx = gaps[0].idxAfter; // we "start" right after the largest gap
  for (let g = 1; g < gaps.length; g++) {
    if (gaps[g].size > maxGap) {
      maxGap = gaps[g].size;
      startIdx = gaps[g].idxAfter;
    }
  }

  // "Lift" the sorted remainders into a single interval of length 12 - maxGap
  // Keep items from startIdx..end as-is; items before startIdx get +period.
  const lifted = new Array(n);
  for (let j = 0; j < n; j++) {
    const s = sorted[j];
    const position = (j < startIdx) ? s.remainder + 12 : s.remainder;
    lifted[j] = {...s, position };
  }

  return lifted.sort((a, b) => a.index - b.index).map((item) => {
    const { position, x } = item;
    return { position, item: x.item };
  });
}

