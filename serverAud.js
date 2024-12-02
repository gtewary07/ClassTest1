const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const ytdl = require('ytdl-core');

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
app.use(express.json());

app.post('/process-youtube', async (req, res) => {
  try {
    const { youtubeUrl } = req.body;
    const audioStream = ytdl(youtubeUrl, { 
      filter: 'audioonly',
      quality: 'lowestaudio'
    });

    let lastUpdate = Date.now();
    const updateInterval = 100; // 100ms between color updates

    audioStream.on('data', (chunk) => {
      const now = Date.now();
      if (now - lastUpdate >= updateInterval) {
        const amplitude = Math.abs(chunk.reduce((acc, val) => acc + val, 0) / chunk.length);
        const normalizedAmplitude = Math.min(amplitude / 128, 1);
        
        const color = calculateColor(normalizedAmplitude);
        io.emit('updateColor', color);
        lastUpdate = now;
      }
    });

    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function calculateColor(amplitude) {
  const hue = amplitude * 360;
  const rgb = hslToRgb(hue/360, 1, 0.5);
  return `#${rgb.map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
