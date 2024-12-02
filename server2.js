const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ['websocket', 'polling'],
});

const port = process.env.PORT || 8080;
const weatherApiKey = '7b15cc0615324f569a2211207242511';

// Light state
let lightState = {
  mode: 'web',
  color: [255, 255, 255],
  weather: {},
  audioEnergy: 0,
};

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket setup
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.emit('lightState', lightState);

  socket.on('changeColor', (color) => {
    lightState.mode = 'web';
    lightState.color = color;
    io.emit('lightState', lightState);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Weather API route
app.get('/weather', async (req, res) => {
  try {
    const city = req.query.city || 'London';
    const url = `http://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${city}&aqi=no`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).send('Error fetching weather data');
  }
});

// Server start
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
