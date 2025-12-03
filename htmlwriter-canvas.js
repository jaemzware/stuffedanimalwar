function writeStuffedAnimalWar(stuffedAnimalMediaObject, readonly = false){
    if (readonly) {
        // Readonly mode: only show the canvas div, fullscreen and centered
        writeStuffedAnimalWarDiv(stuffedAnimalMediaObject, true);
    } else {
        // Normal mode: show everything with flexbox layout
        // Collapse All button
        document.write("<div style='margin-top: 15px; text-align: right;'>");
        document.write("<button id='collapseAllButton' style='padding: 8px 16px; background: #444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;'>Collapse All Sections</button>");
        document.write("</div>");

        // Collapsible header for entire canvas section (drawing area + controls)
        document.write("<div class='section-header collapsible' data-target='canvas-complete-content' style='cursor: pointer; user-select: none; margin-top: 15px; padding: 12px 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 8px;'>");
        document.write("<span class='section-icon'>🎨</span>");
        document.write("<h3 class='section-title' style='margin: 0; color: white;'>Canvas</h3>");
        document.write("<span class='collapse-indicator'>▼</span>");
        document.write("</div>");

        document.write("<div id='canvas-complete-content' class='section-content'>");
        document.write("<div id='sawflexdiv'>");
        writeStuffedAnimalWarDiv(stuffedAnimalMediaObject, false);
        writeStuffedAnimalWarForm(stuffedAnimalMediaObject);
        document.write("</div>");
        document.write("</div>"); // Close canvas-complete-content
        document.write("<hr />");
    }
}
function writeStuffedAnimalWarDiv(stuffedAnimalMediaObject, readonly = false) {
    // Add 'readonly' class when in readonly mode for special styling
    if (readonly) {
        document.write("<div id=\"stuffedanimalwardiv\" class=\"readonly\">");
    } else {
        document.write("<div id=\"stuffedanimalwardiv\">");
    }

    //IF THE BACKGROUND IMAGE WAS SPECIFIED
    if(stuffedAnimalMediaObject && stuffedAnimalMediaObject.backgroundimage){
        let isValidImage = false;
        let imagePath = stuffedAnimalMediaObject.backgroundimage;

        // Check if it's a URL (http/https)
        if (imagePath.toLowerCase().indexOf("http://") === 0 ||
            imagePath.toLowerCase().indexOf("https://") === 0) {
            // Validate URL has image extension
            if (imagePath.toLowerCase().indexOf(".jpg") > 0 ||
                imagePath.toLowerCase().indexOf(".jpeg") > 0 ||
                imagePath.toLowerCase().indexOf(".gif") > 0 ||
                imagePath.toLowerCase().indexOf(".png") > 0) {
                isValidImage = true;
            } else {
                console.log('BACKGROUNDIMAGEPROVIDED DOES NOT CONTAIN A VALID ENOUGH IMAGE URL. NEEDS TO END WITH .jpg, .jpeg, .JPG, .gif, .png: ' + imagePath);
            }
        }
        // Check if it's a local file reference
        else if (imagePath.toLowerCase().indexOf(".jpg") > 0 ||
            imagePath.toLowerCase().indexOf(".jpeg") > 0 ||
            imagePath.toLowerCase().indexOf(".gif") > 0 ||
            imagePath.toLowerCase().indexOf(".png") > 0) {
            isValidImage = true;
        }
        else {
            console.log('BACKGROUNDIMAGEPROVIDED IS NOT A VALID IMAGE. NEEDS TO BE A URL (http:// or https://) OR A LOCAL FILE PATH WITH IMAGE EXTENSION (.jpg, .jpeg, .gif, .png): ' + imagePath);
        }

        // Write the Canvas with or without background
        if (isValidImage) {
            document.write("<canvas id=\"stuffedanimalwarcanvas\" style=\"background-image:url('" + imagePath + "');\">");
        } else {
            document.write("<canvas id=\"stuffedanimalwarcanvas\">");
        }
    }
    else {
        //JUST WRITE THE DEFAULT CANVAS
        document.write("<canvas id=\"stuffedanimalwarcanvas\">");
        console.log('BACKGROUNDIMAGENOTPROVIDED');
    }

    document.write("</canvas>");
    document.write("</div>");
}
function writeStuffedAnimalWarForm(stuffedAnimalMediaObject){
    document.write("<style>");
    document.write(".direction-radio { position: absolute; opacity: 0; width: 0; height: 0; }");
    document.write(".direction-label { display: inline-block; padding: 8px 16px; background-color: #444; color: #fff; border-radius: 6px; cursor: pointer; user-select: none; transition: all 0.2s ease; margin: 0 5px; }");
    document.write(".direction-label-vertical { width: 80px; text-align: center; }");
    document.write(".direction-label:hover { background-color: #555; }");
    document.write(".direction-radio:checked + .direction-label { background-color: #0066cc; font-weight: bold; }");
    document.write("</style>");

    document.write("<form id='stuffedanimalwarform'>");
    document.write("<table id='stuffedanimalwarformtable'>");

    //ANIMAL CHOICES
    document.write("<tr>");
    document.write("<td colspan='4'>");
    document.write("<div style=\"display: grid; grid-template-columns: auto auto 1fr auto; gap: 8px; align-items: center; width: 100%;\">");
    // Dropdown
    document.write("<select id=\"animals\" name=\"sawstyle\" size=1>");
    document.write("<option value=\"dot\" selected>BULLET</option>");
    document.write("<option value=\"line\">LINE</option>");
    document.write("<option value=\"custom\">CUSTOM URL</option>");
    //SPECIFIED ANIMALS
    if(stuffedAnimalMediaObject && stuffedAnimalMediaObject.animals[0]){
        for (let i=0;i<stuffedAnimalMediaObject.animals.length;i++){
            document.write("<option value=\""+stuffedAnimalMediaObject.animals[i].file+"\">"+stuffedAnimalMediaObject.animals[i].title+"</option>");
        }
    }
    document.write("</select>");
    // Add preview image container
    document.write("<div id=\"animalPreview\" style=\"width: 40px; height: 40px; border: 2px solid #ccccff; border-radius: 6px; background: rgba(255, 255, 255, 0.9); display: flex; align-items: center; justify-content: center; overflow: hidden;\">");
    document.write("<div id=\"animalPreviewContent\" style=\"width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #1a1a2e;\">•</div>");
    document.write("</div>");
    // Custom URL text box (hidden by default) - takes up the flex space
    document.write("<input style=\"vertical-align:top;text-align:left;display:none;width:100%;height:40px;box-sizing:border-box;\" id=\"imagepathtextbox\" placeholder=\"CUSTOM URL\" />");
    //CLEAR BUTTON - takes up remaining space
    document.write("<input style=\"vertical-align:top;text-align:center;height:40px;width:100%;min-width:80px;\" id=\"clearboardbutton\" type=\"button\" value=\"ERASE\" />");
    document.write("</div>");
    document.write("</td>");
    document.write("</tr>");
    document.write("<tr>");
    document.write("<td colspan='4' style=\"overflow: hidden;\">");
    // Two column layout: directional buttons on left, color picker on right
    document.write("<div class=\"direction-color-container\" style=\"display: grid; grid-template-columns: 1fr 1fr; gap: 15px; align-items: center; width: 100%; box-sizing: border-box;\">");

    // LEFT COLUMN - MOVEMENT DIRECTION - 3 ROW LAYOUT
    document.write("<div class=\"direction-buttons-grid\" style=\"display: grid; grid-template-columns: auto 80px auto; grid-template-rows: auto auto auto; gap: 5px; justify-items: center; align-items: center; justify-content: center; width: 100%; max-width: 100%; box-sizing: border-box;\">");

    // TOP ROW - UPLEFT (grid column 1, row 1)
    document.write("<div style=\"grid-column: 1; grid-row: 1;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-upleft\" name=\"sawmove\" value=\"UPLEFT\">");
    document.write("<label class=\"direction-label\" for=\"movement-upleft\">↖️</label>");
    document.write("</div>");

    // TOP ROW - UP (grid column 2)
    document.write("<div style=\"grid-column: 2; grid-row: 1;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-up\" name=\"sawmove\" value=\"UP\" checked>");
    document.write("<label class=\"direction-label direction-label-vertical\" for=\"movement-up\">⬆️</label>");
    document.write("</div>");

    // TOP ROW - UPRIGHT (grid column 3, row 1)
    document.write("<div style=\"grid-column: 3; grid-row: 1;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-upright\" name=\"sawmove\" value=\"UPRIGHT\">");
    document.write("<label class=\"direction-label\" for=\"movement-upright\">↗️</label>");
    document.write("</div>");

    // MIDDLE ROW - L-SINE, LEFT (grid column 1)
    document.write("<div style=\"grid-column: 1; grid-row: 2; display: flex; gap: 5px;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-sineleft\" name=\"sawmove\" value=\"L-SINE\">");
    document.write("<label class=\"direction-label\" for=\"movement-sineleft\">🌊⬅️</label>");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-left\" name=\"sawmove\" value=\"LEFT\">");
    document.write("<label class=\"direction-label\" for=\"movement-left\">⬅️</label>");
    document.write("</div>");

    // MIDDLE ROW - STILL (grid column 2)
    document.write("<div style=\"grid-column: 2; grid-row: 2;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-still\" name=\"sawmove\" value=\"STILL\">");
    document.write("<label class=\"direction-label direction-label-vertical\" for=\"movement-still\">⏸️</label>");
    document.write("</div>");

    // MIDDLE ROW - RIGHT, R-SINE (grid column 3)
    document.write("<div style=\"grid-column: 3; grid-row: 2; display: flex; gap: 5px;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-right\" name=\"sawmove\" value=\"RIGHT\">");
    document.write("<label class=\"direction-label\" for=\"movement-right\">➡️</label>");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-sineright\" name=\"sawmove\" value=\"R-SINE\">");
    document.write("<label class=\"direction-label\" for=\"movement-sineright\">➡️🌊</label>");
    document.write("</div>");

    // BOTTOM ROW - DOWNLEFT (grid column 1, row 3)
    document.write("<div style=\"grid-column: 1; grid-row: 3;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-downleft\" name=\"sawmove\" value=\"DOWNLEFT\">");
    document.write("<label class=\"direction-label\" for=\"movement-downleft\">↙️</label>");
    document.write("</div>");

    // BOTTOM ROW - DOWN (grid column 2)
    document.write("<div style=\"grid-column: 2; grid-row: 3;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-down\" name=\"sawmove\" value=\"DOWN\">");
    document.write("<label class=\"direction-label direction-label-vertical\" for=\"movement-down\">⬇️</label>");
    document.write("</div>");

    // BOTTOM ROW - DOWNRIGHT (grid column 3, row 3)
    document.write("<div style=\"grid-column: 3; grid-row: 3;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-downright\" name=\"sawmove\" value=\"DOWNRIGHT\">");
    document.write("<label class=\"direction-label\" for=\"movement-downright\">↘️</label>");
    document.write("</div>");

    document.write("</div>"); // End of directional buttons grid

    // RIGHT COLUMN - COLOR PREVIEW (compact)
    document.write("<div style=\"display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;\">");
    document.write("<label style=\"color: #ccccff; font-weight: 600; font-size: 14px; letter-spacing: 0.5px;\">COLOR</label>");
    document.write("<div id=\"colorPickerButton\" data-red=\"255\" data-green=\"255\" data-blue=\"255\" data-line-width=\"5\" style=\"width: 100%; height: 150px; padding: 0; border-radius: 8px; max-width: 250px; border: 2px solid #ccccff;\">");
    document.write("<span class=\"color-picker-button-sample\" style=\"width: 100%; height: 100%; margin: 0; border-radius: 6px; display: block; background-color: rgb(255, 255, 255);\"></span>");
    document.write("</div>");
    document.write("</div>");

    document.write("</div>"); // End of two-column layout
    document.write("</td>");
    document.write("</tr>");

    // LINE STYLE CONTROLS ROW (inline, no modal)
    document.write("<tr>");
    document.write("<td colspan='4'>");
    document.write("<div id='inlineColorPicker' style=\"padding: 15px; background: rgba(0, 0, 0, 0.3); border-radius: 8px; margin-top: 10px;\">");

    // Section header
    document.write("<div style=\"font-weight: 600; font-size: 14px; color: #ccccff; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2);\">LINE STYLE</div>");

    // Color sliders
    document.write("<div style=\"display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px;\">");

    // Red slider
    document.write("<div style=\"display: flex; align-items: center; gap: 8px;\">");
    document.write("<span style=\"color: #ff6b6b; font-weight: bold; width: 20px;\">R:</span>");
    document.write("<input type=\"range\" min=\"0\" max=\"255\" value=\"255\" id=\"redSlider\" style=\"flex: 1; height: 8px;\">");
    document.write("<input type=\"number\" min=\"0\" max=\"255\" value=\"255\" id=\"redInput\" style=\"width: 50px; padding: 4px; text-align: center; border: 1px solid #ccc; border-radius: 4px; background: #2a2a3e; color: white;\">");
    document.write("</div>");

    // Green slider
    document.write("<div style=\"display: flex; align-items: center; gap: 8px;\">");
    document.write("<span style=\"color: #51cf66; font-weight: bold; width: 20px;\">G:</span>");
    document.write("<input type=\"range\" min=\"0\" max=\"255\" value=\"255\" id=\"greenSlider\" style=\"flex: 1; height: 8px;\">");
    document.write("<input type=\"number\" min=\"0\" max=\"255\" value=\"255\" id=\"greenInput\" style=\"width: 50px; padding: 4px; text-align: center; border: 1px solid #ccc; border-radius: 4px; background: #2a2a3e; color: white;\">");
    document.write("</div>");

    // Blue slider
    document.write("<div style=\"display: flex; align-items: center; gap: 8px;\">");
    document.write("<span style=\"color: #339af0; font-weight: bold; width: 20px;\">B:</span>");
    document.write("<input type=\"range\" min=\"0\" max=\"255\" value=\"255\" id=\"blueSlider\" style=\"flex: 1; height: 8px;\">");
    document.write("<input type=\"number\" min=\"0\" max=\"255\" value=\"255\" id=\"blueInput\" style=\"width: 50px; padding: 4px; text-align: center; border: 1px solid #ccc; border-radius: 4px; background: #2a2a3e; color: white;\">");
    document.write("</div>");

    document.write("</div>"); // End color sliders

    // Line width section
    document.write("<div style=\"font-weight: 600; font-size: 12px; color: #999; margin-bottom: 8px;\">WIDTH</div>");
    document.write("<div style=\"display: flex; align-items: center; gap: 8px; margin-bottom: 15px;\">");
    document.write("<span style=\"width: 6px; height: 6px; background: #666; border-radius: 50%;\"></span>");
    document.write("<input type=\"range\" min=\"1\" max=\"20\" value=\"5\" id=\"lineWidthSlider\" style=\"flex: 1; height: 8px;\">");
    document.write("<span style=\"width: 16px; height: 16px; background: #666; border-radius: 50%;\"></span>");
    document.write("<span id=\"lineWidthValue\" style=\"min-width: 40px; text-align: center; font-size: 12px; color: #339af0; font-weight: bold; background: #2a2a3e; padding: 4px 8px; border-radius: 4px;\">5px</span>");
    document.write("</div>");

    // Color presets section
    document.write("<div style=\"font-weight: 600; font-size: 12px; color: #999; margin-bottom: 8px;\">PRESETS</div>");
    document.write("<div id=\"presets\" style=\"display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px;\"></div>");

    document.write("</div>"); // End inlineColorPicker
    document.write("</td>");
    document.write("</tr>");

    document.write("<tr>");
    document.write("<td colspan='4'>");
    // Combined points and speed slider row
    document.write("<div style=\"display: flex; align-items: center; width: 100%; margin-top: 10px;\">");
    // Points display that will adjust its width based on content
    document.write("<div style=\"display: flex; align-items: center; white-space: nowrap; margin-right: 10px;\">");
    document.write("Points: <span id='points'>0</span><span></span>");
    document.write("</div>");
    // Speed label and slider that take remaining space
    document.write("<div style=\"display: flex; align-items: center; flex-grow: 1; min-width: 0;\">");
    document.write("<label for=\"speedSlider\" style=\"margin-right: 5px; white-space: nowrap;\">Delay:</label>");
    document.write("<input type=\"range\" id=\"speedSlider\" min=\"1\" max=\"100\" value=\"50\" style=\"flex-grow: 1; margin-right: 5px; min-width: 50px;\">");
    document.write("<span id=\"speedValue\" style=\"min-width: 25px; text-align: right;\">50</span>");
    document.write("</div>");
    document.write("</div>"); // End of combined row
    document.write("</td>");
    document.write("</tr>");
    document.write("</table>");
    document.write("</form>");
}
//STUFFEDANIMALWAR//////////////////////////////////////////////STUFFEDANIMALWAR//////////////////////////////////////////////////STUFFEDANIMALWAR
//AUDIOVIDEOPHOTOS//////////////////////////////////////////////AUDIOVIDEOPHOTOS//////////////////////////////////////////////////AUDIOVIDEOPHOTOS
function writeMuteButton(){
    document.write("<button id='readonlyMuteButton' style='position: fixed; top: 20px; right: 20px; z-index: 10000; background: rgba(0, 0, 0, 0.5); border: 2px solid rgba(255, 255, 255, 0.3); color: white; font-size: 24px; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.3s;'>🔇</button>");
}
function writeAudioFromJson(mediaObject){
    //AUDIO
    if(mediaObject.songspath && mediaObject.songs && mediaObject.songs[0]){
        document.write("<div id='audioPlayerContainer' class='section-container'>");
        document.write("<form id='audioform' class='modern-form'>");

            document.write("<div class='section-header collapsible' data-target='audio-content' style='cursor: pointer; user-select: none;'>");
            document.write("<span class='section-icon'>🎵</span>");
            document.write("<h3 class='section-title'>Audio Player</h3>");
            document.write("<span class='collapse-indicator'>▼</span>");
            document.write("</div>");

            document.write("<div class='audio-content section-content' id='audio-content'>");
                document.write("<div class='input-group full-width'>");
                    document.write("<label for='selectsongs' class='input-label'>Select Track</label>");
                    document.write("<select id=\"selectsongs\" class='modern-select'>");
                    //paint song selection dropdown options (songs)
                    for (let i=0;i<mediaObject.songs.length;i++){
                        let filepath = (mediaObject.songs[i].file.startsWith("http://") || mediaObject.songs[i].file.startsWith("https://")) ? mediaObject.songs[i].file : mediaObject.songspath+mediaObject.songs[i].file;
                        document.write("<option value=\""+filepath+"\">"+mediaObject.songs[i].title+"</option>");
                    }
                    document.write("</select>");
                document.write("</div>");

                //paint the audio player
                document.write("<div class='audio-player-wrapper'>");
                    document.write("<audio id=\"jaemzwaredynamicaudioplayer\" controls=\"\" preload=\"metadata\">");
                    let filepath = (mediaObject.songs[0].file.startsWith("http://") || mediaObject.songs[0].file.startsWith("https://")) ? mediaObject.songs[0].file : mediaObject.songspath+mediaObject.songs[0].file;
                    document.write("<source id=\"jaemzwaredynamicaudiosource\" src=\""+filepath+"\" type=\"audio/mpeg\">");
                    document.write("HTML5 Audio Tag support not available with your browser. For source type='audio/mpeg'");
                    document.write("</audio>");
                document.write("</div>");

                //previous and next buttons with metadata display
                document.write("<div class='audio-controls-container'>");
                    document.write("<button type='button' id='nextaudiotrack' class='action-button secondary-button next-track-button'>Next Track</button>");

                    // Album art thumbnail (right after the next button)
                    document.write("<div id='album-art-container'>");
                    document.write("<img id='album-art-img' src='' alt=''>");
                    document.write("</div>");

                    // Metadata text (artist, album, song)
                    document.write("<div id='track-metadata'>");
                    document.write("<span id='track-artist'></span>");
                    document.write("<span id='artist-album-separator'> - </span>");
                    document.write("<span id='track-album'></span>");
                    document.write("<span id='album-title-separator'> - </span>");
                    document.write("<span id='track-title'></span>");
                    document.write("</div>");

                document.write("</div>");

            document.write("</div>");

        document.write("</form>");
        document.write("</div>");
    }
}
function writeVideoFromJson(mediaObject){
    //VIDEO

    //IF THERES A VIDEO PATH IN THE MEDIAOBJECT, AND THERE IS AT LEAST ONE VIDEO
    if(mediaObject.videos && mediaObject.videos[0]){
        document.write("<div id='videoPlayerContainer' class='section-container'>");
        document.write("<form id='videoform' class='modern-form'>");

            document.write("<div class='section-header collapsible' data-target='video-content' style='cursor: pointer; user-select: none;'>");
            document.write("<span class='section-icon'>🎬</span>");
            document.write("<h3 class='section-title'>Video Player</h3>");
            document.write("<span class='collapse-indicator'>▼</span>");
            document.write("</div>");

            document.write("<div class='video-content section-content' id='video-content'>");
                document.write("<div class='input-group full-width'>");
                    document.write("<label for='selectvideos' class='input-label'>Select Video</label>");
                    document.write("<select id=\"selectvideos\" class='modern-select'>");

                    //CAMERA OPTIONS WILL BE ADDED DYNAMICALLY BY initializeCameraOptions()

                    //WRITE A SELECT DROPDOWN OPTION FOR EACH VIDEO PASSED THROUGH THE MEDIA OBJECT
                    for (let i=0;i<mediaObject.videos.length;i++){

                        //IF A FILENAME WAS SPECIFIED IN THE MEDIA OBJECT
                        if(mediaObject.videos[i].file){

                            //IF THE FULL URL WAS SPECIFIED IN THE FILENAME (DETECTED BY CONTAINING HTTPS OR HTTP IN THE URL, DONT USE THE VIDEOS PREPENDING PATH SPECIFIED
                            if(mediaObject.videos[i].file.indexOf("http://")!==-1 ||
                                      mediaObject.videos[i].file.indexOf("https://")!==-1){

                                //MAKE THE VALUE OF THE OPTION THE FULL URL SPECIFIED IN THE FILENAME
                                //mediaObject.videos[i].file
                                document.write("<option poster=\""+mediaObject.videos[i].poster+"\" value=\""+mediaObject.videos[i].file+"\">"+mediaObject.videos[i].title+"</option>");
                            }
                            //ELSE THE FULL URL WAS NOT SPECIFIED...
                            else{
                                //SO WE'LL PREPEND THE VIDEOSPATH TO THE FILENAME PASSED THROUGH THE MEDIAOBJECT
                                //mediaObject.videospath+mediaObject.videos[i].file
                                document.write("<option poster=\""+mediaObject.videos[i].poster+"\" value=\""+mediaObject.videospath+mediaObject.videos[i].file+"\">"+mediaObject.videos[i].title+"</option>");
                            }
                        }
                    }

                    document.write("</select>");
                document.write("</div>");

                //PUT A POSTER IMAGE
                document.write("<div class='video-player-wrapper'>");
                    //if a poster image was provided in the media object for the video
                    if(mediaObject.videos[0].poster){
                        //IF THE FULL URL WAS SPECIFIED, DONT USE THE VIDEOS PREPENDING PATH SPECIFIED
                        if(mediaObject.videos[0].poster.indexOf("http://")!==-1 ||
                            mediaObject.videos[0].poster.indexOf("https://")!==-1){
                            document.write("<video id=\"jaemzwaredynamicvideoplayer\" poster=\""+mediaObject.videos[0].poster+"\" controls=\"controls\" preload=\"metadata\">");
                        }
                        else{
                            document.write("<video id=\"jaemzwaredynamicvideoplayer\" poster=\""+mediaObject.videospath+mediaObject.videos[0].poster+"\" controls=\"controls\" preload=\"metadata\">");
                        }
                    }
                    else{
                        //let the utility.js load the first frame of the video by default
                        document.write("<video id=\"jaemzwaredynamicvideoplayer\" controls=\"controls\" preload=\"metadata\" title=\"stuffedanimalwarTv\">");
                    }

                    document.write("mp4 not supported in this browser");
                    if(mediaObject.videos[0].file.indexOf("http://")!==-1 ||
                        mediaObject.videos[0].file.indexOf("https://")!==-1) {
                        document.write("<source src=\"" + mediaObject.videos[0].file + "\" type=\"video/mp4\" id=\"jaemzwaredynamicvideosource\">");
                    } else {
                        document.write("<source src=\"" + mediaObject.videospath + mediaObject.videos[0].file + "\" type=\"video/mp4\" id=\"jaemzwaredynamicvideosource\">");
                    }
                    document.write("</video>");
                document.write("</div>");
            document.write("</div>");

        document.write("</form>");
        document.write("</div>");
    }
}
function writePhotosFromJson(mediaObject){
    //PHOTOS
    if(mediaObject.photospath && mediaObject.photos && mediaObject.photos[0]){
        document.write("<div id='photoGalleryContainer' class='section-container'>");
            document.write("<div class='section-header collapsible' data-target='photo-gallery' style='cursor: pointer; user-select: none;'>");
            document.write("<span class='section-icon'>🖼️</span>");
            document.write("<h3 class='section-title'>Photo Gallery</h3>");
            document.write("<span class='collapse-indicator'>▼</span>");
            document.write("</div>");

            document.write("<div class=\"photo-gallery section-content\" id='photo-gallery'>");
            //paint the photos
            let isExternalPath = mediaObject.photospath.startsWith("http://") || mediaObject.photospath.startsWith("https://");
            for (let i=0;i<mediaObject.photos.length;i++){
                let isExternalUrl = mediaObject.photos[i].file.startsWith("http://") || mediaObject.photos[i].file.startsWith("https://");
                let filepath;
                let thumbpath;
                if (isExternalUrl) {
                    // For external URLs, encode just the filename portion (after the last /)
                    let url = mediaObject.photos[i].file;
                    let lastSlash = url.lastIndexOf('/');
                    let basePath = url.substring(0, lastSlash + 1);
                    let filename = url.substring(lastSlash + 1);
                    filepath = basePath + encodeURIComponent(filename);
                    thumbpath = filepath; // External URLs don't use our thumb endpoint
                } else if (isExternalPath) {
                    // photospath is external URL - encode filename and don't use thumb endpoint
                    filepath = mediaObject.photospath + encodeURIComponent(mediaObject.photos[i].file);
                    thumbpath = filepath; // External paths don't use our thumb endpoint
                } else {
                    filepath = mediaObject.photospath + encodeURIComponent(mediaObject.photos[i].file);
                    // Use /thumb/ endpoint for local images to get auto-generated thumbnails
                    thumbpath = "/thumb/" + mediaObject.photospath + encodeURIComponent(mediaObject.photos[i].file);
                }
                let filetitle=mediaObject.photos[i].title;
                document.write("<div class=\"photo-item\"><img class=\"photo-thumbnail photosformthumbnail\" src=\""+thumbpath+"\" data-fullsize=\""+filepath+"\" alt=\""+filetitle+"\" /><span class=\"photo-title\">"+filetitle+"</span></div>");
            }
            document.write("</div>");
        document.write("</div>");
    }
}
//AUDIOVIDEOPHOTOS//////////////////////////////////////////////AUDIOVIDEOPHOTOS//////////////////////////////////////////////////AUDIOVIDEOPHOTOS
//CHAT//////////////////////////////////////////////CHAT//////////////////////////////////////////////////CHAT
function writeChatForm(responsesObject) {
    document.write("<div id='chatFormContainer' class='section-container'>");
    document.write("<form id='chatform' class='modern-form'>");

        // Add endpoint info display above the chat form
        document.write("<div id='endpointInfo' class='endpoint-info'>");
        document.write("Endpoint: <span id='endpointDisplay'></span> | ");
        document.write("Master: <span id='masterAliasDisplay'></span> | ");
        document.write("Default: <span id='unspecifiedAliasDisplay'></span>");
        document.write("</div>");

        document.write("<div class='section-header collapsible' data-target='chat-content' style='cursor: pointer; user-select: none;'>");
        document.write("<span class='section-icon'>💬</span>");
        document.write("<h3 class='section-title'>Chat</h3>");
        document.write("<span class='collapse-indicator'>▼</span>");
        document.write("</div>");

        document.write("<div class='chat-content section-content' id='chat-content'>");
        document.write("<div class='chat-controls'>");
            document.write("<div class='input-group'>");
                document.write("<label for='chatClientUser' class='input-label'>Alias</label>");
                document.write("<input id=\"chatClientUser\" class='modern-input' placeholder=\"Enter your alias\"/>");
            document.write("</div>");

            document.write("<div class='input-group'>");
                document.write("<label for='chatClientAutoResponder' class='input-label'>Auto Response</label>");
                document.write("<select id=\"chatClientAutoResponder\" class='modern-select'>");
                writeDefaultAutoResponderOptions(responsesObject);
                document.write("</select>");
            document.write("</div>");

            document.write("<div class='button-group'>");
                document.write("<button type=\"button\" id=\"clearchatbutton\" class='action-button secondary-button'>Clear Chat</button>");
            document.write("</div>");
        document.write("</div>");

        document.write("<div class='chat-message-area'>");
            document.write("<div class='input-group full-width'>");
                document.write("<label for='chatClientMessage' class='input-label'>Message</label>");
                document.write("<input id=\"chatClientMessage\" class='modern-input' placeholder=\"Type message or URL (.jpg .gif .png .mp3 .flac)\" />");
            document.write("</div>");
            document.write("<div class='button-group'>");
                document.write("<button type=\"button\" id=\"sendchatbutton\" class='action-button primary-button'>Send</button>");
            document.write("</div>");
        document.write("</div>");
        document.write("</div>"); // Close chat-content

    document.write("</form>");
    document.write("</div>");
}

