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
  notesToChord, 
  generateInversions,
  getAllInversions,
  getStringSets,
  VOICING,
  intervalDistanceFromNotes
} from 'chord-renderer';

// Define a set of intervals (unordered) and a string set describing which strings are used (true = used)
const notes = [
  Interval.UNISON,
  Interval.MAJOR_THIRD,
  Interval.PERFECT_FIFTH,
];
// Select any combination of 3 strings using getStringSets(3). Example: lowest 3 strings
const stringSet = [true, true, true, false, false, false]; // (low E to high E ordering internally)

// Convert to chord fingering (array of [stringNumber, fret, options])
const chord = notesToChord([...notes], [...stringSet]);
// Example result: [[6, 1, {}], [5, 3, {}], [4, 5, {}]] after normalization

// Generate simplistic rotations (generateInversions just rotates the array without octave math)
for (const rotated of generateInversions(notes)) {
  console.log('Rotation:', rotated);
}

// getAllInversions first sorts, applies a voicing strategy (e.g. DROP_2) then yields rotations
for (const voiced of getAllInversions([Interval.MAJOR_THIRD, Interval.UNISON, Interval.PERFECT_FIFTH], VOICING.DROP_2)) {
  console.log('Voiced:', voiced);
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

#### `generateInversions(notes)`
Generates all possible inversions of a given voicing.

**Parameters:**
- `notes` (Array<Interval>): Array of intervals (order is rotated each yield)

**Returns:**
- `Generator<Array<Interval>>`: Generator yielding (len-1) simple left rotations

**Example:**
```javascript
const notesExample = [Interval.UNISON, Interval.MAJOR_THIRD, Interval.PERFECT_FIFTH];
for (const inversion of generateInversions(notesExample)) {
  console.log(inversion);
}
```

#### `intervalDistanceFromNotes(notes)`
Calculates distances between successive (possibly sparse) intervals in string order, adjusting by octaves so each next sounded note is >= previous.

**Parameters:**
- `notes` (Array<number|null>): Intervals in string order (null for muted)

**Returns:**
- `Array<number | null>`: Distance in semitones from previous sounded note (null preserved)

#### `notesToChord(notes, stringSet, intervalToFingerOptions?, stringIntervals?)`
Converts an ordered list of intervals plus a boolean string usage mask into fret positions.

**Parameters:**
- `notes` (Array<Interval>): Intervals to place (consumed left-to-right)
- `stringSet` (Array<boolean>): True for each used string (low E -> high E)
- `intervalToFingerOptions` (function, optional): Map interval -> `{text?, color?, className?}`
- `stringIntervals` (Array<number>, optional): Tuning step intervals `[0,5,5,5,4,5]` default

**Returns:**
- `Chord`: Array of `[stringNumber, fret, options]` with stringNumber 6..1 (low->high becomes 6->1 after reversal)

**Example:**
```javascript
const chord = notesToChord([
  Interval.UNISON,
  Interval.MAJOR_THIRD,
  Interval.PERFECT_FIFTH
], [true,true,true,false,false,false]);
```

#### `getAllInversions(notes, voicingStrategy?)`
Sorts a note set ascending, applies a voicing transformation (CLOSE by default, or DROP variants), then yields the voiced set followed by simple rotations.

**Parameters:**
- `notes` (Array<Interval>): Unordered set of chord tones
- `voicingStrategy` (VOICING, optional): One of `VOICING.CLOSE`, `VOICING.DROP_2`, etc.

**Returns:**
- `Generator<Array<Interval>>`: First the voiced array, then (len-1) rotations

**Example:**
```javascript
for (const inversion of getAllInversions([
  Interval.MAJOR_THIRD,
  Interval.UNISON,
  Interval.PERFECT_FIFTH
], VOICING.DROP_2)) {
  console.log('Inversion:', inversion);
}
```

## TypeScript Support

This library includes TypeScript declarations generated from JSDoc comments:

```bash
npm run build:types
```

The generated types are available in `types/chord.d.ts`.

## Demo (Static Web Page)

A demo page is available in `public/` to experiment with voicings and automatically render all inversions using svguitar.

Build the bundled demo (uses esbuild):

```bash
npm run build:demo
```

This produces `public/bundle.js`. Then serve the `public/` directory with any static file server, for example:

```bash
npx http-server public
# or
python -m http.server --directory public 8080
```

Open http://localhost:8080 (or the port shown) in your browser.

 - Choose intervals (high E string is first select)
 - (Optional) Customize interval labels: after selecting intervals an "Interval Labels" section appears. Enter up to 3 chars (empty allowed to clear). Check Color if you want the predefined marker color.
 - Leave blank interval selectors for muted strings
  - Chords auto-generate once you have: at least two intervals, a voicing, and a string set selected
  - To start over, deselect intervals manually (URL updates automatically)

 ### Custom Interval Labels (Demo)
 The demo lets you override the short text and color used for each selected interval before generating voicings/inversions.
 - Label length: max 3 characters. Empty string keeps the marker but with no text.
 - Color toggle: unchecked by default; checking applies the predefined interval color.
 - Scope: affects only the current browser session; not persisted and not part of the published library API.
 - Merging: overrides are shallowly merged with the internal interval fingerOptions (text replaced; color only applied when checkbox is checked).
  - Clearing: remove intervals to clear results; label/color overrides persist per interval until interval removed or page reloaded.

 This feature is for illustrative customization only; library functions like notesToChord remain unchanged.


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