import { createServer } from 'http';
import { AddressInfo } from 'net';
import { Server, Socket as ServerSocket } from 'socket.io';
import Client, { Socket as ClientSocket } from 'socket.io-client';
import { Player } from "../src/socket/PlayerManager";
import { createClientSockets, createSocketPairs, createSocketServer } from './helpers';

describe('player class testing', () => {
  let io: Server, serverSocket: ServerSocket, clientSocket: ClientSocket;
  let player1: Player;
  let port: number;
  const DONE_TIMEOUT = 300;

  beforeAll(async () => {
    [io, port] = await createSocketServer();
    io.on('connect', (socket) => {
      player1 = new Player(socket, 'Player 1');
    });
  });

  afterAll(() => {
    io.close();
  });

  beforeEach(async () => {
    let socketPair = (await createSocketPairs(io, port, 1));
    clientSocket = socketPair[0][0];
    serverSocket = socketPair[1][0];
  });

  afterEach(() => {
    serverSocket.removeAllListeners();
    clientSocket.close();
  });

  describe('get info', () => {
    it('get player name', () => {
      expect(player1.name).toBe('Player 1');
    });

    it('get player socket id', () => {
      let socketId = serverSocket.id;
      expect(player1.id).toBe(socketId);
    });
  });
});