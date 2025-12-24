// Global state
let currentEndpoint = null;
let validationPassed = false;
let validationErrors = [];
let authToken = null;

// Initialize on page load
window.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in (token in sessionStorage)
    authToken = sessionStorage.getItem('crudAuthToken');
    if (authToken) {
        showCrudInterface();
        loadEndpointList();
    }

    // Allow Enter key to submit login
    const loginInput = document.getElementById('loginPassword');
    if (loginInput) {
        loginInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                login();
            }
        });
    }
});

// Login function
async function login() {
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    if (!password) {
        errorDiv.textContent = 'Please enter a password';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('/api/crud-auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: password })
        });

        const result = await response.json();

        if (result.success) {
            authToken = result.token;
            sessionStorage.setItem('crudAuthToken', authToken);
            showCrudInterface();
            loadEndpointList();
        } else {
            errorDiv.textContent = result.message;
            errorDiv.style.display = 'block';
            document.getElementById('loginPassword').value = '';
        }
    } catch (error) {
        errorDiv.textContent = 'Login failed: ' + error.message;
        errorDiv.style.display = 'block';
    }
}

// Show CRUD interface
function showCrudInterface() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('crudInterface').style.display = 'block';
}

// Helper function to make authenticated API calls
async function authenticatedFetch(url, options = {}) {
    options.headers = options.headers || {};
    options.headers['x-crud-token'] = authToken;

    const response = await fetch(url, options);

    // Check if unauthorized
    if (response.status === 401) {
        // Clear token and reload page to show login
        sessionStorage.removeItem('crudAuthToken');
        authToken = null;
        alert('Session expired. Please log in again.');
        location.reload();
        throw new Error('Unauthorized');
    }

    return response;
}

// Load list of available endpoints
async function loadEndpointList() {
    try {
        const response = await authenticatedFetch('/api/endpoints');
        const result = await response.json();

        if (result.success) {
            const select = document.getElementById('endpointSelect');
            result.endpoints.forEach(endpoint => {
                const option = document.createElement('option');
                option.value = endpoint;
                option.textContent = endpoint;
                select.appendChild(option);
            });
        }
    } catch (error) {
        showStatus('Error loading endpoints: ' + error.message, 'error');
    }
}

// Load endpoint data
async function loadEndpoint() {
    const select = document.getElementById('endpointSelect');
    const endpointName = select.value;

    if (!endpointName) {
        showStatus('Please select an endpoint', 'error');
        return;
    }

    try {
        const response = await authenticatedFetch('/api/endpoint/' + endpointName);
        const result = await response.json();

        if (result.success) {
            currentEndpoint = endpointName;
            populateForm(result.data);
            document.getElementById('endpointForm').style.display = 'block';
            validationPassed = false;
            document.getElementById('saveBtn').disabled = true;
            clearAllValidationStatus();
            showStatus('Endpoint loaded successfully', 'success');
        } else {
            showStatus('Error: ' + result.message, 'error');
        }
    } catch (error) {
        showStatus('Error loading endpoint: ' + error.message, 'error');
    }
}

// Populate form with data
function populateForm(data) {
    // Basic info
    document.getElementById('endpoint').value = data.endpoint || '';
    document.getElementById('masterAlias').value = data.masterAlias || '';
    document.getElementById('unspecifiedAlias').value = data.unspecifiedAlias || '';

    // Stuffed animal media
    document.getElementById('backgroundimage').value = data.stuffedAnimalMediaObject?.backgroundimage || '';
    populateAnimals(data.stuffedAnimalMediaObject?.animals || []);

    // Media object
    document.getElementById('songspath').value = data.mediaObject?.songspath || '';
    document.getElementById('videospath').value = data.mediaObject?.videospath || '';
    document.getElementById('videosScanPath').value = data.mediaObject?.videosScanPath || '';
    document.getElementById('photospath').value = data.mediaObject?.photospath || '';
    document.getElementById('photosScanPath').value = data.mediaObject?.photosScanPath || '';
    populateSongs(data.mediaObject?.songs || []);
    populatePhotos(data.mediaObject?.photos || []);
    populateVideos(data.mediaObject?.videos || []);

    // Responses
    populateResponses(data.responsesObject?.responses || []);
}

