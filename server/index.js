import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GameRoom } from './game.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const PORT = 3000;

// Store active games
const games = new Map();

function generateInitialId() {
  return Math.random().toString(36).substring(2, 8);
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  io.emit('online_users', io.engine.clientsCount);

  socket.on('create_room', ({ rows = 6, numPlayers = 2 }) => {
    const totalCircles = (rows * (rows + 1)) / 2;
    if ((totalCircles - 1) % numPlayers !== 0 || numPlayers < 2 || numPlayers > 4) {
        rows = 6; numPlayers = 2; // default fallback
    }

    const roomId = generateInitialId();
    const game = new GameRoom(roomId, rows, numPlayers);
    games.set(roomId, game);

    const playerNum = game.addPlayer(socket.id);
    socket.join(roomId);

    socket.emit('room_created', { roomId, playerNum, state: game.getState() });
  });

  socket.on('join_room', (roomId) => {
    if (!games.has(roomId)) {
      socket.emit('error_msg', 'Room not found.');
      return;
    }

    const game = games.get(roomId);
    if (game.status !== 'waiting') {
      socket.emit('error_msg', 'Room is full or game already started.');
      return;
    }

    const playerNum = game.addPlayer(socket.id);
    socket.join(roomId);

    socket.emit('joined_room', { roomId, playerNum, state: game.getState() });

    // Notify all in room
    io.to(roomId).emit('game_update', game.getState());
  });

  socket.on('join_public', ({ rows = 6, numPlayers = 2 }) => {
    const totalCircles = (rows * (rows + 1)) / 2;
    if ((totalCircles - 1) % numPlayers !== 0 || numPlayers < 2 || numPlayers > 4) {
        rows = 6; numPlayers = 2; // fallback
    }

    // try to find a waiting room with same rows
    let foundRoom = null;
    for (let [, game] of games) {
      if (game.status === 'waiting' && game.rows === rows && game.maxPlayers === numPlayers && game.players.length < numPlayers) {
        foundRoom = game;
        break;
      }
    }

    if (foundRoom) {
      const playerNum = foundRoom.addPlayer(socket.id);
      socket.join(foundRoom.id);
      socket.emit('joined_room', { roomId: foundRoom.id, playerNum, state: foundRoom.getState() });
      io.to(foundRoom.id).emit('game_update', foundRoom.getState());
    } else {
      // create new public
      const roomId = generateInitialId();
      const game = new GameRoom(roomId, rows, numPlayers);
      games.set(roomId, game);
      const playerNum = game.addPlayer(socket.id);
      socket.join(roomId);
      socket.emit('room_created', { roomId, playerNum, state: game.getState() });
    }
  });

  socket.on('make_move', ({ roomId, index }) => {
    if (!games.has(roomId)) return;
    const game = games.get(roomId);

    const result = game.makeMove(socket.id, index);
    if (result.error) {
      socket.emit('error_msg', result.error);
    } else {
      io.to(roomId).emit('game_update', game.getState());
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    io.emit('online_users', io.engine.clientsCount);
    for (let [roomId, game] of games) {
      const isPlayer = game.players.some(p => p.id === socket.id);
      if (isPlayer) {
        game.removePlayer(socket.id);
        io.to(roomId).emit('game_update', game.getState());
        io.to(roomId).emit('error_msg', 'Player left.');
        if (game.players.length === 0) {
          games.delete(roomId);
        }
        break;
      }
    }
  });
});

app.get("/", (request, response) => response.send("Nothing to do here!"));

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
