/* 
 * jaemzware
 *
 * CONTROL SHAPES ON THE STUFFEDANIMALWAR GAMEBOARD. THERE ARE NO SOCKET CALLS IN HERE.  THESE ARE RESPONSES TO THE
 * SERVER PUSH OVER SOCKET, I BELIEVE
 */
let animalObjects = []; //{'objectId':'','timerId':'','xAxisAttr':'',yAxisAttr:''}
let shapeObjects = []; //{'objectId':'','timerId':'','xAxisAttr':'',yAxisAttr:''}
let animalPositionIncrement = 5; //distance animal moves each reposition
let shapePositionIncrement = 8; //distance shape moves each reposition
let radius = 10; //RADIUS of the dot shape to draw
let lineWidth = 5; //width of the line shape to draw
let imageHeightPixels = 100; //height of the stuffed animals
let imageWidthPixels = 100; //width of the stuffed animals
let oldPointForLineToolX = null;
let oldPointForLineToolY = null;
const imageCache = {};

function moveAnimalObjectUp(animalObjectId,animalXAxisAttr,animalYAxisAttr) {
    let xPosition = $('#'+animalObjectId).attr(animalXAxisAttr);    //get the current location
    let yPosition = $('#'+animalObjectId).attr(animalYAxisAttr);    //get the current location
    let svgHeight = $('#stuffedanimalwarsvg').height();
    if(yPosition>0){    //if still on the gameboard
        //randomize the distance of how much each animal moves
        let randomAnimalPositionIncrement=Math.floor((Math.random() * animalPositionIncrement) + 1);
        yPosition=parseInt(yPosition)-parseInt(randomAnimalPositionIncrement);        //update the coordinates
        xPosition=parseInt(xPosition);        //update the coordinates
        $('#'+animalObjectId).attr(animalYAxisAttr,yPosition);
        $('#'+animalObjectId).attr(animalXAxisAttr,xPosition);
    }
    else{
        $('#'+animalObjectId).attr(animalYAxisAttr,svgHeight);
        $('#'+animalObjectId).attr(animalXAxisAttr,xPosition);
    }  
}
function moveAnimalObjectLeft(animalObjectId,animalXAxisAttr,animalYAxisAttr) {
    let xPosition = $('#'+animalObjectId).attr(animalXAxisAttr);    //get the current location
    let yPosition = $('#'+animalObjectId).attr(animalYAxisAttr);    //get the current location
    let svgWidth = $('#stuffedanimalwarsvg').width();
    if(xPosition>0){    //if still on the gameboard
        //randomize the distance of how much each animal moves
        let randomAnimalPositionIncrement=Math.floor((Math.random() * animalPositionIncrement) + 1);
        yPosition=parseInt(yPosition);        //update the coordinates
        xPosition=parseInt(xPosition)-parseInt(randomAnimalPositionIncrement);        //update the coordinates
        $('#'+animalObjectId).attr(animalYAxisAttr,yPosition);
        $('#'+animalObjectId).attr(animalXAxisAttr,xPosition);
    }
    else{
        $('#'+animalObjectId).attr(animalYAxisAttr,yPosition);
        $('#'+animalObjectId).attr(animalXAxisAttr,svgWidth);
    }  
}
function moveAnimalObjectDown(animalObjectId,animalXAxisAttr,animalYyAxisAttr) {
    //get the current location
    let yPosition = $('#'+animalObjectId).attr(animalYyAxisAttr);
    let xPosition = $('#'+animalObjectId).attr(animalXAxisAttr);
    let svgHeight = $('#stuffedanimalwarsvg').height();
    if(yPosition<svgHeight){     //if still on SVG gameboard
        //randomize the distance of how much each animal moves
        let randomAnimalPositionIncrement=Math.floor((Math.random() * animalPositionIncrement) + 1);
        yPosition=parseInt(yPosition)+parseInt(randomAnimalPositionIncrement);         //update the coordinates
        $('#'+animalObjectId).attr(animalYyAxisAttr,yPosition);
        $('#'+animalObjectId).attr(animalXAxisAttr,xPosition);
    }
    else{
        $('#'+animalObjectId).attr(animalYyAxisAttr,'0');
        $('#'+animalObjectId).attr(animalXAxisAttr,xPosition);  //MOVE BACK TO THE TOP OF THE SVG
    }
}
function moveAnimalObjectRight(animalObjectId,animalXAxisAttr,animalYAxisAttr) {
    //get the current location
    let yPosition = $('#'+animalObjectId).attr(animalYAxisAttr);
    let xPosition = $('#'+animalObjectId).attr(animalXAxisAttr);
    let svgWidth = $('#stuffedanimalwarsvg').width();
    if(xPosition<svgWidth){     //if still on SVG gameboard
        //randomize the distance of how much each animal moves
        let randomAnimalPositionIncrement=Math.floor((Math.random() * animalPositionIncrement) + 1);
        xPosition=parseInt(xPosition)+parseInt(randomAnimalPositionIncrement);         //update the coordinates
        $('#'+animalObjectId).attr(animalYAxisAttr,yPosition);
        $('#'+animalObjectId).attr(animalXAxisAttr,xPosition);
    }
    else{
        $('#'+animalObjectId).attr(animalXAxisAttr,'0');
        $('#'+animalObjectId).attr(animalYAxisAttr,yPosition);  //MOVE BACK TO THE TOP OF THE SVG
    }
}
function moveAnimalObjectSineRight(animalObjectId, animalXAxisAttr, animalYAxisAttr) {
    // Get the current location
    let xPosition = parseInt($('#' + animalObjectId).attr(animalXAxisAttr));
    let yPosition = parseInt($('#' + animalObjectId).attr(animalYAxisAttr));
    let svgWidth = $('#stuffedanimalwarsvg').width();
    let svgHeight = $('#stuffedanimalwarsvg').height();

    //MAKE SINE BASELINE WHERE Y WAS TAPPED
    // Store the initial yPosition as the baseline if not already stored
    // Using a custom attribute 'data-baseline-y' to store the tap position
    if (!$('#' + animalObjectId).attr('data-baseline-y')) {
        $('#' + animalObjectId).attr('data-baseline-y', yPosition);
    }
    const baselineY = parseInt($('#' + animalObjectId).attr('data-baseline-y'));

    // Define the amplitude and frequency of the sine wave
    const amplitude = 50; // The height of the wave
    const frequency = 0.05; // How often the wave oscillates

    // If still on the gameboard
    if (xPosition < svgWidth) {
        // Update the x position
        xPosition += animalPositionIncrement;

        // Calculate the new y position using a sine wave
        yPosition = amplitude * Math.sin(frequency * xPosition) + baselineY;

        // Update the animal's position
        $('#' + animalObjectId).attr(animalXAxisAttr, xPosition);
        $('#' + animalObjectId).attr(animalYAxisAttr, yPosition);
    } else {
        // If the animal goes off the right edge, reset it to the left
        $('#' + animalObjectId).attr(animalXAxisAttr, '0');
        $('#' + animalObjectId).attr(animalYAxisAttr, baselineY); // Reset y to the center
    }
}
function moveAnimalObjectSineLeft(animalObjectId, animalXAxisAttr, animalYAxisAttr) {
    // Get the current location
    let xPosition = parseInt($('#' + animalObjectId).attr(animalXAxisAttr));
    let yPosition = parseInt($('#' + animalObjectId).attr(animalYAxisAttr));
    let svgWidth = $('#stuffedanimalwarsvg').width();
    let svgHeight = $('#stuffedanimalwarsvg').height();

    //MAKE SINE BASELINE WHERE Y WAS TAPPED
    // Store the initial yPosition as the baseline if not already stored
    // Using a custom attribute 'data-baseline-y' to store the tap position
    if (!$('#' + animalObjectId).attr('data-baseline-y')) {
        $('#' + animalObjectId).attr('data-baseline-y', yPosition);
    }
    const baselineY = parseInt($('#' + animalObjectId).attr('data-baseline-y'));

    // Define the amplitude and frequency of the sine wave
    const amplitude = 50; // The height of the wave
    const frequency = 0.05; // How often the wave oscillates

    // If still on the gameboard
    if (xPosition > 0) {

        // Update the x position
        xPosition -= animalPositionIncrement;

        // Calculate the new y position using a sine wave
        yPosition = amplitude * Math.sin(frequency * xPosition) + baselineY; // Center the wave vertically

        // Update the animal's position
        $('#' + animalObjectId).attr(animalXAxisAttr, xPosition);
        $('#' + animalObjectId).attr(animalYAxisAttr, yPosition);
    } else {
        // If the animal goes off the right edge, reset it to the left
        $('#' + animalObjectId).attr(animalXAxisAttr, svgWidth);
        $('#' + animalObjectId).attr(animalYAxisAttr, baselineY); // Reset y to the center
    }
}

