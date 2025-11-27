/*
 * THIS IS WHERE ON PAGE LOADED THINGS HAPPEN
 */
// Initialize the color picker after page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // COLOR PICKER BUTTON CALLBACK FOR RGB VALUES
    if (document.getElementById('colorPickerButton')) {
        // Connect color picker to your function
        window.ColorPickerModal.setCallback(function (r, g, b) {
            console.log("rgb:" + r + " " + g + " " + b);

            // Example: use the selected color in your stuffedanimalwar mechanics
            // You can add your custom logic here
            // For example, setting a custom color for drawing

            // Store the RGB values in a variable for use in your game
            currentDrawColor = {r: r, g: g, b: b};
        });

        // Set initial color if needed
        window.ColorPickerModal.setColor(255, 255, 255);
    }

    //HIDE CUSTOM URL FIELD UNTIL IT IS CHOSEN FROM SELECT
    const imagePathTextbox = document.getElementById("imagepathtextbox");
    if (imagePathTextbox) {
        $("#imagepathtextbox").css("display", "none");
    }

    //LOAD FIRST FRAME OF VIDEO IF POSTER NOT SPECIFIED
    const video = document.getElementById("jaemzwaredynamicvideoplayer");

    if (video && (!video.hasAttribute("poster") || video.getAttribute("poster") === "")) {
        // Once the video metadata is loaded, we can seek to the first frame
        video.addEventListener("loadedmetadata", function () {
            // Seek to the first frame (0.1 seconds to ensure we get an actual frame)
            video.currentTime = 0.1;

            // Once we've seeked to the first frame, capture it
            video.addEventListener("seeked", function () {
                // Create a canvas to capture the frame
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Draw the current frame to the canvas
                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Set the poster to the canvas data
                video.poster = canvas.toDataURL("image/png");

                // Reset the video's current time to 0
                video.currentTime = 0;

                // Remove the event listener as we only need to do this once
                video.removeEventListener("seeked", arguments.callee);
            }, {once: true});
        });
    }

    //MP3 metadata
    setupMetadataListeners();

    //speed slider
    initSpeedSlider();

    //Initialize camera options
    initializeCameraOptions();
});
/*
 * THESE ARE UTILITY FUNCTIONS FOR CONTROLLING THE AUDIO AND VIDEO PLAYERS ON THE PAGE  THESE ARE RESPONSES TO THE
 * SERVER PUSH OVER SOCKET, I BELIEVE
 */


/* UTILITY - GETRANDOMVALUE (COMMON)
 * this function returns a random color value, used by drawing new things
 */
