/**
 * jaemzware
 * 
 * * THIS JS FILE REQUIRES utilities.js, stuffedanimalwarmechanics.js
 *
 * THIS FILE HANDLES COMMANDS THAT COME FROM THE SERVER ON THE OTHER END OF THE SOCKET
 *
 * SETS A BUNCH OF CALLBACKS THAT CONTROL THE STUFFEDANIMALWAR GAME BOARD AND THE CHAT BOX - CALLBACKS COME FROM THE SERVICE RUNNING FROM index.js
 *
 * THERE IS A TAP SOCKET HANDLER FOR STUFFEDANIMALWAR GAMEBOARD
 onBaseTapSocketEventDots(tapMsgObject);
 onBaseTapSocketEventLines(tapMsgObject);
 onBaseTapSocketEventLines(tapMsgObject);
 onBaseTapSocketEventCustom(tapMsgObject);
 onBaseTapSocketEventImages(tapMsgObject,tapMsgObject.animal);
 *
 *
 * THERE IS A TAP SOCKET HANDLER FOR THE CHAT BOX
 * onBaseChatSocketEvent -  DECIDE WHETHER TO ADD AN IMAGE, MP3, OR MESSAGE TO THE CHAT WINDOW
 *                          PERFORM THE APPROPRIATE ACTION IN THE CHAT WINDOW: PREPEND AN IMAGE, PREPEND AN MP3 AND PLAY IT, PREPEND A TEXT MESSAGE
 * @type String
 */