function moveShapeObjectUp(shapeObjectId,shapeXAxisAttr,shapeYAxisAttr) {
    //get the current location
    let xPosition = $('#'+shapeObjectId).attr(shapeXAxisAttr);
    let yPosition = $('#'+shapeObjectId).attr(shapeYAxisAttr);
    let svgHeight = $('#stuffedanimalwarsvg').height();
    if(yPosition>0){    //if still on the SVG gameboard
        yPosition=parseInt(yPosition)-parseInt(shapePositionIncrement);              //update the coordinates
        $('#'+shapeObjectId).attr(shapeYAxisAttr,yPosition);$('#'+shapeObjectId).attr(shapeXAxisAttr,xPosition);
    }
    else{
        $('#'+shapeObjectId).attr(shapeYAxisAttr,svgHeight);$('#'+shapeObjectId).attr(shapeXAxisAttr,xPosition);
    }
    
    removeShapeAndAnimalObjectsIfHit(shapeObjectId,shapeXAxisAttr,shapeYAxisAttr);
}
function moveShapeObjectLeft(shapeObjectId,shapeXAxisAttr,shapeYAxisAttr) {
    //get the current location
    let xPosition = $('#'+shapeObjectId).attr(shapeXAxisAttr);
    let yPosition = $('#'+shapeObjectId).attr(shapeYAxisAttr);
    let svgWidth = $('#stuffedanimalwarsvg').width();
    if(xPosition>0){    //if still on the SVG gameboard
        xPosition=parseInt(xPosition)-parseInt(shapePositionIncrement);              //update the coordinates
        $('#'+shapeObjectId).attr(shapeYAxisAttr,yPosition);
        $('#'+shapeObjectId).attr(shapeXAxisAttr,xPosition);
    }
    else{
        $('#'+shapeObjectId).attr(shapeXAxisAttr,svgWidth);
        $('#'+shapeObjectId).attr(shapeYAxisAttr,yPosition);
    }

    removeShapeAndAnimalObjectsIfHit(shapeObjectId,shapeXAxisAttr,shapeYAxisAttr)
}
function moveShapeObjectDown(shapeObjectId,shapeXAxisAttr,shapeYAxisAttr) {
    //get the current location
    let xPosition = $('#'+shapeObjectId).attr(shapeXAxisAttr);
    let yPosition = $('#'+shapeObjectId).attr(shapeYAxisAttr);
    let svgHeight = $('#stuffedanimalwarsvg').height();
    //if still on the gameboard
    if(yPosition<svgHeight){
        //update the coordinates
        yPosition=parseInt(yPosition)+parseInt(shapePositionIncrement);
        $('#'+shapeObjectId).attr(shapeYAxisAttr,yPosition);$('#'+shapeObjectId).attr(shapeXAxisAttr,xPosition);
    }
    else{
        $('#'+shapeObjectId).attr(shapeYAxisAttr,'0');$('#'+shapeObjectId).attr(shapeXAxisAttr,xPosition);
    }

    removeShapeAndAnimalObjectsIfHit(shapeObjectId,shapeXAxisAttr,shapeYAxisAttr)
}
function moveShapeObjectRight(shapeObjectId,shapeXAxisAttr,shapeYAxisAttr) {
    //get the current location
    let xPosition = $('#'+shapeObjectId).attr(shapeXAxisAttr);
    let yPosition = $('#'+shapeObjectId).attr(shapeYAxisAttr);
    let svgWidth = $('#stuffedanimalwarsvg').width();
    //if still on the gameboard
    if(xPosition<svgWidth){
        //update the coordinates
        xPosition=parseInt(xPosition)+parseInt(shapePositionIncrement);
        $('#'+shapeObjectId).attr(shapeYAxisAttr,yPosition);
        $('#'+shapeObjectId).attr(shapeXAxisAttr,xPosition);
    }
    else{
        $('#'+shapeObjectId).attr(shapeXAxisAttr,'0');
        $('#'+shapeObjectId).attr(shapeYAxisAttr,yPosition);
    }

    removeShapeAndAnimalObjectsIfHit(shapeObjectId,shapeXAxisAttr,shapeYAxisAttr)
}
function moveShapeObjectSineRight(shapeObjectId, shapeXAxisAttr, shapeYAxisAttr) {
    // Get the current location
    let xPosition = parseInt($('#' + shapeObjectId).attr(shapeXAxisAttr));
    let yPosition = parseInt($('#' + shapeObjectId).attr(shapeYAxisAttr));
    let svgWidth = $('#stuffedanimalwarsvg').width();
    let svgHeight = $('#stuffedanimalwarsvg').height();

    //MAKE SINE BASELINE WHERE Y WAS TAPPED
    // Store the initial yPosition as the baseline if not already stored
    // Using a custom attribute 'data-baseline-y' to store the tap position
    if (!$('#' + shapeObjectId).attr('data-baseline-y')) {
        $('#' + shapeObjectId).attr('data-baseline-y', yPosition);
    }
    const baselineY = parseInt($('#' + shapeObjectId).attr('data-baseline-y'));

    // Define the amplitude and frequency of the sine wave
    const amplitude = 50; // The height of the wave
    const frequency = 0.05; // How often the wave oscillates

    // If still on the gameboard
    if (xPosition < svgWidth) {
        // Update the x position
        xPosition += shapePositionIncrement;

        // Calculate the new y position using a sine wave
        yPosition = amplitude * Math.sin(frequency * xPosition) + baselineY; // Center the wave vertically

        // Update the shape's position
        $('#' + shapeObjectId).attr(shapeXAxisAttr, xPosition);
        $('#' + shapeObjectId).attr(shapeYAxisAttr, yPosition);
    } else {
        // If the shape goes off the right edge, reset it to the left
        $('#' + shapeObjectId).attr(shapeXAxisAttr, '0');
        $('#' + shapeObjectId).attr(shapeYAxisAttr, baselineY); // Reset y to the center
    }

    removeShapeAndAnimalObjectsIfHit(shapeObjectId,shapeXAxisAttr,shapeYAxisAttr)
}
function moveShapeObjectSineLeft(shapeObjectId, shapeXAxisAttr, shapeYAxisAttr) {
    // Get the current location
    let xPosition = parseInt($('#' + shapeObjectId).attr(shapeXAxisAttr));
    let yPosition = parseInt($('#' + shapeObjectId).attr(shapeYAxisAttr));
    let svgWidth = $('#stuffedanimalwarsvg').width();
    let svgHeight = $('#stuffedanimalwarsvg').height();

    //MAKE SINE BASELINE WHERE Y WAS TAPPED
    // Store the initial yPosition as the baseline if not already stored
    // Using a custom attribute 'data-baseline-y' to store the tap position
    if (!$('#' + shapeObjectId).attr('data-baseline-y')) {
        $('#' + shapeObjectId).attr('data-baseline-y', yPosition);
    }
    const baselineY = parseInt($('#' + shapeObjectId).attr('data-baseline-y'));

    // Define the amplitude and frequency of the sine wave
    const amplitude = 50; // The height of the wave
    const frequency = 0.05; // How often the wave oscillates

    // If still on the gameboard
    if (xPosition > 0) {
        // Update the x position
        xPosition -= shapePositionIncrement;

        // Calculate the new y position using a sine wave
        yPosition = amplitude * Math.sin(frequency * xPosition) + baselineY; // Center the wave vertically

        // Update the shape's position
        $('#' + shapeObjectId).attr(shapeXAxisAttr, xPosition);
        $('#' + shapeObjectId).attr(shapeYAxisAttr, yPosition);
    } else {
        // If the shape goes off the left edge, reset it to the right
        $('#' + shapeObjectId).attr(shapeXAxisAttr, svgWidth);
        $('#' + shapeObjectId).attr(shapeYAxisAttr, baselineY); // Reset y to the center
    }

    removeShapeAndAnimalObjectsIfHit(shapeObjectId,shapeXAxisAttr,shapeYAxisAttr)
}

