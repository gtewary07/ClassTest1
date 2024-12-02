const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
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
let CITY = 'London'; // Default city

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
    case 'sunny': return '#FFFF00'; // Yellow
    case 'clear': return '#87CEEB'; // Sky Blue
    case 'partly cloudy': return '#C0C0C0'; // Silver
    case 'cloudy': return '#808080'; // Gray
    case 'overcast': return '#708090'; // Slate Gray
    case 'rainy': case 'light rain': case 'moderate rain': return '#0000FF'; // Blue
    case 'heavy rain': return '#00008B'; // Dark Blue
    case 'thunderstorm': return '#800080'; // Purple
    case 'snowy': return '#FFFFFF'; // White
    default: return '#00FF00'; // Green (default)
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/set-city', (req, res) => {
  CITY = req.body.city;
  res.redirect('/');
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('colorChange', (color) => {
    console.log('Color changed to:', color);
    io.emit('updateColor', color);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Update weather every 5 minutes
setInterval(async () => {
  const weatherCondition = await getWeatherData(CITY);
  if (weatherCondition) {
    const color = getColorForWeather(weatherCondition);
    io.emit('updateColor', color);
    console.log(`Weather in ${CITY}: ${weatherCondition}, Color: ${color}`);
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
