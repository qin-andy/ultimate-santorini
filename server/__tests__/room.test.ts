import { createServer } from 'http';
import { AddressInfo } from 'net';
import { Server, Socket as ServerSocket } from 'socket.io';
import Client, { Socket as ClientSocket } from 'socket.io-client';
import { Player } from "../src/socket/PlayerManager";
import { Room } from '../src/socket/room';
import { createNewClientSocketsArray } from './helpers';

describe('player manager tests', () => {
  const DONE_DELAY = 100;
  const IN_BETWEEN_DELAY = 100;
  const CLIENTS_COUNT = 5;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let room: Room;
  let playerCount: number;

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

  afterAll(() => {
    io.close();
    clientSockets.forEach((clientSocket) => {
      clientSocket.close();
    });
    room.close();
  });

  beforeEach(async () => {
    room = new Room('Test Room');
    playerCount = 1; // incremented when players connect
    clientSockets = await createNewClientSocketsArray(port, CLIENTS_COUNT);
  });

  afterEach((done) => {
    clientSockets.forEach((socket) => socket.close());
    room.close();
    setTimeout(done, IN_BETWEEN_DELAY);
  });

  describe('basic room info', () => {
    it('get room name returns room name', () => {
      expect(room.getRoomName()).toBe('Test Room');
    });

    it('get player names matches client names', () => {
      let expectedNames: string[] = [];
      for (let count = 0; count < CLIENTS_COUNT; count++) {
        // Assuming names are ordered
        expectedNames.push('Player ' + (count + 1));
      }
      expect(room.getPlayerNames()).toEqual(expect.arrayContaining(expectedNames));
    });

    it('get player ids matches client ids', () => {
      let expectedIds = clientSockets.map((clientSocket) => {
        return clientSocket.id;
      });
      expect(room.getPlayerIds()).toEqual(expect.arrayContaining(expectedIds));
    });
  });

  describe('adding and removing players', () => {
    it('add player adds new player', (done) => {
      let newClientSocket = Client(`http://localhost:${port}`);
      let expectedNames: string[] = [];
      for (let count = 0; count < CLIENTS_COUNT + 1; count++) {
        // Assuming names are ordered
        expectedNames.push('Player ' + (count + 1));
      }
      newClientSocket.on('connect', () => {
        try {
          expect(room.getPlayerNames()).toEqual(expect.arrayContaining(expectedNames));
          done();
        } catch (err) {
          done(err)
        }
      });
    });

    it('remove player removes player', () => {
      // DOUBLE CHECK THIS; does disconnecting this client socket cause any issues in teardown?
      let removedName = room.removePlayer(clientSockets[0].id).getName();
      expect(room.getPlayerNames()).not.toEqual(expect.arrayContaining([removedName]));
    });

    it('remove same player twice throws error', () => {

      room.removePlayer(clientSockets[0].id);
      expect(() => room.removePlayer(clientSockets[0].id)).toThrowError();
    });

    it('remove nonexistent player throws error', () => {
      expect(() => room.removePlayer('invalid player name')).toThrowError();
    });
  });

  // Host tests start with empty room. Could I scope out the clientSockets
  // initialization and avoid having to close and reinitialize room every time?
  describe('host management', () => {
    it('room is created with host', () => {
      expect(room.getHost()).toBeTruthy();
    });

    it('empty room has no host', () => {
      room.close();
      room = new Room('Hostless Room');
      expect(room.host).toBe(null);
    });

    it('get host with no host throws no host error', () => {
      room.close();
      room = new Room('Hostless Room');
      expect(() => { room.getHost() }).toThrow('room Hostless Room has no host!');
    });

    it('adding player to empty room makes them the host', (done) => {
      room.close();
      room = new Room('Hostless Room');
      let newClientSocket = Client(`http://localhost:${port}`);
      newClientSocket.on('connect', () => {
        try {
          // Compares client socket id to server player id;
          expect(room.getHost().getId()).toBe(newClientSocket.id);
          done();
        }
        catch (err) {
          done(err);
        }
      });
    });

    it('removing host replaces host with another player', (done) => {
      // empty room -> host player and new player -> remove host -> check if new player is host
      room.close();
      room = new Room('Hostled Room');
      let hostSocket = Client(`http://localhost:${port}`);

      // trying to mitigate pyramid of doom
      const removeHostCallback = (newSocket: ClientSocket) => {
        try {
          room.removePlayer(hostSocket.id);
          expect(room.getHost().getId()).toBe(newSocket.id);
          done();
        } catch (err) {
          done(err);
        }
      }

      hostSocket.on('connect', () => { // TODO: fix pyramid of doom
        let newSocket = Client(`http://localhost:${port}`);
        newSocket.on('connect', () => removeHostCallback(newSocket));
      });
    });

    it('close room removes host', () => {
      room.close();
      expect(() => { room.getHost() }).toThrow('room Test Room has no host!');
    });
  });

  describe('listener management', () => {
    it('close room disconnects all sockets', async () => {
      let disconnectPromises = clientSockets.map((clientSocket) => {
        return new Promise<void>((resolve, reject) => {
          clientSocket.on('disconnect', () => {
            resolve();
          });
        });
      });
      room.close();
      await Promise.all(disconnectPromises);
    });
  });
});