function GetRandomValue(max){
    return Math.floor((Math.random() * max) + 1);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////AUDIO SPECIFIC UTILITIES
function PlayNextTrack(currentFile){
    //don't do anything if there are no songs
    if($('#selectsongs option').length===0){
        return;
    }

    var current=$('#selectsongs option[value="'+currentFile+'"]').attr('value');
    var first=$('#selectsongs option').first().attr('value');
    var last=$('#selectsongs option').last().attr('value');
    var next=$('#selectsongs option[value="'+currentFile+'"]').next().attr('value');

    console.log("FIRST:"+first+" CURRENT:"+current+" NEXT:"+next+" LAST:"+last);

    //if the current song is the last song, play the first song
    if(current===last){
        changeAudio(first);
    }
    else{ //otherwise, play the next song
        changeAudio(next);
    }
}
function PlayNextVideo(currentFile){
    //don't do anything if there are no videos
    if($('#selectvideos option').length===0){
        return;
    }

    var current=$('#selectvideos option[value="'+currentFile+'"]').attr('value');
    var first=$('#selectvideos option').first().attr('value');
    var last=$('#selectvideos option').last().attr('value');
    var next=$('#selectvideos option[value="'+currentFile+'"]').next().attr('value');
    var firstposter=$('#selectvideos option').first().attr('optionposter');
    var nextposter=$('#selectvideos option[value="'+currentFile+'"]').next().attr('optionposter');

    //if the current video is the last video, play the first video
    if(current===last){
        changeMp4(first,firstposter);
    }
    else{ //otherwise, play the next video
        changeMp4(next,nextposter);
    }
}
function changeAudio(audioUrl) {
    let $selectSongs = $('#selectsongs');
    let optionExists = false;

    // Check if the song exists in the dropdown
    $selectSongs.find('option').each(function() {
        if ($(this).val() === audioUrl) {
            optionExists = true;
            return false; // break the loop
        }
    });

    // If the option doesn't exist, add it dynamically with the URL as the display text
    if (!optionExists) {
        let newOption = $('<option>')
            .val(audioUrl)
            .text(audioUrl); // Just show the URL so we know it's a DJ selection

        $selectSongs.append(newOption);
    }

    // Select the option
    $selectSongs.val(audioUrl);

    // Clear the metadata display immediately to prevent showing stale data
    const artist = document.getElementById('track-artist');
    const album = document.getElementById('track-album');
    const title = document.getElementById('track-title');
    const albumArt = document.getElementById('album-art-img');
    const artistAlbumSeparator = document.getElementById('artist-album-separator');
    const albumTitleSeparator = document.getElementById('album-title-separator');

    if (artist) artist.textContent = 'Loading...';
    if (album) album.textContent = '';
    if (title) title.textContent = '';
    if (albumArt) albumArt.style.display = 'none';
    if (artistAlbumSeparator) artistAlbumSeparator.style.display = 'none';
    if (albumTitleSeparator) albumTitleSeparator.style.display = 'none';

    // Determine the MIME type based on file extension
    let audioType = 'audio/mpeg'; // default for MP3
    if (audioUrl.toLowerCase().endsWith('.flac')) {
        audioType = 'audio/flac';
    }

    // Change the source of the AUDIO player
    $('#jaemzwaredynamicaudiosource').attr("src", audioUrl);
    $('#jaemzwaredynamicaudiosource').attr("type", audioType);
    document.getElementById("jaemzwaredynamicaudioplayer").load();
    document.getElementById("jaemzwaredynamicaudioplayer").play();

    // The existing displayMetadata will be triggered by the loadedmetadata event
    // and will update the metadata display below the player
}

// Keep backward compatibility
function changeMp3(mp3Url) {
    changeAudio(mp3Url);
}

function changeMp4(mp4Url){
    //change the source of the VIDEO player with default video cover image
    changeMp4(mp4Url,"photos/stuffedanimalwarfinal.jpg");
}
// Global variable to store active camera stream
let activeCameraStream = null;
let cameraWebRTCConnection = null; // Store WebRTC connection for remote camera

function changeMp4(mp4Url,coverImageUrl){
    console.log("CHANGE MP4");

    let $selectVideos = $('#selectvideos');
    let optionExists = false;

    // Check if the video exists in the dropdown
    $selectVideos.find('option').each(function() {
        if ($(this).val() === mp4Url) {
            optionExists = true;
            return false; // break the loop
        }
    });

    // If the option doesn't exist, add it dynamically
    if (!optionExists) {
        // Extract filename from URL for display (DJ-sent links have filenames)
        let displayText = mp4Url;
        try {
            const urlParts = mp4Url.split('/');
            const filename = urlParts[urlParts.length - 1];
            if (filename) {
                displayText = decodeURIComponent(filename);
            }
        } catch (e) {
            // If filename extraction fails, just use the full URL
            displayText = mp4Url;
        }

        let newOption = $('<option>')
            .val(mp4Url)
            .text(displayText);

        $selectVideos.append(newOption);
    }

    // Select the option
    $selectVideos.val(mp4Url);

    const videoElement = document.getElementById("jaemzwaredynamicvideoplayer");

    // Check if this is a WebRTC camera stream from a broadcaster
    if (mp4Url.startsWith("webrtc://")) {
        console.log("Connecting to WebRTC camera broadcaster");

        // Stop any existing camera stream
        stopCameraStream();
        stopCameraWebRTC();

        // Clear the source element
        $('#jaemzwaredynamicvideosource').attr("src", "");

        // Extract broadcaster ID from the URL
        const broadcasterId = mp4Url.replace("webrtc://", "");

        // Connect to the broadcaster via WebRTC
        connectToCameraBroadcaster(broadcasterId, videoElement);
    }
    // Check if this is a local camera option
    else if (mp4Url.startsWith("camera://")) {
        console.log("Activating camera stream");

        // Stop any existing camera stream
        stopCameraStream();

        // Clear the source element
        $('#jaemzwaredynamicvideosource').attr("src", "");

        // Extract device ID from the URL
        const deviceId = mp4Url.replace("camera://", "");

        // Request camera access
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            // Build video constraints
            const videoConstraints = {
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            };

            // If a specific device ID is provided (not "default"), use it
            if (deviceId && deviceId !== "default") {
                videoConstraints.deviceId = { exact: deviceId };
            } else {
                // For default, prefer environment-facing camera (rear camera on mobile)
                videoConstraints.facingMode = 'environment';
            }

            navigator.mediaDevices.getUserMedia({
                video: videoConstraints,
                audio: false
            })
            .then(function(stream) {
                activeCameraStream = stream;
                videoElement.srcObject = stream;
                videoElement.play();
                console.log("Camera stream activated successfully");

                // Update camera labels now that we have permission
                updateCameraLabels();
            })
            .catch(function(err) {
                console.error("Error accessing camera: ", err);
                alert("Could not access camera: " + err.message + "\n\nPlease ensure:\n1. Camera permissions are granted\n2. Camera is not in use by another application\n3. You're accessing via HTTPS or localhost");
            });
        } else {
            alert("Camera access is not supported in this browser");
        }
    } else {
        // Stop camera stream if switching to a file-based video
        stopCameraStream();
        stopCameraWebRTC();

        // Reset srcObject to null when switching to file-based video
        videoElement.srcObject = null;

        //change the source of the VIDEO player
        $('#jaemzwaredynamicvideosource').attr("src",mp4Url);
        if (coverImageUrl && coverImageUrl !== 'undefined') {
            $('#jaemzwaredynamicvideoplayer').attr("poster",coverImageUrl);
        }
        videoElement.pause();
        videoElement.load();
        videoElement.play();
    }
}

