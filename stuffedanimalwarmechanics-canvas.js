/*
 * jaemzware
 *
 * Canvas-based game mechanics using requestAnimationFrame instead of multiple setInterval timers
 */

// Game objects storage
let animalObjects = []; // {id, x, y, movement, speed, width, height, imageSrc, imageObj, baselineY, lastUpdate, user, animalName}
let shapeObjects = []; // {id, x, y, movement, speed, radius, color, lastUpdate, user}
let lineObjects = []; // {x1, y1, x2, y2, color, width}
let pathObjects = []; // {points: [[x,y], ...], color, width}

// Game constants
let animalPositionIncrement = 5;
let shapePositionIncrement = 8;
let radius = 10;
let lineWidth = 5;
let imageHeightPixels = 100;
let imageWidthPixels = 100;
let oldPointForLineToolX = null;
let oldPointForLineToolY = null;
const imageCache = {};

// Canvas references
let canvas = null;
let ctx = null;
let animationFrameId = null;
let backgroundImage = null;
let backgroundImageLoaded = false;

// Initialize canvas after DOM loads
document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('stuffedanimalwarcanvas');
    if (canvas) {
        // Set canvas size to match the container
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        ctx = canvas.getContext('2d');

        // Check for initial background image from CSS
        const initialBg = $(canvas).css('background-image');
        if (initialBg && initialBg !== 'none') {
            // Extract URL from CSS url() format
            const urlMatch = initialBg.match(/url\(["']?([^"')]+)["']?\)/);
            if (urlMatch && urlMatch[1]) {
                setBackgroundImage(urlMatch[1]);
            }
        }

        // Start the game loop
        startGameLoop();
    }
});

function resizeCanvas() {
    if (!canvas) return;

    const container = document.getElementById('stuffedanimalwardiv');
    if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    } else {
        // Fallback to window size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight * 0.6; // 60% of viewport height
    }
}

function getCanvasWidth() {
    return canvas ? canvas.width : 800;
}

function getCanvasHeight() {
    return canvas ? canvas.height : 600;
}

// ============================================================================
// GAME LOOP - Single requestAnimationFrame replacing all setInterval timers
// ============================================================================

