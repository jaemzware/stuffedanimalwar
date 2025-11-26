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
//cache common jquery selectors (RIP SVG)
let CANVAS = null; // Canvas element, initialized in initializeSocketHandlers
let chatTextBox = $('#chatClientMessage');
//SOCKET EVENTS RECEIVING///////////////////////////////////////////////////////////////////////////SOCKET EVENTS////////////////////////SOCKET EVENTS//
function initializeSocketHandlers(){
    // Get canvas element (we're canvas-only now)
    CANVAS = document.getElementById('stuffedanimalwarcanvas');
    console.log('Canvas mode initialized');

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
        // Canvas-only now (RIP SVG path rendering)
        onBasePathSocketEvent(pathMsgObject);
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
            // Canvas-only (RIP SVG background)
            $('#stuffedanimalwarcanvas').css('background-image', 'url(' + chatImageMsgObject.CHATCLIENTIMAGE + ')');
            setBackgroundImage(chatImageMsgObject.CHATCLIENTIMAGE);
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
        // Canvas-only (RIP SVG presenter)
        $('#stuffedanimalwarcanvas').css('background-image', 'url(' + presentImageMsgObject.CHATCLIENTIMAGE + ')');
        setBackgroundImage(presentImageMsgObject.CHATCLIENTIMAGE);
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
                    // Canvas-only (RIP SVG)
                    $('#stuffedanimalwarcanvas').css('background-image', 'url(' + chatClientMessage + ')');
                    setBackgroundImage(chatClientMessage);
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

// Set up event listeners (canvas-only now, RIP SVG)
document.addEventListener('DOMContentLoaded', function() {
    setupCanvasDrawingEvents();
    // Initialize animal preview with the default selected value
    if ($('#animals').length > 0) {
        updateAnimalPreview($('#animals').val());
    }
});

// CANVAS DRAWING EVENTS
function setupCanvasDrawingEvents() {
    let tempCanvas = null;
    let tempCtx = null;
    let currentDrawLineWidth = 2;

    $(CANVAS).on("mousedown", function (e) {
        let colorPickerButton = $("#colorPickerButton");
        let color = "rgb(" + colorPickerButton.attr("data-red") + "," + colorPickerButton.attr("data-green") + "," + colorPickerButton.attr("data-blue") + ")";
        currentDrawLineWidth = parseInt(colorPickerButton.attr("data-line-width")) || 2;
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
            tempCtx.lineWidth = currentDrawLineWidth;
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
        currentDrawLineWidth = parseInt(colorPickerButton.attr("data-line-width")) || 2;
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
            tempCtx.lineWidth = currentDrawLineWidth;
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
//^^^STUFFED ANIMAL WAR CANVAS CLICK/TAP AND PATH EVENTS (RIP SVG)^^^//////////////////////////////////////////////////////////////////

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

    // Canvas-only (RIP SVG)
    let drawSurface = $('#stuffedanimalwarcanvas');
    drawSurface.css('background-image', 'url(' + imageSrc + ')');
    setBackgroundImage(imageSrc);

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
        lineWidth:parseInt(colorPickerButton.attr("data-line-width")) || 5,
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
        width: parseInt(colorPickerButton.attr("data-line-width")) || 2, // Stroke width from slider
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

//VOICE CHAT - WEBRTC///////////////////////////////////////////////////////////////////////////VOICE CHAT////////////////////////VOICE CHAT//
// Voice chat state
let localStream = null;
let peerConnections = {};
let isMicEnabled = false;
let isVoiceChatMuted = true; // Start muted by default
let connectedPeers = new Set();
let pendingIceCandidates = {}; // Store ICE candidates that arrive before remote description

// ICE server configuration (using public STUN servers)
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Initialize voice chat event listeners
document.addEventListener('DOMContentLoaded', function() {
    const micButton = document.getElementById('micToggleButton');
    const voiceChatMuteButton = document.getElementById('voiceChatMuteButton');

    if (micButton) {
        micButton.addEventListener('click', toggleMicrophone);
    }

    if (voiceChatMuteButton) {
        voiceChatMuteButton.addEventListener('click', toggleVoiceChatMute);
    }

    // Set up WebRTC socket listeners
    initializeVoiceChatSocketHandlers();

    // Set up click handler to resume blocked audio (Chrome autoplay policy)
    let audioResumeAttempted = false;

    function resumeBlockedAudio() {
        if (!audioResumeAttempted) {
            audioResumeAttempted = true;
            console.log('🔊 User clicked - attempting to resume all remote audio elements');

            // Resume pending audio elements
            if (window._pendingAudioElements && window._pendingAudioElements.length > 0) {
                window._pendingAudioElements.forEach((audioElement, index) => {
                    audioElement.play().then(() => {
                        console.log('✅ Successfully resumed pending audio element', index);
                    }).catch(err => {
                        console.error('❌ Still could not play audio element', index, ':', err);
                    });
                });
                window._pendingAudioElements = [];
            }

            // Also ensure ALL remote audio elements are unmuted and playing
            Object.keys(peerConnections).forEach(peerId => {
                const audioElement = document.getElementById('remoteAudio_' + peerId);
                if (audioElement) {
                    console.log('🔊 Unmuting and playing audio for peer:', peerId);
                    audioElement.muted = false;
                    audioElement.play().catch(err => {
                        console.warn('Could not play audio for peer', peerId, ':', err);
                    });
                }
            });

            // Hide the orange button
            const resumeButton = document.getElementById('resumeAudioButton');
            if (resumeButton) {
                resumeButton.style.display = 'none';
            }

            const statusText = document.getElementById('voiceChatStatus');
            if (statusText && !isMicEnabled) {
                statusText.textContent = 'Listening to remote audio';
                statusText.style.color = '#28a745';
            }
        }
    }

    document.addEventListener('click', resumeBlockedAudio, true);

    // Also attach to the specific button
    const resumeButton = document.getElementById('resumeAudioButton');
    if (resumeButton) {
        resumeButton.addEventListener('click', resumeBlockedAudio);
    }

    // Test speakers button
    const testSpeakersButton = document.getElementById('testSpeakersButton');
    if (testSpeakersButton) {
        testSpeakersButton.addEventListener('click', function() {
            console.log('🔊 Testing speakers with 440Hz tone...');
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 440; // A4 note
            oscillator.type = 'sine';

            // Fade in/out to avoid clicks
            const now = audioContext.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, now + 1.0);

            oscillator.start(now);
            oscillator.stop(now + 1.0);

            // Close the audio context after the tone finishes to free resources
            setTimeout(() => {
                audioContext.close();
            }, 1100);

            const statusText = document.getElementById('voiceChatStatus');
            if (statusText) {
                statusText.textContent = 'Playing test tone...';
                statusText.style.color = '#17a2b8';
                setTimeout(() => {
                    if (!isMicEnabled) {
                        statusText.textContent = 'Voice chat ready';
                        statusText.style.color = '#999';
                    }
                }, 1000);
            }

            console.log('✅ If you heard a beep, your speakers work!');
        });
    }
});

function initializeVoiceChatSocketHandlers() {
    // Listen for new user connections - initiate offer if we have mic enabled
    socket.on(connectSocketEvent, function(connectMsgObject) {
        console.log('User connected, mic enabled:', isMicEnabled);
        // If our mic is enabled, create an offer to the new user
        if (isMicEnabled && localStream) {
            // Small delay to ensure the new user is ready
            setTimeout(() => {
                createOfferForNewPeer();
            }, 500);
        }
    });

    // Listen for voice offers from other peers
    socket.on(voiceOfferSocketEvent, async function(data) {
        console.log('📨 Received voice offer from:', data.from);

        // Don't process our own offers
        if (data.from === socket.id) {
            console.log('Ignoring own offer');
            return;
        }

        // Check if we already have a connection with this peer
        let peerConnection = peerConnections[data.from];
        let isRenegotiation = false;

        if (peerConnection) {
            const state = peerConnection.connectionState;
            const signalingState = peerConnection.signalingState;

            // If connection is stable, this might be a renegotiation (e.g., peer added their mic)
            if (state === 'connected' && signalingState === 'stable') {
                console.log('Accepting renegotiation offer from', data.from);
                isRenegotiation = true;
            }
            // If already negotiating, use tie-breaker to avoid glare
            else if (signalingState !== 'stable') {
                console.log('Already negotiating with', data.from, '- using tie-breaker');

                // Use socket IDs as tie-breaker: "polite" peer (lower ID) accepts remote offer
                // "impolite" peer (higher ID) ignores remote offer
                const isPolite = socket.id < data.from;

                if (isPolite) {
                    console.log('We are polite peer - accepting remote offer and rolling back');
                    // Rollback to stable state by setting remote offer
                    // This will implicitly rollback our local offer
                    isRenegotiation = false; // Treat as new negotiation
                } else {
                    console.log('We are impolite peer - ignoring remote offer');
                    return;
                }
            }
            // If connecting but not negotiating, might be recovering from failure
            else if (state === 'connecting') {
                console.log('Connection in progress with', data.from, '- accepting offer to help recovery');
                isRenegotiation = false;
            }
        }

        // Create new connection if needed
        if (!isRenegotiation && !peerConnection) {
            peerConnection = createPeerConnection(data.from);
        }

        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            console.log('📤 Sending answer to:', data.from);
            socket.emit(voiceAnswerSocketEvent, {
                answer: answer,
                to: data.from
            });

            // Process any queued ICE candidates for this peer
            if (pendingIceCandidates[data.from]) {
                console.log('Processing', pendingIceCandidates[data.from].length, 'queued ICE candidates for:', data.from);
                for (const candidate of pendingIceCandidates[data.from]) {
                    try {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (error) {
                        console.error('Error adding queued ICE candidate:', error);
                    }
                }
                delete pendingIceCandidates[data.from];
            }
        } catch (error) {
            console.error('❌ Error handling voice offer:', error);
        }
    });

    // Listen for voice answers
    socket.on(voiceAnswerSocketEvent, async function(data) {
        console.log('📨 Received voice answer from:', data.from);

        let peerConnection = peerConnections[data.from];

        // If we don't have a peer connection, it means this answer is for a broadcast offer
        // that we already closed. The other peer will send us an offer, so just wait for it.
        if (!peerConnection) {
            console.log('No peer connection exists for answer from:', data.from);
            console.log('This is likely from a broadcast offer - ignoring, will connect when we receive their offer');
            return;
        }

        // Check the signaling state before trying to set remote description
        if (peerConnection.signalingState !== 'have-local-offer') {
            console.warn('⚠️ Peer connection not in correct state for answer. State:', peerConnection.signalingState);
            console.warn('This answer is probably for an old offer, ignoring it');
            return;
        }

        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            console.log('✅ Set remote description for peer:', data.from);

            // Process any queued ICE candidates for this peer
            if (pendingIceCandidates[data.from]) {
                console.log('Processing', pendingIceCandidates[data.from].length, 'queued ICE candidates for:', data.from);
                for (const candidate of pendingIceCandidates[data.from]) {
                    try {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (error) {
                        console.error('Error adding queued ICE candidate:', error);
                    }
                }
                delete pendingIceCandidates[data.from];
            }
        } catch (error) {
            console.error('❌ Error handling voice answer:', error, 'State was:', peerConnection.signalingState);
        }
    });

    // Listen for ICE candidates
    socket.on(voiceIceCandidateSocketEvent, async function(data) {
        console.log('Received ICE candidate from:', data.from);

        // Don't process our own candidates
        if (data.from === socket.id) {
            return;
        }

        const peerConnection = peerConnections[data.from];

        if (!peerConnection) {
            console.log('No peer connection yet for', data.from, '- candidate will be queued');
            return;
        }

        if (data.candidate) {
            // Check if remote description is set
            if (!peerConnection.remoteDescription) {
                console.log('Remote description not set yet, queuing ICE candidate for:', data.from);

                // Queue the candidate
                if (!pendingIceCandidates[data.from]) {
                    pendingIceCandidates[data.from] = [];
                }
                pendingIceCandidates[data.from].push(data.candidate);
                return;
            }

            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                console.log('✅ Added ICE candidate for:', data.from);
            } catch (error) {
                console.error('❌ Error adding ICE candidate:', error);
            }
        }
    });

    // Listen for user disconnections
    socket.on(disconnectSocketEvent, function(disconnectMsgObject) {
        // Clean up peer connections for disconnected users
        // Note: We can't reliably map socket IDs here, so we rely on connection state changes
        console.log('User disconnected');
    });
}

async function toggleMicrophone() {
    const micButton = document.getElementById('micToggleButton');
    const micIcon = document.getElementById('micIcon');
    const micLabel = document.getElementById('micLabel');
    const statusText = document.getElementById('voiceChatStatus');

    if (!isMicEnabled) {
        // Enable microphone
        try {
            // First check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia is not supported in this browser');
            }

            // Check current permission state if available
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
                    console.log('Microphone permission state:', permissionStatus.state);

                    if (permissionStatus.state === 'denied') {
                        statusText.textContent = 'Mic blocked - check browser settings';
                        statusText.style.color = '#dc3545';
                        alert('Microphone is blocked.\n\n1. Click the lock/info icon in the address bar\n2. Change Microphone to "Allow"\n3. Refresh the page');
                        return;
                    }
                } catch (e) {
                    console.log('Could not query permission status:', e);
                }
            }

            console.log('Requesting microphone access...');
            localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            console.log('✅ Microphone access granted!');
            console.log('Audio tracks:', localStream.getAudioTracks().map(t => ({
                label: t.label,
                enabled: t.enabled,
                muted: t.muted,
                readyState: t.readyState
            })));

            // Force enable the track just in case
            localStream.getAudioTracks().forEach(track => {
                track.enabled = true;
                console.log('Track after enabling:', track.label, 'enabled:', track.enabled, 'muted:', track.muted);
            });

            isMicEnabled = true;

            // Update UI
            micButton.style.background = '#28a745';
            micIcon.textContent = '🎤';
            micLabel.textContent = 'Mic On';
            statusText.textContent = 'Microphone enabled - broadcasting';
            statusText.style.color = '#28a745';

            console.log('Microphone enabled, creating offer for all peers');

            // Log the local stream details
            console.log('📤 Local stream details:');
            localStream.getTracks().forEach((track, index) => {
                console.log(`  Track ${index}:`, {
                    kind: track.kind,
                    label: track.label,
                    enabled: track.enabled,
                    muted: track.muted,
                    readyState: track.readyState
                });

                // Monitor if we're actually capturing audio
                if (track.kind === 'audio') {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const microphone = audioContext.createMediaStreamSource(new MediaStream([track]));
                    const analyser = audioContext.createAnalyser();
                    microphone.connect(analyser);

                    const dataArray = new Uint8Array(analyser.frequencyBinCount);

                    const checkMicLevel = setInterval(() => {
                        analyser.getByteFrequencyData(dataArray);
                        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                        // Only log occasionally for debugging
                        // if (average > 0) {
                        //     console.log('🎤 LOCAL mic is capturing audio, level:', average.toFixed(2));
                        // }
                    }, 2000);

                    // Store so we can clear it later
                    window._localMicMonitor = checkMicLevel;
                }
            });

            // Add tracks to existing peer connections and force renegotiation
            Object.keys(peerConnections).forEach(peerId => {
                const pc = peerConnections[peerId];
                if (pc && (pc.connectionState === 'connected' || pc.connectionState === 'connecting')) {
                    console.log('📤 Adding track and renegotiating with existing peer:', peerId);

                    try {
                        // Check if we've already added a track to this connection
                        const senders = pc.getSenders();
                        const hasAudioTrack = senders.some(sender => sender.track && sender.track.kind === 'audio');

                        if (!hasAudioTrack) {
                            // Add the audio track
                            localStream.getTracks().forEach(track => {
                                console.log('➕ Adding track to existing connection:', peerId, 'track:', track.kind, track.label);
                                const sender = pc.addTrack(track, localStream);
                                console.log('   Sender added:', sender.track ? sender.track.kind : 'no track');
                            });

                            console.log('📊 After adding track, connection', peerId, 'has', pc.getSenders().length, 'senders');

                            // Now renegotiate by creating a new offer
                            pc.createOffer().then(offer => {
                                return pc.setLocalDescription(offer);
                            }).then(() => {
                                socket.emit(voiceOfferSocketEvent, {
                                    offer: pc.localDescription,
                                    to: peerId  // Send to specific peer
                                });
                                console.log('📤 Sent renegotiation offer to:', peerId);
                            }).catch(err => {
                                console.error('Error renegotiating with', peerId, ':', err);
                            });
                        }
                    } catch (error) {
                        console.error('Error adding track to peer', peerId, ':', error);
                    }
                }
            });

            // Also broadcast offer for any new peers that might join
            createOfferForNewPeer();

        } catch (error) {
            console.error('❌ Error accessing microphone:', error.name, '-', error.message);

            let errorMessage = 'Unable to access microphone.\n\n';

            if (error.name === 'NotAllowedError') {
                errorMessage += 'SYSTEM LEVEL BLOCK:\n' +
                    '1. Open System Settings\n' +
                    '2. Go to Privacy & Security → Microphone\n' +
                    '3. Enable "Google Chrome"\n' +
                    '4. Quit Chrome completely (⌘+Q)\n' +
                    '5. Reopen Chrome and try again\n\n' +
                    'OR check browser permissions:\n' +
                    '- Click the lock icon in address bar\n' +
                    '- Set Microphone to "Allow"';
            } else if (error.name === 'NotFoundError') {
                errorMessage += 'No microphone found on your device.';
            } else if (error.name === 'NotReadableError') {
                errorMessage += 'Microphone is being used by another application.\n' +
                    'Close other apps using the microphone and try again.';
            } else {
                errorMessage += error.message;
            }

            statusText.textContent = 'Microphone access denied - ' + error.name;
            statusText.style.color = '#dc3545';
            alert(errorMessage);
        }
    } else {
        // Disable microphone
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }

        // Close all peer connections
        Object.keys(peerConnections).forEach(peerId => {
            if (peerConnections[peerId]) {
                peerConnections[peerId].close();
                delete peerConnections[peerId];
            }
        });

        connectedPeers.clear();
        isMicEnabled = false;

        // Update UI
        micButton.style.background = '#666';
        micIcon.textContent = '🎤';
        micLabel.textContent = 'Enable Mic';
        statusText.textContent = 'Microphone disabled';
        statusText.style.color = '#999';
    }
}

