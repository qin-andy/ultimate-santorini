import { io } from "socket.io-client";

// const socket = io(''); // intentionally blank
const socket = io('http://localhost:3001');

export const joinGame = (name: string) => { // TODO : timeouts?
  return new Promise<any>(resolve => {
    socket.emit('manager action', 'join game', name, resolve);
  });
}

export const leaveGame = (name: string) => { // TODO : timeouts?
  return new Promise<any>(resolve => {
    socket.emit('manager action', 'leave game', name, resolve);
  });
}

export const createGame = (name: string) => {
  return new Promise<any>(resolve => {
    let payload = { name, type: 'tictactoe', autoplay: true }
    socket.emit('manager action', 'create game', payload, resolve);
  });
}

export const getPlayerInfo = () => {
  return new Promise<any>(resolve => {
    socket.emit('manager action', 'player info', null, resolve);
  });
}

export const joinQueue = () => {
  return new Promise<any>(resolve => {
    socket.emit('manager action', 'join queue', null, resolve);
  });
}

export const tictactoeStart = () => {
  return new Promise<void>(resolve => {
    socket.emit('game action', 'tictactoe start');
    resolve();
  });
}

export const tictactoeMark = (x: number, y: number) => {
  return new Promise<void>(resolve => {
    socket.emit('game action', 'tictactoe mark', { x, y });
    resolve();
  });
}


export default socket;