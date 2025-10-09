/**
 * Make numbers as close as possible by adding/subtracting multiples of `period` (default 12).
 * Works for any array length >= 1.
 *
 * @template T
 * @param {{position: number, item: T}[]} xs - original numbers (assumed > 0)
 * @returns {{position: number, item: T}[]}
 */
export function bunchByPeriod<T>(xs: {
    position: number;
    item: T;
}[]): {
    position: number;
    item: T;
}[];
