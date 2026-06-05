const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Session = require('./models/Session');
const User = require('./models/User');
require('dotenv').config();

// ─── Global crash guards ─────────────────────────────────────────────────────
// Node 18+: unhandled rejections exit with code 1 by default (silently in concurrently).
// Catch them here so the server NEVER crashes due to a single bad async handler.
process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER] Unhandled Promise Rejection:', reason);
  // Do NOT exit — just log. Individual request errors should never kill the server.
});
process.on('uncaughtException', (err) => {
  console.error('[SERVER] Uncaught Exception:', err);
  // Only exit for truly fatal errors (e.g. out-of-memory)
  if (err.code !== 'EADDRINUSE') process.exit(1);
});

// ─── CORS ────────────────────────────────────────────────────────────────────
// Allow localhost (any port), any *.vercel.app preview/production URL,
// any *.onrender.com URL (for Render preview environments), and FRONTEND_URL env var.
const ALLOWED_ORIGINS = [
  'https://csp-phi-one.vercel.app', // explicit production Vercel domain
];

const corsOriginFn = (origin, callback) => {
  try {
    if (!origin) return callback(null, true); // curl, Postman, server-to-server
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (origin.endsWith('.onrender.com')) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return callback(null, true);
    // Block everything else
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(null, false);
  } catch (e) {
    return callback(null, false);
  }
};

const corsOptions = {
  origin: corsOriginFn,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};

// ─── App & Server ────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOriginFn,
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

app.set('io', io);
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/verify',        require('./routes/verify'));
app.use('/api/mentors',       require('./routes/mentors'));
app.use('/api/sessions',      require('./routes/sessions'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/doubts',        require('./routes/doubt'));
app.use('/api/results',       require('./routes/results'));

// ─── Socket.IO ───────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('register-user', (userId) => {
    try {
      socket.join(`user-${userId}`);
      console.log(`Socket ${socket.id} registered to user-${userId}`);
    } catch (e) {
      console.error('[Socket] register-user error:', e.message);
    }
  });

  // Wrap the entire join-room handler in try/catch — async errors are not
  // auto-caught by Socket.IO and become unhandled rejections in Node 18+
  socket.on('join-room', async (roomId, tokenOrUserId) => {
    try {
      let userId = tokenOrUserId;
      let role = null;
      let sessionId = null;

      if (tokenOrUserId && tokenOrUserId.includes('.')) {
        try {
          const decoded = jwt.verify(tokenOrUserId, process.env.JWT_SECRET || 'secret');
          userId = decoded.userId;
          role = decoded.role;
          sessionId = decoded.sessionId;
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
            if (role === 'mentor')        session.attendance.mentorJoinedAt = new Date();
            else if (role === 'student')  session.attendance.studentJoinedAt = new Date();
            await session.save();
            console.log(`Saved join time for ${role} (${userId}) in session ${sessionId}`);
          }
        } catch (e) {
          console.error('Error logging join time in DB:', e.message);
        }
      }

      socket.on('offer',         (data) => socket.to(roomId).emit('offer', data));
      socket.on('answer',        (data) => socket.to(roomId).emit('answer', data));
      socket.on('ice-candidate', (data) => socket.to(roomId).emit('ice-candidate', data));

      socket.on('ghost-detected', async (data) => {
        try {
          socket.to(roomId).emit('peer-ghost-detected', data);
          if (data.isGhosting && socket.sessionId && socket.userId) {
            const session = await Session.findById(socket.sessionId);
            if (session) {
              session.ghostDetectionEvents.push({
                userId: socket.userId,
                timestamp: new Date(),
                type: 'focus_loss'
              });
              await session.save();
              console.log(`Logged focus loss for ${socket.role} in session ${socket.sessionId}`);
            }
          }
        } catch (e) {
          console.error('Error in ghost-detected handler:', e.message);
        }
      });

      socket.on('disconnect', async () => {
        try {
          socket.to(roomId).emit('user-disconnected', userId);
          if (socket.sessionId && socket.role) {
            const session = await Session.findById(socket.sessionId);
            if (session) {
              if (socket.role === 'mentor' && !session.attendance.mentorLeftAt) {
                session.attendance.mentorLeftAt = new Date();
              } else if (socket.role === 'student' && !session.attendance.studentLeftAt) {
                session.attendance.studentLeftAt = new Date();
              }
              await session.save();
              console.log(`Saved leave time for ${socket.role} in session ${socket.sessionId}`);
            }
          }
        } catch (e) {
          console.error('Error in disconnect handler:', e.message);
        }
      });

    } catch (e) {
      console.error('[Socket] join-room error:', e.message);
    }
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} is already in use.`);
    console.error(`    Fix: npx kill-port ${PORT}  OR  taskkill /F /PID <pid>\n`);
    process.exit(1);
  }
  // All other server errors: log but don't crash
  console.error('[SERVER] Server error:', err.message);
});

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/peerlearn')
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('[SERVER] MongoDB connection failed:', err.message);
    process.exit(1);
  });
