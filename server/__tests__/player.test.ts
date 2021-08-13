import { createServer } from 'http';
import { AddressInfo } from 'net';
import { Server, Socket as ServerSocket } from 'socket.io';
import Client, { Socket as ClientSocket } from 'socket.io-client';
import { Player } from "../src/socket/PlayerManager";

describe('player class testing', () => {
  let io: Server, serverSocket: ServerSocket, clientSocket: ClientSocket;
  let player1: Player;

  beforeAll((done) => {
    // Create socket server
    const httpServer = createServer();
    io = new Server(httpServer);

    // Once the server is listening
    httpServer.listen(() => {
      // store client socket
      const port = (httpServer.address() as AddressInfo).port;
      clientSocket = Client(`http://localhost:${port}`);

      // store server socket
      io.on('connection', (socket) => {
        serverSocket = socket;
        player1 = new Player(socket, 'Player 1');
      });

      // create player for a socket once connected
      clientSocket.on('connect', () => {
        done();
      });
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
  });

  it('get player name', () => {
    expect(player1.getName()).toBe('Player 1');
  });

  it('set player name', () => {
    player1.setName('Player 2')
    expect(player1.getName()).toBe('Player 2');
  });

  it('get player socket id', () => {
    let socketId = serverSocket.id;
    expect(player1.getSocketId()).toBe(socketId);
  });
});