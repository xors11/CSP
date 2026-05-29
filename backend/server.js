const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Session = require('./models/Session');
const User = require('./models/User');
require('dotenv').config();

// Allow requests from the Vercel frontend URL (set FRONTEND_URL in Railway env vars)
const ALLOWED_ORIGINS = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001']
  : ['http://localhost:3000', 'http://localhost:3001'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

app.set('io', io);

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Routes
const authRoutes = require('./routes/auth');
const verifyRoutes = require('./routes/verify');
const mentorsRoutes = require('./routes/mentors');
const sessionsRoutes = require('./routes/sessions');
const notificationsRoutes = require('./routes/notifications');
const doubtRoutes = require('./routes/doubt');

app.use('/api/auth', authRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/mentors', mentorsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/doubts', doubtRoutes);

// Socket.IO Logic
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('register-user', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`Socket ${socket.id} registered to user-${userId}`);
  });

  socket.on('join-room', async (roomId, tokenOrUserId) => {
    let userId = tokenOrUserId;
    let role = null;
    let sessionId = null;

    // Check if tokenOrUserId is a JWT token (signified by dots)
    if (tokenOrUserId && tokenOrUserId.includes('.')) {
      try {
        const decoded = jwt.verify(tokenOrUserId, process.env.JWT_SECRET || 'secret');
        userId = decoded.userId;
        role = decoded.role;
        sessionId = decoded.sessionId;
        
        // Save values in socket object for use during disconnect/ghost events
        socket.userId = userId;
        socket.role = role;
        socket.sessionId = sessionId;
        socket.roomId = roomId;
      } catch (err) {
        console.error('Socket authentication failed:', err.message);
        socket.emit('error-msg', 'Invalid session authentication.');
        return;
      }
    }

    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);
    console.log(`User ${userId} joined room ${roomId} as ${role || 'guest'}`);

    // Update join timestamp in DB
    if (sessionId && role && userId) {
      try {
        const session = await Session.findById(sessionId);
        if (session) {
          if (role === 'mentor') {
            session.attendance.mentorJoinedAt = new Date();
          } else if (role === 'student') {
            session.attendance.studentJoinedAt = new Date();
          }
          await session.save();
          console.log(`Saved join time for ${role} (${userId}) in session ${sessionId}`);
        }
      } catch (e) {
        console.error('Error logging join time in DB:', e);
      }
    }

    socket.on('offer', (data) => socket.to(roomId).emit('offer', data));
    socket.on('answer', (data) => socket.to(roomId).emit('answer', data));
    socket.on('ice-candidate', (data) => socket.to(roomId).emit('ice-candidate', data));
    
    socket.on('ghost-detected', async (data) => {
      // Broadcast to other peers
      socket.to(roomId).emit('peer-ghost-detected', data);
      
      // If ghosting is active, log focus loss event in DB
      if (data.isGhosting && socket.sessionId && socket.userId) {
        try {
          const session = await Session.findById(socket.sessionId);
          if (session) {
            session.ghostDetectionEvents.push({
              userId: socket.userId,
              timestamp: new Date(),
              type: 'focus_loss'
            });
            await session.save();
            console.log(`Logged focus loss event for ${socket.role} (${socket.userId}) in session ${socket.sessionId}`);
          }
        } catch (e) {
          console.error('Error logging focus loss event:', e);
        }
      }
    });

    socket.on('disconnect', async () => {
      socket.to(roomId).emit('user-disconnected', userId);
      
      // Update leave timestamp in DB
      if (socket.sessionId && socket.role) {
        try {
          const session = await Session.findById(socket.sessionId);
          if (session) {
            if (socket.role === 'mentor' && !session.attendance.mentorLeftAt) {
              session.attendance.mentorLeftAt = new Date();
            } else if (socket.role === 'student' && !session.attendance.studentLeftAt) {
              session.attendance.studentLeftAt = new Date();
            }
            await session.save();
            console.log(`Saved leave time for ${socket.role} (${socket.userId}) in session ${socket.sessionId}`);
          }
        } catch (e) {
          console.error('Error logging leave time in DB:', e);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/peerlearn')
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.log(err));
