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
        if (mode === 'weather') {
            await updateWeatherColor();
        }
    });

    socket.on('colorChange', (color) => {
        if (currentMode === 'manual') {
            io.emit('updateColor', color);
        }
    });

    socket.on('setCity', async (city) => {
        if (currentMode === 'weather') {
            CITY = city;
            await updateWeatherColor();
        }
    });

    socket.on('audioData', (data) => {
        if (currentMode === 'audio') {
            try {
                const intensity = Math.min(Math.max(data.intensity, 0), 100);
                const r = Math.floor((intensity / 100) * 255);
                const g = Math.floor((intensity / 100) * 255);
                const b = 255 - Math.floor((intensity / 100) * 255);
                const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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
