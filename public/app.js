// --- app.js (Client-side) ---

// Get HTML Elements
const nameInput = document.getElementById('nameInput');
const ageInput = document.getElementById('ageInput');
const locationInput = document.getElementById('locationInput');
const fileInput = document.getElementById('fileInput');
const saveButton = document.getElementById('saveButton'); // Make sure your HTML button has id="saveButton"
const statusElement = document.getElementById('status');
const facesContainer = document.getElementById('facesContainer');

// The address of our local server
const API_URL = '';

// Function to read image file
const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader);
        reader.readAsDataURL(file);
    });
};

// Function to display faces by fetching from the server
const displayFaces = async () => {
    facesContainer.innerHTML = '';
    try {
        const response = await fetch(`${API_URL}/get-faces`);
        const database = await response.json();

        if (database.length === 0) {
            facesContainer.innerHTML = '<p>No faces saved yet.</p>';
            return;
        }

        database.forEach(face => {
            const faceCard = `
                <div class="face-card">
                    <img src="${face.imageDataUrl}" alt="${face.name}">
                    <div class="face-card-content">
                        <h3>${face.name}</h3>
                        <p><strong>Age:</strong> ${face.age}</p>
                        <p><strong>Location:</strong> ${face.location}</p>
                    </div>
                </div>
            `;
            facesContainer.innerHTML += faceCard;
        });
    } catch (error) {
        console.error('Failed to fetch faces:', error);
        facesContainer.innerHTML = '<p style="color:red;">Could not connect to the local server. Is it running?</p>';
    }
};

// Event listener for the save button
saveButton.addEventListener('click', async () => {
    const name = nameInput.value;
    const age = ageInput.value;
    const location = locationInput.value;
    const file = fileInput.files[0];

    if (!name || !age || !location || !file) {
        statusElement.textContent = 'Please fill out all fields.';
        return;
    }

    statusElement.textContent = 'Saving...';
    const imageDataUrl = await readFileAsDataURL(file);

    const newFace = { id: Date.now(), name, age, location, imageDataUrl };

    try {
        // Send the data to our server
        const response = await fetch(`${API_URL}/save-face`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newFace),
        });

        if (!response.ok) {
            throw new Error('Server responded with an error.');
        }

        const result = await response.json();
        statusElement.textContent = result.message;
        
        // Clear form and refresh display
        nameInput.value = ''; ageInput.value = ''; locationInput.value = ''; fileInput.value = '';
        displayFaces();

    } catch (error) {
        console.error('Error saving face:', error);
        statusElement.textContent = 'Failed to save. Make sure the server is running.';
    }
});

// Load faces when the page opens
window.onload = displayFaces;