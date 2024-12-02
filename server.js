const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const AudioMotionAnalyzer = require('audiomotion-analyzer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"], transports: ['websocket', 'polling'] },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true
});

const port = process.env.PORT || 8080;
const weatherApiKey = '7b15cc0615324f569a2211207242511';

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Light state management
let lightState = {
    mode: 'web',
    color: [255, 255, 255],
    weather: {},
    audioEnergy: 0,
    isActive: true
};

// Color update function
function updateLightColor(mode, color) {
    lightState.mode = mode;
    lightState.color = color;
    io.emit('lightState', lightState);
}

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.emit('lightState', lightState);

    socket.on('disconnect', (reason) => {
        console.log('Client disconnected:', socket.id, reason);
    });

    socket.on('changeColor', (color) => {
        updateLightColor('web', color);
    });

    socket.on('changeMode', (mode) => {
        lightState.mode = mode;
        io.emit('lightState', lightState);
    });

    socket.on('audioData', (audioData) => {
        if (lightState.mode === 'audio') {
            // Calculate the average energy across all frequency bands
            const energy = calculateAudioEnergy(audioData);
            lightState.audioEnergy = energy;
            
            // Convert audio energy to color
            const color = getAudioColor(energy);
            updateLightColor('audio', color);
        }
    });
});

// Weather route
app.get('/weather', async (req, res) => {
    try {
        const city = req.query.city || 'London';
        const url = `http://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${city}&aqi=no`;
        const response = await axios.get(url);
        lightState.weather = response.data;
        
        if (lightState.mode === 'weather') {
            const color = getColorFromWeather(response.data);
            updateLightColor('weather', color);
        }
        res.json(response.data);
    } catch (error) {
        console.error('Weather API error:', error);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

// Audio energy calculation
function calculateAudioEnergy(audioData) {
    // Calculate the root mean square (RMS) of the audio data
    const sum = audioData.reduce((acc, val) => acc + (val * val), 0);
    return Math.sqrt(sum / audioData.length);
}

// Audio energy to color conversion
function getAudioColor(energy) {
    // Map energy (0-1) to hue (0-360)
    // Lower energy = cooler colors (blue/green)
    // Higher energy = warmer colors (yellow/red)
    const hue = (1 - energy) * 240; // 240 = blue, 0 = red
    return HSVtoRGB(hue / 360, 1, 1);
}

// Weather to color mapping
function getColorFromWeather(weatherData) {
    const condition = weatherData.current.condition.code;
    const temp = weatherData.current.temp_c;
    
    const colorMap = {
        1000: [255, 255, 0],   // Sunny
        1003: [135, 206, 235], // Partly cloudy
        1006: [128, 128, 128], // Cloudy
        1009: [169, 169, 169], // Overcast
        1030: [255, 255, 255], // Mist
        1063: [0, 0, 255],     // Rain
        1066: [255, 255, 255], // Snow
        1087: [128, 0, 128],   // Thunder
    };

    // Adjust color based on temperature
    let color = colorMap[condition] || [255, 255, 255];
    if (temp < 0) {
        color = [0, 0, 255]; // Cold blue
    } else if (temp > 30) {
        color = [255, 0, 0]; // Hot red
    }
    
    return color;
}

// HSV to RGB conversion
function HSVtoRGB(h, s, v) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255)
    ];
}

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