let endpoint = null;
let chatSocketEvent = null;
let chatImageSocketEvent = null;
let chatVideoSocketEvent = null;
let tapSocketEvent = null;
let pathSocketEvent = null;
let presentImageSocketEvent = null;
let connectSocketEvent = null;
let disconnectSocketEvent = null;
let socket = null;
let masterAlias=null;
let unspecifiedAlias=null;
//free form path drawing vars
let isDrawing = false;
let points = [];
let currentPath = null;
let currentDrawColor;
//cache common jquery selectors
let SVG = $('#stuffedanimalwarsvg');
let CANVAS = null; // Will be set when canvas is detected
let chatTextBox = $('#chatClientMessage');
let isCanvasMode = false; // Will be set based on which element exists
//SOCKET EVENTS RECEIVING///////////////////////////////////////////////////////////////////////////SOCKET EVENTS////////////////////////SOCKET EVENTS//
function initializeSocketHandlers(){
    // Detect rendering mode (SVG or Canvas)
    CANVAS = document.getElementById('stuffedanimalwarcanvas');
    if (CANVAS) {
        isCanvasMode = true;
        console.log('Canvas mode detected');
    } else {
        isCanvasMode = false;
        console.log('SVG mode detected');
    }

    //  WHEN A TAP MESSAGE IS RECEIVED FROM THER SERVER
    //  SEND THE OBJECT RECEIVED TO THE APPROPRIATE FUNCTION THAT HANDLES IT,
    //  DEPENDING ON THE TYPE OF ANIMAL SENT BY $('#stuffedanimalwarsvg').click;
    socket.on(chatSocketEvent, function(chatMsgObject){
        onBaseChatSocketEvent(chatMsgObject);
    });
    socket.on(tapSocketEvent, function(tapMsgObject){
        let animal = tapMsgObject.animal; //see htmlwriter.js writeStuffedAnimalWarAnimalDropdown
        switch(animal){
            case "custom":
                onBaseTapSocketEventCustom(tapMsgObject);
                break;
            case "dot":
                onBaseTapSocketEventDots(tapMsgObject);
                break;
            case "line":
                onBaseTapSocketEventLines(tapMsgObject);
                break;
            default:
                onBaseTapSocketEventImages(tapMsgObject);
                break;
        }        
    });
    socket.on(pathSocketEvent, function(pathMsgObject){
        if (isCanvasMode) {
            // Canvas mode: call the canvas path handler
            onBasePathSocketEvent(pathMsgObject);
        } else {
            // SVG mode: create SVG path element
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

            // Construct the "d" attribute for the path
            const d = `M${pathMsgObject.points[0][0]} ${pathMsgObject.points[0][1]} L${pathMsgObject.points
                .slice(1)
                .map((p) => p.join(" "))
                .join(" ")}`;

            // Set attributes for the path
            $(path)
                .attr("d", d)
                .attr("stroke", "rgb(" + pathMsgObject.red + "," + pathMsgObject.green + "," + pathMsgObject.blue + ")")
                .attr("stroke-width", pathMsgObject.width)
                .attr("fill", "none");

            // Append the path to the SVG
            $('#stuffedanimalwarsvg').append(path);
        }
    });
    socket.on(chatImageSocketEvent, function(chatImageMsgObject){
        let chatServerDate = chatImageMsgObject.CHATSERVERDATE;
        let chatServerUser = formatChatServerUserIp(chatImageMsgObject.CHATSERVERUSER);
        let serverStamp = "["+chatServerDate+"]"; //ip and time stamp
        //server date and user
        $("<div>").prependTo("#messagesdiv").attr({
            class: "right-aligned-container"
        }).append(
            $("<span>").attr({ class: "remoteChatClientUser" }).text("(" + chatServerUser + ")"),
            $("<span>").attr({ class: "serverdate" }).text(" " + serverStamp) // Add a space for separation
        );

        var img = $("<img/>").attr({
            src: chatImageMsgObject.CHATCLIENTIMAGE,
            alt: chatServerUser + " " + chatImageMsgObject.CHATSERVERDATE,
            class: "photosformthumbnail" // Optional: Add a class for styling the thumbnail
        });

        img.on("click", function () {
            if (isCanvasMode) {
                $('#stuffedanimalwarcanvas').css('background-image', 'url(' + chatImageMsgObject.CHATCLIENTIMAGE + ')');
                setBackgroundImage(chatImageMsgObject.CHATCLIENTIMAGE);
            } else {
                $('#stuffedanimalwarsvg').css('background-image', 'url(' + chatImageMsgObject.CHATCLIENTIMAGE + ')');
            }
        });

        // Prepend the image (or linked image) to the #messagesdiv
        img.prependTo("#messagesdiv");
    });
    socket.on(chatVideoSocketEvent, function(chatVideoMsgObject){
        let chatServerDate = chatVideoMsgObject.CHATSERVERDATE;
        let chatServerUser = formatChatServerUserIp(chatVideoMsgObject.CHATSERVERUSER);
        let serverStamp = "["+chatServerDate+"]"; //ip and time stamp

        //server date and user
        $("<div>").prependTo("#messagesdiv").attr({
            class: "right-aligned-container"
        }).append(
            $("<span>").attr({ class: "remoteChatClientUser" }).text("(" + chatServerUser + ")"),
            $("<span>").attr({ class: "serverdate" }).text(" " + serverStamp) // Add a space for separation
        );

        // Create a video thumbnail container
        var videoContainer = $("<div/>").attr({
            class: "video-thumbnail-container"
        });

        // Create a video element with the first frame as a thumbnail
        var video = $("<video/>").attr({
            src: chatVideoMsgObject.CHATCLIENTVIDEO,
            alt: chatClientUser + " " + chatVideoMsgObject.CHATSERVERDATE,
            class: "video-thumbnail",
            preload: "metadata",
            muted: true,
            width: "120", // Set appropriate thumbnail size
            height: "80"
        });

        // Force the video to load its metadata and seek to the first frame
        video.on('loadedmetadata', function() {
            this.currentTime = 0.1; // Seek to 0.1 seconds to ensure we get an actual frame
        });

        // Add a play button overlay
        var playButton = $("<div/>").attr({
            class: "play-button-overlay"
        }).html("▶️");

        // Add click event to load video in existing player
        videoContainer.on("click", function() {
            const videoUrl = chatVideoMsgObject.CHATCLIENTVIDEO;

            // Add to selectvideos dropdown if it doesn't exist
            let $selectVideos = $('#selectvideos');
            let optionExists = false;

            $selectVideos.find('option').each(function() {
                if ($(this).val() === videoUrl) {
                    optionExists = true;
                    return false; // break the loop
                }
            });

            if (!optionExists) {
                // Create a label from the datestamp and IP (using existing fields)
                const videoLabel = formatChatServerUserIp(chatVideoMsgObject.CHATSERVERUSER) + " - " + chatVideoMsgObject.CHATSERVERDATE;

                let newOption = $('<option>')
                    .val(videoUrl)
                    .text(videoLabel);

                $selectVideos.append(newOption);
            }

            // Select the option
            $selectVideos.val(videoUrl);

            // Update the video source
            $("#jaemzwaredynamicvideosource").attr("src", videoUrl);

            // Get the video element and reload it
            const videoPlayer = document.getElementById("jaemzwaredynamicvideoplayer");
            videoPlayer.load();
            videoPlayer.play();

            // Optionally scroll to the video player or make it visible if needed
            $('html, body').animate({
                scrollTop: $("#jaemzwaredynamicvideoplayer").offset().top
            }, 500);
        });

        // Append video and play button to container
        videoContainer.append(video);
        videoContainer.append(playButton);

        // Prepend the video container to the #messagesdiv
        videoContainer.prependTo("#messagesdiv");
    });
    socket.on(presentImageSocketEvent, function(presentImageMsgObject){
        console.log("PRESENTER IMAGE UPDATE:" + JSON.stringify(presentImageMsgObject));
        if (isCanvasMode) {
            $('#stuffedanimalwarcanvas').css('background-image', 'url(' + presentImageMsgObject.CHATCLIENTIMAGE + ')');
            setBackgroundImage(presentImageMsgObject.CHATCLIENTIMAGE);
        } else {
            $('#stuffedanimalwarsvg').css('background-image', 'url(' + presentImageMsgObject.CHATCLIENTIMAGE + ')');
        }
    });
    socket.on(connectSocketEvent, function(connectMsgObject){
        var span = $("<span/>").text(formatChatServerUserIp(connectMsgObject.CHATSERVERUSER) + " CONNECT - "+ connectMsgObject.CHATSERVERPORT + "/" + connectMsgObject.CHATSERVERENDPOINT +" - Total:" + connectMsgObject.CHATUSERCOUNT);
        span.attr("class", "connectnotification");
        span.prependTo("#messagesdiv");
    });
    socket.on(disconnectSocketEvent, function(disconnectMsgObject){
        var span = $("<span/>").text(formatChatServerUserIp(disconnectMsgObject.CHATSERVERUSER) + " DISCONNECT - "+ disconnectMsgObject.CHATSERVERPORT + "/" + disconnectMsgObject.CHATSERVERENDPOINT +" - Total:" + disconnectMsgObject.CHATUSERCOUNT);
        span.attr("class", "disconnectnotification");
        span.prependTo("#messagesdiv");
    });
}
function onBaseChatSocketEvent(chatMsgObject){
    let remoteChatClientUser = chatMsgObject.CHATCLIENTUSER;
    let chatServerUser = chatMsgObject.CHATSERVERUSER;
    let chatClientMessage = chatMsgObject.CHATCLIENTMESSAGE;
    let chatServerDate = chatMsgObject.CHATSERVERDATE;
    let serverStamp = "["+chatServerDate+"]"; //ip and time stamp
    
    //smart link - recognize chat links (only at the very beginning of the message), and display them appropriately.
    if(chatClientMessage.indexOf("#CLEARBOARD;")===0) {
        if(remoteChatClientUser===masterAlias)
            clearGameBoard();
    } else if (chatClientMessage.indexOf("#CLEARCHAT;")===0) {
        if(remoteChatClientUser===masterAlias)
            clearChat();
    }
    else if (
        chatClientMessage.toLowerCase().indexOf("http://")===0||
        chatClientMessage.toLowerCase().indexOf("https://")===0
       ){
            if( chatClientMessage.toLowerCase().endsWith(".jpg")    ||
                chatClientMessage.toLowerCase().endsWith(".jpeg")   ||
                chatClientMessage.toLowerCase().endsWith(".gif")    ||
                chatClientMessage.toLowerCase().endsWith(".webp")    ||
                chatClientMessage.toLowerCase().endsWith(".png")  )
            {

                //server date and user
                $("<div>").prependTo("#messagesdiv").attr({
                    class: "right-aligned-container"
                }).append(
                    $("<span>").attr({ class: "remoteChatClientUser" }).text(remoteChatClientUser + "(" + formatChatServerUserIp(chatServerUser) + ")"),
                    $("<span>").attr({ class: "serverdate" }).text(" " + serverStamp) // Add a space for separation
                );

                var img = $("<img/>").attr({
                    src: chatClientMessage,
                    alt: "chat image",
                    class: "photosformthumbnail"
                 });

                img.on("click", function () {
                    if (isCanvasMode) {
                        $('#stuffedanimalwarcanvas').css('background-image', 'url(' + chatClientMessage + ')');
                        setBackgroundImage(chatClientMessage);
                    } else {
                        $('#stuffedanimalwarsvg').css('background-image', 'url(' + chatClientMessage + ')');
                    }
                });

                img.prependTo("#messagesdiv");
            }
            else if((chatClientMessage.toLowerCase().endsWith(".mp3") || chatClientMessage.toLowerCase().endsWith(".flac")) && remoteChatClientUser===masterAlias)
            {
                changeAudio(chatClientMessage);
            }
            else if((chatClientMessage.toLowerCase().endsWith(".mp4") || chatClientMessage.toLowerCase().endsWith(".mov")) && remoteChatClientUser===masterAlias)
            {
                changeMp4(chatClientMessage);
            }
            else if(chatClientMessage.toLowerCase().endsWith(".mp3") || chatClientMessage.toLowerCase().endsWith(".flac"))
            {
                // Audio link from non-master user - make it clickable
                //server date and user
                $("<div>").prependTo("#messagesdiv").attr({
                    class: "right-aligned-container"
                }).append(
                    $("<span>").attr({ class: "remoteChatClientUser" }).text(remoteChatClientUser + "(" + formatChatServerUserIp(chatServerUser) + ")"),
                    $("<span>").attr({ class: "serverdate" }).text(" " + serverStamp) // Add a space for separation
                );

                // Create clickable link for audio
                var audioLink = $("<a/>").attr({
                    href: "#",
                    class: "chatclientmessage audio-link"
                }).text(chatClientMessage);

                audioLink.on("click", function(e) {
                    e.preventDefault();
                    changeAudio(chatClientMessage);
                });

                audioLink.prependTo("#messagesdiv");
            }
            else if(chatClientMessage.toLowerCase().endsWith(".mp4") || chatClientMessage.toLowerCase().endsWith(".mov"))
            {
                // Video link from non-master user - make it clickable
                //server date and user
                $("<div>").prependTo("#messagesdiv").attr({
                    class: "right-aligned-container"
                }).append(
                    $("<span>").attr({ class: "remoteChatClientUser" }).text(remoteChatClientUser + "(" + formatChatServerUserIp(chatServerUser) + ")"),
                    $("<span>").attr({ class: "serverdate" }).text(" " + serverStamp) // Add a space for separation
                );

                // Create clickable link for video
                var videoLink = $("<a/>").attr({
                    href: "#",
                    class: "chatclientmessage video-link"
                }).text(chatClientMessage);

                videoLink.on("click", function(e) {
                    e.preventDefault();
                    changeMp4(chatClientMessage);
                });

                videoLink.prependTo("#messagesdiv");
            }
            else{
                //server date and user
                $("<div>").prependTo("#messagesdiv").attr({
                    class: "right-aligned-container"
                }).append(
                    $("<span>").attr({ class: "remoteChatClientUser" }).text(remoteChatClientUser + "(" + formatChatServerUserIp(chatServerUser) + ")"),
                    $("<span>").attr({ class: "serverdate" }).text(" " + serverStamp) // Add a space for separation
                );

                 //chat message
                $("<span>").prependTo("#messagesdiv").attr({
                   class: "chatclientmessage"
                }).text(chatClientMessage);
            }
        }
    else{
        //server date and user
        $("<div>").prependTo("#messagesdiv").attr({
            class: "right-aligned-container"
        }).append(
            $("<span>").attr({ class: "remoteChatClientUser" }).text(remoteChatClientUser + "(" + formatChatServerUserIp(chatServerUser) + ")"),
            $("<span>").attr({ class: "serverdate" }).text(" " + serverStamp) // Add a space for separation
        );

        //chat message
        $("<span>").prependTo("#messagesdiv").attr({
            class: "chatclientmessage"
        }).text(chatClientMessage);
    }
}
//SOCKET EVENTS RECEIVING///////////////////////////////////////////////////////////////////////////SOCKET EVENTS////////////////////////SOCKET EVENTS//