function stopCameraStream() {
    if (activeCameraStream) {
        console.log("Stopping camera stream");
        activeCameraStream.getTracks().forEach(track => track.stop());
        activeCameraStream = null;
    }
}

// Initialize camera options by enumerating available video devices
async function initializeCameraOptions() {
    const selectVideos = document.getElementById('selectvideos');

    // Check if video select exists and getUserMedia is supported
    if (!selectVideos || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.log("Camera enumeration not supported or video select not found");
        return;
    }

    try {
        // Enumerate all media devices WITHOUT requesting permission first
        // Device labels will be blank until permission is granted, but we can still detect count
        const devices = await navigator.mediaDevices.enumerateDevices();

        // Filter for video input devices (cameras)
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        console.log(`Found ${videoDevices.length} camera device(s)`);

        if (videoDevices.length > 0) {
            // Add an option for each camera at the beginning of the dropdown
            videoDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = `camera://${device.deviceId}`;
                option.setAttribute('data-is-camera', 'true');
                option.setAttribute('data-device-id', device.deviceId);

                // Use device label if available (will be blank until permission granted)
                // Otherwise use a generic label
                let label = device.label || `Camera ${index + 1}`;

                // Add emoji and format the label
                option.textContent = `📹 ${label}`;

                // Insert at the beginning of the select
                if (selectVideos.firstChild) {
                    selectVideos.insertBefore(option, selectVideos.firstChild);
                } else {
                    selectVideos.appendChild(option);
                }
            });

            console.log("Camera options added to dropdown");
        } else {
            // No cameras detected, add a default option anyway
            console.log("No cameras detected, adding default option");
            addDefaultCameraOption(selectVideos);
        }
    } catch (err) {
        console.log("Could not enumerate cameras:", err.message);
        // Add a default camera option as fallback
        addDefaultCameraOption(selectVideos);
    }
}

