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
let CITY = 'Tempe';
let currentMode = 'manual';

function map(value, in_min, in_max, out_min, out_max) {
    return (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function calculateAudioColor(intensity) {
    let r, g, b;
    
    if (intensity < 20) {
        // Deep Purple
        r = Math.floor(map(intensity, 0, 20, 128, 255));
        g = 0;
        b = 255;
    } else if (intensity < 40) {
        // Bright Blue
        r = 0;
        g = Math.floor(map(intensity, 20, 40, 0, 128));
        b = 255;
    } else if (intensity < 60) {
        // Bright Green
        r = 0;
        g = 255;
        b = Math.floor(map(intensity, 40, 60, 255, 0));
    } else if (intensity < 80) {
        // Orange
        r = 255;
        g = Math.floor(map(intensity, 60, 80, 128, 255));
        b = 0;
    } else {
        // Red
        r = 255;
        g = 0;
        b = Math.floor(map(intensity, 80, 100, 128, 0));
    }
    
    return rgbToHex(r, g, b);
}

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
                // Handle both RGB and intensity-based color calculations
                let color;
                if (data.color && data.color.startsWith('rgb')) {
                    // Parse RGB color string
                    const rgb = data.color.match(/\d+/g).map(Number);
                    color = rgbToHex(rgb[0], rgb[1], rgb[2]);
                } else if (data.intensity !== undefined) {
                    color = calculateAudioColor(data.intensity);
                } else if (data.color) {
                    color = data.color; // Use provided hex color
                }

                if (color) {
                    io.emit('updateColor', color);
                }
            } catch (error) {
                console.error('Error processing audio data:', error);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Update weather every 5 minutes
setInterval(updateWeatherColor, 5 * 60 * 1000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

server.on('error', (error) => {
    console.error('Server Error:', error);
});