//STUFFED ANIMAL WAR SVG/CANVAS CLICK/TAP AND PATH EVENTS///////////////////////////////////////////////////////////////////////////HTML EVENTS////////////////////////HTML EVENTS//

// Set up event listeners based on rendering mode
document.addEventListener('DOMContentLoaded', function() {
    const drawSurface = isCanvasMode ? CANVAS : SVG[0];
    if (isCanvasMode) {
        setupCanvasDrawingEvents();
    } else {
        setupSVGDrawingEvents();
    }
    // Initialize animal preview with the default selected value
    if ($('#animals').length > 0) {
        updateAnimalPreview($('#animals').val());
    }
});

// CANVAS DRAWING EVENTS
function setupCanvasDrawingEvents() {
    let tempCanvas = null;
    let tempCtx = null;

    $(CANVAS).on("mousedown", function (e) {
        let colorPickerButton = $("#colorPickerButton");
        let color = "rgb(" + colorPickerButton.attr("data-red") + "," + colorPickerButton.attr("data-green") + "," + colorPickerButton.attr("data-blue") + ")";
        isDrawing = true;
        points = [[e.offsetX, e.offsetY]];
        currentDrawColor = color;

        // Create temporary canvas overlay for real-time drawing
        if (!tempCanvas) {
            tempCanvas = document.createElement('canvas');
            tempCanvas.width = CANVAS.width;
            tempCanvas.height = CANVAS.height;
            tempCanvas.style.position = 'absolute';
            tempCanvas.style.top = CANVAS.offsetTop + 'px';
            tempCanvas.style.left = CANVAS.offsetLeft + 'px';
            tempCanvas.style.pointerEvents = 'none';
            CANVAS.parentNode.appendChild(tempCanvas);
            tempCtx = tempCanvas.getContext('2d');
        }
    });

    $(CANVAS).on("mousemove", function (e) {
        if (!isDrawing) return;
        points.push([e.offsetX, e.offsetY]);

        // Draw on temporary canvas
        if (tempCtx) {
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.beginPath();
            tempCtx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                tempCtx.lineTo(points[i][0], points[i][1]);
            }
            tempCtx.strokeStyle = currentDrawColor;
            tempCtx.lineWidth = 2;
            tempCtx.stroke();
        }
    });

    $(CANVAS).on("mouseup", function (e) {
        if (!isDrawing) return;
        isDrawing = false;

        // Clear temporary canvas
        if (tempCtx) {
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        }

        if (points.length === 1) {
            emitTapMessage(points[0][0], points[0][1]);
        } else {
            emitPathMessage();
        }
    });

    // Touch events for canvas
    $(CANVAS).on("touchstart", function (e) {
        if (e.cancelable) {
            e.preventDefault();
        }
        let colorPickerButton = $("#colorPickerButton");
        let color = "rgb(" + colorPickerButton.attr("data-red") + "," + colorPickerButton.attr("data-green") + "," + colorPickerButton.attr("data-blue") + ")";
        const touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
        const canvasRect = CANVAS.getBoundingClientRect();
        const x = touch.clientX - canvasRect.left;
        const y = touch.clientY - canvasRect.top;

        isDrawing = true;
        points = [[x, y]];
        currentDrawColor = color;

        if (!tempCanvas) {
            tempCanvas = document.createElement('canvas');
            tempCanvas.width = CANVAS.width;
            tempCanvas.height = CANVAS.height;
            tempCanvas.style.position = 'absolute';
            tempCanvas.style.top = CANVAS.offsetTop + 'px';
            tempCanvas.style.left = CANVAS.offsetLeft + 'px';
            tempCanvas.style.pointerEvents = 'none';
            CANVAS.parentNode.appendChild(tempCanvas);
            tempCtx = tempCanvas.getContext('2d');
        }
    });

    $(CANVAS).on("touchmove", function (e) {
        e.preventDefault();
        if (!isDrawing) return;
        const touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
        const canvasRect = CANVAS.getBoundingClientRect();
        const x = touch.clientX - canvasRect.left;
        const y = touch.clientY - canvasRect.top;
        points.push([x, y]);

        if (tempCtx) {
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.beginPath();
            tempCtx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                tempCtx.lineTo(points[i][0], points[i][1]);
            }
            tempCtx.strokeStyle = currentDrawColor;
            tempCtx.lineWidth = 2;
            tempCtx.stroke();
        }
    });

    $(CANVAS).on("touchend", function (e) {
        e.preventDefault();
        if (!isDrawing) return;
        isDrawing = false;

        if (tempCtx) {
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        }

        const isActualTap = points.length > 1 && points.every(point =>
            point[0] === points[0][0] && point[1] === points[0][1]
        );

        if (points.length === 1 || isActualTap) {
            emitTapMessage(points[0][0], points[0][1]);
        } else {
            emitPathMessage();
        }
    });
}

