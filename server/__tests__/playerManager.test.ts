import { Server, Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { PlayerManager } from "../src/game/PlayerManager";
import { Player } from '../src/game/player';
import { createClientSockets, createSocketPairs, createSocketServer } from './helpers';

describe('player manager tests', () => {
  const IN_BETWEEN_DELAY = 100;
  const CLIENTS_COUNT = 5;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let serverSockets: ServerSocket[];
  let playerManager: PlayerManager;
  let playerCount = 1;

  beforeAll(async () => {
    [io, port] = await createSocketServer();
    io.on('connect', (socket) => {
      playerManager.addPlayer(new Player(socket, 'Player ' + playerCount));
      playerCount++;
    })
    clientSockets = [];
    serverSockets = [];
  });

  afterAll(() => {
    io.close();
    clientSockets.forEach((clientSocket) => {
      clientSocket.close();
    });
    if (global.gc) { global.gc() }
  });

  beforeEach(async () => {
    playerManager = new PlayerManager();
    playerCount = 1;
    [clientSockets, serverSockets] = await createSocketPairs(io, port, CLIENTS_COUNT);
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
    it('add new players get names returns new ids', async () => {
      let newClientSocket = (await createClientSockets(port, 1))[0];
      clientSockets.push(newClientSocket);
      let expectedIds = clientSockets.map((socket) => {
        return socket.id;
      });
      expect(playerManager.getIds()).toEqual(expect.arrayContaining(expectedIds));
    });

    it('add same player multiple times throws error', async () => {
      let [newClientSockets, newServerSockets] = (await createSocketPairs(io, port, 1));
      clientSockets.push(newClientSockets[0]); // to let jest hooks cleanup the new socket
      let newPlayer = new Player(newServerSockets[0], 'New Player');
      playerManager.addPlayer(newPlayer);
      expect(() => playerManager.addPlayer(newPlayer)).toThrowError();
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