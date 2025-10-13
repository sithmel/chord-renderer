//@ts-check

/**
 * @typedef {any} SVGuitarChord
 * @typedef {[number, number, {text?: string, color?: string, className?: string}?]} FingerPosition
 * @typedef {{fingers: FingerPosition[], barres: any[], frets?: number}} ChordConfig
 * @typedef {{text?: string, color?: string, className?: string}} FingerOptions
 */

/**
 * Default color presets for the chord editor
 */
export const COLOR_PRESETS = [
  // Top row
  '#e74c3c', '#f39c12', '#f1c40f', '#8b4513', '#229954', '#9b59b6', '#3498db',
  // Bottom row  
  '#85c1e9', '#48c9b0', '#82e5aa', '#000000', '#555555', '#999999', '#cccccc'
];

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
  constructor(container, SVGuitarChordClass) {
    this.container = container;
    this.SVGuitarChordClass = SVGuitarChordClass;
    
    /** @type {ChordConfig} */
    this.chordConfig = { fingers: [], barres: [] };
    
    /** @type {any} */
    this.config = { frets: 5, noPosition: true };
    
    this.svgChord = null;
    this.isDialogOpen = false;
    this.controlsCreated = false;
    this.currentEditElement = null;
    
    /** @type {Function|null} */
    this.changeCallback = null;
    
    // Only create controls if we have a real DOM environment
    if (typeof document !== 'undefined') {
      this.createControls();
    }
  }

  /**
   * Create controls and containers
   */
  createControls() {
    this.controlsCreated = true;
    
    // Create SVG container directly without fret selector
    this.svgContainer = document.createElement('div');
    this.svgContainer.className = 'editable-svguitar-svg';
    this.container.appendChild(this.svgContainer);
    
    // Create dialog
    this.createDialog();
  }

  /**
   * Create the edit dialog
   */
  createDialog() {
    this.dialog = document.createElement('div');
    this.dialog.className = 'editable-svguitar-dialog';
    this.dialog.style.cssText = `
      display: none;
      position: absolute;
      background: white;
      border: 2px solid #333;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 1000;
      min-width: 250px;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Edit Dot';
    title.style.cssText = 'margin: 0 0 15px 0; font-size: 16px;';

    const textLabel = document.createElement('label');
    textLabel.textContent = 'Text: ';
    textLabel.style.cssText = 'display: block; margin-bottom: 10px;';
    
    this.textInput = document.createElement('input');
    this.textInput.type = 'text';
    this.textInput.maxLength = 3;
    this.textInput.style.cssText = 'width: 38px; margin-left: 5px;';
    
    // Add real-time text change listener
    this.textInput.addEventListener('input', () => this.updateDotText());
    
    textLabel.appendChild(this.textInput);

    const colorLabel = document.createElement('label');
    colorLabel.textContent = 'Color: ';
    colorLabel.style.cssText = 'display: block; margin-bottom: 10px;';
    
    this.colorInput = document.createElement('input');
    this.colorInput.type = 'color';
    this.colorInput.value = '#000000';
    this.colorInput.style.cssText = 'margin-left: 5px; margin-bottom: 8px;';
    
    // Add real-time color change listener
    this.colorInput.addEventListener('input', () => this.updateDotColor());
    
    colorLabel.appendChild(this.colorInput);

    // Add color presets in the same section
    const colorsGrid = document.createElement('div');
    colorsGrid.style.cssText = 'display: grid; grid-template-columns: repeat(7, 20px); gap: 3px; margin-left: 5px;';
    
    COLOR_PRESETS.forEach(color => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.style.cssText = `
        width: 20px;
        height: 20px;
        border: 1px solid #ccc;
        border-radius: 3px;
        background-color: ${color};
        cursor: pointer;
        padding: 0;
      `;
      swatch.addEventListener('click', () => {
        this.colorInput.value = color;
        this.updateDotColor();
      });
      colorsGrid.appendChild(swatch);
    });
    
    colorLabel.appendChild(colorsGrid);

    const buttonDiv = document.createElement('div');
    buttonDiv.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.style.cssText = 'padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;';
    removeBtn.addEventListener('click', () => this.removeDot());

    const doneBtn = document.createElement('button');
    doneBtn.textContent = 'Done';
    doneBtn.style.cssText = 'padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;';
    doneBtn.addEventListener('click', () => this.closeDialog());

    buttonDiv.appendChild(removeBtn);
    buttonDiv.appendChild(doneBtn);

    this.dialog.appendChild(title);
    this.dialog.appendChild(textLabel);
    this.dialog.appendChild(colorLabel);
    this.dialog.appendChild(buttonDiv);

    document.body.appendChild(this.dialog);

    // Add backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'editable-svguitar-backdrop';
    this.backdrop.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 999;
    `;
    this.backdrop.addEventListener('click', () => this.closeDialog());
    document.body.appendChild(this.backdrop);
  }

  /**
   * Set chord configuration
   * @param {ChordConfig} config
   * @returns {EditableSVGuitarChord}
   */
  chord(config) {
    this.chordConfig = { ...config };
    return this;
  }

  /**
   * Configure SVGuitar options
   * @param {any} config
   * @returns {EditableSVGuitarChord}
   */
  configure(config) {
    this.config = { ...this.config, ...config };
    return this;
  }

  /**
   * Calculate dynamic fret count based on chord content
   * @returns {number} - Number of frets needed (minimum 3, max dot position + 1)
   */
  calculateDynamicFrets() {
    const { fingers } = this.chordConfig;
    
    // Find the highest fret position
    let maxFret = 0;
    for (const [, fret] of fingers) {
      if (fret > maxFret) {
        maxFret = fret;
      }
    }
    
    // Return minimum 3 frets, or highest fret + 1 for one empty fret above
    return Math.max(3, maxFret + 1);
  }

  /**
   * Draw the chord with interactive capabilities
   * @returns {EditableSVGuitarChord}
   */
  draw() {
    // Ensure controls are created if we have a DOM environment
    if (typeof document !== 'undefined' && !this.controlsCreated) {
      this.createControls();
    }
    
    // Update fret count dynamically
    this.config.frets = this.calculateDynamicFrets();
    
    // Add transparent placeholder dots for all fret positions
    const chordWithPlaceholders = this.addPlaceholderDots(this.chordConfig);
    
    // Create new SVGuitar instance only if we have an svgContainer
    if (this.svgContainer) {
      this.svgChord = new this.SVGuitarChordClass(this.svgContainer);
      this.svgChord.chord(chordWithPlaceholders).configure(this.config).draw();
      
      // Add event listeners after drawing
      this.addEventListeners();
    }
    
    return this;
  }

  /**
   * Redraw the chord
   */
  redraw() {
    if (this.svgContainer) {
      this.svgContainer.innerHTML = '';
    }
    this.draw();
  }

  /**
   * Add transparent placeholder dots for empty positions
   * @param {ChordConfig} config
   * @returns {ChordConfig}
   */
  addPlaceholderDots(config) {
    const { fingers } = config;
    const placeholders = [];
    
    // Add placeholders for all string/fret combinations (they are both 1-based)
    for (let string = 1; string <= 6; string++) {
      for (let fret = 1; fret <= this.config.frets; fret++) {
        // Skip if there's already a finger at this position
        const exists = fingers.some(([s, f]) => s === string && f === fret);
        if (!exists) {
          /** @type {FingerPosition} */
          const placeholder = [string, fret, { 
            color: 'transparent', 
            className: 'placeholder-dot',
            text: ''
          }];
          placeholders.push(placeholder);
        }
      }
    }
    
    return {
      ...config,
      fingers: [...fingers, ...placeholders]
    };
  }

  /**
   * Add event listeners to SVG elements
   */
  addEventListeners() {
    const svg = this.svgContainer.querySelector('svg');
    if (!svg) return;

    // Use event delegation on the SVG
    svg.addEventListener('click', (event) => {
      const target = /** @type {Element} */ (event.target);
      // Check if clicked on a finger circle
      if (target.tagName === 'circle' && target.classList.contains('finger-circle')) {
        this.handleDotClick(target);
      } else if (target.tagName === 'text' && target.previousElementSibling && target.previousElementSibling.tagName === 'circle' && target.previousElementSibling.classList.contains('finger-circle')) {
        this.handleDotClick(target.previousElementSibling);
      }

    });
  }

  /**
   * Handle click on a dot (finger circle)
   * @param {Element} circleElement
   */
  handleDotClick(circleElement) {
    if (this.isDialogOpen) return;

    // Store the clicked element for positioning
    this.currentEditElement = circleElement;

    // Extract string and fret from classes
    const classes = Array.from(circleElement.classList);
    const stringClass = classes.find(c => c.startsWith('finger-string-'));
    const fretClass = classes.find(c => c.startsWith('finger-fret-'));
    
    if (!stringClass || !fretClass) return;
    
    // Convert to 1-based string and fret numbers
    // also invert string number (1=high E, 6=low E)
    const string = 6 - parseInt(stringClass.replace('finger-string-', ''), 10);
    const fret = 1 + parseInt(fretClass.replace('finger-fret-', ''), 10);
    
    // Check if this is a placeholder (transparent) or existing dot
    const isPlaceholder = circleElement.getAttribute('fill') === 'transparent';
    
    if (isPlaceholder) {
      // Add new dot
      this.addDot(string, fret);
    } else {
      // Edit existing dot
      this.editDot(string, fret);
    }
  }

  /**
   * Add a new dot at the specified position
   * @param {number} string
   * @param {number} fret
   */
  addDot(string, fret) {
    // Add to fingers array
    this.chordConfig.fingers.push([string, fret, { text: '', color: '#000000' }]);
    this.redraw();
    this.triggerChange();
  }

  /**
   * Edit an existing dot
   * @param {number} string
   * @param {number} fret
   */
  editDot(string, fret) {
    // Find the finger
    const finger = this.chordConfig.fingers.find(([s, f]) => s === string && f === fret);
    if (!finger) return;

    this.currentEditFinger = finger;
    this.currentEditString = string;
    this.currentEditFret = fret;

    // Populate dialog
    this.textInput.value = finger[2]?.text || '';
    this.colorInput.value = finger[2]?.color || '#000000';

    this.openDialog();
  }

  /**
   * Open the edit dialog
   */
  openDialog() {
    this.isDialogOpen = true;
    this.dialog.style.display = 'block';
    this.backdrop.style.display = 'block';
    
    // Position dialog relative to the clicked element
    if (this.currentEditElement) {
      this.positionDialog();
    }
    
    this.textInput.focus();
  }

  /**
   * Position dialog relative to the clicked element
   */
  positionDialog() {
    if (!this.currentEditElement || !this.dialog) return;

    // Get the bounding rect of the clicked element
    const elementRect = this.currentEditElement.getBoundingClientRect();
    const dialogRect = this.dialog.getBoundingClientRect();
    
    // Calculate position
    const elementCenterX = elementRect.left + elementRect.width / 2;
    const elementCenterY = elementRect.top + elementRect.height / 2;
    
    // Position dialog to the right and slightly above the dot
    let dialogX = elementCenterX + 20;
    let dialogY = elementCenterY - dialogRect.height / 2;
    
    // Ensure dialog stays within viewport bounds
    const padding = 10;
    const maxX = window.innerWidth - dialogRect.width - padding;
    const maxY = window.innerHeight - dialogRect.height - padding;
    
    let arrowSide = 'left'; // Default: arrow points right (dot is to the left of dialog)
    
    if (dialogX > maxX) {
      // Position to the left of the dot instead
      dialogX = elementCenterX - dialogRect.width - 20;
      arrowSide = 'right'; // Arrow points left (dot is to the right of dialog)
    }
    if (dialogX < padding) dialogX = padding;
    if (dialogY < padding) dialogY = padding;
    if (dialogY > maxY) dialogY = maxY;
    
    // Apply positioning
    this.dialog.style.left = `${dialogX}px`;
    this.dialog.style.top = `${dialogY}px`;
    
    // Add arrow CSS class and calculate arrow position
    this.addArrowCSS(arrowSide, elementCenterY, dialogY, dialogRect.height);
  }

  /**
   * Add CSS arrow using ::after pseudo-element
   * @param {string} side - 'left' or 'right' indicating arrow direction
   * @param {number} dotY - Y position of the clicked dot
   * @param {number} dialogY - Y position of the dialog
   * @param {number} dialogHeight - Height of the dialog
   */
  addArrowCSS(side, dotY, dialogY, dialogHeight) {
    // Remove any existing arrow classes
    this.dialog.classList.remove('arrow-left', 'arrow-right');
    
    // Calculate arrow vertical position relative to dialog
    const arrowY = Math.max(20, Math.min(dialogHeight - 20, dotY - dialogY));
    
    // Add appropriate arrow class and set CSS custom property for position
    this.dialog.classList.add(`arrow-${side}`);
    this.dialog.style.setProperty('--arrow-y', `${arrowY}px`);
    
    // Add the CSS rules if not already added
    this.ensureArrowCSS();
  }

  /**
   * Ensure arrow CSS rules are added to the document
   */
  ensureArrowCSS() {
    if (document.getElementById('editable-svguitar-arrow-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'editable-svguitar-arrow-styles';
    style.textContent = `
      .editable-svguitar-dialog.arrow-left::after {
        content: '';
        position: absolute;
        left: -16px;
        top: var(--arrow-y, 50px);
        width: 0;
        height: 0;
        border: 8px solid transparent;
        border-right-color: white;
        transform: translateY(-50%);
      }
      
      .editable-svguitar-dialog.arrow-right::after {
        content: '';
        position: absolute;
        right: -16px;
        top: var(--arrow-y, 50px);
        width: 0;
        height: 0;
        border: 8px solid transparent;
        border-left-color: white;
        transform: translateY(-50%);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Close the edit dialog
   */
  closeDialog() {
    this.isDialogOpen = false;
    this.dialog.style.display = 'none';
    this.backdrop.style.display = 'none';
    
    // Remove arrow CSS classes
    this.dialog.classList.remove('arrow-left', 'arrow-right');
    this.dialog.style.removeProperty('--arrow-y');
    
    this.currentEditFinger = null;
    this.currentEditElement = null;
  }

  /**
   * Update dot text in real-time
   */
  updateDotText() {
    if (!this.currentEditFinger) return;
    
    // Update the finger options
    if (!this.currentEditFinger[2]) {
      this.currentEditFinger[2] = {};
    }
    
    this.currentEditFinger[2].text = this.textInput.value;
    this.redraw();
    this.triggerChange();
  }

  /**
   * Update dot color in real-time
   */
  updateDotColor() {
    if (!this.currentEditFinger) return;
    
    // Update the finger options
    if (!this.currentEditFinger[2]) {
      this.currentEditFinger[2] = {};
    }
    
    this.currentEditFinger[2].color = this.colorInput.value;
    this.redraw();
    this.triggerChange();
  }

  /**
   * Save changes to the current dot
   */
  saveDot() {
    if (!this.currentEditFinger) return;

    // Update the finger options
    if (!this.currentEditFinger[2]) {
      this.currentEditFinger[2] = {};
    }
    
    this.currentEditFinger[2].text = this.textInput.value;
    this.currentEditFinger[2].color = this.colorInput.value;

    this.closeDialog();
    this.redraw();
  }

  /**
   * Remove the current dot
   */
  removeDot() {
    if (!this.currentEditFinger) return;

    // Remove from fingers array
    const index = this.chordConfig.fingers.findIndex(
      ([s, f]) => s === this.currentEditString && f === this.currentEditFret
    );
    
    if (index >= 0) {
      this.chordConfig.fingers.splice(index, 1);
    }

    this.closeDialog();
    this.redraw();
    this.triggerChange();
  }

  /**
   * Get current chord configuration
   * @returns {ChordConfig}
   */
  getChord() {
    return { ...this.chordConfig };
  }

  /**
   * Register a callback for when the chord changes
   * @param {Function} callback - Called with updated fingers array
   * @returns {EditableSVGuitarChord}
   */
  onChange(callback) {
    this.changeCallback = callback;
    return this;
  }

  /**
   * Trigger the change callback if registered
   */
  triggerChange() {
    if (this.changeCallback && typeof this.changeCallback === 'function') {
      // Only pass the fingers array to match the expected format
      this.changeCallback([...this.chordConfig.fingers]);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.dialog && this.dialog.parentNode) {
      this.dialog.parentNode.removeChild(this.dialog);
    }
    if (this.backdrop && this.backdrop.parentNode) {
      this.backdrop.parentNode.removeChild(this.backdrop);
    }
  }
}