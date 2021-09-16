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

export const tictactoeStart = () => {
  socket.emit('game action', 'tictactoe start');
}

export const tictactoeMark = (x: number, y: number) => {
  socket.emit('game action', 'tictactoe mark', { x, y });
}

export default socket;