// SVG DRAWING EVENTS (original code)
function setupSVGDrawingEvents() {
    SVG.on("mousedown", function (e) {
    let colorPickerButton = $("#colorPickerButton");
    let color = "rgb(" + colorPickerButton.attr("data-red") + "," + colorPickerButton.attr("data-green") + "," + colorPickerButton.attr("data-blue") + ")";
    isDrawing = true;
    //points array to send path event
    points = [[e.offsetX, e.offsetY]];
    //current line before sending path event / real-time drawing
    currentPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    $(currentPath)
        .attr("d", `M${points[0][0]} ${points[0][1]}`)
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .attr("id", `temp-path-${Date.now()}`);
    $('#stuffedanimalwarsvg').append(currentPath);
});
// Continue drawing
SVG.on("mousemove", function (e) {
    if (!isDrawing) return;
    //more points for array to send path event
    points.push([e.offsetX, e.offsetY]);
    //update current line real-time drawing before sending path event
    const d = `M${points[0][0]} ${points[0][1]} L${points
        .slice(1)
        .map((p) => p.join(" "))
        .join(" ")}`;
    $(currentPath).attr("d", d);
});
// Finish drawing
SVG.on("mouseup", function (e) {
    if (!isDrawing) return;
    isDrawing = false;
    if (points.length === 1) {
        // Remove the temporary path which is just a dot that we dont want to see
        if (currentPath) {
            currentPath.remove();
            currentPath = null;
        }
        // just send a dot
        emitTapMessage(points[0][0],points[0][1]);
    } else {
        emitPathMessage();

        //remove real time path because the server will send a broadcasted one
        if (currentPath) {
            currentPath.remove();
            currentPath = null;
        }
    }
});
//MOBILE EVENTS
SVG.on("touchstart", function (e) {
    if (e.cancelable) {
        e.preventDefault(); //PREVENT SVG FROM SCROLLING WHEN TOUCHED
    }
    let colorPickerButton = $("#colorPickerButton");
    let color = "rgb(" + colorPickerButton.attr("data-red") + "," + colorPickerButton.attr("data-green") + "," + colorPickerButton.attr("data-blue") + ")";
    // Get touch coordinates
    const touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
    const svgElement = document.getElementById('stuffedanimalwarsvg');
    const svgRect = svgElement.getBoundingClientRect();

    // Calculate position relative to SVG
    const x = touch.clientX - svgRect.left;
    const y = touch.clientY - svgRect.top;

    isDrawing = true;
    //points array for path event to be emitted when line is complete
    points = [[x, y]];

    //real time path before event of path is emitted
    // Create the path when starting to draw
    currentPath = document.createElementNS("http://www.w3.org/2000/svg", "path");

    // Set initial attributes
    $(currentPath)
        .attr("d", `M${points[0][0]} ${points[0][1]}`)
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .attr("id", `temp-path-${Date.now()}`);

    // Append the path to the SVG
    $('#stuffedanimalwarsvg').append(currentPath);
});
// Continue drawing
SVG.on("touchmove", function (e) {
    e.preventDefault(); //PREVENT SVG FROM SCROLLING WHEN TOUCHED
    if (!isDrawing) return;
    const touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
    const svgElement = document.getElementById('stuffedanimalwarsvg');
    const svgRect = svgElement.getBoundingClientRect();

    // Calculate position relative to SVG
    const x = touch.clientX - svgRect.left;
    const y = touch.clientY - svgRect.top;
    //push more points for paths event when touchend
    points.push([x, y]);

    //update realtime path
    // Update the path's d attribute in real-time
    const d = `M${points[0][0]} ${points[0][1]} L${points
        .slice(1)
        .map((p) => p.join(" "))
        .join(" ")}`;

    $(currentPath).attr("d", d);
});
// Finish drawing
SVG.on("touchend", function (e) {
    e.preventDefault(); //PREVENT SVG FROM SCROLLING WHEN TOUCHED
    if (!isDrawing) return;
    isDrawing = false;

    // Check if all points are identical (indicates a tap, not a drag)
    const isActualTap = points.length > 1 && points.every(point =>
        point[0] === points[0][0] && point[1] === points[0][1]
    );

    // If only one point exists, duplicate it to avoid the SVG path error
    if (points.length === 1 || isActualTap) {
        // Remove the temporary path
        if (currentPath) {
            currentPath.remove();
            currentPath = null;
        }
        emitTapMessage(points[0][0],points[0][1]);
    } else {
        emitPathMessage();

        //remove real time path because the server will send a broadcasted one
        if (currentPath) {
            currentPath.remove();
            currentPath = null;
        }
    }
    });
}
//^^^STUFFED ANIMAL WAR SVG/CANVAS CLICK/TAP AND PATH EVENTS^^^//////////////////////////////////////////////////////////////////

