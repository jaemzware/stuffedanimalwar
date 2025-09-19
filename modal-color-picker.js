// ===== IMPROVED COLOR PICKER MODAL =====
// Mobile-friendly with smaller swatches and better positioning

(function() {
    // Initial RGB values
    let currentRed = 128;
    let currentGreen = 128;
    let currentBlue = 128;

    // Custom callback function (replace this with your own)
    let customCallback = function(r, g, b) {
        console.log(`Selected color: rgb(${r}, ${g}, ${b})`);
        // Your existing RGB function goes here
    };

    // Create the modal HTML structure (hidden by default)
    const modalHTML = `
  <div id="colorPickerModal" class="color-picker-modal">
    <div class="color-picker-content">
      <div class="color-picker-header">
        <h3>Select Color</h3>
        <button id="closeColorPicker" class="close-button">&times;</button>
      </div>
      
      <div class="color-picker-body">
        <div class="color-display" id="colorDisplay"></div>
        
        <div class="color-controls">
          <div class="color-control">
            <span class="color-label red-label">R:</span>
            <input type="range" min="0" max="255" value="${currentRed}" class="color-slider" id="redSlider">
            <input type="number" min="0" max="255" value="${currentRed}" class="color-input" id="redInput">
          </div>
          
          <div class="color-control">
            <span class="color-label green-label">G:</span>
            <input type="range" min="0" max="255" value="${currentGreen}" class="color-slider" id="greenSlider">
            <input type="number" min="0" max="255" value="${currentGreen}" class="color-input" id="greenInput">
          </div>
          
          <div class="color-control">
            <span class="color-label blue-label">B:</span>
            <input type="range" min="0" max="255" value="${currentBlue}" class="color-slider" id="blueSlider">
            <input type="number" min="0" max="255" value="${currentBlue}" class="color-input" id="blueInput">
          </div>
        </div>
        
        <div class="presets">
          <div class="presets-grid" id="presets"></div>
        </div>
        
        <div class="action-buttons">
          <button id="cancelColorPicker" class="cancel-button">Cancel</button>
          <button id="confirmColorPicker" class="confirm-button">Select</button>
        </div>
      </div>
    </div>
  </div>
  `;

    // Create and inject the CSS
    const modalCSS = `
  .color-picker-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    justify-content: center;
    align-items: flex-start; /* Changed from center to flex-start */
    overflow-y: auto; /* Allow scrolling */
    box-sizing: border-box;
    padding-top: 10vh; /* Add some padding at the top */
  }
  
  .color-picker-content {
    background-color: white;
    border-radius: 8px;
    width: 90%;
    max-width: 320px; /* Reduced from 360px */
    max-height: 80vh; /* Reduced from 90vh */
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    box-sizing: border-box;
    margin-bottom: 20vh; /* Ensure space at bottom */
  }
  
  .color-picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px; /* Reduced padding */
    border-bottom: 1px solid #eee;
  }
  
  .color-picker-header h3 {
    margin: 0;
    font-size: 14px; /* Smaller font */
  }
  
  .close-button {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #666;
    padding: 0;
  }
  
  .color-picker-body {
    padding: 10px; /* Reduced padding */
  }
  
  .color-display {
    width: 100%;
    height: 30px; /* Reduced height */
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 10px; /* Reduced margin */
  }
  
  .color-controls {
    display: flex;
    flex-direction: column;
    gap: 8px; /* Reduced gap */
  }
  
  .color-control {
    display: flex;
    align-items: center;
  }
  
  .color-label {
    width: 20px;
    font-weight: bold;
    font-size: 12px; /* Smaller font */
  }
  
  .red-label { color: #d32f2f; }
  .green-label { color: #388e3c; }
  .blue-label { color: #1976d2; }
  
  .color-slider {
    flex: 1;
    min-width: 100px;
    margin: 0 6px; /* Reduced margin */
    height: 8px; /* Smaller height */
  }
  
  .color-input {
    width: 40px; /* Smaller input */
    padding: 2px;
    text-align: center;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 12px; /* Smaller font */
  }
  
  .presets {
    margin-top: 10px; /* Reduced margin */
  }
  
  .presets-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 3px; /* Reduced gap */
  }
  
  .preset-button {
    aspect-ratio: 1;
    min-height: 12px; /* 50% smaller */
    border: 1px solid #ddd;
    border-radius: 3px; /* Smaller radius */
    cursor: pointer;
  }
  
  .action-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px; /* Reduced gap */
    margin-top: 10px; /* Reduced margin */
  }
  
  .cancel-button, .confirm-button {
    padding: 5px 10px; /* Reduced padding */
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    font-size: 12px; /* Smaller font */
  }
  
  .cancel-button {
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    color: #333;
  }
  
  .confirm-button {
    background-color: #1976d2;
    border: 1px solid #1976d2;
    color: white;
  }
  
  /* Button styles for the trigger button */
  .color-picker-button {
    display: inline-flex;
    align-items: center;
    padding: 0px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: #fff;
    cursor: pointer;
    font-size: 12px; /* Smaller font */
  }
  
  .color-picker-button-sample {
    width: 14px; /* Smaller sample */
    height: 14px; /* Smaller sample */
    border: 1px solid #ccc;
    border-radius: 2px;
    margin-right: 6px; /* Reduced margin */
  }
  
  /* Responsive styles */
  @media (max-width: 480px) {
    .color-picker-content {
      width: 95%;
      max-width: 280px; /* Even smaller on very small screens */
      margin-bottom: 10vh; /* Less bottom margin on small screens */
    }
    
    .presets-grid {
      grid-template-columns: repeat(8, 1fr); /* Keep 8 columns but smaller */
    }
    
    .preset-button {
      min-height: 12px; /* Very small on mobile */
    }
    
    /* Make number inputs and sliders even smaller */
    .color-input {
      width: 35px;
      font-size: 11px;
    }
    
    .color-slider {
      margin: 0 4px;
      height: 6px;
    }
    
    /* Smaller action buttons */
    .cancel-button, .confirm-button {
      padding: 4px 8px;
      font-size: 11px;
    }
  }
  `;

    // Function to initialize the color picker
    function initColorPicker() {
        // Create and append the stylesheet
        const styleEl = document.createElement('style');
        styleEl.textContent = modalCSS;
        document.head.appendChild(styleEl);

        // Create and append the modal HTML
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);

        // Initialize elements
        const modal = document.getElementById('colorPickerModal');
        const colorDisplay = document.getElementById('colorDisplay');
        const redSlider = document.getElementById('redSlider');
        const greenSlider = document.getElementById('greenSlider');
        const blueSlider = document.getElementById('blueSlider');
        const redInput = document.getElementById('redInput');
        const greenInput = document.getElementById('greenInput');
        const blueInput = document.getElementById('blueInput');
        const presetsContainer = document.getElementById('presets');
        const closeBtn = document.getElementById('closeColorPicker');
        const cancelBtn = document.getElementById('cancelColorPicker');
        const confirmBtn = document.getElementById('confirmColorPicker');

        // Define color presets - expanded set
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

        // Initialize the color display
        updateColorDisplay();

        // Add event listeners for sliders
        redSlider.addEventListener('input', function() {
            redInput.value = this.value;
            updateColorDisplay();
        });

        greenSlider.addEventListener('input', function() {
            greenInput.value = this.value;
            updateColorDisplay();
        });

        blueSlider.addEventListener('input', function() {
            blueInput.value = this.value;
            updateColorDisplay();
        });

        // Add event listeners for number inputs
        redInput.addEventListener('input', function() {
            let value = clampValue(this.value);
            redSlider.value = value;
            updateColorDisplay();
        });

        greenInput.addEventListener('input', function() {
            let value = clampValue(this.value);
            greenSlider.value = value;
            updateColorDisplay();
        });

        blueInput.addEventListener('input', function() {
            let value = clampValue(this.value);
            blueSlider.value = value;
            updateColorDisplay();
        });

        // Close modal handlers
        closeBtn.addEventListener('click', hideModal);
        cancelBtn.addEventListener('click', hideModal);

        // Handle clicking outside modal to close
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                hideModal();
            }
        });

        // Confirm button handler
        confirmBtn.addEventListener('click', function() {
            const red = parseInt(redSlider.value);
            const green = parseInt(greenSlider.value);
            const blue = parseInt(blueSlider.value);

            // Update current values
            currentRed = red;
            currentGreen = green;
            currentBlue = blue;

            // Call the custom function
            customCallback(red, green, blue);

            // Update the button color
            updateButtonColor();

            // Hide the modal
            hideModal();
        });

        // Create color presets
        presets.forEach(preset => {
            const presetButton = document.createElement('div');
            presetButton.className = 'preset-button';
            presetButton.title = `R:${preset.r} G:${preset.g} B:${preset.b}`;
            presetButton.style.backgroundColor = `rgb(${preset.r}, ${preset.g}, ${preset.b})`;

            presetButton.addEventListener('click', function() {
                redSlider.value = preset.r;
                greenSlider.value = preset.g;
                blueSlider.value = preset.b;
                redInput.value = preset.r;
                greenInput.value = preset.g;
                blueInput.value = preset.b;
                updateColorDisplay();
            });

            presetsContainer.appendChild(presetButton);
        });

        // Find or create the trigger button
        let triggerButton = document.getElementById('colorPickerButton');
        if (!triggerButton) {
            triggerButton = createTriggerButton();
            document.body.appendChild(triggerButton);
        }

        // Add event listener to the trigger button
        triggerButton.addEventListener('click', showModal);

        // Update the button color initially
        updateButtonColor();

        // Utility functions
        function updateColorDisplay() {
            const red = parseInt(redSlider.value);
            const green = parseInt(greenSlider.value);
            const blue = parseInt(blueSlider.value);

            const rgbValue = `rgb(${red}, ${green}, ${blue})`;
            colorDisplay.style.backgroundColor = rgbValue;
        }

        function clampValue(value) {
            const parsed = parseInt(value, 10);
            if (isNaN(parsed)) return 0;
            return Math.min(255, Math.max(0, parsed));
        }

        function showModal() {
            // Get the latest values from button attributes if possible
            const button = document.getElementById('colorPickerButton');
            if (button) {
                const r = parseInt(button.getAttribute('data-red'));
                const g = parseInt(button.getAttribute('data-green'));
                const b = parseInt(button.getAttribute('data-blue'));

                if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                    currentRed = r;
                    currentGreen = g;
                    currentBlue = b;
                }
            }

            // Reset the modal with current values
            redSlider.value = currentRed;
            greenSlider.value = currentGreen;
            blueSlider.value = currentBlue;
            redInput.value = currentRed;
            greenInput.value = currentGreen;
            blueInput.value = currentBlue;
            updateColorDisplay();

            // Position modal to show near top of screen for better access to buttons
            const modalContent = modal.querySelector('.color-picker-content');

            // Show the modal
            modal.style.display = 'flex';

            // Ensure buttons are visible by scrolling if needed
            const actionButtons = document.querySelector('.action-buttons');
            if (actionButtons) {
                // Give time for the modal to render before scrolling
                setTimeout(() => {
                    actionButtons.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 50);
            }
        }

        function hideModal() {
            modal.style.display = 'none';
        }

        function updateButtonColor() {
            const button = document.getElementById('colorPickerButton');
            if (button) {
                // Update data attributes
                button.setAttribute('data-red', currentRed);
                button.setAttribute('data-green', currentGreen);
                button.setAttribute('data-blue', currentBlue);

                // Update visual sample
                const buttonSample = button.querySelector('.color-picker-button-sample');
                if (buttonSample) {
                    buttonSample.style.backgroundColor = `rgb(${currentRed}, ${currentGreen}, ${currentBlue})`;
                }
            }
        }

        function createTriggerButton() {
            const button = document.createElement('button');
            button.id = 'colorPickerButton';
            button.className = 'color-picker-button';
            button.setAttribute('data-red', currentRed);
            button.setAttribute('data-green', currentGreen);
            button.setAttribute('data-blue', currentBlue);
            button.innerHTML = `
        <span class="color-picker-button-sample"></span>
        Select Color
      `;
            return button;
        }
    }

    // Initialize when DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initColorPicker);
    } else {
        initColorPicker();
    }

    // Public API to set the callback function
    window.ColorPickerModal = {
        // Set a custom callback function
        setCallback: function(callback) {
            if (typeof callback === 'function') {
                customCallback = callback;
            }
        },

        // Set initial RGB values
        setColor: function(r, g, b) {
            currentRed = clampValue(r);
            currentGreen = clampValue(g);
            currentBlue = clampValue(b);

            // Update elements if they exist
            const elements = {
                redSlider: document.getElementById('redSlider'),
                greenSlider: document.getElementById('greenSlider'),
                blueSlider: document.getElementById('blueSlider'),
                redInput: document.getElementById('redInput'),
                greenInput: document.getElementById('greenInput'),
                blueInput: document.getElementById('blueInput')
            };

            if (elements.redSlider) {
                elements.redSlider.value = currentRed;
                elements.greenSlider.value = currentGreen;
                elements.blueSlider.value = currentBlue;
                elements.redInput.value = currentRed;
                elements.greenInput.value = currentGreen;
                elements.blueInput.value = currentBlue;

                // Update display
                const colorDisplay = document.getElementById('colorDisplay');
                if (colorDisplay) {
                    colorDisplay.style.backgroundColor = `rgb(${currentRed}, ${currentGreen}, ${currentBlue})`;
                }
            }

            // Update button color and attributes
            const button = document.getElementById('colorPickerButton');
            if (button) {
                // Store values as data attributes
                button.setAttribute('data-red', currentRed);
                button.setAttribute('data-green', currentGreen);
                button.setAttribute('data-blue', currentBlue);

                // Update visual sample
                const buttonSample = button.querySelector('.color-picker-button-sample');
                if (buttonSample) {
                    buttonSample.style.backgroundColor = `rgb(${currentRed}, ${currentGreen}, ${currentBlue})`;
                }
            }
        },

        // Get current color
        getColor: function() {
            // Try to get values from button attributes first
            const button = document.getElementById('colorPickerButton');
            if (button) {
                const r = parseInt(button.getAttribute('data-red')) || currentRed;
                const g = parseInt(button.getAttribute('data-green')) || currentGreen;
                const b = parseInt(button.getAttribute('data-blue')) || currentBlue;
                return { red: r, green: g, blue: b };
            }

            // Fall back to stored values if button doesn't exist
            return {
                red: currentRed,
                green: currentGreen,
                blue: currentBlue
            };
        }
    };

    // Helper function to clamp values
    function clampValue(value) {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) return 0;
        return Math.min(255, Math.max(0, parsed));
    }
})();