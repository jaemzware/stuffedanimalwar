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
    } else {
        console.error("Color picker button not found!");
    }

    //HIDE CUSTOM URL FIELD UNTIL IT IS CHOSEN FROM SELECT
    $("#imagepathtextbox").css("display", "none");

    //LOAD FIRST FRAME OF VIDEO IF POSTER NOT SPECIFIED
    const video = document.getElementById("jaemzwaredynamicvideoplayer");

    if (!video.hasAttribute("poster") || video.getAttribute("poster") === "") {
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
        changeMp3(first);
    }
    else{ //otherwise, play the next song
        changeMp3(next);
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
function changeMp3(mp3Url) {
    let $selectSongs = $('#selectsongs');
    let optionExists = false;

    // Check if the song exists in the dropdown
    $selectSongs.find('option').each(function() {
        if ($(this).val() === mp3Url) {
            optionExists = true;
            return false; // break the loop
        }
    });

    // If the option doesn't exist, add it dynamically with the URL as the display text
    if (!optionExists) {
        let newOption = $('<option>')
            .val(mp3Url)
            .text(mp3Url); // Just show the URL so we know it's a DJ selection

        $selectSongs.append(newOption);
    }

    // Select the option
    $selectSongs.val(mp3Url);

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

    // Change the source of the AUDIO player
    $('#jaemzwaredynamicaudiosource').attr("src", mp3Url);
    document.getElementById("jaemzwaredynamicaudioplayer").load();
    document.getElementById("jaemzwaredynamicaudioplayer").play();

    // The existing displayMetadata will be triggered by the loadedmetadata event
    // and will update the metadata display below the player
}

function changeMp4(mp4Url){
    //change the source of the VIDEO player with default video cover image
    changeMp4(mp4Url,"https://seattlerules.com/media/stuffedanimalwar/stuffedanimalmountain.jpg");
}
function changeMp4(mp4Url,coverImageUrl){
    console.log("CHANGE MP4");
    //change the source of the VIDEO player
    $('#jaemzwaredynamicvideosource').attr("src",mp4Url);
    $('#jaemzwaredynamicvideoplayer').attr("poster",coverImageUrl);
    document.getElementById("jaemzwaredynamicvideoplayer").pause();
    document.getElementById("jaemzwaredynamicvideoplayer").load();
    document.getElementById("jaemzwaredynamicvideoplayer").play();
    $('#selectvideos').val(mp4Url);
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

        // Fallback to showing just the filename
        const filename = audioUrl.split('/').pop().split('.')[0];
        title.textContent = filename;

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

            albumArtContainer.style.backgroundColor = generateColor(filename);
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
// Extend existing PlayNextTrack function
const originalPlayNextTrack = window.PlayNextTrack || function() {};
window.PlayNextTrack = function(currentFile) {
    // Call the original function
    originalPlayNextTrack(currentFile);

    // Then update metadata after a short delay
    setTimeout(function() {
        const audioSource = document.getElementById('jaemzwaredynamicaudiosource');
        if (audioSource && audioSource.src) {
            displayMetadata(audioSource.src);
        }
    }, 100);
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////SPEED SLIDER FOR SHAPES AND ANIMALS
// Speed slider functionality - add this to your JavaScript initialization code
function initSpeedSlider() {
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');

    // Update the displayed value when the slider changes
    speedSlider.addEventListener('input', function() {
        speedValue.textContent = this.value;
    });
}
// Function to get the current speed value
function getSpeed() {
    return parseInt(document.getElementById('speedSlider').value);
}