// Populate animals array
function populateAnimals(animals) {
    const container = document.getElementById('animalsArray');
    container.innerHTML = '';

    animals.forEach((animal, index) => {
        addAnimalItem(animal.file, animal.title, index);
    });
}

function addAnimal() {
    const container = document.getElementById('animalsArray');
    const index = container.children.length;
    addAnimalItem('', '', index);
}

function addAnimalItem(file = '', title = '', index) {
    const container = document.getElementById('animalsArray');
    const item = document.createElement('div');
    item.className = 'array-item';
    item.setAttribute('data-index', index);

    item.innerHTML = `
        <div class="array-item-header">
            <strong>Animal ${index + 1}</strong>
            <button type="button" class="remove-btn" onclick="removeArrayItem(this)">Remove</button>
        </div>
        <div class="form-group">
            <label>File: <span class="validation-status" id="val-animal-file-${index}"></span></label>
            <input type="text" class="animal-file" placeholder="animals/badger.png" value="${file}" data-validate-type="animal" data-index="${index}" />
        </div>
        <div class="form-group">
            <label>Title: <span class="validation-status" id="val-animal-title-${index}"></span></label>
            <input type="text" class="animal-title" placeholder="Badger" value="${title}" data-index="${index}" />
        </div>
    `;

    container.appendChild(item);
}

// Populate songs array
function populateSongs(songs) {
    const container = document.getElementById('songsArray');
    container.innerHTML = '';

    songs.forEach((song, index) => {
        addSongItem(song.file, song.title, index);
    });
}

function addSong() {
    const container = document.getElementById('songsArray');
    const index = container.children.length;
    addSongItem('', '', index);
}

function addSongItem(file = '', title = '', index) {
    const container = document.getElementById('songsArray');
    const item = document.createElement('div');
    item.className = 'array-item';
    item.setAttribute('data-index', index);

    item.innerHTML = `
        <div class="array-item-header">
            <strong>Song ${index + 1}</strong>
            <button type="button" class="remove-btn" onclick="removeArrayItem(this)">Remove</button>
        </div>
        <div class="form-group">
            <label>File: <span class="validation-status" id="val-song-file-${index}"></span></label>
            <input type="text" class="song-file" placeholder="song.mp3" value="${file}" data-validate-type="song" data-index="${index}" />
        </div>
        <div class="form-group">
            <label>Title: <span class="validation-status" id="val-song-title-${index}"></span></label>
            <input type="text" class="song-title" placeholder="Song Title" value="${title}" data-index="${index}" />
        </div>
    `;

    container.appendChild(item);
}

// Populate photos array
function populatePhotos(photos) {
    const container = document.getElementById('photosArray');
    container.innerHTML = '';

    photos.forEach((photo, index) => {
        addPhotoItem(photo.file, photo.title, index);
    });
}

function addPhoto() {
    const container = document.getElementById('photosArray');
    const index = container.children.length;
    addPhotoItem('', '', index);
}

function addPhotoItem(file = '', title = '', index) {
    const container = document.getElementById('photosArray');
    const item = document.createElement('div');
    item.className = 'array-item';
    item.setAttribute('data-index', index);

    item.innerHTML = `
        <div class="array-item-header">
            <strong>Photo ${index + 1}</strong>
            <button type="button" class="remove-btn" onclick="removeArrayItem(this)">Remove</button>
        </div>
        <div class="form-group">
            <label>File: <span class="validation-status" id="val-photo-file-${index}"></span></label>
            <input type="text" class="photo-file" placeholder="photo.jpg" value="${file}" data-validate-type="photo" data-index="${index}" />
        </div>
        <div class="form-group">
            <label>Title: <span class="validation-status" id="val-photo-title-${index}"></span></label>
            <input type="text" class="photo-title" placeholder="Photo Title" value="${title}" data-index="${index}" />
        </div>
    `;

    container.appendChild(item);
}