function startAnimalObjectTimerUp(animalObjectId,xAxisAttr,yAxisAttr,animalInterval){
    let timerId=window.setInterval(moveAnimalObjectUp,animalInterval,animalObjectId,xAxisAttr,yAxisAttr);
    let animalObjectTimerId = {'objectId':animalObjectId,'timerId':timerId,'xAxisAttr':xAxisAttr,'yAxisAttr':yAxisAttr};
    animalObjects.push(animalObjectTimerId);
}
function startAnimalObjectTimerDown(animalObjectId,xAxisAttr,yAxisAttr,animalInterval){
    let timerId = window.setInterval(moveAnimalObjectDown,animalInterval,animalObjectId,xAxisAttr,yAxisAttr);
    let animalObjectTimerId = {'objectId':animalObjectId,'timerId':timerId,'xAxisAttr':xAxisAttr,'yAxisAttr':yAxisAttr};
    animalObjects.push(animalObjectTimerId);
}
function startAnimalObjectTimerLeft(animalObjectId,xAxisAttr,yAxisAttr,animalInterval){
    let timerId=window.setInterval(moveAnimalObjectLeft,animalInterval,animalObjectId,xAxisAttr,yAxisAttr);
    let animalObjectTimerId = {'objectId':animalObjectId,'timerId':timerId,'xAxisAttr':xAxisAttr,'yAxisAttr':yAxisAttr};
    animalObjects.push(animalObjectTimerId);
}
function startAnimalObjectTimerRight(animalObjectId,xAxisAttr,yAxisAttr,animalInterval){
    let timerId = window.setInterval(moveAnimalObjectRight,animalInterval,animalObjectId,xAxisAttr,yAxisAttr);
    let animalObjectTimerId = {'objectId':animalObjectId,'timerId':timerId,'xAxisAttr':xAxisAttr,'yAxisAttr':yAxisAttr};
    animalObjects.push(animalObjectTimerId);
}
function startAnimalObjectTimerSineRight(animalObjectId,xAxisAttr,yAxisAttr,animalInterval){
    let timerId = window.setInterval(moveAnimalObjectSineRight,animalInterval,animalObjectId,xAxisAttr,yAxisAttr);
    let animalObjectTimerId = {'objectId':animalObjectId,'timerId':timerId,'xAxisAttr':xAxisAttr,'yAxisAttr':yAxisAttr};
    animalObjects.push(animalObjectTimerId);
}
function startAnimalObjectTimerSineLeft(animalObjectId,xAxisAttr,yAxisAttr,animalInterval){
    let timerId = window.setInterval(moveAnimalObjectSineLeft,animalInterval,animalObjectId,xAxisAttr,yAxisAttr);
    let animalObjectTimerId = {'objectId':animalObjectId,'timerId':timerId,'xAxisAttr':xAxisAttr,'yAxisAttr':yAxisAttr};
    animalObjects.push(animalObjectTimerId);
}
function startAnimalObjectTimerStill(animalObjectId,xAxisAttr,yAxisAttr,animalInterval){
    let timerId = getFormattedDateToMillisecondPrecision();
    let animalObjectTimerId = {'objectId':animalObjectId,'timerId':timerId,'xAxisAttr':xAxisAttr,'yAxisAttr':yAxisAttr};
    animalObjects.push(animalObjectTimerId);
}

