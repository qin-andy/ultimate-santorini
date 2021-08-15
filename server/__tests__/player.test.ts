import { createServer } from 'http';
import { AddressInfo } from 'net';
import { Server, Socket as ServerSocket } from 'socket.io';
import Client, { Socket as ClientSocket } from 'socket.io-client';
import { Player } from "../src/socket/PlayerManager";

describe('player class testing', () => {
  let io: Server, serverSocket: ServerSocket, clientSocket: ClientSocket;
  let player1: Player;
  let port: number;
  const DONE_TIMEOUT = 300;

  beforeAll((done) => {
    try {
      // Create socket server
      const httpServer = createServer();
      io = new Server(httpServer);

      // Once the server is listening
      httpServer.listen(() => {
        // store client socket
        port = (httpServer.address() as AddressInfo).port;

        // store server socket
        io.on('connection', (socket) => {
          serverSocket = socket;
          player1 = new Player(socket, 'Player 1');
        });
        done();
      });
    } catch (err) {
      done(err);
    }
  });

  afterAll(() => {
    io.close();
  });

  beforeEach((done) => {
    clientSocket = Client(`http://localhost:${port}`);
    clientSocket.on('connect', () => {
      done();
    });
  });

  afterEach(() => {
    clientSocket.close();
  });

  describe('get info', () => {
    it('get player name', () => {
      expect(player1.getName()).toBe('Player 1');
    });

    it('set player name', () => {
      player1.setName('Player 2')
      expect(player1.getName()).toBe('Player 2');
    });

    it('get player socket id', () => {
      let socketId = serverSocket.id;
      expect(player1.getId()).toBe(socketId);
    });
  });

  describe('adding and removing listseners', () => {
    it('add listener', (done) => {
      const listener = (data: any) => {
        try {
          expect(data).toBe('test message');
          done();
        } catch (err) {
          done(err);
        }
      }
      player1.addListener('test', listener);
      clientSocket.emit('test', 'test message');
    });

    it('remove listener no longer listens to event', (done) => {
      let timer = setTimeout(done, DONE_TIMEOUT);
      const listener = (data: any) => {
        clearTimeout(timer);
        done('listener still picked up test event!');
      }
      player1.addListener('test', listener);
      player1.removeListener('test');
      clientSocket.emit('test', 'test message');
    });

    it('disconnecting player', (done) => {
      try {
        expect(serverSocket.connected).toBe(true);
        player1.disconnect();
        clientSocket.on('disconnect', () => {
          done();
        });
      } catch (err) {
        done(err)
      }
    });
  });
});