// Populate videos array
function populateVideos(videos) {
    const container = document.getElementById('videosArray');
    container.innerHTML = '';

    videos.forEach((video, index) => {
        addVideoItem(video.file, video.title, video.poster || '', index);
    });
}

function addVideo() {
    const container = document.getElementById('videosArray');
    const index = container.children.length;
    addVideoItem('', '', '', index);
}

function addVideoItem(file = '', title = '', poster = '', index) {
    const container = document.getElementById('videosArray');
    const item = document.createElement('div');
    item.className = 'array-item';
    item.setAttribute('data-index', index);

    item.innerHTML = `
        <div class="array-item-header">
            <strong>Video ${index + 1}</strong>
            <button type="button" class="remove-btn" onclick="removeArrayItem(this)">Remove</button>
        </div>
        <div class="form-group">
            <label>File: <span class="validation-status" id="val-video-file-${index}"></span></label>
            <input type="text" class="video-file" placeholder="video.mp4" value="${file}" data-validate-type="video" data-index="${index}" />
        </div>
        <div class="form-group">
            <label>Title: <span class="validation-status" id="val-video-title-${index}"></span></label>
            <input type="text" class="video-title" placeholder="Video Title" value="${title}" data-index="${index}" />
        </div>
        <div class="form-group">
            <label>Poster: <span class="validation-status" id="val-video-poster-${index}"></span></label>
            <input type="text" class="video-poster" placeholder="poster.jpg (if not specified, will use base path)" value="${poster}" data-validate-type="poster" data-index="${index}" />
        </div>
    `;

    container.appendChild(item);
}

// Populate responses array
function populateResponses(responses) {
    const container = document.getElementById('responsesArray');
    container.innerHTML = '';

    responses.forEach((response, index) => {
        addResponseItem(response.response, index);
    });
}

function addResponse() {
    const container = document.getElementById('responsesArray');
    const index = container.children.length;
    addResponseItem('', index);
}

function addResponseItem(response = '', index) {
    const container = document.getElementById('responsesArray');
    const item = document.createElement('div');
    item.className = 'array-item';
    item.setAttribute('data-index', index);

    item.innerHTML = `
        <div class="array-item-header">
            <strong>Response ${index + 1}</strong>
            <button type="button" class="remove-btn" onclick="removeArrayItem(this)">Remove</button>
        </div>
        <div class="form-group">
            <label>Response: <span class="validation-status" id="val-response-${index}"></span></label>
            <input type="text" class="response-text" placeholder="Response text" value="${response}" data-index="${index}" />
        </div>
    `;

    container.appendChild(item);
}

// Remove array item
function removeArrayItem(button) {
    const item = button.closest('.array-item');
    const container = item.parentElement;

    // Count remaining items
    const itemCount = container.querySelectorAll('.array-item').length;

    if (itemCount <= 1) {
        alert('Cannot remove the last item. At least one entry is required in each array.');
        return;
    }

    item.remove();
}

