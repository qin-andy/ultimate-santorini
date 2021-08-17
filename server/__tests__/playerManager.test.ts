import { createServer } from 'http';
import { AddressInfo } from 'net';
import { Server, Socket as ServerSocket } from 'socket.io';
import Client, { Socket as ClientSocket } from 'socket.io-client';
import { Player, PlayerManager } from "../src/socket/PlayerManager";
import { createNewClientSocketsArray } from './helpers';

describe('player manager tests', () => {
  const DONE_DELAY = 100;
  const IN_BETWEEN_DELAY = 100;
  const CLIENTS_COUNT = 10;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let playerManager: PlayerManager;
  let playerCount = 1;

  beforeAll((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);
    playerManager = new PlayerManager();

    httpServer.listen(() => {
      io.on('connection', (socket) => {
        // increment each socket connected name
        let name = 'Player ' + playerCount;
        playerManager.addPlayer(new Player(socket, name));
        playerCount++;
      });
      port = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  afterAll(() => {
    io.close();
    playerManager.close();
    clientSockets.forEach((clientSocket) => {
      clientSocket.close();
    });
    if (global.gc) { global.gc() }
  });

  beforeEach(async () => {
    playerManager = new PlayerManager();
    playerCount = 1;
    clientSockets = await createNewClientSocketsArray(port, CLIENTS_COUNT);
  });

  afterEach((done) => {
    clientSockets.forEach((socket) => socket.close());
    setTimeout(done, IN_BETWEEN_DELAY);
  });

  describe('player manager info', () => {
    it('get count returns correct number of players (' + CLIENTS_COUNT + ')', () => {
      expect(playerManager.getCount()).toBe(CLIENTS_COUNT);
    });

    it('get names returns correct player names', () => {
      let expectedNames: string[] = [];
      for (let count = 0; count < CLIENTS_COUNT; count++) {
        // Assuming names are ordered
        expectedNames.push('Player ' + (count + 1));
      }
      expect(playerManager.getNames()).toEqual(expect.arrayContaining(expectedNames));
    });

    it('get names returns correct socket ids', () => {
      let expectedIds = clientSockets.map((socket) => {
        return socket.id;
      });
      expect(playerManager.getIds()).toEqual(expect.arrayContaining(expectedIds));
    });

    it('get player by socket id returns correct player and socket', () => {
      clientSockets.forEach((clientSocket, index) => {
        let player = playerManager.getPlayerById(clientSocket.id);
        expect(player.id).toBe(clientSocket.id);
      });
    });
  });

  describe('adding and removing players', () => {
    it('add new players get names returns new ids', (done) => {
      // add playeres is called automatically when a client connects.
      let newClientSocket = Client(`http://localhost:${port}`);
      clientSockets.push(newClientSocket);
      newClientSocket.on('connect', () => {
        let expectedIds = clientSockets.map((socket) => {
          return socket.id;
        });
        try {
          expect(playerManager.getIds()).toEqual(expect.arrayContaining(expectedIds));
          done();
        } catch (err) { // since we're using done, have to catch the error and pass it to done
          done(err);
        }
      });
    });

    it('remove first player get names doesnt include first player', () => {
      playerManager.removePlayer(clientSockets[0].id);
      clientSockets[0].close();
      clientSockets.shift();
      let expectedIds = clientSockets.map((socket) => {
        return socket.id;
      });
      expect(playerManager.getIds()).toEqual(expect.arrayContaining(expectedIds));
    });

    it('remove first player twice throws error', () => {
      // DOUBLE CHECK THIS; does disconnecting this client socket cause any issues
      // in teardown?
      playerManager.removePlayer(clientSockets[0].id);
      expect(() => playerManager.removePlayer(clientSockets[0].id)).toThrowError();
    });

    it('get nonexisent player throws error', () => {
      expect(() => playerManager.getPlayerById('invalid player name')).toThrowError();
    });

    it('remove nonexistaent player throws error', () => {
      expect(() => playerManager.removePlayer('invalid player name')).toThrowError();
    })
  });
});