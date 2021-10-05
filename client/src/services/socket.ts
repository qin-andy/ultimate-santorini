import { io } from "socket.io-client";

const socket = io();

export const joinGame = (name: string) => {
  socket.emit('manager action', 'join game', { name });
}

export const leaveGame = () => {
  socket.emit('manager action', 'leave game', null);
}

export const createGame = (name: string) => {
  let payload = { name, type: 'tictactoe', autoplay: true }
  socket.emit('manager action', 'create game', payload);
}

export const getPlayerInfo = () => {
  socket.emit('manager action', 'player info', null);
}

export const joinQueue = () => {
  socket.emit('manager action', 'join queue', null);
}

export const joinBotGame = () => {
  socket.emit('manager action', 'join bot game', null);
}

export const santoriniStart = () => {
  socket.emit('game action', 'santorini start');
}

export const santoriniPlace = (payload: any) => {
  socket.emit('game action', 'santorini place', payload);
}

export const santoriniMove = (payload: any) => {
  socket.emit('game action', 'santorini move', payload);
}

export const santoriniWinMove = (payload: any) => {
  socket.emit('game action', 'santorini win move', payload);
}

export default socket;