// Validate form
async function validateForm() {
    clearAllValidationStatus();
    validationErrors = [];
    validationPassed = false;

    showStatus('Validating...', 'pending');

    // Collect all validation promises
    const validations = [];

    // Validate basic fields
    validations.push(validateRequired('masterAlias', 'Master Alias'));
    validations.push(validateRequired('unspecifiedAlias', 'Unspecified Alias'));

    // Validate background image
    validations.push(validateResourcePath('backgroundimage', 'background'));

    // Validate all animals
    const animalFiles = document.querySelectorAll('.animal-file');
    const animalTitles = document.querySelectorAll('.animal-title');
    for (let i = 0; i < animalFiles.length; i++) {
        validations.push(validateRequired(animalFiles[i], `Animal ${i + 1} File`, `animal-file-${i}`));
        validations.push(validateRequired(animalTitles[i], `Animal ${i + 1} Title`, `animal-title-${i}`));
        validations.push(validateResourcePath(animalFiles[i], 'animal', `animal-file-${i}`));
    }

    // Validate songs
    const songFiles = document.querySelectorAll('.song-file');
    const songTitles = document.querySelectorAll('.song-title');
    for (let i = 0; i < songFiles.length; i++) {
        validations.push(validateRequired(songFiles[i], `Song ${i + 1} File`, `song-file-${i}`));
        validations.push(validateRequired(songTitles[i], `Song ${i + 1} Title`, `song-title-${i}`));
        validations.push(validateResourcePath(songFiles[i], 'song', `song-file-${i}`));
    }

    // Validate photos
    const photoFiles = document.querySelectorAll('.photo-file');
    const photoTitles = document.querySelectorAll('.photo-title');
    for (let i = 0; i < photoFiles.length; i++) {
        validations.push(validateRequired(photoFiles[i], `Photo ${i + 1} File`, `photo-file-${i}`));
        validations.push(validateRequired(photoTitles[i], `Photo ${i + 1} Title`, `photo-title-${i}`));
        validations.push(validateResourcePath(photoFiles[i], 'photo', `photo-file-${i}`));
    }

    // Validate videos
    const videoFiles = document.querySelectorAll('.video-file');
    const videoTitles = document.querySelectorAll('.video-title');
    const videoPosters = document.querySelectorAll('.video-poster');
    for (let i = 0; i < videoFiles.length; i++) {
        validations.push(validateRequired(videoFiles[i], `Video ${i + 1} File`, `video-file-${i}`));
        validations.push(validateRequired(videoTitles[i], `Video ${i + 1} Title`, `video-title-${i}`));
        validations.push(validateResourcePath(videoFiles[i], 'video', `video-file-${i}`));
        // Poster is optional, but if provided, validate it
        if (videoPosters[i].value.trim() !== '') {
            validations.push(validateResourcePath(videoPosters[i], 'poster', `video-poster-${i}`));
        }
    }

    // Validate responses
    const responses = document.querySelectorAll('.response-text');
    for (let i = 0; i < responses.length; i++) {
        validations.push(validateRequired(responses[i], `Response ${i + 1}`, `response-${i}`));
    }

    // Wait for all validations to complete
    await Promise.all(validations);

    // Check results
    if (validationErrors.length === 0) {
        validationPassed = true;
        document.getElementById('saveBtn').disabled = false;
        showStatus('✅ Validation passed! Click Save to overwrite the file.', 'success');
    } else {
        validationPassed = false;
        document.getElementById('saveBtn').disabled = true;

        let errorHtml = '<strong>Validation errors:</strong><ul class="error-list">';
        validationErrors.forEach(error => {
            errorHtml += `<li>❌ ${error}</li>`;
        });
        errorHtml += '</ul>';

        const statusDiv = document.getElementById('statusMessage');
        statusDiv.innerHTML = errorHtml;
        statusDiv.className = 'status-message status-error';
        statusDiv.style.display = 'block';

        // Scroll to top to show validation errors
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Validate required field
function validateRequired(fieldOrElement, fieldName, validationId = null) {
    return new Promise((resolve) => {
        let element, value, valId;

        if (typeof fieldOrElement === 'string') {
            element = document.getElementById(fieldOrElement);
            value = element.value.trim();
            valId = 'val-' + fieldOrElement;
        } else {
            element = fieldOrElement;
            value = element.value.trim();
            valId = 'val-' + (validationId || fieldName.toLowerCase().replace(/\s+/g, '-'));
        }

        if (value === '') {
            validationErrors.push(`${fieldName} is required`);
            setValidationStatus(valId, 'error', 'Required');
        } else {
            setValidationStatus(valId, 'success', '✓');
        }

        resolve();
    });
}

// Validate resource path (file or HTTP URL)
async function validateResourcePath(fieldOrElement, type, validationId = null) {
    let element, value, valId;

    if (typeof fieldOrElement === 'string') {
        element = document.getElementById(fieldOrElement);
        value = element.value.trim();
        valId = 'val-' + fieldOrElement;
    } else {
        element = fieldOrElement;
        value = element.value.trim();
        valId = 'val-' + (validationId || 'resource');
    }

    if (value === '') {
        return; // Empty fields handled by validateRequired
    }

    // Check if it's an HTTP URL
    if (value.startsWith('http://') || value.startsWith('https://')) {
        try {
            // Validate HTTP URL via server-side to avoid CORS issues
            const response = await authenticatedFetch('/api/validate-resource', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: value,
                    type: type
                })
            });

            const result = await response.json();

            if (result.success && result.httpStatus >= 200 && result.httpStatus < 400) {
                setValidationStatus(valId, 'success', `✓ ${result.httpStatus}`);
            } else if (result.httpStatus) {
                validationErrors.push(`${value} returned status ${result.httpStatus}`);
                setValidationStatus(valId, 'error', `${result.httpStatus}`);
            } else {
                validationErrors.push(`${value} is not accessible: ${result.message || 'Unknown error'}`);
                setValidationStatus(valId, 'error', 'Error');
            }
        } catch (error) {
            validationErrors.push(`${value} validation failed: ${error.message}`);
            setValidationStatus(valId, 'error', 'Error');
        }
    } else {
        // Local file - prepend base path if needed
        let resourcePath = value;

        // If no "http" in path, prepend the appropriate base path
        if (type === 'song' && !value.startsWith('songs/')) {
            resourcePath = document.getElementById('songspath').value + value;
        } else if (type === 'photo' && !value.startsWith('photos/')) {
            resourcePath = document.getElementById('photospath').value + value;
        } else if (type === 'video' && !value.startsWith('videos/')) {
            resourcePath = document.getElementById('videospath').value + value;
        } else if (type === 'poster' && !value.startsWith('videos/')) {
            // Poster images are stored in the videos directory
            resourcePath = document.getElementById('videospath').value + value;
        }

        // Validate with server
        try {
            const response = await authenticatedFetch('/api/validate-resource', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: resourcePath,
                    type: type
                })
            });

            const result = await response.json();

            // Check if it's an HTTP URL response or local file response
            if (result.isHttp) {
                // HTTP URL validation response
                if (result.success && result.httpStatus >= 200 && result.httpStatus < 400) {
                    setValidationStatus(valId, 'success', `✓ ${result.httpStatus}`);
                } else {
                    validationErrors.push(`${resourcePath} returned status ${result.httpStatus || 'Error'}`);
                    setValidationStatus(valId, 'error', `${result.httpStatus || 'Error'}`);
                }
            } else {
                // Local file validation response
                if (result.success && result.exists) {
                    setValidationStatus(valId, 'success', '✓ OK');
                } else {
                    validationErrors.push(`${resourcePath} does not exist on server`);
                    setValidationStatus(valId, 'error', '404');
                }
            }
        } catch (error) {
            validationErrors.push(`Failed to validate ${resourcePath}: ${error.message}`);
            setValidationStatus(valId, 'error', 'Error');
        }
    }
}

