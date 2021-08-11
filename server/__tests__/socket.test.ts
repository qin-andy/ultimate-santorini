import { createServer } from 'http';
import { AddressInfo } from 'net';
import { Server, Socket as ServerSocket } from 'socket.io';
import Client, { Socket as clientSocket } from 'socket.io-client';
import { testHandlers } from '../src/socket/socket';

describe('single socket handlers', () => {
  let io: Server, serverSocket: ServerSocket, clientSocket: clientSocket;

  beforeAll((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);
    httpServer.listen(() => {
      const port = (httpServer.address() as AddressInfo).port;
      clientSocket = Client(`http://localhost:${port}`);
      io.on('connection', (socket) => {
        serverSocket = socket;
        testHandlers(io, serverSocket);
      });
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
  });

  test('chat message status is 200', (done) => {
    clientSocket.once('status', (code) => {
      try {
        expect(code).toBe(200);
        done();
      } catch (err) {
        done(err);
      }
    });
    clientSocket.emit('chat message', 'Hello, world!');
  });
});

