//@ts-check
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {bunchByPeriod} from '../lib/bunchByPeriod.js';

describe('bunchByPeriod', () => {
  test('should throw error for empty array', () => {
    assert.throws(
      () => bunchByPeriod([]),
      /Provide a non-empty array of numbers/
    );
  });

  test('should return unchanged array for single element', () => {
    const input = [{ position: 5, item: 'A' }];
    const result = bunchByPeriod(input);
    
    assert.strictEqual(result.length, 1);
    assert.deepEqual(result, input);
  });

  test('should handle two positions close together', () => {
    const input = [
      { position: 0, item: 'C' },
      { position: 7, item: 'G' }
    ];
    const result = bunchByPeriod(input);
    
    assert.strictEqual(result.length, 2);
    // Check that original order is preserved by index
    assert.strictEqual(result[0].item, 'C');
    assert.strictEqual(result[1].item, 'G');
    // Positions should be bunched together
    const spread = Math.abs(result[1].position - result[0].position);
    assert.ok(spread <= 7); // Should be within 7 semitones
  });

  test('should bunch positions across octave boundary', () => {
    const input = [
      { position: 0, item: 'C' },
      { position: 11, item: 'B' }
    ];
    const result = bunchByPeriod(input);
    
    assert.strictEqual(result.length, 2);
    // These are only 1 semitone apart when considered circularly
    assert.strictEqual(result[0].position, 12);
    assert.strictEqual(result[1].position, 11);
  });

  test('should handle negative positions', () => {
    const input = [
      { position: -5, item: 'A' },
      { position: 7, item: 'B' }
    ];
    const result = bunchByPeriod(input);
    
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].item, 'A');
    assert.strictEqual(result[1].item, 'B');
    assert.strictEqual(result[0].position, 7);
    assert.strictEqual(result[1].position, 7);
  });

  test('should handle positions larger than 12', () => {
    const input = [
      { position: 13, item: 'C#' },  // 13 % 12 = 1
      { position: 25, item: 'C#' },  // 25 % 12 = 1
      { position: 37, item: 'C#' }   // 37 % 12 = 1
    ];
    const result = bunchByPeriod(input);
    
    assert.strictEqual(result.length, 3);
    // All should have the same remainder mod 12, so should be bunched tightly
    const positions = result.map(r => r.position);
    const min = Math.min(...positions);
    const max = Math.max(...positions);
    // Since all have same remainder, they should be bunched within 1 octave but optimally
    assert.ok(max - min <= 12); // Should be at most 12 apart (1 octave)
    // Check that all positions have the same remainder mod 12
    const remainders = positions.map(p => p % 12);
    assert.ok(remainders.every(r => r === remainders[0]));
  });

  test('should minimize spread for chord-like positions', () => {
    const input = [
      { position: 0, item: 'C' },   // C
      { position: 4, item: 'E' },   // E  
      { position: 7, item: 'G' },   // G
      { position: 12, item: 'C' }   // C (octave)
    ];
    const result = bunchByPeriod(input);
    
    assert.strictEqual(result.length, 4);
    const positions = result.map(r => r.position);
    const min = Math.min(...positions);
    const max = Math.max(...positions);
    const spread = max - min;
    assert.ok(spread <= 12); // Should fit within one octave
  });

  test('should handle the example from comments', () => {
    // Convert the example numbers to the expected format
    const input = [
      { position: 7, item: 'note1' },
      { position: 13, item: 'note2' },
      { position: 25, item: 'note3' },
      { position: 27, item: 'note4' },
      { position: 40, item: 'note5' },
      { position: 52, item: 'note6' }
    ];
    const result = bunchByPeriod(input);
    
    assert.strictEqual(result.length, 6);
    // Check that original order is preserved
    assert.strictEqual(result[0].item, 'note1');
    assert.strictEqual(result[1].item, 'note2');
    assert.strictEqual(result[2].item, 'note3');
    assert.strictEqual(result[3].item, 'note4');
    assert.strictEqual(result[4].item, 'note5');
    assert.strictEqual(result[5].item, 'note6');
    
    // Check that the spread is minimized
    const positions = result.map(r => r.position);
    const min = Math.min(...positions);
    const max = Math.max(...positions);
    const spread = max - min;
    assert.ok(spread <= 7); // Should achieve minimal spread as mentioned in comment
  });

  test('should preserve original item data', () => {
    const input = [
      { position: 0, item: { note: 'C', octave: 4 } },
      { position: 4, item: { note: 'E', octave: 4 } },
      { position: 7, item: { note: 'G', octave: 4 } }
    ];
    const result = bunchByPeriod(input);
    
    assert.strictEqual(result.length, 3);
    assert.deepEqual(result[0].item, { note: 'C', octave: 4 });
    assert.deepEqual(result[1].item, { note: 'E', octave: 4 });
    assert.deepEqual(result[2].item, { note: 'G', octave: 4 });
  });

  test('should handle evenly spaced positions', () => {
    const input = [
      { position: 0, item: 'A' },
      { position: 3, item: 'B' },
      { position: 6, item: 'C' },
      { position: 9, item: 'D' }
    ];
    const result = bunchByPeriod(input);
    
    assert.strictEqual(result.length, 4);
    // All positions should remain the same since they're evenly distributed
    const positions = result.map(r => r.position);
    const spread = Math.max(...positions) - Math.min(...positions);
    assert.strictEqual(spread, 9);
  });

  test('should find largest gap and bunch around it', () => {
    const input = [
      { position: 0, item: 'A' },   // 0
      { position: 1, item: 'B' },   // 1  
      { position: 2, item: 'C' },   // 2
      { position: 8, item: 'D' }    // 8 - large gap between 2 and 8
    ];
    const result = bunchByPeriod(input);
    
    assert.strictEqual(result.length, 4);
    const positions = result.map(r => r.position);
    const min = Math.min(...positions);
    const max = Math.max(...positions);
    // Should bunch the 0,1,2 together with the 8, avoiding the large gap
    assert.ok(max - min <= 8);
  });
});
