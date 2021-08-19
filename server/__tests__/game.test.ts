import { Server, Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { Game } from '../src/game/game';
import { Player } from '../src/game/player';
import { createClientSockets, createSocketPairs, createSocketServer } from './helpers';

describe('player manager tests', () => {
  const CLIENTS_COUNT = 5;
  const IN_BETWEEN_DELAY = 100;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let serverSockets: ServerSocket[];
  let players: Player[];
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

    afterEach((done) => {
      playerCount = 1;
      clientSockets.forEach((socket) => socket.close());
      clientSockets = [];
      players = [];
      io.removeAllListeners();
      setTimeout(done, IN_BETWEEN_DELAY);
      game.close();
    });

    afterAll(() => {
      io.close();
    });

    it('name returns right name', async () => {
      game = new Game('Test Game 1');
      expect(game.name).toBe('Test Game 1');
    });

    it('after add player, game playerManager has correct info 1', async () => {
      game = new Game('Test Game 1');
      io.on('connect', (serverSocket) => {
        let newPlayer = new Player(serverSocket, 'Player ' + playerCount);
        game.addPlayer(newPlayer);
        players.push(newPlayer);
        playerCount++;
      });
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 3);
      expect(game.playerManager.getCount()).toBe(3);
    });

    it('after add player, game playerManager has correct info 2', async () => {
      io.on('connect', (serverSocket) => {
        let newPlayer = new Player(serverSocket, 'Player ' + playerCount);
        game.addPlayer(newPlayer);
        players.push(newPlayer);
        playerCount++;
      });
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 3);
      let expectedPlayerNames = players.map(player => {
        return player.name;
      });
      expect(game.playerManager.getNames()).toEqual(expect.arrayContaining(expectedPlayerNames));
    });

    it('after add add remove player, game playerManager has correct info 2', async () => {
      io.on('connect', (serverSocket) => {
        let newPlayer = new Player(serverSocket, 'Player ' + playerCount);
        game.addPlayer(newPlayer);
        players.push(newPlayer);
        playerCount++;
      });
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 3);
      game.removePlayer(players[0]);
      game.removePlayer(players[1]);
      expect(game.playerManager.getNames()[0]).toEqual(players[2].name);
      expect(game.playerManager.getCount()).toBe(1);
    });
  });

  describe('event handling', () => {
    it.todo('event handler correctly attached');
  });


});