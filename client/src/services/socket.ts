import { io } from "socket.io-client";

// const socket = io(''); // intentionally blank
const socket = io('http://localhost:3001');

export const joinGame = (name: string) => { // TODO : timeouts?
  return new Promise<boolean>(resolve => {
    socket.emit('join game', name, resolve);
  });
}

export const createGame = (name: string) => {
  return new Promise<boolean>(resolve => {
    socket.emit('create game', name, 'tictactoe', resolve);
  });
}

socket.onAny((...args) => {
  console.log(...args);
});

export default socket;