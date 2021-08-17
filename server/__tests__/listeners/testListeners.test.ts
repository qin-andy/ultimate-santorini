import { createServer } from 'http';
import { AddressInfo } from 'net';
import { Server } from 'socket.io';
import Client, { Socket as ClientSocket } from 'socket.io-client';
import { Player } from '../../src/socket/PlayerManager';
import { Room } from '../../src/socket/room';
import { mirrorListener } from '../../src/listeners/listeners';
import { createNewClientSocketsArray } from '../helpers';

const DONE_DELAY = 100;
const IN_BETWEEN_DELAY = 100;
const CLIENTS_COUNT = 3;

describe('player manager tests', () => {
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let room: Room;
  let playerCount = 1;

  /*
    An HTTP server and a socket.io server instance are created and used
    by all the tests.

    A Room object (see room.ts) is also initialized in order to test
    the Listeners (see /listeners/) and how they are added and removed

    For these tests, socket.io server is set up such that when a new
    client socket connects with the server, they are automatically
    added to the room as a Player and given a name (e.g. 'Player 3')
  */
  beforeAll((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);
    room = new Room('Test Room');

    httpServer.listen(() => {
      io.on('connection', (socket) => {
        // increment each socket connected name
        let name = 'Player ' + playerCount;
        room.addPlayer(new Player(socket, name));
        playerCount++;
      });
      port = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  /*
    Teardown: Close the server, each clientsocket, and the room
    If there's a memory leak, this should be the first place to look
  */
  afterAll(() => {
    io.close();
    clientSockets.forEach((clientSocket) => {
      clientSocket.close();
    });
    room.close();
    if (global.gc) { global.gc() }
  });

  /*
    An array of multiple client sockets is used to verify that events
    on the server sockets are being managed correctly. These are stored
    in the clientSockets object (see helpers.ts)
  */
  beforeEach(async () => {
    room = new Room('Test Room');
    clientSockets = await createNewClientSocketsArray(port, CLIENTS_COUNT);
    playerCount = 1;
  });

  afterEach((done) => {
    clientSockets.forEach((socket) => socket.close());
    room.close();
    setTimeout(done, IN_BETWEEN_DELAY);
  });

  describe('room listener management infrastructure tests with mirror', () => {
    // only tests a single clientsocket
    it('add mirror listener', async () => {
      room.addListenerToAll(mirrorListener);
      let mirroredPromise = new Promise<string>((resolve, reject) => {
        const mirrorNotifier = (message: string) => {
          resolve(message);
        }
        clientSockets[0].emit('mirror', 'mirrored message', mirrorNotifier);
      });
      expect(await mirroredPromise).toBe('mirrored message');;
    });

    it('multiple add mirror listeners should duplicate message', async () => {
      // only tests a single clientsocket
      room.addListenerToAll(mirrorListener);
      room.addListenerToAll(mirrorListener);
      room.addListenerToAll(mirrorListener);
      let mirroredPromises: Promise<string>[] = [];
      for (let i = 0; i < 3; i++) {
        mirroredPromises.push(new Promise<string>((resolve, reject) => {
          const mirrorNotifier = (message: string) => {
            resolve(message);
          }
          clientSockets[0].emit('mirror', 'mirrored message', mirrorNotifier);
        }));
      }
      expect(await Promise.all(mirroredPromises)).toEqual(
        expect.arrayContaining(['mirrored message', 'mirrored message', 'mirrored message'])
      );
    });

    it('add then remove mirror listener', () => {
      // only tests a single clientsocket
      let mirroredPromise = new Promise<void>((resolve, reject) => {
        const mirrorNotifier = (message: string) => {
          reject('wrongfully acknowledged!');
        }
        room.addListenerToAll(mirrorListener);
        room.removeListenerFromAll(mirrorListener);
        clientSockets[0].emit('mirror', 'mirrored message', mirrorNotifier);
        setTimeout(resolve, DONE_DELAY);
      });
      return mirroredPromise;
    });

    it('multiple add then remove mirror listener, but finally removed', () => {
      // only tests a single clientsocket
      room.addListenerToAll(mirrorListener);
      let mirroredPromise = new Promise<void>((resolve, reject) => {
        const mirrorNotifier = (message: string) => {
          reject('wrongfully notified and acknowledged!');
        }
        for (let i = 0; i < 20; i++) {
          room.addListenerToAll(mirrorListener);
          room.removeListenerFromAll(mirrorListener);
        }
        clientSockets[0].emit('mirror', 'mirrored message', mirrorNotifier);
        setTimeout(resolve, DONE_DELAY);
      });
      return mirroredPromise;
    });

    it('multiple add then remove mirror listener, but finally added', async () => {
      // only tests a single clientsocket
      let mirroredPromise = new Promise<string>((resolve, reject) => {
        const mirrorNotifier = (message: string) => {
          resolve(message);
        }
        for (let i = 0; i < 20; i++) {
          room.addListenerToAll(mirrorListener);
          room.removeListenerFromAll(mirrorListener);
        }
        room.addListenerToAll(mirrorListener);
        clientSockets[0].emit('mirror', 'mirrored message', mirrorNotifier);
      });
      expect(await mirroredPromise).toBe('mirrored message');;
    });

    it('multiple room creates and mirror listener tests', () => {
      return new Promise<void>(async (superResolve, superReject) => {
        for (let i = 0; i < 10; i++) {
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
              const mirrorNotifier = (message: string) => {
                expect(message).toBe('mirrored message');
                resolve();
              }
              clientSocket.emit('mirror', 'mirrored message', mirrorNotifier);
            });
          });
          await Promise.all(mirroredPromises);
        }
        superResolve();
      });
    });
  });
});