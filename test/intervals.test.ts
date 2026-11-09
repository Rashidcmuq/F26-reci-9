import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeIntervals, type Interval } from '../src/intervals';

// Read the spec in src/intervals/mergeIntervals.ts, then check your progress
// with `npm run mutants:intervals`.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The output is sorted.
// (invariant, algebraic, metamorphic, differential, or conditional)

// A first attempt at a generator. It has a problem: run the tests and read
// the counterexample.
const interval: fc.Arbitrary<Interval> = fc
  .tuple(
    fc.integer({ min: -20, max: 20 }),
    fc.integer({ min: -20, max: 20 }),
  )
  .map(([a, b]) => [Math.min(a, b), Math.max(a, b)]);

const intervalList = fc.array(interval);

describe('mergeIntervals', () => {
  const covers = (intervals: readonly Interval[], p: number) =>
    intervals.some(([s, e]) => s <= p && p <= e);

  const separatedIntervals = fc.array(
    fc.record({
      gap: fc.integer({ min: 1, max: 4 }),
      length: fc.integer({ min: 0, max: 4 }),
    }),
    { maxLength: 8 },
  ).map(parts => {
    let end = -20;
    const xs: Interval[] = [];

    for (const part of parts) {
      const start = end + part.gap;
      end = start + part.length;
      xs.push([start, end]);
    }

    return xs;
  });
  // Pattern: invariant. Every input interval lies inside some output interval.
  it('every input interval lies inside some output interval', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        const uncovered = xs.filter(([s, e]) => !out.some(([a, b]) => a <= s && e <= b));
        expect(uncovered).toEqual([]);
      }),
    );
  });

  // Add your properties here. Aim for at least one of each pattern:
  // invariant, algebraic, metamorphic, differential, conditional.
  // Pattern: invariant. Output is sorted and disjoint.
  it('returns valid, sorted, disjoint intervals', () => {
    fc.assert(fc.property(intervalList, xs => {
      const before = xs.map(([s, e]): Interval => [s, e]);
      const out = mergeIntervals(xs);

      for (const [s, e] of out) {
        expect(s).toBeLessThanOrEqual(e);
      }

      for (let i = 1; i < out.length; i++) {
        expect(out[i - 1]![1]).toBeLessThan(out[i]![0]);
      }

      expect(xs).toEqual(before);
    }));
  });

  // Pattern: differential. Input and output cover the same points.
  it('preserves coverage', () => {
    fc.assert(fc.property(intervalList, xs => {
      const out = mergeIntervals(xs);

      const endpoints = [...xs, ...out]
        .flatMap(([s, e]) => [s, e]);

      const points = endpoints
        .flatMap(p => [p - 0.5, p, p + 0.5]);

      for (const p of points) {
        expect(covers(out, p)).toBe(covers(xs, p));
      }
    }));
  });

  // Pattern: metamorphic. Order and duplicates do not matter.
  it('ignores order and duplicates', () => {
    fc.assert(fc.property(intervalList, xs => {
      const expected = mergeIntervals(xs);

      expect(mergeIntervals([...xs].reverse()))
        .toEqual(expected);

      expect(mergeIntervals([...xs, ...xs]))
        .toEqual(expected);
    }));
  });

  // Pattern: algebraic. Merging twice equals merging once.
  it('is idempotent', () => {
    fc.assert(fc.property(intervalList, xs => {
      const once = mergeIntervals(xs);
      const twice = mergeIntervals(once);

      expect(twice).toEqual(once);
    }));
  });

  // Pattern: conditional. Disjoint intervals stay separate.
  it('preserves already disjoint intervals', () => {
    fc.assert(fc.property(separatedIntervals, xs => {
      expect(mergeIntervals([...xs].reverse()))
        .toEqual(xs);
    }));
  });

});
