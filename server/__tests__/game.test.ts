import { Server, Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { Game } from '../src/game/game';
import { Player } from '../src/game/player';
import { createClientSockets, createSocketPairs, createSocketServer } from './helpers';

describe('player manager tests', () => {
  const CLIENTS_COUNT = 5;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let serverSockets: ServerSocket[];
  let game: Game;
  let playerCount: number;

  beforeAll(async () => {
    [io, port] = await createSocketServer();
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

  afterEach(() => {
    clientSockets.forEach((socket) => socket.close());
  });

  describe('basic info', () => {
    beforeAll(() => {
      game = new Game('Test Game');
      playerCount = 1;
    });
    
    afterEach(() => {
      playerCount = 1;
      io.removeAllListeners();
    });

    afterAll(() => {
      io.close();
    });

    it('name returns right name', async () => {
      game = new Game('Test Game 1');
      expect(game.name).toBe('Test Game 1');
    });

    it('game playerManager has correct info 1', async () => {
      io.on('connect', (serverSocket) => {
        game.playerManager.addPlayer(new Player(serverSocket, 'Player ' + playerCount))
      });
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 3);
      expect(game.playerManager.getCount()).toBe(3);
    });

    it('game playerManager has correct info 2', async () => {
      let players: Player[] = [];
      io.on('connect', (serverSocket) => {
        let newPlayer = new Player(serverSocket, 'Player ' + playerCount);
        game.playerManager.addPlayer(newPlayer);
        players.push(newPlayer);
        playerCount++;
      });
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 3);
      let expectedPlayerNames = players.map(player => {
        return player.name;
      });
      expect(game.playerManager.getNames()).toEqual(expect.arrayContaining(expectedPlayerNames));
    });
  });
});