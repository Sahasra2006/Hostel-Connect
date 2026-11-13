const express = require('express');
const promClient = require('prom-client');

// Initialize default system metrics collector for Prometheus
promClient.collectDefaultMetrics({ register: promClient.register });
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const Message = require('./models/Message');
const aiService = require('./services/aiService');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Security Shield Middleware Configuration
app.use(helmet({
  contentSecurityPolicy: false // Allow Vite inline scripts/canvas background assets
}));
// Express 5 query writable hack for express-mongo-sanitize compatibility
app.use((req, res, next) => {
  if (req.query) {
    Object.defineProperty(req, 'query', {
      value: { ...req.query },
      writable: true,
      configurable: true,
      enumerable: true
    });
  }
  next();
});
app.use(mongoSanitize()); // Prevent NoSQL Injection attacks

// Rate Limiting Protection (Shield against DDoS and brute-force)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs for auth routes
  message: { message: 'Too many login or change password attempts, please try again after 15 minutes.' }
});

// Apply rate limits
app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);

// Middleware
app.use(cors());
app.use(express.json());

// Basic Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running' });
});

// Prometheus Metrics Exporter Route
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// Routes — complaints receives `io` so it can emit real-time status notifications
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/complaints', require('./routes/complaints')(io));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/mess-menu', require('./routes/messMenu'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/lost-found', require('./routes/lostFound')(io));
app.use('/api/devsecops', require('./routes/devsecops'));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelconnect';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Socket.io
const activeUsers = new Map(); // socket.id -> { id, name, role }

// Socket.io Connection Shield (Enforces Authentication Handshake)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    console.error('🔌 Socket Auth Error: No token provided');
    return next(new Error('Authentication error: Token required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecretSecurityTokenKeyForJWTVerification');
    // Store decoded user info in socket object
    socket.user = decoded.user;
    next();
  } catch (err) {
    console.error('🔌 Socket Auth Error: Invalid token');
    return next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('userConnected', (user) => {
    if (user && (user.id || user._id)) {
      activeUsers.set(socket.id, user);
      io.emit('onlineUsers', Array.from(activeUsers.values()));
    }
  });

  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on('leaveRoom', (room) => {
    socket.leave(room);
    console.log(`Socket ${socket.id} left room ${room}`);
  });

  socket.on('sendMessage', async (data) => {
    try {
      if (!data.userId) return;

      // AI content moderation check
      const moderation = await aiService.moderateContent(data.text);
      if (moderation.isInappropriate) {
        socket.emit('moderationWarning', {
          message: `Your message was blocked by AI moderation. Reason: ${moderation.reason}`
        });
        return;
      }

      const User = require('./models/User');
      const sender = await User.findById(data.userId);
      const isSenderAdmin = sender && sender.role === 'admin';
      const isOfficial = isSenderAdmin && data.isOfficialNotice === true;
      const isAnonymousMsg = isOfficial ? false : (data.isAnonymous || false);

      const newMessage = new Message({
        user: data.userId,
        text: data.text,
        isAnonymous: isAnonymousMsg,
        room: data.room || 'Global',
        recipient: data.recipient || null,
        isOfficialNotice: isOfficial
      });
      await newMessage.save();

      let populatedMessage = await Message.findById(newMessage._id).populate('user', 'name role');
      
      // Convert to object to modify if anonymous
      const messageObj = populatedMessage.toObject();
      if (messageObj.isAnonymous) {
        messageObj.user = { name: 'Anonymous Resident', role: 'student' };
      }

      if (data.recipient) {
        // Direct Message — find recipient & sender sockets, emit to both
        const recipientSocketIds = [];
        const senderSocketIds = [];

        for (const [id, user] of activeUsers.entries()) {
          if (user.id === data.recipient) recipientSocketIds.push(id);
          if (user.id === data.userId) senderSocketIds.push(id);
        }

        recipientSocketIds.forEach(id => io.to(id).emit('receiveMessage', messageObj));
        senderSocketIds.forEach(id => io.to(id).emit('receiveMessage', messageObj));

        // Emit DM notification to recipient
        const senderUser = activeUsers.get(socket.id);
        recipientSocketIds.forEach(id => io.to(id).emit('newDirectMessage', {
          recipientId: data.recipient,
          senderId: data.userId,
          senderName: messageObj.isAnonymous ? 'Anonymous' : (senderUser ? senderUser.name : 'Someone')
        }));
      } else if (data.room) {
        io.to(data.room).emit('receiveMessage', messageObj);
      } else {
        io.emit('receiveMessage', messageObj);
      }
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    activeUsers.delete(socket.id);
    io.emit('onlineUsers', Array.from(activeUsers.values()));
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
