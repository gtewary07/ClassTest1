const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mm = require('music-metadata');

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
});

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

// Function to convert audio amplitude to color
function amplitudeToColor(amplitude) {
    // Normalize amplitude to 0-1 range
    const normalized = Math.min(Math.max(amplitude, 0), 1);
    
    // Convert to HSL color (hue based on amplitude)
    const hue = normalized * 360;
    const saturation = 100;
    const lightness = 50;
    
    // Convert HSL to RGB
    const c = (1 - Math.abs(2 * lightness / 100 - 1)) * saturation / 100;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = lightness / 100 - c / 2;
    
    let r, g, b;
    if (hue < 60) {
        [r, g, b] = [c, x, 0];
    } else if (hue < 120) {
        [r, g, b] = [x, c, 0];
    } else if (hue < 180) {
        [r, g, b] = [0, c, x];
    } else if (hue < 240) {
        [r, g, b] = [0, x, c];
    } else if (hue < 300) {
        [r, g, b] = [x, 0, c];
    } else {
        [r, g, b] = [c, 0, x];
    }
    
    // Convert to RGB hex
    const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

async function processAudioFile(filePath, io) {
    try {
        const metadata = await mm.parseFile(filePath);
        const duration = metadata.format.duration;
        const sampleRate = metadata.format.sampleRate;
        
        // Process audio in chunks
        const chunkSize = Math.floor(sampleRate / 10); // 100ms chunks
        let currentTime = 0;
        
        const processChunk = () => {
            if (currentTime < duration) {
                // Simulate amplitude analysis (replace with actual audio analysis if needed)
                const amplitude = Math.random(); // Random amplitude for demonstration
                const color = amplitudeToColor(amplitude);
                
                io.emit('colorUpdate', color);
                currentTime += 0.1; // Advance by 100ms
                
                setTimeout(processChunk, 100);
            } catch (error) {
        console.error('Error processing audio file:', error);
    }
            else {
                // Cleanup
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }
        };
        
        processChunk();
    } catch (error) {
        console.error('Error processing audio file:', error);
    }
}

app.post('/upload', upload.single('audioFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
    }
    
    processAudioFile(req.file.path, io);
    res.json({ success: true, filename: req.file.filename });
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

server.listen(8080, () => {
    console.log('Server running on port 8080');
});