// Helper function to add a default camera option
function addDefaultCameraOption(selectVideos) {
    const option = document.createElement('option');
    option.value = 'camera://default';
    option.setAttribute('data-is-camera', 'true');
    option.textContent = '📹 Camera (Default)';
    if (selectVideos.firstChild) {
        selectVideos.insertBefore(option, selectVideos.firstChild);
    } else {
        selectVideos.appendChild(option);
    }
}

// Update camera labels after permission is granted
async function updateCameraLabels() {
    const selectVideos = document.getElementById('selectvideos');
    if (!selectVideos || !navigator.mediaDevices) return;

    try {
        // Re-enumerate devices - now we should get labels since permission was granted
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        // Update labels for existing camera options
        const options = selectVideos.querySelectorAll('option[data-is-camera="true"]');
        options.forEach((option, index) => {
            const deviceId = option.getAttribute('data-device-id');
            if (deviceId) {
                // Find matching device
                const device = videoDevices.find(d => d.deviceId === deviceId);
                if (device && device.label) {
                    option.textContent = `📹 ${device.label}`;
                    console.log(`Updated camera label: ${device.label}`);
                }
            }
        });
    } catch (err) {
        console.log("Could not update camera labels:", err.message);
    }
}

// Stop WebRTC camera connection
function stopCameraWebRTC() {
    if (cameraWebRTCConnection) {
        console.log("Stopping WebRTC camera connection");
        cameraWebRTCConnection.close();
        cameraWebRTCConnection = null;
    }
}