function startShapeObjectTimerUp(shapeObjectId,xAxisAttr,yAxisAttr,shapeInterval){
    let timerId = window.setInterval(moveShapeObjectUp,shapeInterval,shapeObjectId,xAxisAttr,yAxisAttr);
    let shapeObjectTimerId = {'objectId':shapeObjectId,'timerId':timerId,'xAxisAttr':xAxisAttr,'yAxisAttr':yAxisAttr};
    shapeObjects.push(shapeObjectTimerId);
}
function startShapeObjectTimerDown(shapeObjectId,xAxisAttr,yAxisAttr,shapeInterval){
    let timerId = window.setInterval(moveShapeObjectDown,shapeInterval,shapeObjectId,xAxisAttr,yAxisAttr);
    let shapeObjectTimerId = {'objectId':shapeObjectId,'timerId':timerId,'xAxisAttr':xAxisAttr,'yAxisAttr':yAxisAttr};
    shapeObjects.push(shapeObjectTimerId);
}
function startShapeObjectTimerLeft(shapeObjectId,xAxisAttr,yAxisAttr,shapeInterval){
    let timerId = window.setInterval(moveShapeObjectLeft,shapeInterval,shapeObjectId,xAxisAttr,yAxisAttr);
    let shapeObjectTimerId = {'objectId':shapeObjectId,'timerId':timerId,'xAxisAttr':xAxisAttr,'yAxisAttr':yAxisAttr};
    shapeObjects.push(shapeObjectTimerId);
}
function startShapeObjectTimerRight(shapeObjectId,xAxisAttr,yAxisAttr,shapeInterval){
    let timerId = window.setInterval(moveShapeObjectRight,shapeInterval,shapeObjectId,xAxisAttr,yAxisAttr);
    let shapeObjectTimerId = {'objectId':shapeObjectId,'timerId':timerId,'xAxisAttr':xAxisAttr,'yAxisAttr':yAxisAttr};
    shapeObjects.push(shapeObjectTimerId);
}
function startShapeObjectTimerSineRight(shapeObjectId,xAxisAttr,yAxisAttr,shapeInterval){
    let timerId = window.setInterval(moveShapeObjectSineRight,shapeInterval,shapeObjectId,xAxisAttr,yAxisAttr);
    let shapeObjectTimerId = {'objectId':shapeObjectId,'timerId':timerId,'xAxisAttr':xAxisAttr,'yAxisAttr':yAxisAttr};
    shapeObjects.push(shapeObjectTimerId);
}
function startShapeObjectTimerSineLeft(shapeObjectId,xAxisAttr,yAxisAttr,shapeInterval){
    let timerId = window.setInterval(moveShapeObjectSineLeft,shapeInterval,shapeObjectId,xAxisAttr,yAxisAttr);
    let shapeObjectTimerId = {'objectId':shapeObjectId,'timerId':timerId,'xAxisAttr':xAxisAttr,'yAxisAttr':yAxisAttr};
    shapeObjects.push(shapeObjectTimerId);
}
function startShapeObjectTimerStill(shapeObjectId,xAxisAttr,yAxisAttr,shapeInterval){
    let timerId = getFormattedDateToMillisecondPrecision();
    let shapeObjectTimerId = {'objectId':shapeObjectId,'timerId':timerId,'xAxisAttr':xAxisAttr,'yAxisAttr':yAxisAttr};
    shapeObjects.push(shapeObjectTimerId);
}

