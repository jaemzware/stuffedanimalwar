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
let chatTextBox = $('#chatClientMessage');
//SOCKET EVENTS RECEIVING///////////////////////////////////////////////////////////////////////////SOCKET EVENTS////////////////////////SOCKET EVENTS//
function initializeSocketHandlers(){
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
        // Create the SVG path element
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
            $('#stuffedanimalwarsvg').css('background-image', 'url(' + chatImageMsgObject.CHATCLIENTIMAGE + ')');
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
            // Update the video source
            $("#jaemzwaredynamicvideosource").attr("src", chatVideoMsgObject.CHATCLIENTVIDEO);

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
        $('#stuffedanimalwarsvg').css('background-image', 'url(' + presentImageMsgObject.CHATCLIENTIMAGE + ')');
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
                    $('#stuffedanimalwarsvg').css('background-image', 'url(' + chatClientMessage + ')');
                });

                img.prependTo("#messagesdiv");
            }
            else if(chatClientMessage.toLowerCase().endsWith(".mp3") && remoteChatClientUser===masterAlias)
            {
                changeMp3(chatClientMessage);
            }
            else if(chatClientMessage.toLowerCase().endsWith(".mp4") && remoteChatClientUser===masterAlias)
            {
                changeMp4(chatClientMessage);
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

//STUFFED ANIMAL WAR SVG CLICK/TAP AND PATH EVENTS///////////////////////////////////////////////////////////////////////////HTML EVENTS////////////////////////HTML EVENTS//

// DESKTOP DRAG
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
    e.preventDefault(); //PREVENT SVG FROM SCROLLING WHEN TOUCHED
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
//^^^STUFFED ANIMAL WAR SVG CLICK/TAP AND PATH EVENTS^^^//////////////////////////////////////////////////////////////////

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
        emitChatMessage(songToPlay);
    }
    else{
        changeMp3(songToPlay);
    }
});
//IMAGE AND VIDEO UPLOAD FORM SUBMISSION
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
            document.getElementById('progressIndicator').textContent = `${percentComplete.toFixed(2)}% uploaded`;
        }
    };

    xhr.onload = () => {
        if (xhr.status === 200) {
            document.getElementById('progressIndicator').textContent = 'Image Upload complete!';
            document.getElementById('uploadForm').reset();
        } else {
            console.error('Image Upload failed.');
            document.getElementById('progressIndicator').textContent = 'Image Upload failed.';
        }
    };

    xhr.open('POST', '/'+chatImageSocketEvent, true);
    xhr.send(formData);
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
            document.getElementById('videoProgressIndicator').textContent = `${percentComplete.toFixed(2)}% uploaded`;
        }
    };

    xhr.onload = () => {
        if (xhr.status === 200) {
            document.getElementById('videoProgressIndicator').textContent = 'Video Upload complete!';
            document.getElementById('videoUploadForm').reset();
        } else {
            console.error('Video Upload failed.');
            document.getElementById('videoProgressIndicator').textContent = 'Video Upload failed.';
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
    let chatClientUser = $("#chatClientUser").val();
    changeMp4(videoToPlay,poster);
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
    let SVG = $('#stuffedanimalwarsvg');

    // Set the background image of stuffedanimalwarsvg
    SVG.css('background-image', 'url(' + imageSrc + ')');

    // Set the background image for everyone
    let chatClientUser = $("#chatClientUser").val();
    if(chatClientUser===masterAlias){
        emitPresentImage(imageSrc);
    }

    // Scroll to the SVG element
    $('html, body').animate({
        scrollTop: SVG.offset().top
    }, 500); // 500ms animation duration
});
$('#clearboardbutton').on("click", function() {
    clearGameBoard();
    emitChatMessage("#CLEARBOARD;");
});
$('#animals').on('change', function() {
    if ($(this).val() === "custom") {
        $('#imagepathtextbox').show();
    } else {
        $('#imagepathtextbox').hide();
    }
    if ($(this).val() === "line") {
        //RESET OLD POINT LINE VALUES
        oldPointForLineToolX = null;
        oldPointForLineToolY = null;
    }
});
$('#clearchatbutton').on("click", function() {
    clearChat();
    emitChatMessage("#CLEARCHAT;");
});

function clearChat(){
    $('#messagesdiv').empty();
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
