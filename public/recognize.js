// --- recognize.js (with Pause/Continue logic) ---

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const statusElement = document.getElementById('status');
const resultOverlay = document.getElementById('resultOverlay');
const resultImage = document.getElementById('resultImage');
const resultDetails = document.getElementById('resultDetails');
const continueButton = document.getElementById('continueButton');

const API_URL = '';
const MODELS_URL = './models';

let recognitionInterval; // This will hold our setInterval so we can stop it
let savedFacesData = []; // This will hold the full data of our saved faces

// --- Load Models and Start Video (These functions are the same) ---
async function loadModels() { /* ... Same as before ... */
    statusElement.textContent = 'Loading AI Models...';
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL)
    ]).catch(error => console.error("Error loading models:", error));
    statusElement.textContent = 'Models Loaded.';
}
async function startVideo() { /* ... Same as before ... */
    statusElement.textContent = 'Accessing Camera...';
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        video.srcObject = stream;
    } catch (err) {
        console.error("Camera Error:", err);
        statusElement.textContent = 'Error: Could not access camera.';
    }
}

// --- "Study" faces from the database (Slightly modified) ---
async function loadLabeledImages() {
    statusElement.textContent = 'Learning faces from database...';
    
    const response = await fetch(`${API_URL}/get-faces`);
    savedFacesData = await response.json(); // Store the full data globally

    if (savedFacesData.length === 0) {
        statusElement.textContent = 'Database is empty.';
        return null;
    }

    return Promise.all(
        savedFacesData.map(async face => {
            const descriptions = [];
            const img = await faceapi.fetchImage(face.imageDataUrl);
            const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
            
            if (detection) {
                descriptions.push(detection.descriptor);
            }
            return new faceapi.LabeledFaceDescriptors(face.name, descriptions);
        })
    );
}


// --- NEW: Function to stop the camera tracks ---
function stopCamera() {
    const stream = video.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
}


// --- UPDATED: Main Logic Block ---
async function startRecognition() {
    statusElement.textContent = 'Ready! Looking for faces...';
    videoContainer.classList.remove('hidden'); // Show video if it was hidden
    resultOverlay.classList.add('hidden');    // Hide results

    await startVideo(); // Make sure camera starts

    const labeledFaceDescriptors = await loadLabeledImages();
    if (!labeledFaceDescriptors) return;

    const validDescriptors = labeledFaceDescriptors.filter(d => d.descriptors.length > 0);
    const faceMatcher = new faceapi.FaceMatcher(validDescriptors, 0.6);

    faceapi.matchDimensions(canvas, { width: video.width, height: video.height });

    recognitionInterval = setInterval(async () => {
        const displaySize = { width: video.width, height: video.height };
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor));
        
        if (results.length > 0 && results[0].label !== 'unknown') {
            const bestMatch = results[0];
            const matchedPerson = savedFacesData.find(person => person.name === bestMatch.label);

            if (matchedPerson) {
                // --- A MATCH IS FOUND! ---
                clearInterval(recognitionInterval); // 1. Stop scanning
                stopCamera();                     // 2. Stop the camera
                
                // 3. Prepare and show the results
                resultImage.src = matchedPerson.imageDataUrl;
                resultDetails.innerHTML = `
                    <p><strong>Name:</strong> ${matchedPerson.name}</p>
                    <p><strong>Age:</strong> ${matchedPerson.age}</p>
                    <p><strong>Location:</strong> ${matchedPerson.location}</p>
                    <p><strong>Confidence:</strong> ${Math.round((1 - bestMatch.distance) * 100)}%</p>
                `;
                
                videoContainer.classList.add('hidden'); // Hide video element
                resultOverlay.classList.remove('hidden'); // Show the results overlay
            }
        }
    }, 200);
}

// Event listener for the "Continue" button
continueButton.addEventListener('click', () => {
    startRecognition(); // Simply restart the whole process
});


// --- Initial Startup ---
async function run() {
    await loadModels();
    startRecognition();
}
run();