function toggleVoiceChatMute() {
    const muteButton = document.getElementById('voiceChatMuteButton');
    const muteIcon = document.getElementById('voiceChatMuteIcon');
    const muteLabel = document.getElementById('voiceChatMuteLabel');
    const statusText = document.getElementById('voiceChatStatus');

    isVoiceChatMuted = !isVoiceChatMuted;

    // Mute/unmute all remote audio elements
    document.querySelectorAll('audio[id^="remoteAudio_"]').forEach(audioElement => {
        audioElement.muted = isVoiceChatMuted;
    });

    if (isVoiceChatMuted) {
        muteButton.style.background = '#dc3545';
        muteIcon.textContent = '🔇';
        muteLabel.textContent = 'Unmute Voice Chat';
        if (!isMicEnabled) {
            statusText.textContent = 'Voice chat muted';
            statusText.style.color = '#dc3545';
        }
    } else {
        muteButton.style.background = '#666';
        muteIcon.textContent = '🔊';
        muteLabel.textContent = 'Mute Voice Chat';
        if (!isMicEnabled) {
            statusText.textContent = 'Voice chat ready';
            statusText.style.color = '#999';
        }
    }
}

function updatePeerCount() {
    const peerCountElement = document.getElementById('voiceChatPeers');
    if (peerCountElement) {
        const count = Object.keys(peerConnections).length;
        peerCountElement.textContent = 'Peers: ' + count;
        console.log('Active peer connections:', count, Object.keys(peerConnections));

        // Debug: List all remote audio elements
        const audioElements = document.querySelectorAll('audio[id^="remoteAudio_"]');
        console.log('Remote audio elements:', audioElements.length);
        audioElements.forEach(audio => {
            console.log('  -', audio.id,
                'srcObject:', !!audio.srcObject,
                'paused:', audio.paused,
                'muted:', audio.muted,
                'volume:', audio.volume,
                'readyState:', audio.readyState);

            if (audio.srcObject) {
                const tracks = audio.srcObject.getAudioTracks();
                console.log('    Tracks:', tracks.length);
                tracks.forEach(track => {
                    console.log('      Track:', track.label, 'enabled:', track.enabled, 'readyState:', track.readyState);
                });
            }
        });
    }
}

