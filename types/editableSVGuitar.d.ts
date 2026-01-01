/**
 * @typedef {any} SVGuitarChord
 * @typedef {[number, number, {text?: string, color?: string, className?: string}?]} FingerPosition
 * @typedef {{fingers: FingerPosition[], barres: any[], frets?: number}} ChordConfig
 * @typedef {{text?: string, color?: string, className?: string}} FingerOptions
 */
/**
 * Default color presets for the chord editor
 */
export const COLOR_PRESETS: string[];
/**
 * EditableSVGuitarChord - Wrapper around SVGuitarChord that adds interactive editing capabilities
 *
 * Features:
 * - Click on fretboard to add dots
 * - Click existing dots to edit/remove them
 * - Dialog for editing dot text and color
 * - Fret count selector
 * - Maintains same interface as SVGuitarChord
 */
export class EditableSVGuitarChord {
    /**
     * @param {HTMLElement} container
     * @param {any} SVGuitarChordClass
     */
    constructor(container: HTMLElement, SVGuitarChordClass: any);
    container: HTMLElement;
    SVGuitarChordClass: any;
    /** @type {ChordConfig} */
    chordConfig: ChordConfig;
    /** @type {any} */
    config: any;
    svgChord: any;
    isDialogOpen: boolean;
    controlsCreated: boolean;
    currentEditElement: Element;
    /** @type {Function|null} */
    changeCallback: Function | null;
    /**
     * Create controls and containers
     */
    createControls(): void;
    svgContainer: HTMLDivElement;
    /**
     * Create the edit dialog
     */
    createDialog(): void;
    dialog: HTMLDivElement;
    textInput: HTMLInputElement;
    colorInput: HTMLInputElement;
    backdrop: HTMLDivElement;
    /**
     * Set chord configuration
     * @param {ChordConfig} config
     * @returns {EditableSVGuitarChord}
     */
    chord(config: ChordConfig): EditableSVGuitarChord;
    /**
     * Configure SVGuitar options
     * @param {any} config
     * @returns {EditableSVGuitarChord}
     */
    configure(config: any): EditableSVGuitarChord;
    /**
     * Calculate dynamic fret count based on chord content
     * @returns {number} - Number of frets needed (minimum 3, max dot position + 1)
     */
    calculateDynamicFrets(): number;
    /**
     * Draw the chord with interactive capabilities
     * @returns {EditableSVGuitarChord}
     */
    draw(): EditableSVGuitarChord;
    /**
     * Redraw the chord
     */
    redraw(): void;
    /**
     * Add transparent placeholder dots for empty positions
     * @param {ChordConfig} config
     * @returns {ChordConfig}
     */
    addPlaceholderDots(config: ChordConfig): ChordConfig;
    /**
     * Add event listeners to SVG elements
     */
    addEventListeners(): void;
    /**
     * Handle click on a dot (finger circle)
     * @param {Element} circleElement
     */
    handleDotClick(circleElement: Element): void;
    /**
     * Add a new dot at the specified position
     * @param {number} string
     * @param {number} fret
     */
    addDot(string: number, fret: number): void;
    /**
     * Edit an existing dot
     * @param {number} string
     * @param {number} fret
     */
    editDot(string: number, fret: number): void;
    currentEditFinger: FingerPosition;
    currentEditString: number;
    currentEditFret: number;
    /**
     * Open the edit dialog
     */
    openDialog(): void;
    /**
     * Position dialog relative to the clicked element
     */
    positionDialog(): void;
    /**
     * Add CSS arrow using ::after pseudo-element
     * @param {string} side - 'left' or 'right' indicating arrow direction
     * @param {number} dotY - Y position of the clicked dot
     * @param {number} dialogY - Y position of the dialog
     * @param {number} dialogHeight - Height of the dialog
     */
    addArrowCSS(side: string, dotY: number, dialogY: number, dialogHeight: number): void;
    /**
     * Ensure arrow CSS rules are added to the document
     */
    ensureArrowCSS(): void;
    /**
     * Close the edit dialog
     */
    closeDialog(): void;
    /**
     * Update dot text in real-time
     */
    updateDotText(): void;
    /**
     * Update dot color in real-time
     */
    updateDotColor(): void;
    /**
     * Save changes to the current dot
     */
    saveDot(): void;
    /**
     * Remove the current dot
     */
    removeDot(): void;
    /**
     * Get current chord configuration
     * @returns {ChordConfig}
     */
    getChord(): ChordConfig;
    /**
     * Register a callback for when the chord changes
     * @param {Function} callback - Called with updated fingers array
     * @returns {EditableSVGuitarChord}
     */
    onChange(callback: Function): EditableSVGuitarChord;
    /**
     * Trigger the change callback if registered
     */
    triggerChange(): void;
    /**
     * Clean up resources
     */
    destroy(): void;
}
export type SVGuitarChord = any;
export type FingerPosition = [number, number, {
    text?: string;
    color?: string;
    className?: string;
}?];
export type ChordConfig = {
    fingers: FingerPosition[];
    barres: any[];
    frets?: number;
};
export type FingerOptions = {
    text?: string;
    color?: string;
    className?: string;
};
