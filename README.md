# Chord Renderer

A JavaScript library for working with guitar chords, voicings, and inversions. It is designed for creating chords that can be rendered using [svguitar](https://github.com/omnibrain/svguitar)

## Description

Chord Renderer provides utilities for:
- Generating chord inversions
- Converting voicings to actual fret positions on guitar using svguitar

## Installation

```bash
npm install chord-renderer
```

## Usage

```javascript
import { 
  Interval, 
  stringToInterval,
  voicingToChord, 
  generateInversions,
  getAllInversions
} from 'chord-renderer';

// Define a voicing (array of 6 elements for guitar strings)
const voicing = [
  Interval.PERFECT_FIFTH, // String 0: High E (6th string)
  Interval.UNISON,        // String 1: B (5th string)
  Interval.MAJOR_THIRD,   // String 2: G (4th string) 
  Interval.MAJOR_SEVENTH, // String 3: D (3rd string)
  null,                   // String 4: A (2nd string - muted)
  null                    // String 5: Low E (1st string - muted)
];

// Convert voicing to chord fingering
const chord = voicingToChord(voicing);
// Result: [[6, 2, {}], [5, 2, {}], [4, 1, {}], [3, 3, {}]]

// Generate all inversions
for (const inversion of generateInversions(voicing)) {
  const inversionChord = voicingToChord(inversion);
  console.log('Inversion:', inversionChord);
}
```

## API Reference

### Constants

#### `Interval`
Musical intervals represented as semitones from the root:
```javascript
Interval.UNISON         // 0
Interval.MINOR_SECOND   // 1
Interval.MAJOR_SECOND   // 2
Interval.MINOR_THIRD    // 3
Interval.MAJOR_THIRD    // 4
Interval.PERFECT_FOURTH // 5
Interval.TRITONE        // 6
Interval.PERFECT_FIFTH  // 7
Interval.MINOR_SIXTH    // 8
Interval.MAJOR_SIXTH    // 9
Interval.MINOR_SEVENTH  // 10
Interval.MAJOR_SEVENTH  // 11
```

#### `INVERSIONS`
Mapping of intervals to their inversions:
```javascript
INVERSIONS.UNISON        // 'UNISON'
INVERSIONS.MINOR_SECOND  // 'MAJOR_SEVENTH'
INVERSIONS.MAJOR_SECOND  // 'MINOR_SEVENTH'
// ... etc
```

#### `INTERVAL_ALIASES`
Array of regex patterns and their corresponding intervals for parsing string notation.

#### `GUITAR_STANDARD_TUNING_INTERVALS`
Standard guitar tuning intervals between adjacent strings:
```javascript
[0, 5, 5, 5, 4, 5] // E-A-D-G-B-E
```

### Type Definitions

```javascript
// Basic types
Finger         // number: 1 to 6 (1 is high E string)
Fret          // number: fret position
FingerOptions // {text?: string, color?: string, className?: string}
FingerPosition // [Finger, Fret, FingerOptions?]
Chord         // Array<FingerPosition>
Voicing       // [Interval|null, Interval|null, Interval|null, Interval|null, Interval|null, Interval|null]
```

### Functions

#### `stringToInterval(str)`
Converts string notation to interval value.

**Parameters:**
- `str` (string): Interval notation (e.g., "1", "b3", "5", "ii", "#4")

**Returns:**
- `Interval | null`: Corresponding interval or null if not found

**Examples:**
```javascript
stringToInterval("1")    // Interval.UNISON (0)
stringToInterval("b3")   // Interval.MINOR_THIRD (3)
stringToInterval("5")    // Interval.PERFECT_FIFTH (7)
stringToInterval("vii")  // Interval.MAJOR_SEVENTH (11)
stringToInterval("invalid") // null
```

#### `fretNormalizer(chord)`
Normalizes a chord by moving all fret positions to the lowest possible position.

**Parameters:**
- `chord` (Chord): Array of finger positions to normalize

**Returns:**
- `void`: Modifies the chord in-place

**Example:**
```javascript
const chord = [[1, 5], [2, 7], [3, 9]];
fretNormalizer(chord);
// Result: [[1, 1], [2, 3], [3, 5]]
```

#### `generateInversions(voicing)`
Generates all possible inversions of a given voicing.

**Parameters:**
- `voicing` (Voicing): Array of 6 intervals (or null for muted strings)

**Returns:**
- `Generator<Voicing>`: Generator yielding all inversions

**Example:**
```javascript
const voicing = [Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, null, null, null];
for (const inversion of generateInversions(voicing)) {
  console.log(inversion);
}
```

#### `intervalDistanceFromVoicing(voicing)`
Calculates the interval distances between consecutive notes in a voicing.

**Parameters:**
- `voicing` (Voicing): Array of 6 intervals

**Returns:**
- `Array<number | null>`: Distances between consecutive intervals

#### `voicingToChord(voicing, intervalToFingerOptions?, stringIntervals?)`
Converts a voicing to actual fret positions on guitar.

**Parameters:**
- `voicing` (Voicing): Array of 6 intervals representing the chord
- `intervalToFingerOptions` (function, optional): Function to generate finger options
- `stringIntervals` (Array<number>, optional): Guitar tuning intervals

**Returns:**
- `Chord`: Array of finger positions `[guitarString, fret, options]`

**Example:**
```javascript
const voicing = [Interval.PERFECT_FIFTH, Interval.UNISON, Interval.MAJOR_THIRD, null, null, null];
const chord = voicingToChord(voicing);
// Result: [[6, 2, {}], [5, 2, {}], [4, 1, {}]]
```

#### `getAllInversions(voicing)`
Generates the original voicing and all its inversions as chord fingerings.

**Parameters:**
- `voicing` (Voicing): Array of 6 intervals

**Returns:**
- `Generator<Chord>`: Generator yielding chord fingerings for original and all inversions

**Example:**
```javascript
const voicing = [Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH, null, null, null];
for (const chord of getAllInversions(voicing)) {
  console.log('Chord:', chord);
}
```

## TypeScript Support

This library includes TypeScript declarations generated from JSDoc comments:

```bash
npm run build:types
```

The generated types are available in `types/chord.d.ts`.

## Development

### Running Tests

```bash
npm test
npm run test:watch  # Watch mode
```

### Generate Type Declarations

```bash
npm run build:types
```

### Project Structure

```
chord-renderer/
├── lib/
│   └── chord.js      # Main library code
├── test/             # Test files
├── types/            # Generated TypeScript declarations
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.