function createPeerConnection(peerId) {
    // If we already have a connection to this peer, check its state
    if (peerConnections[peerId]) {
        const existing = peerConnections[peerId];
        const state = existing.connectionState;

        // If it's connected or connecting, reuse it
        if (state === 'connected' || state === 'connecting' || state === 'new') {
            console.log('Reusing existing peer connection for:', peerId, 'state:', state);
            return existing;
        }

        // If it's failed/disconnected/closed, clean it up and create new
        console.log('Cleaning up old peer connection for:', peerId, 'state:', state);
        existing.close();
        delete peerConnections[peerId];
    }

    console.log('Creating new peer connection for:', peerId);
    const peerConnection = new RTCPeerConnection(iceServers);
    peerConnections[peerId] = peerConnection;

    // Add local stream tracks if microphone is enabled
    if (localStream) {
        localStream.getTracks().forEach(track => {
            console.log('➕ Adding local track to peer connection:', peerId, 'track:', track.kind, track.label);
            const sender = peerConnection.addTrack(track, localStream);
            console.log('   Sender added:', sender.track ? sender.track.kind : 'no track');
        });
    }

    // Log current senders for this connection
    console.log('📊 Peer connection', peerId, 'now has', peerConnection.getSenders().length, 'senders');
    peerConnection.getSenders().forEach((sender, idx) => {
        if (sender.track) {
            console.log('   Sender', idx, ':', sender.track.kind, sender.track.label, 'enabled:', sender.track.enabled);
        }
    });

    // Handle ICE candidates
    peerConnection.onicecandidate = function(event) {
        if (event.candidate) {
            console.log('Sending ICE candidate to peer:', peerId);
            socket.emit(voiceIceCandidateSocketEvent, {
                candidate: event.candidate,
                to: peerId
            });
        }
    };

    // Handle remote tracks (incoming audio from other users)
    peerConnection.ontrack = function(event) {
        console.log('🎵 Received remote track from peer:', peerId);
        console.log('Track kind:', event.track.kind);
        console.log('Track enabled:', event.track.enabled);
        console.log('Streams:', event.streams);

        const remoteStream = event.streams[0];

        // Create or get audio element for this peer
        let audioElement = document.getElementById('remoteAudio_' + peerId);
        if (!audioElement) {
            audioElement = document.createElement('audio');
            audioElement.id = 'remoteAudio_' + peerId;
            audioElement.autoplay = true;
            audioElement.muted = isVoiceChatMuted;
            audioElement.volume = 1.0;
            audioElement.style.display = 'none';
            document.body.appendChild(audioElement);
            console.log('✅ Created audio element for peer:', peerId);
        }

        audioElement.srcObject = remoteStream;

        // Log stream info
        console.log('Audio element ID:', audioElement.id);
        console.log('Audio element muted:', audioElement.muted, 'volume:', audioElement.volume);
        console.log('Stream has', remoteStream.getAudioTracks().length, 'audio tracks');
        remoteStream.getAudioTracks().forEach((track, index) => {
            console.log('Audio track', index, '- enabled:', track.enabled, 'muted:', track.muted, 'readyState:', track.readyState);
        });

        // Try to play audio - Chrome may block this until user interaction
        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('✅ Audio playback started for peer:', peerId);
            }).catch(err => {
                console.warn('⚠️ Autoplay blocked - will retry on next user interaction:', err.message);

                // Store this audio element to retry later
                if (!window._pendingAudioElements) {
                    window._pendingAudioElements = [];
                }
                window._pendingAudioElements.push(audioElement);

                // Show the orange "Click to hear" button
                const resumeButton = document.getElementById('resumeAudioButton');
                if (resumeButton) {
                    resumeButton.style.display = 'block';
                }

                // Update status to inform user
                const statusText = document.getElementById('voiceChatStatus');
                if (statusText && !isMicEnabled) {
                    statusText.textContent = 'Incoming audio ready - click orange button';
                    statusText.style.color = '#ffa500';
                }
            });
        }

        // Monitor audio levels (for debugging)
        if (window.AudioContext || window.webkitAudioContext) {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioContext.createMediaStreamSource(remoteStream);
                const analyser = audioContext.createAnalyser();
                source.connect(analyser);

                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                let silenceCount = 0;

                const checkAudio = setInterval(() => {
                    analyser.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

                    if (average > 0) {
                        // console.log('🔊 Audio level from peer', peerId, ':', average.toFixed(2));
                        silenceCount = 0;
                    } else {
                        silenceCount++;
                        if (silenceCount === 30) {
                            console.warn('⚠️ No audio detected from peer', peerId, 'for 30 seconds');
                            silenceCount = 0; // Reset to avoid repeated warnings
                        }
                    }
                }, 1000);

                // Store interval to clear later
                peerConnection._audioCheckInterval = checkAudio;
            } catch (e) {
                console.log('Could not set up audio monitoring:', e);
            }
        }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = function() {
        console.log('Peer connection state for', peerId, ':', peerConnection.connectionState);
        if (peerConnection.connectionState === 'disconnected' ||
            peerConnection.connectionState === 'failed' ||
            peerConnection.connectionState === 'closed') {
            // Clean up audio monitoring
            if (peerConnection._audioCheckInterval) {
                clearInterval(peerConnection._audioCheckInterval);
            }
            // Clean up audio element
            const audioElement = document.getElementById('remoteAudio_' + peerId);
            if (audioElement) {
                audioElement.remove();
            }
            delete peerConnections[peerId];
            connectedPeers.delete(peerId);
            console.log('Cleaned up peer connection:', peerId);
            updatePeerCount();
        } else if (peerConnection.connectionState === 'connected') {
            connectedPeers.add(peerId);
            console.log('✅ Peer CONNECTED:', peerId);
            updatePeerCount();
        }
    };

    // Handle ICE connection state
    peerConnection.oniceconnectionstatechange = function() {
        console.log('ICE connection state for', peerId, ':', peerConnection.iceConnectionState);
    };

    updatePeerCount();
    return peerConnection;
}

async function createOfferForNewPeer() {
    if (!localStream) {
        console.log('No local stream available');
        return;
    }

    console.log('📢 Broadcasting offer to room - existing peers will create connections');

    // We're just broadcasting that we have a mic enabled
    // Remote peers will create peer connections and send us back their stream
    console.log('📤 Broadcasting offer with', localStream.getTracks().length, 'tracks');

    // Just send a simple offer - the WebRTC negotiation will happen when peers respond
    // The answering peer will create their connection, and we'll create ours when we get the answer
    const tempPc = new RTCPeerConnection(iceServers);

    // Add tracks to create a proper SDP
    localStream.getTracks().forEach(track => {
        tempPc.addTrack(track, localStream);
    });

    try {
        const offer = await tempPc.createOffer();
        await tempPc.setLocalDescription(offer);

        socket.emit(voiceOfferSocketEvent, {
            offer: offer
        });

        // Close temp connection - we'll create real ones when we get answers
        setTimeout(() => tempPc.close(), 1000);
    } catch (error) {
        console.error('Error creating offer:', error);
    }
}
//HTML EVENTS///////////////////////////////////////////////////////////////////////////HTML EVENTS////////////////////////HTML EVENTS//