$('#chatClientAutoResponder').change(function(){
    //GET THE MESSAGE FROM THE AUTORESPONDER
    let chatAutoResponderMessage = $('#chatClientAutoResponder option:selected').text();

    //SEND IT TO A FUNCTION THAT WILL ASSEMBLE A JSON BLOB, AND SEND IT TO THE SERVER, WHO WILL SEND IT TO EVERYONE ELSE
    emitChatMessage(chatAutoResponderMessage);
});
$('#selectsongs').change(function(){
    let songToPlay = $('#selectsongs option:selected').attr("value");
    let chatClientUser = $("#chatClientUser").val();

    if(chatClientUser===masterAlias){
        // If the song path is relative (doesn't start with http), prepend server origin
        let songUrl = songToPlay;
        if (!songToPlay.toLowerCase().startsWith('http://') && !songToPlay.toLowerCase().startsWith('https://')) {
            songUrl = window.location.origin + '/' + songToPlay.replace(/^\/+/, '');
        }
        emitChatMessage(songUrl);
    }
    else{
        changeAudio(songToPlay);
    }
});
//IMAGE AND VIDEO UPLOAD FORM SUBMISSION
// Handle file selection for image upload
$('#imageFileInput').on('change', function(e) {
    const file = e.target.files[0];
    const fileNameDisplay = document.getElementById('imageFileName');
    if (file) {
        fileNameDisplay.textContent = file.name;
    } else {
        fileNameDisplay.textContent = 'No file selected';
    }
});

