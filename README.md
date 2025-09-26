# Chord Renderer

A JavaScript library for working with guitar chords, voicings, and inversions.

## Description

Chord Renderer provides utilities for:
- Defining musical intervals and chord voicings
- Generating chord inversions
- Working with guitar chord fingerings and fret positions
- Converting between different chord representations

## Installation

```bash
npm install chord-renderer
```

## Usage

```javascript
import { Interval, getInversions } from 'chord-renderer';

// Define a voicing (array of 6 elements for guitar strings)
const voicing = [
  Interval.UNISON,     // High E string
  Interval.MAJOR_THIRD, // B string
  Interval.PERFECT_FIFTH, // G string
  null,                 // D string (muted)
  null,                 // A string (muted)  
  null                  // Low E string (muted)
];

// Generate inversions
const inversions = getInversions(voicing);
```

## API Reference

### Enums

#### `Interval`
Musical intervals represented as semitones:
- `UNISON: 0`
- `MINOR_SECOND: 1`
- `MAJOR_SECOND: 2`
- `MINOR_THIRD: 3`
- `MAJOR_THIRD: 4`
- `PERFECT_FOURTH: 5`
- `TRITONE: 6`
- `PERFECT_FIFTH: 7`
- `MINOR_SIXTH: 8`
- `MAJOR_SIXTH: 9`
- `MINOR_SEVENTH: 10`
- `MAJOR_SEVENTH: 11`
- `OCTAVE: 12`

### Type Definitions

- `Finger`: Number from 1 to 6 (1 is high E string)
- `Fret`: Number representing fret position
- `FingerPosition`: `[Finger, Fret, FingerOptions?]`
- `Chord`: Array of `FingerPosition`
- `Voicing`: Array of 6 elements (one per guitar string), each either an `Interval` or `null` for muted strings

### Functions

#### `getInversions(voicing)`
Generates all possible inversions of a given voicing.

**Parameters:**
- `voicing` (Voicing): Array of 6 elements representing intervals on each guitar string

**Returns:**
- Array of chords with all inversions

## Development

### Running Tests

```bash
npm test
```

Tests are located in the `test/` directory and use Node.js built-in test runner.

### Project Structure

```
chord-renderer/
├── lib/
│   └── index.js      # Main library code
├── test/             # Test files
├── package.json
├── README.md
└── LICENSE
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Changelog

### [0.0.0] - Initial Release
- Basic interval definitions
- Chord voicing utilities
- Inversion generation (work in progress)