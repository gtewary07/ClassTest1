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
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const port = process.env.PORT || 8080;
const weatherApiKey = '7b15cc0615324f569a2211207242511';

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store the light state
let lightState = {
  mode: 'web',
  color: [255, 255, 255], // Default to white
};

// Utility to emit the light state
function updateLightState(mode, color) {
  lightState.mode = mode;
  lightState.color = color;
  io.emit('lightState', lightState);
}

// WebSocket connections
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.emit('lightState', lightState);

  socket.on('changeColor', (color) => {
    updateLightState('web', color);
  });

  socket.on('changeMode', (mode) => {
    lightState.mode = mode;
    io.emit('lightState', lightState);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Handle weather-based mode
app.get('/weather', async (req, res) => {
  try {
    const city = req.query.city || 'London';
    const url = `http://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${city}`;
    const response = await axios.get(url);
    const weatherData = response.data;

    if (lightState.mode === 'weather') {
      const weatherColor = getColorFromWeather(weatherData);
      updateLightState('weather', weatherColor);
    }
    res.json(weatherData);
  } catch (error) {
    console.error('Weather API Error:', error.message);
    res.status(500).json({ error: 'Could not fetch weather data' });
  }
});

// Map weather conditions to colors
function getColorFromWeather(data) {
  const conditionCode = data.current.condition.code;
  const conditionColorMap = {
    1000: [255, 223, 0],   // Sunny - Yellow
    1003: [135, 206, 235], // Partly Cloudy - Light Blue
    1063: [0, 0, 255],     // Rain - Blue
    1066: [255, 255, 255], // Snow - White
    1087: [138, 43, 226],  // Thunder - Violet
    // Default white if no match
  };
  return conditionColorMap[conditionCode] || [255, 255, 255];
}

// Handle YouTube pitch-based mode
app.post('/youtube-pitch', [
  body('pitch').isFloat({ min: 0, max: 20000 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { pitch } = req.body;
  if (lightState.mode === 'youtube') {
    const pitchColor = pitchToColor(pitch);
    updateLightState('youtube', pitchColor);
  }
  res.sendStatus(200);
});

// Map pitch to color using HSV
function pitchToColor(pitch) {
  const hue = (pitch % 360) / 360; // Normalize to 0-1 range
  const rgb = HSVtoRGB(hue, 1, 1); // Convert HSV to RGB
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
    case 0: [r, g, b] = [v, t, p]; break;
    case 1: [r, g, b] = [q, v, p]; break;
    case 2: [r, g, b] = [p, v, t]; break;
    case 3: [r, g, b] = [p, q, v]; break;
    case 4: [r, g, b] = [t, p, v]; break;
    case 5: [r, g, b] = [v, p, q]; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// Start the server
server.listen(port, () => console.log(`Server running on http://localhost:${port}`));