function startGameLoop() {
    function gameLoop(timestamp) {
        // Clear canvas
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw background image if loaded
            if (backgroundImageLoaded && backgroundImage) {
                drawBackgroundImage();
            }

            // Draw paths (static)
            drawPaths();

            // Draw lines (static)
            drawLines();

            // Update and draw animals
            updateAndDrawAnimals(timestamp);

            // Update and draw shapes (bullets)
            updateAndDrawShapes(timestamp);

            // Check collisions
            checkCollisions();
        }

        // Continue loop
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

function stopGameLoop() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// ============================================================================
// DRAWING FUNCTIONS
// ============================================================================

function drawBackgroundImage() {
    if (!backgroundImage || !ctx || !canvas) return;

    // Calculate dimensions to maintain aspect ratio and center the image
    const canvasAspect = canvas.width / canvas.height;
    const imageAspect = backgroundImage.width / backgroundImage.height;

    let drawWidth, drawHeight, drawX, drawY;

    // Use 'contain' behavior - image fits inside canvas while maintaining aspect ratio
    if (imageAspect > canvasAspect) {
        // Image is wider than canvas
        drawWidth = canvas.width;
        drawHeight = canvas.width / imageAspect;
        drawX = 0;
        drawY = (canvas.height - drawHeight) / 2;
    } else {
        // Image is taller than canvas
        drawWidth = canvas.height * imageAspect;
        drawHeight = canvas.height;
        drawX = (canvas.width - drawWidth) / 2;
        drawY = 0;
    }

    ctx.drawImage(backgroundImage, drawX, drawY, drawWidth, drawHeight);
}

function setBackgroundImage(imageUrl) {
    if (!imageUrl) {
        backgroundImage = null;
        backgroundImageLoaded = false;
        return;
    }

    const img = new Image();
    img.onload = function() {
        backgroundImage = img;
        backgroundImageLoaded = true;
    };
    img.onerror = function() {
        console.error('Failed to load background image:', imageUrl);
        backgroundImage = null;
        backgroundImageLoaded = false;
    };
    img.src = imageUrl;
}

function drawPaths() {
    pathObjects.forEach(pathObj => {
        if (pathObj.points && pathObj.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(pathObj.points[0][0], pathObj.points[0][1]);
            for (let i = 1; i < pathObj.points.length; i++) {
                ctx.lineTo(pathObj.points[i][0], pathObj.points[i][1]);
            }
            ctx.strokeStyle = pathObj.color;
            ctx.lineWidth = pathObj.width;
            ctx.stroke();
        }
    });
}

function drawLines() {
    lineObjects.forEach(line => {
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width;
        ctx.stroke();
    });
}

function updateAndDrawAnimals(timestamp) {
    for (let i = animalObjects.length - 1; i >= 0; i--) {
        const animal = animalObjects[i];

        // Initialize lastUpdate if needed
        if (!animal.lastUpdate) {
            animal.lastUpdate = timestamp;
        }

        // Check if enough time has passed based on speed
        const elapsed = timestamp - animal.lastUpdate;
        if (elapsed >= animal.speed) {
            // Update position based on movement type
            updateAnimalPosition(animal);
            animal.lastUpdate = timestamp;
        }

        // Draw the animal
        drawAnimal(animal);
    }
}

function updateAndDrawShapes(timestamp) {
    for (let i = shapeObjects.length - 1; i >= 0; i--) {
        const shape = shapeObjects[i];

        // Initialize lastUpdate if needed
        if (!shape.lastUpdate) {
            shape.lastUpdate = timestamp;
        }

        // Check if enough time has passed based on speed
        const elapsed = timestamp - shape.lastUpdate;
        if (elapsed >= shape.speed) {
            // Update position based on movement type
            updateShapePosition(shape);
            shape.lastUpdate = timestamp;
        }

        // Draw the shape
        drawShape(shape);
    }
}

function drawAnimal(animal) {
    if (animal.imageObj && animal.imageObj.complete) {
        ctx.drawImage(animal.imageObj, animal.x, animal.y, animal.width, animal.height);
    }
}

function drawShape(shape) {
    ctx.beginPath();
    ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
    ctx.fillStyle = shape.color;
    ctx.strokeStyle = shape.color;
    ctx.fill();
    ctx.stroke();
}

// ============================================================================
// MOVEMENT UPDATE FUNCTIONS
// ============================================================================

function updateAnimalPosition(animal) {
    const canvasWidth = getCanvasWidth();
    const canvasHeight = getCanvasHeight();
    const randomIncrement = Math.floor((Math.random() * animalPositionIncrement) + 1);

    switch(animal.movement) {
        case 'UP':
            animal.y -= randomIncrement;
            if (animal.y < 0) animal.y = canvasHeight;
            break;
        case 'DOWN':
            animal.y += randomIncrement;
            if (animal.y > canvasHeight) animal.y = 0;
            break;
        case 'LEFT':
            animal.x -= randomIncrement;
            if (animal.x < 0) animal.x = canvasWidth;
            break;
        case 'RIGHT':
            animal.x += randomIncrement;
            if (animal.x > canvasWidth) animal.x = 0;
            break;
        case 'UPLEFT':
            animal.y -= randomIncrement;
            animal.x -= randomIncrement;
            if (animal.y < 0) animal.y = canvasHeight;
            if (animal.x < 0) animal.x = canvasWidth;
            break;
        case 'UPRIGHT':
            animal.y -= randomIncrement;
            animal.x += randomIncrement;
            if (animal.y < 0) animal.y = canvasHeight;
            if (animal.x > canvasWidth) animal.x = 0;
            break;
        case 'DOWNLEFT':
            animal.y += randomIncrement;
            animal.x -= randomIncrement;
            if (animal.y > canvasHeight) animal.y = 0;
            if (animal.x < 0) animal.x = canvasWidth;
            break;
        case 'DOWNRIGHT':
            animal.y += randomIncrement;
            animal.x += randomIncrement;
            if (animal.y > canvasHeight) animal.y = 0;
            if (animal.x > canvasWidth) animal.x = 0;
            break;
        case 'R-SINE':
            if (!animal.baselineY) animal.baselineY = animal.y;
            animal.x += animalPositionIncrement;
            animal.y = 50 * Math.sin(0.05 * animal.x) + animal.baselineY;
            if (animal.x > canvasWidth) {
                animal.x = 0;
                animal.y = animal.baselineY;
            }
            break;
        case 'L-SINE':
            if (!animal.baselineY) animal.baselineY = animal.y;
            animal.x -= animalPositionIncrement;
            animal.y = 50 * Math.sin(0.05 * animal.x) + animal.baselineY;
            if (animal.x < 0) {
                animal.x = canvasWidth;
                animal.y = animal.baselineY;
            }
            break;
        case 'STILL':
            // No movement
            break;
    }
}

function updateShapePosition(shape) {
    const canvasWidth = getCanvasWidth();
    const canvasHeight = getCanvasHeight();

    switch(shape.movement) {
        case 'UP':
            shape.y -= shapePositionIncrement;
            if (shape.y < 0) shape.y = canvasHeight;
            break;
        case 'DOWN':
            shape.y += shapePositionIncrement;
            if (shape.y > canvasHeight) shape.y = 0;
            break;
        case 'LEFT':
            shape.x -= shapePositionIncrement;
            if (shape.x < 0) shape.x = canvasWidth;
            break;
        case 'RIGHT':
            shape.x += shapePositionIncrement;
            if (shape.x > canvasWidth) shape.x = 0;
            break;
        case 'UPLEFT':
            shape.y -= shapePositionIncrement;
            shape.x -= shapePositionIncrement;
            if (shape.y < 0) shape.y = canvasHeight;
            if (shape.x < 0) shape.x = canvasWidth;
            break;
        case 'UPRIGHT':
            shape.y -= shapePositionIncrement;
            shape.x += shapePositionIncrement;
            if (shape.y < 0) shape.y = canvasHeight;
            if (shape.x > canvasWidth) shape.x = 0;
            break;
        case 'DOWNLEFT':
            shape.y += shapePositionIncrement;
            shape.x -= shapePositionIncrement;
            if (shape.y > canvasHeight) shape.y = 0;
            if (shape.x < 0) shape.x = canvasWidth;
            break;
        case 'DOWNRIGHT':
            shape.y += shapePositionIncrement;
            shape.x += shapePositionIncrement;
            if (shape.y > canvasHeight) shape.y = 0;
            if (shape.x > canvasWidth) shape.x = 0;
            break;
        case 'R-SINE':
            if (!shape.baselineY) shape.baselineY = shape.y;
            shape.x += shapePositionIncrement;
            shape.y = 50 * Math.sin(0.05 * shape.x) + shape.baselineY;
            if (shape.x > canvasWidth) {
                shape.x = 0;
                shape.y = shape.baselineY;
            }
            break;
        case 'L-SINE':
            if (!shape.baselineY) shape.baselineY = shape.y;
            shape.x -= shapePositionIncrement;
            shape.y = 50 * Math.sin(0.05 * shape.x) + shape.baselineY;
            if (shape.x < 0) {
                shape.x = canvasWidth;
                shape.y = shape.baselineY;
            }
            break;
        case 'STILL':
            // No movement
            break;
    }
}

// ============================================================================
// COLLISION DETECTION
// ============================================================================

function checkCollisions() {
    for (let s = shapeObjects.length - 1; s >= 0; s--) {
        const shape = shapeObjects[s];

        for (let a = animalObjects.length - 1; a >= 0; a--) {
            const animal = animalObjects[a];

            // Simple bounding box collision
            if (shape.x >= animal.x &&
                shape.x <= (animal.x + animal.width) &&
                shape.y >= animal.y &&
                shape.y <= (animal.y + animal.height)) {

                // Collision detected!
                // Remove shape
                shapeObjects.splice(s, 1);

                // Remove animal with fade effect (just remove it immediately for now)
                animalObjects.splice(a, 1);

                // Update points if the user created the bullet
                let chatClientUser = $("#chatClientUser").val();
                if (chatClientUser === "") {
                    chatClientUser = unspecifiedAlias;
                }
                if (chatClientUser === shape.user) {
                    const currentNumber = parseInt($('#points').text(), 10);
                    const newNumber = currentNumber + 1;
                    $('#points').text(newNumber);
                }

                break; // Exit animal loop since shape is removed
            }
        }
    }
}

// ============================================================================
// SOCKET EVENT HANDLERS (called from sockethandler.js)
// ============================================================================

function onBaseTapSocketEventDots(tapMsgObject) {
    const rgbValue = tapMsgObject.red + ',' + tapMsgObject.green + ',' + tapMsgObject.blue;
    const color = 'rgb(' + rgbValue + ')';

    const shape = {
        id: 'circle' + Date.now() + Math.random(),
        x: tapMsgObject.x,
        y: tapMsgObject.y,
        radius: radius,
        color: color,
        movement: tapMsgObject.movement,
        speed: tapMsgObject.speed,
        lastUpdate: null,
        user: tapMsgObject.CHATCLIENTUSER
    };

    shapeObjects.push(shape);
}

function onBaseTapSocketEventLines(tapMsgObject) {
    const rgbValue = tapMsgObject.red + ',' + tapMsgObject.green + ',' + tapMsgObject.blue;
    const color = 'rgb(' + rgbValue + ')';

    const newPointX = tapMsgObject.x;
    const newPointY = tapMsgObject.y;

    // Save off these coordinates (for drawing a line)
    if (oldPointForLineToolX === null) {
        oldPointForLineToolX = tapMsgObject.x;
        oldPointForLineToolY = tapMsgObject.y;
    }

    const line = {
        x1: oldPointForLineToolX,
        y1: oldPointForLineToolY,
        x2: newPointX,
        y2: newPointY,
        color: color,
        width: lineWidth
    };

    lineObjects.push(line);

    // Move the cursor
    oldPointForLineToolX = newPointX;
    oldPointForLineToolY = newPointY;
}

function onBaseTapSocketEventCustom(tapMsgObject) {
    if (tapMsgObject.customimage.indexOf("http://") === 0 ||
        tapMsgObject.customimage.indexOf("https://") === 0) {
        if (tapMsgObject.customimage.indexOf(".jpg") > 0 ||
            tapMsgObject.customimage.indexOf(".jpeg") > 0 ||
            tapMsgObject.customimage.indexOf(".JPG") > 0 ||
            tapMsgObject.customimage.indexOf(".gif") > 0 ||
            tapMsgObject.customimage.indexOf(".png") > 0) {
            onBaseTapSocketEventImages(tapMsgObject, tapMsgObject.customimage);
        } else {
            console.log('MESSAGE SENT DOES NOT CONTAIN A VALID ENOUGH IMAGE URL' + tapMsgObject.customimage);
        }
    }
}

function onBaseTapSocketEventImages(tapMsgObject) {
    const width = imageWidthPixels;
    const height = imageHeightPixels;
    const animalId = 'animal' + Date.now() + Math.random();

    const pointX = tapMsgObject.x - (width / 2);
    const pointY = tapMsgObject.y - (height / 2);

    const imageSrc = tapMsgObject.animal === "custom" ? tapMsgObject.customimage : tapMsgObject.animal;

    // Load or get cached image
    let imageObj;
    if (imageCache[imageSrc]) {
        imageObj = imageCache[imageSrc];
    } else {
        imageObj = new Image();
        imageObj.src = imageSrc;
        imageCache[imageSrc] = imageObj;
    }

    const animal = {
        id: animalId,
        x: pointX,
        y: pointY,
        width: width,
        height: height,
        imageSrc: imageSrc,
        imageObj: imageObj,
        movement: tapMsgObject.movement,
        speed: tapMsgObject.speed,
        lastUpdate: null,
        user: tapMsgObject.CHATCLIENTUSER,
        animalName: tapMsgObject.animalName,
        baselineY: null
    };

    animalObjects.push(animal);
}

function onBasePathSocketEvent(pathMsgObject) {
    const rgbValue = pathMsgObject.red + ',' + pathMsgObject.green + ',' + pathMsgObject.blue;
    const color = 'rgb(' + rgbValue + ')';

    const pathObj = {
        points: pathMsgObject.points,
        color: color,
        width: pathMsgObject.width || 2
    };

    pathObjects.push(pathObj);
}

function clearGameBoard() {
    // Clear all game objects
    animalObjects = [];
    shapeObjects = [];
    lineObjects = [];
    pathObjects = [];

    // Reset old point line values
    oldPointForLineToolX = null;
    oldPointForLineToolY = null;
}

function getFormattedDateToMillisecondPrecision() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;
}
