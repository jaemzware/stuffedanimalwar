/*
 * THIS IS WHERE ON PAGE LOADED THINGS HAPPEN
 */
// Initialize the color picker after page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Enable GPU compositing for smoother canvas rendering on mobile
    const canvas = document.getElementById('stuffedanimalwarcanvas');
    if (canvas) {
        canvas.style.transform = 'translateZ(0)';
    }
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

    // Collapsible sections functionality
    console.log('Initializing collapsible sections...');
    const collapsibleHeaders = document.querySelectorAll('.collapsible');

    collapsibleHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            const indicator = this.querySelector('.collapse-indicator');

            if (targetContent) {
                if (targetContent.style.display === 'none') {
                    // Use empty string to remove inline style and let CSS take over
                    // This preserves display:grid for photo-gallery, display:flex for others, etc.
                    targetContent.style.display = '';
                    if (indicator) indicator.textContent = '▼';
                } else {
                    targetContent.style.display = 'none';
                    if (indicator) indicator.textContent = '▶';
                }
                console.log('Toggled section:', targetId);
            }
        });
    });

    console.log('Found', collapsibleHeaders.length, 'collapsible sections');

    // Collapse all sections by default on page load
    const allSectionsOnLoad = document.querySelectorAll('.section-content');
    allSectionsOnLoad.forEach(section => {
        section.style.display = 'none';
    });
    collapsibleHeaders.forEach(header => {
        const indicator = header.querySelector('.collapse-indicator');
        if (indicator) {
            indicator.textContent = '▶';
        }
    });
    console.log('All sections collapsed by default');

    // Collapse All button functionality
    const collapseAllButton = document.getElementById('collapseAllButton');
    if (collapseAllButton) {
        let allExpanded = false; // Start collapsed
        collapseAllButton.textContent = 'Expand All Sections';

        collapseAllButton.addEventListener('click', function() {
            const allSections = document.querySelectorAll('.section-content');
            const allHeaders = document.querySelectorAll('.collapsible');

            if (allExpanded) {
                // Collapse all
                console.log('Collapsing all sections...');
                allSections.forEach(section => {
                    section.style.display = 'none';
                });

                allHeaders.forEach(header => {
                    const indicator = header.querySelector('.collapse-indicator');
                    if (indicator) {
                        indicator.textContent = '▶';
                    }
                });

                this.textContent = 'Expand All Sections';
                this.style.background = '#28a745';
                allExpanded = false;
            } else {
                // Expand all
                console.log('Expanding all sections...');
                allSections.forEach(section => {
                    // Use empty string to remove inline style and let CSS take over
                    section.style.display = '';
                });

                allHeaders.forEach(header => {
                    const indicator = header.querySelector('.collapse-indicator');
                    if (indicator) {
                        indicator.textContent = '▼';
                    }
                });

                this.textContent = 'Collapse All Sections';
                this.style.background = '#444';
                allExpanded = true;
            }
        });
    }
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

// Update the Select Track label with audio sync status for debugging
function updateAudioSyncStatus(status) {
    let label = document.getElementById('selectsongs-label');
    if (label) {
        label.textContent = 'Select Track [' + status + ']';
        console.log('Audio sync status:', status);
    }
}

// Update the Select Video label with video sync status for debugging
function updateVideoSyncStatus(status) {
    let label = document.getElementById('selectvideos-label');
    if (label) {
        label.textContent = 'Select Video [' + status + ']';
        console.log('Video sync status:', status);
    }
}

