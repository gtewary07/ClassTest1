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
  pingInterval: 25000
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/set-city', (req, res) => {
  if (currentMode === 'weather') {
    CITY = req.body.city;
  }
  res.redirect('/');
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('colorChange', (color) => {
    if (currentMode === 'manual') {
      console.log('Color changed to:', color);
      io.emit('updateColor', color);
    }
  });

  socket.on('setCity', (city) => {
    if (currentMode === 'weather') {
      CITY = city;
      console.log('City set to:', city);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

setInterval(async () => {
  if (currentMode === 'weather') {
    const weatherCondition = await getWeatherData(CITY);
    if (weatherCondition) {
      const color = getColorForWeather(weatherCondition);
      io.emit('updateColor', color);
      console.log(`Weather in ${CITY}: ${weatherCondition}, Color: ${color}`);
    }
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
