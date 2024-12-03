// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e8
});

const API_KEY = '7b15cc0615324f569a2211207242511';
let CITY = 'London';
let currentMode = 'manual';

async function getWeatherData(city) {
    try {
        const response = await axios.get(`http://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${city}`);
        return response.data.current.condition.text;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        return null;
    }
}

function getColorForWeather(weatherCondition) {
    switch(weatherCondition.toLowerCase()) {
        case 'sunny': return '#FFFF00';
        case 'clear': return '#87CEEB';
        case 'partly cloudy': return '#C0C0C0';
        case 'cloudy': return '#808080';
        case 'overcast': return '#708090';
        case 'rainy': case 'light rain': case 'moderate rain': return '#0000FF';
        case 'heavy rain': return '#00008B';
        case 'thunderstorm': return '#800080';
        case 'snowy': return '#FFFFFF';
        default: return '#00FF00';
    }
}

function calculateColor(intensity) {
    intensity = Math.min(Math.max(intensity, 0), 100);
    let r, g, b;
    
    if (intensity < 20) {
        r = Math.floor((intensity / 20) * 128);
        g = 0;
        b = 255;
    } else if (intensity < 40) {
        r = 0;
        g = Math.floor(((intensity - 20) / 20) * 255);
        b = 255;
    } else if (intensity < 60) {
        r = 0;
        g = 255;
        b = Math.floor(255 - ((intensity - 40) / 20) * 255);
    } else if (intensity < 80) {
        r = Math.floor(((intensity - 60) / 20) * 255);
        g = 255;
        b = 0;
    } else {
        r = 255;
        g = Math.floor(255 - ((intensity - 80) / 20) * 255);
        b = 0;
    }
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

async function updateWeatherColor() {
    if (currentMode === 'weather') {
        const weatherCondition = await getWeatherData(CITY);
        if (weatherCondition) {
            const color = getColorForWeather(weatherCondition);
            io.emit('updateColor', color);
            io.emit('weatherUpdate', { city: CITY, condition: weatherCondition });
        }
    }
}

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('setMode', async (mode) => {
        currentMode = mode;
        console.log('Mode changed to:', mode);
        if (mode === 'weather') {
            await updateWeatherColor();
        }
    });

    socket.on('colorChange', (color) => {
        if (currentMode === 'manual') {
            console.log('Manual color change:', color);
            io.emit('updateColor', color);
        }
    });

    socket.on('setCity', async (city) => {
        if (currentMode === 'weather') {
            CITY = city;
            console.log('City set to:', city);
            await updateWeatherColor();
        }
    });

    socket.on('audioData', (data) => {
        if (currentMode === 'audio') {
            try {
                const color = data.color || calculateColor(data.intensity);
                io.emit('updateColor', color);
            } catch (error) {
                console.error('Error processing audio data:', error);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

setInterval(updateWeatherColor, 5 * 60 * 1000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
