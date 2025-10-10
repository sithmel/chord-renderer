// @ts-nocheck

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { EditableSVGuitarChord, COLOR_PRESETS } from '../lib/editableSVGuitar.js';

// Mock SVGuitarChord class for testing
class MockSVGuitarChord {
  constructor(container) {
    this.container = container;
    this.chordConfig = {};
    this.config = {};
  }
  
  chord(config) {
    this.chordConfig = config;
    return this;
  }
  
  configure(config) {
    this.config = config;
    return this;
  }
  
  draw() {
    return this;
  }
}

describe('EditableSVGuitarChord (Core Functionality)', () => {
  test('creates instance with basic properties', () => {
    // Create minimal mock DOM elements
    const mockContainer = {
      appendChild: () => {},
      querySelector: () => null
    };
    
    const editableChord = new EditableSVGuitarChord(mockContainer, MockSVGuitarChord);
    
    assert.ok(editableChord);
    assert.equal(editableChord.container, mockContainer);
    assert.equal(editableChord.SVGuitarChordClass, MockSVGuitarChord);
    assert.deepEqual(editableChord.chordConfig, { fingers: [], barres: [] });
    assert.equal(editableChord.config.frets, 5);
    assert.equal(editableChord.isDialogOpen, false);
  });

  test('sets and gets chord configuration', () => {
    const mockContainer = { appendChild: () => {} };
    const editableChord = new EditableSVGuitarChord(mockContainer, MockSVGuitarChord);
    
    const testChord = {
      fingers: [[1, 0], [2, 2], [3, 2]],
      barres: []
    };
    
    editableChord.chord(testChord);
    const result = editableChord.getChord();
    
    assert.deepEqual(result.fingers, testChord.fingers);
    assert.deepEqual(result.barres, testChord.barres);
  });

  test('configures SVGuitar options', () => {
    const mockContainer = { appendChild: () => {} };
    const editableChord = new EditableSVGuitarChord(mockContainer, MockSVGuitarChord);
    
    const testConfig = { frets: 7, tuning: ['E', 'A', 'D', 'G', 'B', 'E'] };
    editableChord.configure(testConfig);
    
    assert.equal(editableChord.config.frets, 7);
    assert.deepEqual(editableChord.config.tuning, testConfig.tuning);
  });

  test('adds placeholder dots correctly', () => {
    const mockContainer = { appendChild: () => {} };
    const editableChord = new EditableSVGuitarChord(mockContainer, MockSVGuitarChord);
    
    const originalChord = {
      fingers: [[1, 2, { text: '1', color: '#000000' }]],
      barres: []
    };
    
    const chordWithPlaceholders = editableChord.addPlaceholderDots(originalChord);
    
    // Should have the original finger plus many placeholders
    assert.ok(chordWithPlaceholders.fingers.length > 1, 'Should add placeholder dots');
    
    // Should preserve the original finger
    const originalFinger = chordWithPlaceholders.fingers.find(([s, f, options]) => 
      s === 1 && f === 2 && options && options.color === '#000000'
    );
    assert.ok(originalFinger, 'Should preserve original finger');
    
    // Should have transparent placeholders
    const placeholders = chordWithPlaceholders.fingers.filter(([, , options]) => 
      options && options.color === 'transparent'
    );
    assert.ok(placeholders.length > 0, 'Should add transparent placeholders');
    
    // Check placeholder structure
    const firstPlaceholder = placeholders[0];
    assert.equal(firstPlaceholder.length, 3, 'Placeholder should have 3 elements');
    assert.equal(typeof firstPlaceholder[0], 'number', 'String should be number');
    assert.equal(typeof firstPlaceholder[1], 'number', 'Fret should be number');
    assert.equal(firstPlaceholder[2].color, 'transparent', 'Should be transparent');
    assert.equal(firstPlaceholder[2].className, 'placeholder-dot', 'Should have placeholder class');
  });

  test('adds new dot correctly', () => {
    const mockContainer = { appendChild: () => {} };
    const editableChord = new EditableSVGuitarChord(mockContainer, MockSVGuitarChord);
    
    editableChord.chord({ fingers: [], barres: [] });
    
    const originalFingerCount = editableChord.chordConfig.fingers.length;
    
    // Add a new dot
    editableChord.addDot(1, 3);
    
    assert.equal(editableChord.chordConfig.fingers.length, originalFingerCount + 1);
    
    const newFinger = editableChord.chordConfig.fingers.find(([s, f]) => s === 1 && f === 3);
    assert.ok(newFinger, 'Should add new finger');
    assert.equal(newFinger[2].text, '');
    assert.equal(newFinger[2].color, '#000000');
  });

  test('placeholder dots cover all string/fret combinations', () => {
    const mockContainer = { appendChild: () => {} };
    const editableChord = new EditableSVGuitarChord(mockContainer, MockSVGuitarChord);
    
    // Set frets to 3 for easier testing
    editableChord.configure({ frets: 3 });
    
    const emptyChord = { fingers: [], barres: [] };
    const chordWithPlaceholders = editableChord.addPlaceholderDots(emptyChord);
    
    // Should have placeholders for all 6 strings x 4 frets (0-3) = 24 positions
    assert.equal(chordWithPlaceholders.fingers.length, 24);
    
    // Check we have all combinations
    for (let string = 1; string <= 6; string++) {
      for (let fret = 0; fret <= 3; fret++) {
        const placeholder = chordWithPlaceholders.fingers.find(([s, f]) => s === string && f === fret);
        assert.ok(placeholder, `Should have placeholder for string ${string}, fret ${fret}`);
        assert.equal(placeholder[2].color, 'transparent');
      }
    }
  });

  test('excludes existing fingers from placeholders', () => {
    const mockContainer = { appendChild: () => {} };
    const editableChord = new EditableSVGuitarChord(mockContainer, MockSVGuitarChord);
    
    editableChord.configure({ frets: 2 });
    
    const chordWithFingers = {
      fingers: [[1, 1, { text: '1' }], [2, 2, { text: '2' }]],
      barres: []
    };
    
    const chordWithPlaceholders = editableChord.addPlaceholderDots(chordWithFingers);
    
    // Should have 2 original fingers + (6 strings * 3 frets - 2 existing) placeholders
    const expectedPlaceholders = (6 * 3) - 2;
    const expectedTotal = 2 + expectedPlaceholders;
    assert.equal(chordWithPlaceholders.fingers.length, expectedTotal);
    
    // Original fingers should not be placeholders
    const originalFingers = chordWithPlaceholders.fingers.filter(([, , options]) => 
      options && options.color !== 'transparent'
    );
    assert.equal(originalFingers.length, 2);
    
    // Should not have placeholders at the existing positions
    const placeholderAt1_1 = chordWithPlaceholders.fingers.find(([s, f, options]) => 
      s === 1 && f === 1 && options && options.color === 'transparent'
    );
    const placeholderAt2_2 = chordWithPlaceholders.fingers.find(([s, f, options]) => 
      s === 2 && f === 2 && options && options.color === 'transparent'  
    );
    
    assert.equal(placeholderAt1_1, undefined, 'Should not have placeholder where finger exists');
    assert.equal(placeholderAt2_2, undefined, 'Should not have placeholder where finger exists');
  });
});

describe('COLOR_PRESETS', () => {
  test('exports COLOR_PRESETS array', () => {
    assert.ok(Array.isArray(COLOR_PRESETS), 'COLOR_PRESETS should be an array');
    assert.ok(COLOR_PRESETS.length > 0, 'COLOR_PRESETS should not be empty');
  });

  test('COLOR_PRESETS contains valid hex colors', () => {
    COLOR_PRESETS.forEach(color => {
      assert.ok(typeof color === 'string', 'Color should be a string');
      assert.ok(/^#[0-9a-fA-F]{6}$/.test(color), `Color ${color} should be valid hex format`);
    });
  });

  test('COLOR_PRESETS does not contain white', () => {
    assert.ok(!COLOR_PRESETS.includes('#ffffff'), 'COLOR_PRESETS should not contain white');
    assert.ok(!COLOR_PRESETS.includes('#FFFFFF'), 'COLOR_PRESETS should not contain white (uppercase)');
  });
});