// Set validation status
function setValidationStatus(elementId, status, message) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.textContent = message;
    element.className = 'validation-status validation-' + status;
}

// Clear all validation status
function clearAllValidationStatus() {
    const statusElements = document.querySelectorAll('.validation-status');
    statusElements.forEach(element => {
        element.textContent = '';
        element.className = 'validation-status';
    });
}

// Show save confirmation modal
function showSaveConfirmation() {
    if (!validationPassed) {
        showStatus('Please validate the form first', 'error');
        return;
    }

    document.getElementById('confirmModal').style.display = 'block';
}

// Close modal
function closeModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

// Confirm save
async function confirmSave() {
    closeModal();

    const data = collectFormData();

    try {
        const response = await authenticatedFetch('/api/endpoint/' + currentEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showStatus('✅ ' + result.message, 'success');
            validationPassed = false;
            document.getElementById('saveBtn').disabled = true;
        } else {
            showStatus('❌ Error: ' + result.message, 'error');
        }
    } catch (error) {
        showStatus('❌ Error saving: ' + error.message, 'error');
    }
}

// Collect form data
function collectFormData() {
    // Basic info
    const data = {
        endpoint: document.getElementById('endpoint').value,
        masterAlias: document.getElementById('masterAlias').value,
        unspecifiedAlias: document.getElementById('unspecifiedAlias').value
    };

    // Stuffed animal media object
    data.stuffedAnimalMediaObject = {
        backgroundimage: document.getElementById('backgroundimage').value,
        animals: []
    };

    const animalFiles = document.querySelectorAll('.animal-file');
    const animalTitles = document.querySelectorAll('.animal-title');
    for (let i = 0; i < animalFiles.length; i++) {
        data.stuffedAnimalMediaObject.animals.push({
            file: animalFiles[i].value,
            title: animalTitles[i].value
        });
    }

    // Media object
    data.mediaObject = {
        songspath: document.getElementById('songspath').value,
        videospath: document.getElementById('videospath').value,
        photospath: document.getElementById('photospath').value,
        songs: [],
        photos: [],
        videos: []
    };

    // Add scan paths only if they have values (for analogarchive integration)
    const videosScanPath = document.getElementById('videosScanPath').value.trim();
    const photosScanPath = document.getElementById('photosScanPath').value.trim();
    if (videosScanPath) {
        data.mediaObject.videosScanPath = videosScanPath;
    }
    if (photosScanPath) {
        data.mediaObject.photosScanPath = photosScanPath;
    }

    const songFiles = document.querySelectorAll('.song-file');
    const songTitles = document.querySelectorAll('.song-title');
    for (let i = 0; i < songFiles.length; i++) {
        data.mediaObject.songs.push({
            file: songFiles[i].value,
            title: songTitles[i].value
        });
    }

    const photoFiles = document.querySelectorAll('.photo-file');
    const photoTitles = document.querySelectorAll('.photo-title');
    for (let i = 0; i < photoFiles.length; i++) {
        data.mediaObject.photos.push({
            file: photoFiles[i].value,
            title: photoTitles[i].value
        });
    }

    const videoFiles = document.querySelectorAll('.video-file');
    const videoTitles = document.querySelectorAll('.video-title');
    const videoPosters = document.querySelectorAll('.video-poster');
    for (let i = 0; i < videoFiles.length; i++) {
        const video = {
            file: videoFiles[i].value,
            title: videoTitles[i].value
        };
        if (videoPosters[i].value.trim() !== '') {
            video.poster = videoPosters[i].value;
        }
        data.mediaObject.videos.push(video);
    }

    // Responses object
    data.responsesObject = {
        responses: []
    };

    const responses = document.querySelectorAll('.response-text');
    for (let i = 0; i < responses.length; i++) {
        data.responsesObject.responses.push({
            response: responses[i].value
        });
    }

    return data;
}

// Cancel edit
function cancelEdit() {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
        document.getElementById('endpointForm').style.display = 'none';
        document.getElementById('endpointSelect').value = '';
        currentEndpoint = null;
        validationPassed = false;
        showStatus('Edit cancelled', 'error');
    }
}

// Show status message
function showStatus(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = 'status-message status-' + type;
    statusDiv.style.display = 'block';

    // Scroll to top to show the message
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

// Toggle collapse/expand array sections
function toggleCollapse(sectionId) {
    const section = document.getElementById(sectionId);
    const indicator = document.getElementById(sectionId + '-indicator');

    if (section.classList.contains('collapsed')) {
        section.classList.remove('collapsed');
        indicator.textContent = '▼';
    } else {
        section.classList.add('collapsed');
        indicator.textContent = '▶';
    }
}