function onBaseTapSocketEventDots(tapMsgObject){
    let rgbValue = tapMsgObject.red + ',' + tapMsgObject.green + ',' + tapMsgObject.blue;
    //get the coordinates emitted
    let pointX = tapMsgObject.x;
    let pointY = tapMsgObject.y;

    //draw a circle from the new to the old location
    let newCircle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    let circleId = 'circle'+$.now();

    newCircle.setAttribute('id',circleId);
    newCircle.setAttribute('cx',pointX);
    newCircle.setAttribute('cy',pointY);
    newCircle.setAttribute('r',radius);
    newCircle.setAttribute('data-user',tapMsgObject.CHATCLIENTUSER);
    
    newCircle.setAttribute('style','transform=translate(75,25);stroke:rgb('+rgbValue+');fill:rgb('+rgbValue+');'); //WHITE FILL / WHITE STROKE (OUTER CIRCLE)
    
    $("#stuffedanimalwarsvg").append(newCircle);

        //commented out to draw lines
    //start a timer for the line, depending on the direction
   let direction = tapMsgObject.movement;
   let uiSetShapeInterval=tapMsgObject.speed;
   switch(direction){
       case 'UP':
           startShapeObjectTimerUp(circleId,"cx","cy",uiSetShapeInterval);
           break;
       case 'DOWN':
           startShapeObjectTimerDown(circleId,"cx","cy",uiSetShapeInterval);
           break;
       case 'LEFT':
           startShapeObjectTimerLeft(circleId,"cx","cy",uiSetShapeInterval);
           break;
       case 'RIGHT':
           startShapeObjectTimerRight(circleId,"cx","cy",uiSetShapeInterval);
           break;
       case 'R-SINE':
           startShapeObjectTimerSineRight(circleId,"cx","cy",uiSetShapeInterval);
           break;
       case 'L-SINE':
           startShapeObjectTimerSineLeft(circleId,"cx","cy",uiSetShapeInterval);
           break;
       case 'STILL':
           startShapeObjectTimerStill(circleId,"cx","cy",uiSetShapeInterval);
           break;
       default:
           console.log("UNKNOWN DIRECTION FOR BULLET:"+direction);
           break;
   }
}
function onBaseTapSocketEventLines(tapMsgObject){
    let rgbValue = tapMsgObject.red + ',' + tapMsgObject.green + ',' + tapMsgObject.blue;
    //get the coordinates emitted
    let newPointX = tapMsgObject.x;
    let newPointY = tapMsgObject.y;

    //save off these coordinates (for drawing a line)
    if(oldPointForLineToolX === null) {
        oldPointForLineToolX = tapMsgObject.x;
        oldPointForLineToolY = tapMsgObject.y;
    }

    //draw a line from the new to the old location
    let newLine = document.createElementNS('http://www.w3.org/2000/svg','line');
    let lineId='line'+$.now();

    newLine.setAttribute('id',lineId);
    newLine.setAttribute('x1',oldPointForLineToolX);
    newLine.setAttribute('y1',oldPointForLineToolY);

    newLine.setAttribute('x2',newPointX); //
    newLine.setAttribute('y2',newPointY); //

    newLine.setAttribute('style','stroke:rgb('+rgbValue+');stroke-width:'+lineWidth+';');

    //ADD LINE TO THE SVG
    $("#stuffedanimalwarsvg").append(newLine);

    //MOVE THE CURSOR
    //move the state rectangle to where the click was made
    oldPointForLineToolX = newPointX;
    oldPointForLineToolY = newPointY;

}
function onBaseTapSocketEventCustom(tapMsgObject){
    if (
        tapMsgObject.customimage.indexOf("http://")===0||
        tapMsgObject.customimage.indexOf("https://")===0
       ){ 
            if( tapMsgObject.customimage.indexOf(".jpg")   >   0 ||
                tapMsgObject.customimage.indexOf(".jpeg")  >   0 ||
                tapMsgObject.customimage.indexOf(".JPG")  >   0 ||
                tapMsgObject.customimage.indexOf(".gif")   >   0 ||
                tapMsgObject.customimage.indexOf(".png")   >   0){
                onBaseTapSocketEventImages(tapMsgObject,tapMsgObject.customimage);
            }
            else{
                console.log('MESSAGE SENT DOES NOT CONTAIN A VALID ENOUGH IMAGE URL'+tapMsgObject.customimage);
            }
        }
}
function onBaseTapSocketEventImages(tapMsgObject){
    let width=imageWidthPixels;
    let height=imageHeightPixels;
    let animalId='animal'+$.now();

    //get the coordinates emitted
    let pointX = tapMsgObject.x-(width/2);
    let pointY = tapMsgObject.y-(height/2);
    
    let svgImg = createSVGImage(animalId, pointX, pointY, width, height, tapMsgObject);
    $('#stuffedanimalwarsvg').append(svgImg);
    
    //start a timer for the line, depending on the direction
    let direction = tapMsgObject.movement;

    let uiSetAnimalInterval=tapMsgObject.speed;

    switch(direction){
        case 'UP':
            startAnimalObjectTimerUp(animalId,"x","y",uiSetAnimalInterval);
            break;
        case 'DOWN':
            startAnimalObjectTimerDown(animalId,"x","y",uiSetAnimalInterval);
            break;
        case 'LEFT':
            startAnimalObjectTimerLeft(animalId,"x","y",uiSetAnimalInterval);
            break;
        case 'RIGHT':
            startAnimalObjectTimerRight(animalId,"x","y",uiSetAnimalInterval);
            break;
        case 'R-SINE':
            startAnimalObjectTimerSineRight(animalId,"x","y",uiSetAnimalInterval);
            break;
        case 'L-SINE':
            startAnimalObjectTimerSineLeft(animalId,"x","y",uiSetAnimalInterval);
            break;
        case 'STILL':
            startAnimalObjectTimerStill(animalId,"x","y",uiSetAnimalInterval);
            break;
        default:
            console.log("UNKNOWN DIRECTION FOR ANIMAL:"+direction);
            break;
    }
}

