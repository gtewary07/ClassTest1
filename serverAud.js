const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Create Express and Socket.IO instances
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e8,
    path: '/socket.io'
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('Server is running');
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Send initial connection confirmation
    socket.emit('connect_confirmed', { status: 'connected', id: socket.id });

    // Handle audio data
    socket.on('audioData', (data) => {
        try {
            const intensity = data.intensity;
            const r = Math.floor((intensity / 100) * 255);
            const g = Math.floor((intensity / 100) * 255);
            const b = 255 - r;
            const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            io.emit('updateColor', { color: color });
        } catch (error) {
            console.error('Error processing audio data:', error);
        }
    });

    // Handle ping messages
    socket.on('ping', () => {
        socket.emit('pong');
    });

    // Handle color change events
    socket.on('colorChange', (color) => {
        io.emit('updateColor', { color: color });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
        console.error(`Socket error for client ${socket.id}:`, error);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
