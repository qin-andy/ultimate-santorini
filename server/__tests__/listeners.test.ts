import { createServer } from 'http';
import { AddressInfo } from 'net';
import { Server, Socket as ServerSocket } from 'socket.io';
import Client, { Socket as ClientSocket } from 'socket.io-client';
import { Player } from '../src/socket/PlayerManager';
import { Room } from '../src/socket/room';
import { mirrorListener, roomInfoListener } from '../src/listeners/lobbyListeners';

// UNFINISHED IN THIS COMMIT!

describe('player manager tests', () => {
  const DONE_DELAY = 100;
  const IN_BETWEEN_DELAY = 100;
  const CLIENTS_COUNT = 5;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let room: Room;
  let count = 1;

  beforeAll((done) => {
    // create room
    room = new Room('Test Room');
    clientSockets = [];

    // create server instance
    const httpServer = createServer();
    io = new Server(httpServer);

    // once server is listening
    httpServer.listen(() => {
      io.on('connection', (socket) => {
        // increment each socket connected name
        let name = 'Player ' + count;
        room.addPlayer(new Player(socket, name));
        count++;
      });
      port = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  afterAll(() => {
    io.close();
    clientSockets.forEach((clientSocket) => {
      clientSocket.close();
    });
    room.close();
  });

  beforeEach((done) => {
    let connectedCount = 0; // track number of connected sockets

    // Create CLIENTs_COUNT new sockets and store them in clientSockets
    for (let i = 0; i < CLIENTS_COUNT; i++) {
      let clientSocket = Client(`http://localhost:${port}`);
      clientSockets.push(clientSocket);
      clientSocket.on('connect', () => {
        connectedCount++;
        if (connectedCount === CLIENTS_COUNT) {
          setTimeout(done, IN_BETWEEN_DELAY); // finish once all sockets are connected
        }
      });
    }
    count = 1;
  });

  afterEach((done) => {
    clientSockets.forEach((socket) => socket.close());
    clientSockets = [];
    room.close();
    room = new Room('Test Room');

    setTimeout(done, IN_BETWEEN_DELAY);
  });

  it('smoh', () => {
    expect(true).toBe(true);
  });

  it('add mirror listener', (done) => {
    room.addListenerToAll(mirrorListener);
    clientSockets[0].on('mirror', (data) => {
      try {
        expect(data).toBe('test message');
        done();
      } catch (err) {
        done(err);
      }
    });
    clientSockets[0].emit('mirror', 'test message');
  });

  it('multiple room creates', async (done) => {
    for (let i = 0; i < 500; i++) {

      clientSockets.forEach((socket) => socket.close());
      clientSockets = [];
      room.close();
      room = new Room('Test Room');

      let connectPromises = [];
      for (let i = 0; i < CLIENTS_COUNT; i++) {
        let connectPromise = new Promise<void>((resolve, reject) => {
          let clientSocket = Client(`http://localhost:${port}`);
          clientSocket.on('connect', () => {
            clientSockets.push(clientSocket);
            resolve();
          });
        });
        connectPromises.push(connectPromise);
      };
      await Promise.all(connectPromises);
      room.addListenerToAll(mirrorListener);

      let mirroredPromises = clientSockets.map((clientSocket) => {
        return new Promise<void>((resolve, reject) => {
          clientSocket.on('mirror', (data) => {
            expect(data).toBe('test message');
            resolve();
          });
        });
      });
      clientSockets.forEach((clientSocket) => {
        clientSocket.emit('mirror', 'test message');
      });
      await Promise.all(mirroredPromises);
    }
    done();
  });
});