// Connect to a camera broadcaster via WebRTC
function connectToCameraBroadcaster(broadcasterId, videoElement) {
    console.log("[VIEWER] 🎬 Setting up WebRTC connection to broadcaster:", broadcasterId);

    // Create a new peer connection
    const pc = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    });

    cameraWebRTCConnection = pc;

    // Handle incoming video track
    pc.ontrack = function(event) {
        console.log("[VIEWER] 🎥 Received video track from broadcaster!");
        console.log("[VIEWER]   Track kind:", event.track.kind);
        console.log("[VIEWER]   Track enabled:", event.track.enabled);
        console.log("[VIEWER]   Track readyState:", event.track.readyState);
        console.log("[VIEWER]   Streams:", event.streams.length);

        const remoteStream = event.streams[0];
        console.log("[VIEWER]   Stream tracks:", remoteStream.getTracks().length);
        remoteStream.getTracks().forEach(track => {
            console.log("[VIEWER]     - Track:", track.kind, track.label, "enabled:", track.enabled);
        });

        videoElement.srcObject = remoteStream;
        console.log("[VIEWER] ✅ Set srcObject on video element");
        videoElement.play().then(() => {
            console.log("[VIEWER] ✅ Video playing!");
        }).catch(err => {
            console.error("[VIEWER] ❌ Error playing video:", err);
        });
    };

    // Handle ICE candidates
    pc.onicecandidate = function(event) {
        if (event.candidate) {
            console.log("Sending ICE candidate to broadcaster");
            socket.emit('camera-ice-candidate', {
                candidate: event.candidate,
                to: broadcasterId
            });
        }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = function() {
        console.log("[VIEWER] 🔄 Camera WebRTC connection state:", pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            console.error("[VIEWER] ❌ Connection state:", pc.connectionState);
            alert("Camera connection lost. Please try again.");
        } else if (pc.connectionState === 'connected') {
            console.log("[VIEWER] ✅ WebRTC connection established!");
        }
    };

    // Monitor ICE connection state
    pc.oniceconnectionstatechange = function() {
        console.log("[VIEWER] 🧊 ICE connection state:", pc.iceConnectionState);
    };

    // Request camera stream from broadcaster
    console.log("[VIEWER] 📤 Requesting camera stream from broadcaster:", broadcasterId);
    socket.emit('request-camera-stream', { broadcasterId: broadcasterId });

    // Listen for the offer from the broadcaster
    socket.on('camera-offer', async function(data) {
        if (data.from === broadcasterId) {
            console.log("[VIEWER] 📨 Received camera offer from broadcaster");
            try {
                console.log("[VIEWER] 📝 Setting remote description...");
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                console.log("[VIEWER] ✅ Remote description set");

                console.log("[VIEWER] 📝 Creating answer...");
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                console.log("[VIEWER] ✅ Local description set");

                console.log("[VIEWER] 📤 Sending answer to broadcaster...");
                socket.emit('camera-answer', {
                    answer: answer,
                    to: broadcasterId
                });
                console.log("[VIEWER] ✅ Answer sent to broadcaster");
            } catch (err) {
                console.error("[VIEWER] ❌ Error handling camera offer:", err);
            }
        }
    });

    // Listen for ICE candidates from broadcaster
    socket.on('camera-ice-candidate', async function(data) {
        if (data.from === broadcasterId && data.candidate) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                console.log("Added ICE candidate from broadcaster");
            } catch (err) {
                console.error("Error adding ICE candidate:", err);
            }
        }
    });
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////MP3 META-DATA
async function fetchMetadata(audioUrl) {
    try {
        const isCrossDomain = audioUrl.indexOf('http') === 0 && audioUrl.indexOf(window.location.hostname) === -1;

        // If it's a remote URL, use our metadata API
        if (isCrossDomain) {
            const response = await fetch(`/mp3-metadata?url=${encodeURIComponent(audioUrl)}`);

            if (!response.ok) {
                throw new Error(`Metadata request failed: ${response.status}`);
            }

            return await response.json();
        } else {
            // For local files, also use the metadata API
            const response = await fetch(`/mp3-metadata?url=${encodeURIComponent(audioUrl)}`);

            if (!response.ok) {
                throw new Error(`Metadata request failed: ${response.status}`);
            }

            return await response.json();
        }
    } catch (error) {
        console.error('Error fetching metadata:', error);

        // Return a basic fallback based on the filename
        const filename = audioUrl.split('/').pop().split('.')[0];
        return {
            title: filename,
            artist: '',
            album: '',
            artwork: null
        };
    }
}
async function displayMetadata(audioUrl) {
    console.log('Displaying metadata for:', audioUrl);

    const artist = document.getElementById('track-artist');
    const album = document.getElementById('track-album');
    const title = document.getElementById('track-title');
    const albumArt = document.getElementById('album-art-img');
    const albumArtContainer = document.getElementById('album-art-container');
    const artistAlbumSeparator = document.getElementById('artist-album-separator');
    const albumTitleSeparator = document.getElementById('album-title-separator');

    if (!title || !artist || !album) {
        console.error('One or more metadata elements not found in the DOM');
        return;
    }

    // Reset metadata display
    artist.textContent = 'Searching...';
    album.textContent = '';
    title.textContent = '';
    albumArt.src = 'https://analogarchive.com/favicon.ico';
    artistAlbumSeparator.style.display = 'none';
    albumTitleSeparator.style.display = 'none';

    if (albumArt) {
        albumArt.style.display = 'none';
    }

    // Show a loading indicator or color
    if (albumArtContainer) {
        albumArtContainer.style.backgroundColor = '#333';
    }

    try {
        // Fetch metadata from the server
        const metadata = await fetchMetadata(audioUrl);
        console.log('Received metadata:', metadata);

        // Display title if available
        if (metadata.title) {
            title.textContent = metadata.title;
        } else {
            // Fallback to filename
            const filename = audioUrl.split('/').pop().split('.')[0];
            title.textContent = filename;
        }

        // Display artist if available
        if (metadata.artist) {
            artist.textContent = metadata.artist;
            artistAlbumSeparator.style.display = 'inline';
        }

        // Display album if available
        if (metadata.album) {
            album.textContent = metadata.album;
            albumTitleSeparator.style.display = 'inline';
        }

        // Display artwork if available
        if (metadata.artwork && albumArt) {
            // Log the first 50 characters of artwork to check format
            console.log('Artwork data (first 50 chars):', metadata.artwork.substring(0, 50));

            // Make sure we're setting a valid data URL
            albumArt.onload = function() {
                console.log('Album art loaded successfully');
                albumArt.style.display = 'block';
            };

            albumArt.onerror = function(e) {
                console.error('Error loading album art:', e);
                albumArt.style.display = 'none';

                // Use a colored background as fallback
                if (albumArtContainer) {
                    albumArtContainer.style.backgroundColor = generateColor(metadata.title || audioUrl);
                }
            };

            // Set the proper data URL format
            try {
                albumArt.src = `data:image/jpeg;base64,${metadata.artwork}`;
            } catch (e) {
                console.error('Error setting album art src:', e);
            }
        } else if (albumArtContainer) {
            // No artwork - use a colored background
            const generateColor = function(str) {
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    hash = str.charCodeAt(i) + ((hash << 5) - hash);
                }

                const r = (hash & 0xFF0000) >> 16;
                const g = (hash & 0x00FF00) >> 8;
                const b = hash & 0x0000FF;

                return `rgb(${r}, ${g}, ${b})`;
            };

            albumArtContainer.style.backgroundColor = generateColor(metadata.title || audioUrl);
        }
    } catch (error) {
        console.error('Error displaying metadata:', error);

        // Display the error message in the player
        artist.textContent = 'Could not obtain meta information: ' + error.message;
        album.textContent = '';
        title.textContent = '';
        artistAlbumSeparator.style.display = 'none';
        albumTitleSeparator.style.display = 'none';

        // Use a colored background as fallback
        if (albumArtContainer) {
            const generateColor = function(str) {
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    hash = str.charCodeAt(i) + ((hash << 5) - hash);
                }

                const r = (hash & 0xFF0000) >> 16;
                const g = (hash & 0x00FF00) >> 8;
                const b = hash & 0x0000FF;

                return `rgb(${r}, ${g}, ${b})`;
            };

            albumArtContainer.style.backgroundColor = generateColor(audioUrl);
        }
    }
}
function setupMetadataListeners() {
    console.log('Setting up metadata listeners');

    // Initialize with the first track when the page loads
    setTimeout(function() {
        const audioSource = document.getElementById('jaemzwaredynamicaudiosource');
        if (audioSource && audioSource.src) {
            console.log('Initializing metadata for first track:', audioSource.src);
            displayMetadata(audioSource.src);
        }
    }, 500); // Small delay to ensure elements are fully loaded

    // Listen for the audio player's loadedmetadata event
    const audioPlayer = document.getElementById('jaemzwaredynamicaudioplayer');
    if (audioPlayer) {
        audioPlayer.addEventListener('loadedmetadata', function() {
            console.log('Audio loadedmetadata event fired');
            const audioSource = document.getElementById('jaemzwaredynamicaudiosource');
            if (audioSource && audioSource.src) {
                displayMetadata(audioSource.src);
            }
        });
    }

    // Hook into the select change event
    const selectSongs = document.getElementById('selectsongs');
    if (selectSongs) {
        selectSongs.addEventListener('change', function() {
            console.log('Song selection changed');
            const selectedValue = this.value;
            if (selectedValue) {
                displayMetadata(selectedValue);
            }
        });
    }

    // Hook into the next track button
    const nextButton = document.getElementById('nextaudiotrack');
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            console.log('Next track button clicked');
            // Update after a delay to let the track change
            setTimeout(function() {
                const audioSource = document.getElementById('jaemzwaredynamicaudiosource');
                if (audioSource && audioSource.src) {
                    displayMetadata(audioSource.src);
                }
            }, 100);
        });
    }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////SPEED SLIDER FOR SHAPES AND ANIMALS
// Speed slider functionality - add this to your JavaScript initialization code
function initSpeedSlider() {
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');

    // Only initialize if elements exist (won't exist in readonly mode)
    if (speedSlider && speedValue) {
        // Update the displayed value when the slider changes
        speedSlider.addEventListener('input', function() {
            speedValue.textContent = this.value;
        });
    }
}
// Function to get the current speed value
function getSpeed() {
    const speedSlider = document.getElementById('speedSlider');
    return speedSlider ? parseInt(speedSlider.value) : 50; // Default to 50 if slider doesn't exist
}