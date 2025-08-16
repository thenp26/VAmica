// --- server.js (Production Ready) ---

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path'); // Import the 'path' module

const app = express();
// Heroku will set the PORT environment variable. If it's not set, we use 3000.
const PORT = process.env.PORT || 3000;
const DB_FILE_PATH = './database.json';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// This tells Express to serve all files from our 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to GET all the faces
app.get('/get-faces', (req, res) => {
    fs.readFile(DB_FILE_PATH, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') { return res.json([]); }
            return res.status(500).json({ message: 'Error reading database.' });
        }
        res.json(JSON.parse(data));
    });
});

// API endpoint to POST a new face
app.post('/save-face', (req, res) => {
    const newFace = req.body;
    fs.readFile(DB_FILE_PATH, 'utf8', (err, data) => {
        let database = [];
        if (!err) { database = JSON.parse(data); }
        database.push(newFace);
        fs.writeFile(DB_FILE_PATH, JSON.stringify(database, null, 2), (writeErr) => {
            if (writeErr) { return res.status(500).json({ message: 'Error writing to database.' }); }
            res.status(200).json({ message: 'Face saved successfully!' });
        });
    });
});

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});