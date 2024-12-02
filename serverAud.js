const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

// Configure multer for MP3 uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
})[1];

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'audio/mpeg') {
            cb(null, true);
        } else {
            cb(null, false);
        }
    }
});

app.use(express.static('public'));

app.post('/upload', upload.single('audioFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
    }
    
    // Process the audio file and emit color changes
    const filePath = req.file.path;
    processAudioFile(filePath, io);
    
    res.json({ success: true, filename: req.file.filename });
});

server.listen(8080, () => {
    console.log('Server running on port 8080');
});