$('#uploadForm').on('submit', function (e) {
    e.preventDefault();
    const fileInput = e.target.elements.image;
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file.');
        e.preventDefault();
        return;
    }

    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file.');
        e.preventDefault();
        return;
    }

    // Optionally, check file size (e.g., 50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        alert('File size must be less than 20MB.');
        e.preventDefault();
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            document.getElementById('progressIndicator').textContent = `${percentComplete.toFixed(0)}% uploaded`;
            document.getElementById('imageProgressBar').style.width = `${percentComplete}%`;
        }
    };

    xhr.onload = () => {
        if (xhr.status === 200) {
            document.getElementById('progressIndicator').textContent = 'Upload complete!';
            document.getElementById('imageProgressBar').style.width = '100%';
            setTimeout(() => {
                document.getElementById('uploadForm').reset();
                document.getElementById('imageFileName').textContent = 'No file selected';
                document.getElementById('progressIndicator').textContent = 'Ready to upload';
                document.getElementById('imageProgressBar').style.width = '0%';
            }, 2000);
        } else {
            console.error('Image Upload failed.');
            document.getElementById('progressIndicator').textContent = 'Upload failed';
            document.getElementById('imageProgressBar').style.width = '0%';
        }
    };

    xhr.open('POST', '/'+chatImageSocketEvent, true);
    xhr.send(formData);
});
// Handle file selection for video upload
$('#videoFileInput').on('change', function(e) {
    const file = e.target.files[0];
    const fileNameDisplay = document.getElementById('videoFileName');
    if (file) {
        fileNameDisplay.textContent = file.name;
    } else {
        fileNameDisplay.textContent = 'No file selected';
    }
});

