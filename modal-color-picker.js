// ===== INLINE COLOR PICKER =====
// Replaces modal with inline controls for better UX

(function() {
    // Current values
    let currentRed = 255;
    let currentGreen = 255;
    let currentBlue = 255;
    let currentLineWidth = 5;

    // Custom callback function
    let customCallback = function(r, g, b) {
        console.log(`Selected color: rgb(${r}, ${g}, ${b})`);
    };

    // Define color presets
    const presets = [
        { r: 255, g: 0, b: 0 },       // Red
        { r: 0, g: 255, b: 0 },       // Green
        { r: 0, g: 0, b: 255 },       // Blue
        { r: 255, g: 255, b: 0 },     // Yellow
        { r: 0, g: 255, b: 255 },     // Cyan
        { r: 255, g: 0, b: 255 },     // Magenta
        { r: 255, g: 255, b: 255 },   // White
        { r: 0, g: 0, b: 0 },         // Black
        { r: 128, g: 128, b: 128 },   // Gray
        { r: 255, g: 165, b: 0 },     // Orange
        { r: 128, g: 0, b: 128 },     // Purple
        { r: 0, g: 128, b: 0 },       // Dark Green
        { r: 139, g: 69, b: 19 },     // Brown
        { r: 255, g: 192, b: 203 },   // Pink
        { r: 64, g: 224, b: 208 },    // Turquoise
        { r: 218, g: 165, b: 32 }     // Gold
    ];

    // Function to initialize the inline color picker
    function initInlineColorPicker() {
        // Get elements
        const redSlider = document.getElementById('redSlider');
        const greenSlider = document.getElementById('greenSlider');
        const blueSlider = document.getElementById('blueSlider');
        const redInput = document.getElementById('redInput');
        const greenInput = document.getElementById('greenInput');
        const blueInput = document.getElementById('blueInput');
        const lineWidthSlider = document.getElementById('lineWidthSlider');
        const lineWidthValue = document.getElementById('lineWidthValue');
        const presetsContainer = document.getElementById('presets');
        const colorPreview = document.getElementById('colorPickerButton');

        // Exit if elements don't exist (e.g., readonly mode)
        if (!redSlider || !greenSlider || !blueSlider) {
            return;
        }

        // Function to update color preview and apply changes
        function updateColorAndApply() {
            const red = parseInt(redSlider.value);
            const green = parseInt(greenSlider.value);
            const blue = parseInt(blueSlider.value);

            currentRed = red;
            currentGreen = green;
            currentBlue = blue;

            // Update preview
            if (colorPreview) {
                const sample = colorPreview.querySelector('.color-picker-button-sample');
                if (sample) {
                    sample.style.backgroundColor = `rgb(${red}, ${green}, ${blue})`;
                }
                colorPreview.setAttribute('data-red', red);
                colorPreview.setAttribute('data-green', green);
                colorPreview.setAttribute('data-blue', blue);
            }

            // Call callback to apply color immediately
            customCallback(red, green, blue);
        }

        // Add event listeners for sliders
        redSlider.addEventListener('input', function() {
            redInput.value = this.value;
            updateColorAndApply();
        });

        greenSlider.addEventListener('input', function() {
            greenInput.value = this.value;
            updateColorAndApply();
        });

        blueSlider.addEventListener('input', function() {
            blueInput.value = this.value;
            updateColorAndApply();
        });

        // Add event listeners for number inputs
        redInput.addEventListener('input', function() {
            let value = clampValue(this.value);
            this.value = value;
            redSlider.value = value;
            updateColorAndApply();
        });

        greenInput.addEventListener('input', function() {
            let value = clampValue(this.value);
            this.value = value;
            greenSlider.value = value;
            updateColorAndApply();
        });

        blueInput.addEventListener('input', function() {
            let value = clampValue(this.value);
            this.value = value;
            blueSlider.value = value;
            updateColorAndApply();
        });

        // Add event listener for line width slider
        if (lineWidthSlider && lineWidthValue) {
            lineWidthSlider.addEventListener('input', function() {
                currentLineWidth = parseInt(this.value);
                lineWidthValue.textContent = currentLineWidth + 'px';
                if (colorPreview) {
                    colorPreview.setAttribute('data-line-width', currentLineWidth);
                }
            });
        }

        // Create color presets
        if (presetsContainer) {
            presets.forEach(preset => {
                const presetButton = document.createElement('div');
                presetButton.style.cssText = `
                    aspect-ratio: 1;
                    min-height: 20px;
                    border: 1px solid rgba(255,255,255,0.3);
                    border-radius: 4px;
                    cursor: pointer;
                    background-color: rgb(${preset.r}, ${preset.g}, ${preset.b});
                    transition: transform 0.1s, box-shadow 0.1s;
                `;
                presetButton.title = `R:${preset.r} G:${preset.g} B:${preset.b}`;

                presetButton.addEventListener('mouseenter', function() {
                    this.style.transform = 'scale(1.1)';
                    this.style.boxShadow = '0 0 8px rgba(255,255,255,0.5)';
                });

                presetButton.addEventListener('mouseleave', function() {
                    this.style.transform = 'scale(1)';
                    this.style.boxShadow = 'none';
                });

                presetButton.addEventListener('click', function() {
                    redSlider.value = preset.r;
                    greenSlider.value = preset.g;
                    blueSlider.value = preset.b;
                    redInput.value = preset.r;
                    greenInput.value = preset.g;
                    blueInput.value = preset.b;
                    updateColorAndApply();
                });

                presetsContainer.appendChild(presetButton);
            });
        }

        // Initialize with current values
        updateColorAndApply();
    }

    // Helper function to clamp values
    function clampValue(value) {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) return 0;
        return Math.min(255, Math.max(0, parsed));
    }

    // Initialize when DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initInlineColorPicker);
    } else {
        initInlineColorPicker();
    }

    // Public API (maintains compatibility with existing code)
    window.ColorPickerModal = {
        // Set a custom callback function
        setCallback: function(callback) {
            if (typeof callback === 'function') {
                customCallback = callback;
            }
        },

        // Set RGB values
        setColor: function(r, g, b) {
            currentRed = clampValue(r);
            currentGreen = clampValue(g);
            currentBlue = clampValue(b);

            // Update elements if they exist
            const redSlider = document.getElementById('redSlider');
            const greenSlider = document.getElementById('greenSlider');
            const blueSlider = document.getElementById('blueSlider');
            const redInput = document.getElementById('redInput');
            const greenInput = document.getElementById('greenInput');
            const blueInput = document.getElementById('blueInput');
            const colorPreview = document.getElementById('colorPickerButton');

            if (redSlider) {
                redSlider.value = currentRed;
                greenSlider.value = currentGreen;
                blueSlider.value = currentBlue;
                redInput.value = currentRed;
                greenInput.value = currentGreen;
                blueInput.value = currentBlue;
            }

            // Update preview
            if (colorPreview) {
                const sample = colorPreview.querySelector('.color-picker-button-sample');
                if (sample) {
                    sample.style.backgroundColor = `rgb(${currentRed}, ${currentGreen}, ${currentBlue})`;
                }
                colorPreview.setAttribute('data-red', currentRed);
                colorPreview.setAttribute('data-green', currentGreen);
                colorPreview.setAttribute('data-blue', currentBlue);
            }
        },

        // Set line width
        setLineWidth: function(width) {
            const parsed = parseInt(width, 10);
            if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) {
                currentLineWidth = parsed;

                const lineWidthSlider = document.getElementById('lineWidthSlider');
                const lineWidthValue = document.getElementById('lineWidthValue');
                const colorPreview = document.getElementById('colorPickerButton');

                if (lineWidthSlider) {
                    lineWidthSlider.value = currentLineWidth;
                }
                if (lineWidthValue) {
                    lineWidthValue.textContent = currentLineWidth + 'px';
                }
                if (colorPreview) {
                    colorPreview.setAttribute('data-line-width', currentLineWidth);
                }
            }
        },

        // Get current color and line width
        getColor: function() {
            const colorPreview = document.getElementById('colorPickerButton');
            if (colorPreview) {
                const r = parseInt(colorPreview.getAttribute('data-red')) || currentRed;
                const g = parseInt(colorPreview.getAttribute('data-green')) || currentGreen;
                const b = parseInt(colorPreview.getAttribute('data-blue')) || currentBlue;
                const w = parseInt(colorPreview.getAttribute('data-line-width')) || currentLineWidth;
                return { red: r, green: g, blue: b, lineWidth: w };
            }
            return {
                red: currentRed,
                green: currentGreen,
                blue: currentBlue,
                lineWidth: currentLineWidth
            };
        },

        // Get current line width
        getLineWidth: function() {
            const colorPreview = document.getElementById('colorPickerButton');
            if (colorPreview) {
                const w = parseInt(colorPreview.getAttribute('data-line-width'));
                if (!isNaN(w)) return w;
            }
            return currentLineWidth;
        }
    };
})();
