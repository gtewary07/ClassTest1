const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e8
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('Server is running');
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle audio data
    socket.on('audioData', (data) => {
        try {
            console.log('Received audio data:', data);
            const intensity = Math.min(Math.max(data.intensity, 0), 100);
            
            // Convert intensity to color
            const r = Math.floor((intensity / 100) * 255);
            const g = Math.floor((intensity / 100) * 255);
            const b = 255 - Math.floor((intensity / 100) * 255);
            
            const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            console.log('Emitting color:', color);
            io.emit('updateColor', color);
        } catch (error) {
            console.error('Error processing audio data:', error);
        }
    });

    // Handle manual color changes
    socket.on('colorChange', (color) => {
        console.log('Manual color change:', color);
        io.emit('updateColor', color);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