$('#videoUploadForm').on('submit', function (e) {
    e.preventDefault();
    const fileInput = e.target.elements.video;
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file.');
        e.preventDefault();
        return;
    }

    // Check if the file is an image
    if (!file.type.startsWith('video/')) {
        alert('Please upload a valid image file.');
        e.preventDefault();
        return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        alert('File size must be less than 50MB.');
        e.preventDefault();
        return;
    }

    const formData = new FormData();
    formData.append('video', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            document.getElementById('videoProgressIndicator').textContent = `${percentComplete.toFixed(0)}% uploaded`;
            document.getElementById('videoProgressBar').style.width = `${percentComplete}%`;
        }
    };

    xhr.onload = () => {
        if (xhr.status === 200) {
            document.getElementById('videoProgressIndicator').textContent = 'Upload complete!';
            document.getElementById('videoProgressBar').style.width = '100%';
            setTimeout(() => {
                document.getElementById('videoUploadForm').reset();
                document.getElementById('videoFileName').textContent = 'No file selected';
                document.getElementById('videoProgressIndicator').textContent = 'Ready to upload';
                document.getElementById('videoProgressBar').style.width = '0%';
            }, 2000);
        } else {
            console.error('Video Upload failed.');
            document.getElementById('videoProgressIndicator').textContent = 'Upload failed';
            document.getElementById('videoProgressBar').style.width = '0%';
        }
    };

    xhr.open('POST', '/'+chatVideoSocketEvent, true);
    xhr.send(formData);
});
//VIDEO PLAYER HTML EVENTS
$('#jaemzwaredynamicvideoplayer').bind("ended", function(){
    let currentFile = $(this).children(":first").attr('src');
    PlayNextVideo(currentFile);
});
//AUDIO PLAYER HTML EVENTS
$('#jaemzwaredynamicaudioplayer').bind("ended", function(){
    let currentFile = $(this).children(":first").attr('src');
    PlayNextTrack(currentFile);
});
$('#nextaudiotrack').click(function(){
    let currentFile = $('#selectsongs option:selected').attr("value");
    PlayNextTrack(currentFile);
});
$('#selectvideos').change(function(){
    let videoOption = $('#selectvideos option:selected');
    let videoToPlay = videoOption.attr("value");
    let poster = videoOption.attr("poster");
    changeMp4(videoToPlay,poster);
    let chatClientUser = $("#chatClientUser").val();
    if(chatClientUser===masterAlias){
        // If the video path is relative (doesn't start with http), prepend server origin
        let videoUrl = videoToPlay;
        if (!videoToPlay.toLowerCase().startsWith('http://') && !videoToPlay.toLowerCase().startsWith('https://')) {
            videoUrl = window.location.origin + '/' + videoToPlay.replace(/^\/+/, '');
        }
        emitChatMessage(videoUrl);
    }
});
chatTextBox.keypress(function (event) {
    if (event.which === 13) {
        emitChatMessage(chatTextBox.val());
        chatTextBox.val('');
        return false; 
    }
});
$('#sendchatbutton').click(function () {
        emitChatMessage(chatTextBox.val());
        chatTextBox.val('');
});
$('.photosformthumbnail').on("click", function() {
    // Get the src from the clicked thumbnail
    let imageSrc = $(this).attr('src');

    // Set the background image based on rendering mode
    let drawSurface;
    if (isCanvasMode) {
        drawSurface = $('#stuffedanimalwarcanvas');
        drawSurface.css('background-image', 'url(' + imageSrc + ')');
        setBackgroundImage(imageSrc);
    } else {
        drawSurface = $('#stuffedanimalwarsvg');
        drawSurface.css('background-image', 'url(' + imageSrc + ')');
    }

    // Set the background image for everyone
    let chatClientUser = $("#chatClientUser").val();
    if(chatClientUser===masterAlias){
        emitPresentImage(imageSrc);
    }

    // Scroll to the drawing surface element
    $('html, body').animate({
        scrollTop: drawSurface.offset().top
    }, 500); // 500ms animation duration
});
$('#clearboardbutton').on("click", function() {
    clearGameBoard();
    let chatClientUser = $("#chatClientUser").val();
    if(chatClientUser===masterAlias) {
        emitChatMessage("#CLEARBOARD;");
    }
});
$('#animals').on('change', function() {
    if ($(this).val() === "custom") {
        $('#imagepathtextbox').show();
        $('#colorPickerButton').hide();
    } else {
        $('#imagepathtextbox').hide();
        $('#colorPickerButton').show();
    }
    if ($(this).val() === "line") {
        //RESET OLD POINT LINE VALUES
        oldPointForLineToolX = null;
        oldPointForLineToolY = null;
    }
    // Update preview image
    updateAnimalPreview($(this).val());
});
$('#clearchatbutton').on("click", function() {
    clearChat();
    let chatClientUser = $("#chatClientUser").val();
    if(chatClientUser===masterAlias) {
        emitChatMessage("#CLEARCHAT;");
    }
});