function PlayNextTrack(currentFile){
    //don't do anything if there are no songs
    if($('#selectsongs option').length===0){
        return;
    }

    var $currentOption = $('#selectsongs option[value="'+currentFile+'"]');
    var current = $currentOption.attr('value');
    var first = $('#selectsongs option').first().attr('value');
    var last = $('#selectsongs option').last().attr('value');
    var next = $currentOption.next().attr('value');

    console.log("FIRST:"+first+" CURRENT:"+current+" NEXT:"+next+" LAST:"+last);

    // If current song not found in dropdown, don't auto-advance (prevents jumping to first song unexpectedly)
    if(!current || $currentOption.length === 0){
        console.log('PlayNextTrack: current file not found in dropdown, not advancing');
        return;
    }

    //if the current song is the last song, play the first song
    if(current===last){
        changeAudio(first);
    }
    else if(next) { //otherwise, play the next song if it exists
        changeAudio(next);
    }
    else {
        // No next song found, wrap to first
        console.log('PlayNextTrack: no next song found, wrapping to first');
        changeAudio(first);
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
function changeAudio(audioUrl, startPaused) {
    // startPaused: if true, load and cue up the audio but don't play
    // This allows master to broadcast an audio URL, have everyone load it paused,
    // then when master clicks play, everyone starts together (better sync for high latency)
    startPaused = startPaused || false;

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
    // Prepend so newest songs are at top, creating a reverse playlist effect
    if (!optionExists) {
        let newOption = $('<option>')
            .val(audioUrl)
            .text(audioUrl); // Just show the URL so we know it's a DJ selection

        $selectSongs.prepend(newOption);
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

    let audioPlayer = document.getElementById("jaemzwaredynamicaudioplayer");
    audioPlayer.load();

    if (startPaused) {
        // Explicitly pause to stop any currently playing audio, cue up the new song
        audioPlayer.pause();
        updateAudioSyncStatus('CUED: waiting for master to play');
        console.log('Audio cued up and paused, waiting for master to play:', audioUrl);
    } else {
        audioPlayer.play().catch(function(err) {
            console.log('Autoplay blocked - user interaction required:', err.message);
        });
    }

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
    // Prepend so newest videos are at top, creating a reverse playlist effect
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

        $selectVideos.prepend(newOption);
    }

    // Select the option
    $selectVideos.val(mp4Url);

    const videoElement = document.getElementById("jaemzwaredynamicvideoplayer");

    //change the source of the VIDEO player
    $('#jaemzwaredynamicvideosource').attr("src",mp4Url);
    if (coverImageUrl && coverImageUrl !== 'undefined') {
        $('#jaemzwaredynamicvideoplayer').attr("poster",coverImageUrl);
    }
    videoElement.pause();
    videoElement.load();
    videoElement.play();
}

function changeVideo(videoUrl, startPaused) {
    // startPaused: if true, load and cue up the video but don't play
    // This allows master to broadcast a video URL, have everyone load it paused,
    // then when master clicks play, everyone starts together (better sync for high latency)
    startPaused = startPaused || false;

    let $selectVideos = $('#selectvideos');
    let optionExists = false;

    // Check if the video exists in the dropdown
    $selectVideos.find('option').each(function() {
        if ($(this).val() === videoUrl) {
            optionExists = true;
            return false; // break the loop
        }
    });

    // If the option doesn't exist, add it dynamically
    // Prepend so newest videos are at top, creating a reverse playlist effect
    if (!optionExists) {
        // Extract filename from URL for display (DJ-sent links have filenames)
        let displayText = videoUrl;
        try {
            const urlParts = videoUrl.split('/');
            const filename = urlParts[urlParts.length - 1];
            if (filename) {
                displayText = decodeURIComponent(filename);
            }
        } catch (e) {
            // If filename extraction fails, just use the full URL
            displayText = videoUrl;
        }

        let newOption = $('<option>')
            .val(videoUrl)
            .text(displayText);

        $selectVideos.prepend(newOption);
    }

    // Select the option
    $selectVideos.val(videoUrl);

    // Change the source of the VIDEO player
    $('#jaemzwaredynamicvideosource').attr("src", videoUrl);
    $('#jaemzwaredynamicvideosource').attr("type", "video/mp4");

    let videoPlayer = document.getElementById("jaemzwaredynamicvideoplayer");
    videoPlayer.load();

    if (startPaused) {
        // Explicitly pause to stop any currently playing video, cue up the new video
        videoPlayer.pause();
        updateVideoSyncStatus('CUED: waiting for master to play');
        console.log('Video cued up and paused, waiting for master to play:', videoUrl);
    } else {
        videoPlayer.play().catch(function(err) {
            console.log('Autoplay blocked - user interaction required:', err.message);
        });
    }
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