const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket'],
    allowEIO3: true
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('audioData', (data) => {
        const intensity = Math.min(Math.max(data.intensity || 0, 0), 100);
        const color = calculateColor(intensity);
        io.emit('updateColor', color);
        console.log('Audio intensity:', intensity);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

function calculateColor(intensity) {
    const r = Math.floor((intensity / 100) * 57);
    const g = Math.floor((intensity / 100) * 57);
    const b = 198;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
