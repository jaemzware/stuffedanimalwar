function writeStuffedAnimalWar(stuffedAnimalMediaObject, readonly = false){
    if (readonly) {
        // Readonly mode: only show the canvas div, fullscreen and centered
        writeStuffedAnimalWarDiv(stuffedAnimalMediaObject, true);
    } else {
        // Normal mode: show everything with flexbox layout
        document.write("<div id='sawflexdiv'>");
        writeStuffedAnimalWarDiv(stuffedAnimalMediaObject, false);
        writeStuffedAnimalWarForm(stuffedAnimalMediaObject);
        document.write("</div>");
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
    document.write("<td>");
    document.write("<select id=\"animals\" name=\"sawstyle\" size=1 style=\"height: 32px;\">");
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
    document.write("</td>");
    document.write("<td style=\"width: 100%;\">");
    document.write("<div style=\"width: 100%; display: flex; justify-content: center;\">");
    // Color picker button (visible by default)
    document.write("<button type=\"button\" id=\"colorPickerButton\" class=\"color-picker-button\" style=\"width: 200px; height: 32px; padding: 0;\">");
    document.write("<span class=\"color-picker-button-sample\" style=\"width: 100%; height: 100%; margin: 0; border-radius: 4px; display: block;\"></span>");
    document.write("</button>");
    // Custom URL text box (hidden by default)
    document.write("<input style=\"vertical-align:top;text-align:left;display:none;width:100%;height:32px;box-sizing:border-box;\" id=\"imagepathtextbox\" placeholder=\"CUSTOM URL\" />");
    document.write("</div>");
    document.write("</td>");
    document.write("<td>");
    //CLEAR BUTTON
    document.write("<input style=\"vertical-align:top;text-align:left;height:32px;\" id=\"clearboardbutton\" type=\"button\" value=\"Clean\" />");
    document.write("</td>");
    document.write("</tr>");
    document.write("<tr>");
    document.write("<td colspan='4'>");
    //MOVEMENT DIRECTION - 3 ROW LAYOUT
    document.write("<div style=\"display: grid; grid-template-columns: auto 80px auto; grid-template-rows: auto auto auto; gap: 5px; justify-items: center; align-items: center; justify-content: center;\">");

    // TOP ROW - UPLEFT (grid column 1, row 1)
    document.write("<div style=\"grid-column: 1; grid-row: 1;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-upleft\" name=\"sawmove\" value=\"UPLEFT\">");
    document.write("<label class=\"direction-label\" for=\"movement-upleft\">UPLEFT</label>");
    document.write("</div>");

    // TOP ROW - UP (grid column 2)
    document.write("<div style=\"grid-column: 2; grid-row: 1;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-up\" name=\"sawmove\" value=\"UP\" checked>");
    document.write("<label class=\"direction-label direction-label-vertical\" for=\"movement-up\">UP</label>");
    document.write("</div>");

    // TOP ROW - UPRIGHT (grid column 3, row 1)
    document.write("<div style=\"grid-column: 3; grid-row: 1;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-upright\" name=\"sawmove\" value=\"UPRIGHT\">");
    document.write("<label class=\"direction-label\" for=\"movement-upright\">UPRIGHT</label>");
    document.write("</div>");

    // MIDDLE ROW - L-SINE, LEFT (grid column 1)
    document.write("<div style=\"grid-column: 1; grid-row: 2; display: flex; gap: 5px;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-sineleft\" name=\"sawmove\" value=\"L-SINE\">");
    document.write("<label class=\"direction-label\" for=\"movement-sineleft\">L-SINE</label>");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-left\" name=\"sawmove\" value=\"LEFT\">");
    document.write("<label class=\"direction-label\" for=\"movement-left\">LEFT</label>");
    document.write("</div>");

    // MIDDLE ROW - STILL (grid column 2)
    document.write("<div style=\"grid-column: 2; grid-row: 2;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-still\" name=\"sawmove\" value=\"STILL\">");
    document.write("<label class=\"direction-label direction-label-vertical\" for=\"movement-still\">STILL</label>");
    document.write("</div>");

    // MIDDLE ROW - RIGHT, R-SINE (grid column 3)
    document.write("<div style=\"grid-column: 3; grid-row: 2; display: flex; gap: 5px;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-right\" name=\"sawmove\" value=\"RIGHT\">");
    document.write("<label class=\"direction-label\" for=\"movement-right\">RIGHT</label>");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-sineright\" name=\"sawmove\" value=\"R-SINE\">");
    document.write("<label class=\"direction-label\" for=\"movement-sineright\">R-SINE</label>");
    document.write("</div>");

    // BOTTOM ROW - DOWNLEFT (grid column 1, row 3)
    document.write("<div style=\"grid-column: 1; grid-row: 3;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-downleft\" name=\"sawmove\" value=\"DOWNLEFT\">");
    document.write("<label class=\"direction-label\" for=\"movement-downleft\">DOWNLEFT</label>");
    document.write("</div>");

    // BOTTOM ROW - DOWN (grid column 2)
    document.write("<div style=\"grid-column: 2; grid-row: 3;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-down\" name=\"sawmove\" value=\"DOWN\">");
    document.write("<label class=\"direction-label direction-label-vertical\" for=\"movement-down\">DOWN</label>");
    document.write("</div>");

    // BOTTOM ROW - DOWNRIGHT (grid column 3, row 3)
    document.write("<div style=\"grid-column: 3; grid-row: 3;\">");
    document.write("<input type=\"radio\" class=\"direction-radio\" id=\"movement-downright\" name=\"sawmove\" value=\"DOWNRIGHT\">");
    document.write("<label class=\"direction-label\" for=\"movement-downright\">DOWNRIGHT</label>");
    document.write("</div>");

    document.write("</div>");
    document.write("</td>");
    document.write("</tr>");
    document.write("<tr>");
    document.write("<td colspan='4'>");
    // Combined points and speed slider row
    document.write("<div style=\"display: flex; align-items: center; width: 100%;\">");
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
    //MESSAGES FROM CHAT FORM
    document.write("<tr>");
    document.write("<td colspan='4'>");
    document.write("<div id=\"messagesdiv\" style=\"height: 350px; overflow-y: auto; overflow-x: hidden;\"></div>");
    document.write("</td>");
    document.write("</tr>");
    document.write("</table>");
    document.write("</form>");
}
//STUFFEDANIMALWAR//////////////////////////////////////////////STUFFEDANIMALWAR//////////////////////////////////////////////////STUFFEDANIMALWAR
//AUDIOVIDEOPHOTOS//////////////////////////////////////////////AUDIOVIDEOPHOTOS//////////////////////////////////////////////////AUDIOVIDEOPHOTOS
function writeAudioFromJson(mediaObject){
    //AUDIO
    if(mediaObject.songspath && mediaObject.songs && mediaObject.songs[0]){
        document.write("<form id='audioform'>");
        document.write("<div id='audioformdiv'>");
        document.write("<table id='audiotable'>");
        //paint the song selection dropdown
        document.write("<tr>");
        document.write("<td class='audioplayertd'>");
        document.write("<select id=\"selectsongs\">");
        //paint song selection dropdown options (songs)
        for (let i=0;i<mediaObject.songs.length;i++){
            let filepath = (mediaObject.songs[i].file.startsWith("http://") || mediaObject.songs[i].file.startsWith("https://")) ? mediaObject.songs[i].file : mediaObject.songspath+mediaObject.songs[i].file;
            document.write("<option value=\""+filepath+"\">"+mediaObject.songs[i].title+"</option>");
        }
        document.write("</select>");
        document.write("</td>");
        document.write("</tr>");

        //paint the audio player
        document.write("<tr>");
        document.write("<td class='audioplayertd' colspan='2'>");
        document.write("<audio id=\"jaemzwaredynamicaudioplayer\" controls=\"\" preload=\"metadata\">");
        let filepath = (mediaObject.songs[0].file.startsWith("http://") || mediaObject.songs[0].file.startsWith("https://")) ? mediaObject.songs[0].file : mediaObject.songspath+mediaObject.songs[0].file;
        document.write("<source id=\"jaemzwaredynamicaudiosource\" src=\""+filepath+"\" type=\"audio/mpeg\">");
        document.write("HTML5 Audio Tag support not available with your browser. For source type='audio/mpeg'");
        document.write("</audio>");
        document.write("</td>");
        document.write("</tr>");

        document.write("<tr>");

        //previous and next buttons with metadata display
        document.write("<td>");
        document.write("<div class='audio-controls-container' style='display: flex; align-items: center;'>");
        document.write("<input type='button' id='nextaudiotrack' value='next' />");

        // Album art thumbnail (right after the next button)
        document.write("<div id='album-art-container' style='margin-left: 10px; width: 30px; height: 30px; background-color: #333; display: inline-block;'>");
        document.write("<img id='album-art-img' src='' alt='' style='width: 100%; height: 100%; object-fit: cover; display: none;'>");
        document.write("</div>");

        // Metadata text (artist, album, song)
        document.write("<div id='track-metadata' style='margin-left: 5px; font-size: 12px; color: white; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center;'>");
        document.write("<span id='track-artist'></span>");
        document.write("<span id='artist-album-separator' style='margin: 0 4px;'> - </span>");
        document.write("<span id='track-album'></span>");
        document.write("<span id='album-title-separator' style='margin: 0 4px;'> - </span>");
        document.write("<span id='track-title'></span>");
        document.write("</div>");

        document.write("</div>");
        document.write("</td>");
        document.write("</tr>");

        document.write("</table>");
        document.write("</div>");
        document.write("</form>");
    }
}
function writeVideoFromJson(mediaObject){
    //VIDEO

    //IF THERES A VIDEO PATH IN THE MEDIAOBJECT, AND THERE IS AT LEAST ONE VIDEO
    if(mediaObject.videos && mediaObject.videos[0]){
        //WRITE A WEB PAGE FORM FOR THE VIDEOS EMBEDDED IN A DIV
        document.write("<form id='videoform'>")
        document.write("<div id='videoformdiv'>");

        //PUT A TABLE IN THE DIV
        document.write("<table id='videotable'>");

        //WRITE THE FIRST TABLE ROW
        document.write("<tr>");

        //WRITE THE FIRST TABLE COLUMN
        document.write("<td>");

        //WRITE A SELECT DROPDOWN FOR THE VIDEOS PASSED THROUGH THE MEDIA OBJECT
        document.write("<select id=\"selectvideos\">");

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

        //FINISH WRITING THE SELECT DROPDOWN FOR EACH VIDOE PASSED THROUGH THE MEDIA OBJECT
        document.write("</select>");
        document.write("</td>");
        document.write("</tr>");

        //PUT A POSTER IMAGE
        document.write("<tr>");
        document.write("<td>");
        //if a poster image was provided in the media object for the video
        if(mediaObject.videos[0].poster){
            //IF THE FULL URL WAS SPECIFIED, DONT USE THE VIDEOS PREPENDING PATH SPECIFIED
            if(mediaObject.videos[0].poster.indexOf("http://")!==-1 ||
                mediaObject.videos[0].poster.indexOf("https://")!==-1){
                document.write("<video id=\"jaemzwaredynamicvideoplayer\" poster=\""+mediaObject.videos[0].poster+"\" controls=\"controls\" preload=\"metadata\" title=\"stuffedanimalwarTv\">");
            }
            else{
                document.write("<video id=\"jaemzwaredynamicvideoplayer\" poster=\""+mediaObject.videospath+mediaObject.videos[0].poster+"\" controls=\"controls\" preload=\"metadata\" title=\"stuffedanimalwarTv\">");
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
        document.write("</td>");
        document.write("</tr>");

        document.write("</table>");
        document.write("</div>");
        document.write("</form>");
    }
}
function writePhotosFromJson(mediaObject){
    //PHOTOS
    if(mediaObject.photospath && mediaObject.photos && mediaObject.photos[0]){
        document.write("<div class=\"photo-container\">");
        //paint the photos
        for (let i=0;i<mediaObject.photos.length;i++){
            let filepath = (mediaObject.photos[i].file.startsWith("http://") || mediaObject.photos[i].file.startsWith("https://")) ? mediaObject.photos[i].file : mediaObject.photospath+mediaObject.photos[i].file;
            let filetitle=mediaObject.photos[i].title;
            document.write("<div class=\"skatecreteordiephoto\"><img class=\"photosformthumbnail\" src=\""+filepath+"\" alt=\""+filetitle+"\" /><span class=\"skatecreteordiephototitle\">"+filetitle+"</span></div>");
        }
        document.write("</div>");
    }
}
//AUDIOVIDEOPHOTOS//////////////////////////////////////////////AUDIOVIDEOPHOTOS//////////////////////////////////////////////////AUDIOVIDEOPHOTOS
//CHAT//////////////////////////////////////////////CHAT//////////////////////////////////////////////////CHAT
function writeChatForm(responsesObject) {
    document.write("<form id='chatform'>");
    document.write("<div id='chatformdiv'>");

    // Add endpoint info display above the chat form
    document.write("<div id='endpointInfo' style='color: white; font-weight: bold; font-size: 12px; margin-bottom: 5px; text-align: left;'>");
    document.write("Endpoint: <span id='endpointDisplay'></span> | ");
    document.write("Master: <span id='masterAliasDisplay'></span> | ");
    document.write("Default: <span id='unspecifiedAliasDisplay'></span>");
    document.write("</div>");

    document.write("<table id='chattable'>");
    document.write("<tr>");
    document.write("<td id=\"chatclientusertd\">");
    document.write("<input id=\"chatClientUser\" placeholder=\"chat alias\"/>");
    document.write("</td>");
    document.write("<td>");
    document.write("<select id=\"chatClientAutoResponder\" size=1 >");
    writeDefaultAutoResponderOptions(responsesObject);
    document.write("</select>");
    document.write("</td>");
    document.write("<td>");
    document.write("<input style=\"vertical-align:top;text-align:left;\" id=\"clearchatbutton\" type=\"button\" value=\"Clear Chat\" />");
    document.write("</td>");
    document.write("</tr>");
    document.write("<tr>");
    document.write("<td id=\"chatclientmessagetd\" colspan=\"2\">");
    document.write("<input id=\"chatClientMessage\" placeholder=\"hit enter to send message text or URL ending with .jpg .gif .png .mp3 .flac\" />");
    document.write("</td>");
    document.write("<td>");
    document.write("<input style=\"vertical-align:top;text-align:left;\" id=\"sendchatbutton\" type=\"button\" value=\"Send\" />");
    document.write("</td>");
    document.write("</tr>");
    document.write("</table>");
    document.write("</div>");
    document.write("</form>");
}
function writeChatFormFileUpload() {
    document.write("<table id='chattableuploadform'>");
        document.write("<tr>");
            document.write("<td id=\"chatclientuploadformtd\">");
                document.write("<form id=\"uploadForm\" enctype=\"multipart/form-data\">");
                document.write("<input type=\"file\" name=\"image\" accept=\"image/*\" required>");
                document.write("<button type=\"submit\">Upload Image (<50MB)</button>");
                document.write("</form>");
            document.write("</td>");
            document.write("<td id=\"chatclientuploadformtd\">");
                document.write("<div id=\"progressIndicator\">0% uploaded</div>");
            document.write("</td>");
        document.write("</tr>");
    document.write("</table>");
}
function writeChatFormVideoUpload() {
    document.write("<table id='chattableuploadform'>");
        document.write("<tr>");
            document.write("<td id=\"chatclientuploadformtd\">");
            document.write("<form id=\"videoUploadForm\" enctype=\"multipart/form-data\">");
            document.write("<input type=\"file\" name=\"video\" accept=\"video/*\" required>");
            document.write("<button type=\"submit\">Upload Video (<10MB)</button>");
            document.write("</form>");
            document.write("</td>");
            document.write("<td id=\"chatclientuploadformtd\">");
            document.write("<div id=\"videoProgressIndicator\">0% uploaded</div>");
            document.write("</td>");
        document.write("</tr>");
    document.write("</table>");
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




