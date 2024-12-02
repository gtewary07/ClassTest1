const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const { body, validationResult } = require('express-validator');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" },
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
  pingTimeout: 60000,
  pingInterval: 25000
});

const port = process.env.PORT || 8080;
const weatherApiKey = '7b15cc0615324f569a2211207242511';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let lightState = {
    mode: 'web',
    color: [255, 255, 255],
    weather: {},
    youtubePitch: 0
};

function updateLightColor(mode, color) {
    lightState.mode = mode;
    lightState.color = color;
    io.emit('lightState', lightState);
}

io.on('connection', (socket) => {
    console.log('New client connected');
    socket.emit('lightState', lightState);

    socket.on('disconnect', (reason) => {
        console.log('Client disconnected:', reason);
    });

    socket.on('changeColor', (color) => {
        updateLightColor('web', color);
    });

    socket.on('changeMode', (mode) => {
        lightState.mode = mode;
        io.emit('lightState', lightState);
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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
        console.error('Failed to fetch weather data:', error);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

function getColorFromWeather(weatherData) {
    const condition = weatherData.current.condition.code;
    const colorMap = {
        1000: [255, 255, 0],   // Sunny - Yellow
        1003: [135, 206, 235], // Partly cloudy - Light Blue
        1006: [128, 128, 128], // Cloudy - Gray
        1009: [169, 169, 169], // Overcast - Dark Gray
        1030: [255, 255, 255], // Mist - White
        1063: [0, 0, 255],     // Rain - Blue
        1066: [255, 255, 255], // Snow - White
        1087: [128, 0, 128],   // Thunder - Purple
    };
    return colorMap[condition] || [255, 255, 255];
}

app.post('/api/youtube-pitch', [
  body('pitch').isFloat({ min: 0, max: 20000 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { pitch } = req.body;
  lightState.youtubePitch = pitch;
  if (lightState.mode === 'youtube') {
    const color = getPitchColor(pitch);
    updateLightColor('youtube', color);
  }
  res.sendStatus(200);
});

function getPitchColor(pitch) {
  const hue = (pitch % 360) / 360;
  const rgb = HSVtoRGB(hue, 1, 1);
  return [rgb.r, rgb.g, rgb.b];
}

function HSVtoRGB(h, s, v) {
  let r, g, b, i, f, p, q, t;
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
