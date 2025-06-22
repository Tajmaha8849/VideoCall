import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "http://192.168.137.1:5173","http://172.16.0.2:5173"],
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store rooms and users
const rooms = new Map();
const users = new Map();

// Generate unique room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Socket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create room
  socket.on('create-room', (userData) => {
    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      host: socket.id,
      users: new Map(),
      createdAt: Date.now()
    };
    
    room.users.set(socket.id, {
      id: socket.id,
      name: userData.name,
      isHost: true
    });
    
    rooms.set(roomCode, room);
    users.set(socket.id, { roomCode, name: userData.name });
    
    socket.join(roomCode);
    socket.emit('room-created', { 
      roomCode, 
      isHost: true,
      users: Array.from(room.users.values())
    });
    
    console.log(`Room ${roomCode} created by ${userData.name}`);
  });

  // Join room
  socket.on('join-room', (data) => {
    const { roomCode, name } = data;
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.users.size >= 4) { // Limit to 4 users per room
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    
    room.users.set(socket.id, {
      id: socket.id,
      name: name,
      isHost: false
    });
    
    users.set(socket.id, { roomCode, name });
    socket.join(roomCode);
    
    // Get updated user list
    const userList = Array.from(room.users.values());
    
    // Notify existing users about new user
    socket.to(roomCode).emit('user-joined', {
      user: { id: socket.id, name },
      users: userList
    });
    
    // Send current room state to new user
    socket.emit('room-joined', { 
      roomCode, 
      users: userList,
      isHost: false 
    });
    
    console.log(`${name} joined room ${roomCode}. Total users: ${userList.length}`);
  });

  // WebRTC signaling
  socket.on('offer', (data) => {
    console.log(`Offer from ${socket.id} to ${data.target}`);
    socket.to(data.target).emit('offer', {
      offer: data.offer,
      caller: socket.id
    });
  });

  socket.on('answer', (data) => {
    console.log(`Answer from ${socket.id} to ${data.target}`);
    socket.to(data.target).emit('answer', {
      answer: data.answer,
      answerer: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.target).emit('ice-candidate', {
      candidate: data.candidate,
      sender: socket.id
    });
  });

  // Translation message relay
  socket.on('translation-audio', (data) => {
    const user = users.get(socket.id);
    if (user) {
      socket.to(user.roomCode).emit('translation-audio', {
        audio: data.audio,
        language: data.language,
        sender: socket.id
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      const room = rooms.get(user.roomCode);
      if (room) {
        room.users.delete(socket.id);
        
        // Notify other users
        socket.to(user.roomCode).emit('user-left', {
          userId: socket.id,
          users: Array.from(room.users.values())
        });
        
        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(user.roomCode);
          console.log(`Room ${user.roomCode} deleted - no users remaining`);
        }
      }
      users.delete(socket.id);
    }
    
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0',() => {
  console.log(`Server running on port ${PORT}`);
});