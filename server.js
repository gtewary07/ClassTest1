const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 8080;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Store current light state
let lightState = {
    mode: 'web',
    color: [255, 255, 255], // Default white
    weather: {},
    youtubePitch: 0
};

// WebSocket connection
io.on('connection', (socket) => {
    console.log('New client connected');
    socket.emit('lightState', lightState);

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });

    socket.on('changeColor', (color) => {
        lightState.color = color;
        lightState.mode = 'web';
        io.emit('lightState', lightState);
    });

    socket.on('changeMode', (mode) => {
        lightState.mode = mode;
        io.emit('lightState', lightState);
    });

    socket.on('updateWeather', (weatherData) => {
        lightState.weather = weatherData;
        if (lightState.mode === 'weather') {
            io.emit('lightState', lightState);
        }
    });

    socket.on('updateYoutubePitch', (pitch) => {
        lightState.youtubePitch = pitch;
        if (lightState.mode === 'youtube') {
            io.emit('lightState', lightState);
        }
    });
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/weather', (req, res) => {
    const weatherData = req.body;
    lightState.weather = weatherData;
    if (lightState.mode === 'weather') {
        io.emit('lightState', lightState);
    }
    res.sendStatus(200);
});

app.post('/api/youtube-pitch', (req, res) => {
    const { pitch } = req.body;
    lightState.youtubePitch = pitch;
    if (lightState.mode === 'youtube') {
        io.emit('lightState', lightState);
    }
    res.sendStatus(200);
});

// Start server
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
