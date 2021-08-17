import { createServer } from 'http';
import { AddressInfo } from 'net';
import { Server } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { Player } from '../../src/socket/PlayerManager';
import { Room } from '../../src/socket/room';
import { createNewClientSocketsArray } from '../helpers';
import { getPlayerListAcknowledger, roomNameAcknowledger } from '../../src/listeners/lobbyListeners';

const DONE_DELAY = 100;
const IN_BETWEEN_DELAY = 100;
const CLIENTS_COUNT = 3; // DO NOT CHANGE FOR THIS TEST SUITE

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

  describe('info getters', () => {
    it('room name gets room name', async () => {
      let roomNamePromise = new Promise<string>((resolve, reject) => {
        clientSockets[0].emit('get room name', null, resolve);
      });
      room.addListenerToAll(roomNameAcknowledger);
      expect(await roomNamePromise).toBe('Test Room');
    });

    it('room name gets room name 2', async () => {
      room.name = 'Room Name 2'
      let roomNamePromise = new Promise<string>((resolve, reject) => {
        clientSockets[0].emit('get room name', null, resolve);
      });
      room.addListenerToAll(roomNameAcknowledger);
      expect(await roomNamePromise).toBe('Room Name 2');
    });

    it.skip('get player names', () => {
      room.addListenerToAll(getPlayerListAcknowledger);
      let playerListPromise = new Promise<string[]>((resolve, reject) => {
        clientSockets[0].emit('get room name', null, resolve);
      });
    });
  });

});