function clearChat(){
    $('#messagesdiv').empty();
}

function updateAnimalPreview(value) {
    const previewContent = $('#animalPreviewContent');

    if (!value) {
        value = 'dot'; // Default to bullet if no value
    }

    if (value === 'dot') {
        // Show a bullet point
        previewContent.html('•').css({
            'font-size': '20px',
            'background': 'none',
            'color': '#1a1a2e'
        });
    } else if (value === 'line') {
        // Show a line symbol
        previewContent.html('─').css({
            'font-size': '20px',
            'background': 'none',
            'color': '#1a1a2e'
        });
    } else if (value === 'custom') {
        // Show custom text
        previewContent.html('?').css({
            'font-size': '18px',
            'font-weight': 'bold',
            'background': 'none',
            'color': '#1a1a2e'
        });
    } else {
        // Show the actual image (for custom animals with image URLs)
        previewContent.css('background', 'none').html('<img src="' + value + '" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.style.display=\'none\'; this.parentElement.innerHTML=\'<span style=\\\'font-size: 16px; color: #1a1a2e;\\\'>🦁</span>\';" />');
    }
}

function emitChatMessage(messageString){
    //get the user alias
    let chatClientUser = $('#chatClientUser').val();
    if(chatClientUser===""){
        chatClientUser = unspecifiedAlias;
    }

    //CONSTRUCT THE MESSAGE TO EMIT IN JSON, WITH THE USERNAME INCLUDED
    let chatMessageObject = {
              CHATCLIENTMESSAGE:messageString,
              CHATCLIENTUSER: chatClientUser
          };  

    //send the message
    socket.emit(chatSocketEvent,chatMessageObject);
}

function emitTapMessage(xcoord,ycoord) {
    let animalOrShapeDropdownOption = $('#animals option:selected');
    let colorPickerButton = $("#colorPickerButton");
    let chatClientUser = $('#chatClientUser').val();
    if(chatClientUser===""){
        chatClientUser = unspecifiedAlias;
    }
    let tapMsgObject = {
        x:xcoord,
        y:ycoord,
        animal:animalOrShapeDropdownOption.val(),
        animalName:animalOrShapeDropdownOption.text(),
        customimage:$('#imagepathtextbox').val(),
        movement:$("input[name='sawmove']:checked").val(),
        red:colorPickerButton.attr("data-red"),
        green:colorPickerButton.attr("data-green"),
        blue:colorPickerButton.attr("data-blue"),
        speed:getSpeed(),
        CHATCLIENTUSER: chatClientUser
    };

    socket.emit(tapSocketEvent,tapMsgObject);
}

function emitPathMessage() {
    let colorPickerButton = $("#colorPickerButton");
    let chatClientUser = $('#chatClientUser').val();
    if(chatClientUser===""){
        chatClientUser = unspecifiedAlias;
    }
    // Create the path message object
    const pathMsgObject = {
        id: `path-${Date.now()}`, // Unique ID for the path
        points: points, // Array of points
        red:colorPickerButton.attr("data-red"),
        green:colorPickerButton.attr("data-green"),
        blue:colorPickerButton.attr("data-blue"),
        width: 2, // Stroke width
        CHATCLIENTUSER: chatClientUser
    };

    // Emit the path to the server
    socket.emit(pathSocketEvent, pathMsgObject);
}

function emitPresentImage(imageSrc) {
    let chatClientUser = $('#chatClientUser').val();
    let presentImageObject = {
        CHATCLIENTIMAGE:imageSrc,
        CHATCLIENTUSER:chatClientUser
    };
    socket.emit(presentImageSocketEvent, presentImageObject);
}

function formatChatServerUserIp(chatServerUser) {
    return chatServerUser.replace(/[^a-zA-Z0-9]/g, '');
}
//HTML EVENTS///////////////////////////////////////////////////////////////////////////HTML EVENTS////////////////////////HTML EVENTS//