// Chat Messages section - separate collapsible section for chat messages
function writeChatMessagesSection() {
    document.write("<div id='chatMessagesContainer' class='section-container'>");

        document.write("<div class='section-header collapsible' data-target='chat-messages-content' style='cursor: pointer; user-select: none;'>");
        document.write("<span class='section-icon'>📜</span>");
        document.write("<h3 class='section-title'>Chat Messages</h3>");
        document.write("<span class='collapse-indicator'>▼</span>");
        document.write("</div>");

        document.write("<div class='chat-messages-content section-content' id='chat-messages-content'>");
        document.write("<div id=\"messagesdiv\" style=\"height: 350px; overflow-y: auto; overflow-x: hidden;\"></div>");
        document.write("</div>");

    document.write("</div>");
}

// Camera section - separate collapsible section
function writeCameraSection() {
    document.write("<div id='cameraSectionContainer' class='section-container'>");
    document.write("<form id='cameraform' class='modern-form'>");

        document.write("<div class='section-header collapsible' data-target='camera-content' style='cursor: pointer; user-select: none;'>");
        document.write("<span class='section-icon'>📹</span>");
        document.write("<h3 class='section-title'>Camera</h3>");
        document.write("<span class='collapse-indicator'>▼</span>");
        document.write("</div>");

        document.write("<div class='camera-content section-content' id='camera-content'>");

        // Voice chat controls
        document.write("<div class='voice-chat-controls' style='display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 15px; padding: 10px; background: rgba(0, 0, 0, 0.3); border-radius: 8px;'>");

        // Microphone button
        document.write("<button id='micToggleButton' type='button' style='padding: 6px 12px; background: #666; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 5px; transition: all 0.3s; flex: 1 1 auto; min-width: 120px;'>");
        document.write("<span id='micIcon'>🎤</span>");
        document.write("<span id='micLabel'>Enable Mic</span>");
        document.write("</button>");

        // Camera button
        document.write("<button id='cameraToggleButton' type='button' style='padding: 6px 12px; background: #666; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 5px; transition: all 0.3s; flex: 1 1 auto; min-width: 120px;'>");
        document.write("<span id='cameraIcon'>📹</span>");
        document.write("<span id='cameraLabel'>Enable Camera</span>");
        document.write("</button>");

        // Camera switch button
        document.write("<button id='cameraSwitchButton' type='button' style='padding: 6px 12px; background: #666; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 5px; transition: all 0.3s; flex: 1 1 auto; min-width: 120px;' disabled>");
        document.write("<span>🔄</span>");
        document.write("<span>Switch Camera</span>");
        document.write("</button>");

        // Accept incoming mic audio checkbox (unchecked by default)
        document.write("<label style='padding: 8px 12px; background: #2a2a3e; color: white; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 8px; transition: all 0.3s; flex: 1 1 auto; min-width: 160px; user-select: none;'>");
        document.write("<input type='checkbox' id='acceptMicChatCheckbox' style='width: 18px; height: 18px; cursor: pointer; accent-color: #28a745;'>");
        document.write("<span style='flex: 1;'>Accept Mic Chat</span>");
        document.write("</label>");

        // Accept incoming camera video checkbox (checked by default)
        document.write("<label style='padding: 8px 12px; background: #2a2a3e; color: white; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 8px; transition: all 0.3s; flex: 1 1 auto; min-width: 160px; user-select: none;'>");
        document.write("<input type='checkbox' id='acceptCameraCheckbox' checked style='width: 18px; height: 18px; cursor: pointer; accent-color: #28a745;'>");
        document.write("<span style='flex: 1;'>Accept Camera</span>");
        document.write("</label>");

        // Test speakers button
        document.write("<button id='testSpeakersButton' type='button' style='padding: 6px 12px; background: #17a2b8; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; flex: 1 1 auto; min-width: 120px;'>");
        document.write("🔊 Test Speakers");
        document.write("</button>");

        // Camera device selector
        document.write("<select id='cameraSelector' style='padding: 6px 12px; background: #2a2a3e; color: white; border: 1px solid #444; border-radius: 6px; cursor: pointer; font-size: 13px; flex: 1 1 auto; min-width: 180px;'>");
        document.write("<option value=''>Select Camera...</option>");
        document.write("</select>");

        // Status indicator
        document.write("<span id='voiceChatStatus' style='color: #999; font-size: 11px; flex: 1 1 100%; margin-top: 5px;'>Voice chat ready</span>");

        // Peers counter
        document.write("<span id='voiceChatPeers' style='color: #999; font-size: 11px;'>Peers: 0</span>");

        // Refresh peers button
        document.write("<button id='refreshPeersButton' type='button' style='padding: 6px 12px; background: #17a2b8; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; flex: 1 1 auto; min-width: 140px;'>");
        document.write("🔄 Refresh Peers");
        document.write("</button>");

        // Add CSS animation for pulse
        document.write("<style>@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }</style>");

        document.write("</div>");

        // Local camera preview
        document.write("<div id='localCameraPreview' style='display: none; margin-top: 15px; padding: 10px; background: rgba(0, 0, 0, 0.3); border-radius: 8px;'>");
        document.write("<div style='display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;'>");
        document.write("<span style='color: #fff; font-size: 13px; font-weight: bold;'>📹 Your Camera</span>");
        document.write("<span id='cameraStatus' style='color: #999; font-size: 11px;'>Initializing...</span>");
        document.write("</div>");
        document.write("<video id='localCameraVideo' autoplay playsinline muted style='width: 100%; max-width: 400px; border-radius: 6px; background: #000;'></video>");
        document.write("</div>");

        // Remote camera feeds container
        document.write("<div id='remoteCameraFeeds' style='display: none; margin-top: 15px; padding: 10px; background: rgba(0, 0, 0, 0.3); border-radius: 8px;'>");
        document.write("<div style='margin-bottom: 8px;'>");
        document.write("<span style='color: #fff; font-size: 13px; font-weight: bold;'>📹 Remote Cameras</span>");
        document.write("</div>");
        document.write("<div id='remoteCameraContainer' style='display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px;'></div>");
        document.write("</div>");

        document.write("</div>"); // Close camera-content

    document.write("</form>");
    document.write("</div>");
}
function writeChatFormFileUpload() {
    document.write("<div class='section-container' style='margin-top: 15px;'>");

    // Combined header for both photo and video uploads
    document.write("<div class='section-header collapsible' data-target='uploads-content' style='cursor: pointer; user-select: none; padding: 12px 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 8px; margin-bottom: 0;'>");
        document.write("<span class='section-icon'>📤</span>");
        document.write("<h3 class='section-title' style='margin: 0; color: white;'>Media Upload</h3>");
        document.write("<span class='collapse-indicator'>▼</span>");
    document.write("</div>");

    document.write("<div class='section-content' id='uploads-content' style='padding: 15px 0; overflow-x: hidden;'>");

    document.write("<div id='fileUploadContainer' class='upload-container' style='margin-bottom: 20px;'>");
        document.write("<form id=\"uploadForm\" enctype=\"multipart/form-data\" class='upload-form'>");
            document.write("<div style='padding: 10px 0; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);'>");
                document.write("<span style='font-size: 18px; margin-right: 8px;'>📸</span>");
                document.write("<span style='font-size: 14px; font-weight: 600; color: #fff;'>Photo Upload</span>");
            document.write("</div>");
            document.write("<div class='upload-content'>");
                document.write("<label for='imageFileInput' class='file-input-wrapper'>");
                    document.write("<input type=\"file\" id='imageFileInput' name=\"image\" accept=\"image/*\" required class='file-input'>");
                    document.write("<div class='file-input-button'>");
                        document.write("<span class='file-input-icon'>📁</span>");
                        document.write("<span class='file-input-text'>Choose Photo</span>");
                    document.write("</div>");
                    document.write("<div class='file-input-label' id='imageFileName'>No file selected</div>");
                document.write("</label>");
                document.write("<button type=\"submit\" class='upload-submit-button'>");
                    document.write("<span class='upload-submit-icon'>⬆</span>");
                    document.write("<span class='upload-submit-text'>Upload</span>");
                document.write("</button>");
            document.write("<div class='upload-progress'>");
                document.write("<div id=\"progressIndicator\" class='progress-text'>Ready to upload</div>");
                document.write("<div class='progress-bar-container'><div id='imageProgressBar' class='progress-bar'></div></div>");
            document.write("</div>");
            document.write("<div class='upload-info'>Max size: 50MB</div>");
            document.write("</div>"); // Close upload-content
        document.write("</form>");
    document.write("</div>");
}
function writeChatFormVideoUpload() {
    document.write("<div id='videoUploadContainer' class='upload-container' style='margin-bottom: 20px;'>");
        document.write("<form id=\"videoUploadForm\" enctype=\"multipart/form-data\" class='upload-form'>");
            document.write("<div style='padding: 10px 0; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);'>");
                document.write("<span style='font-size: 18px; margin-right: 8px;'>🎥</span>");
                document.write("<span style='font-size: 14px; font-weight: 600; color: #fff;'>Video Upload</span>");
            document.write("</div>");
            document.write("<div class='upload-content'>");
                document.write("<label for='videoFileInput' class='file-input-wrapper'>");
                    document.write("<input type=\"file\" id='videoFileInput' name=\"video\" accept=\"video/*\" required class='file-input'>");
                    document.write("<div class='file-input-button'>");
                        document.write("<span class='file-input-icon'>📁</span>");
                        document.write("<span class='file-input-text'>Choose Video</span>");
                    document.write("</div>");
                    document.write("<div class='file-input-label' id='videoFileName'>No file selected</div>");
                document.write("</label>");
                document.write("<button type=\"submit\" class='upload-submit-button'>");
                    document.write("<span class='upload-submit-icon'>⬆</span>");
                    document.write("<span class='upload-submit-text'>Upload</span>");
                document.write("</button>");
            document.write("<div class='upload-progress'>");
                document.write("<div id=\"videoProgressIndicator\" class='progress-text'>Ready to upload</div>");
                document.write("<div class='progress-bar-container'><div id='videoProgressBar' class='progress-bar'></div></div>");
            document.write("</div>");
            document.write("<div class='upload-info'>Max size: 50MB</div>");
            document.write("</div>"); // Close upload-content
        document.write("</form>");
    document.write("</div>");

    document.write("</div>"); // Close uploads-content
    document.write("</div>"); // Close section-container
}
function writeDefaultAutoResponderOptions(responsesObject){
    document.write("<option value=\"blank\" selected>--I don't know what to say--</option>");
    responsesObject.responses.forEach(item => {
        let responseText = item.response;
        // Remove spaces, quotes, and single quotes
        let value = responseText.replace(/[\s"']/g, '');
        document.write(`<option value="${value}">${responseText}</option>`);
    });
}
//CHAT//////////////////////////////////////////////CHAT//////////////////////////////////////////////////CHAT




