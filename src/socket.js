import { io } from 'socket.io-client';
import { handleRoomCreated, handleJoinedRoom, handleGameUpdate, handleError, updateOnlineUsers } from './main.js';

let socket = null;

export function initSocket() {
  // Connect to the same host using socket.io endpoint
  socket = io(import.meta.env.VITE_SERVER_URL);

  socket.on('connect', () => {
    console.log('Connected to server', socket.id);
  });

  socket.on('room_created', handleRoomCreated);
  socket.on('joined_room', handleJoinedRoom);
  socket.on('game_update', handleGameUpdate);
  socket.on('error_msg', handleError);
  socket.on('online_users', updateOnlineUsers);

  return socket;
}

export function createRoom(rows, numPlayers) {
  if (socket) socket.emit('create_room', { rows, numPlayers });
}

export function joinRoom(roomId) {
  if (socket) socket.emit('join_room', roomId);
}

export function joinPublic(rows, numPlayers) {
  if (socket) socket.emit('join_public', { rows, numPlayers });
}

export function makeMove(roomId, index) {
  if (socket) socket.emit('make_move', { roomId, index });
}

export function getSocketId() {
  return socket?.id;
}