function createSVGImage(animalId, pointX, pointY, width, height, tapMsgObject) {
    // Check if image is in cache first
    if (!imageCache[tapMsgObject.animal]) {
        const img = new Image();
        img.src = tapMsgObject.animal;
        imageCache[tapMsgObject.animal] = img;
    }
    let svgImg = document.createElementNS('http://www.w3.org/2000/svg','image');
    svgImg.setAttributeNS(null,'id',animalId);
    svgImg.setAttributeNS(null,'class','animalimage');
    svgImg.setAttributeNS(null,'height',height);
    svgImg.setAttributeNS(null,'width',width);
    svgImg.setAttributeNS('http://www.w3.org/1999/xlink', 'href',
        tapMsgObject.animal === "custom" ? tapMsgObject.customimage : tapMsgObject.animal);
    svgImg.setAttributeNS(null,'x',pointX);
    svgImg.setAttributeNS(null,'y',pointY);
    svgImg.setAttributeNS(null, 'visibility', 'visible');
    svgImg.setAttributeNS(null,'data-user',tapMsgObject.CHATCLIENTUSER);
    svgImg.setAttributeNS(null,'data-animalName',tapMsgObject.animalName);
    return svgImg;
}

/* 
 * HIT TEST
 */
function removeShapeAndAnimalObjectsIfHit(shapeObjectId,shapeXAxisAttr,shapeYAxisAttr){
    //check if any image animal was hit, and stop it if so
    for(let i=0;i<animalObjects.length;i++){
        if(HitTest(animalObjects[i],shapeObjectId,shapeXAxisAttr,shapeYAxisAttr)){
            shapeObjectThatHitAnimal = jQuery.grep(shapeObjects, function(shapeObject) {  //REMOVE THE SHAPE
                return shapeObject.objectId === shapeObjectId;});
            clearInterval(shapeObjectThatHitAnimal.timerId);             //stop the shapeObjectThatHitAnimal timer
            let shapeObjectUser = $('#'+shapeObjectId).attr('data-user');
            $('#'+shapeObjectId).remove();            //remove the shapeObjectThatHitAnimal
            clearInterval(animalObjects[i].timerId);            //stop the animal timer
            let animalObjectUser = $('#'+animalObjects[i].objectId).attr('data-user');
            let animalObjectName = $('#'+animalObjects[i].objectId).attr('data-animalName');
            $('#'+animalObjects[i].objectId).fadeToggle('slow', function() {            //fade out the animal
                this.remove();                //remove the animal from the svg
            });

            //ANNOUNCE THE HIT IN CHAT
            // let chatClientMessage = shapeObjectUser + " HIT " + animalObjectName + " (thrown by " + animalObjectUser + ")";
            // $("<span>").prependTo("#messagesdiv").attr({
            //     class: "hitclientmessage"
            // }).text(chatClientMessage);

            //GIVE THE USER A POINT IF THEY CREATED THE SHAPE THAT HIT THE ANIMAL
            let chatClientUser = $("#chatClientUser").val();
            if (chatClientUser === "") {
                chatClientUser = unspecifiedAlias;
            }
            if(chatClientUser === shapeObjectUser) {
                const currentNumber = parseInt($('#points').text(), 10);
                const newNumber = currentNumber + 1;
                $('#points').text(newNumber);
            }
        }
    }
}
function HitTest(animalObject,shapeObjectId,shapeXAxisAttr,shapeYAxisAttr){
    let shapePointX=            parseInt($('#'+shapeObjectId).attr(shapeXAxisAttr));
    let shapePointY=            parseInt($('#'+shapeObjectId).attr(shapeYAxisAttr));
    let animalOriginPointX =    parseInt($('#'+animalObject.objectId).attr(animalObject.xAxisAttr));
    let animalOriginPointY =    parseInt($('#'+animalObject.objectId).attr(animalObject.yAxisAttr));
    let animalWidthPixels =     parseInt($('#'+animalObject.objectId).attr('width'));
    let animalHeightPixels =    parseInt($('#'+animalObject.objectId).attr('height'));
    
    if(     shapePointX >= animalOriginPointX && 
            shapePointX <= (animalOriginPointX + animalWidthPixels) &&
            shapePointY >= animalOriginPointY &&
            shapePointY <= (animalOriginPointY + animalHeightPixels)){
        return true;
    }
    else{
        return false;
    }
}

function clearGameBoard() {
    //REMOVE ALL ANIMALS
    for(let i=0;i<animalObjects.length;i++){
        clearInterval(animalObjects[i].timerId); //CLEAR THE TIMER
        $('#'+animalObjects[i].objectId).remove(); //REMOVE THE IMAGE
    }

    //REMOVE ALL SHAPES
    for(let i=0;i<shapeObjects.length;i++){
        clearInterval(shapeObjects[i].timerId);  //CLEAR THE TIMER
        $('#'+shapeObjects[i].objectId).remove(); //REMOVE THE IMAGE
    }

    //REMOVE ALL LINES
    $('#stuffedanimalwarsvg line').remove();

    //REMOVE ALL PATHS
    $('#stuffedanimalwarsvg path').remove();

    //RESET OLD POINT LINE VALUES
    oldPointForLineToolX = null;
    oldPointForLineToolY = null;
}
function getFormattedDateToMillisecondPrecision() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;
}

