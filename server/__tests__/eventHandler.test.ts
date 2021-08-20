import { Server, Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { Game } from '../src/game/game';
import { Player } from '../src/game/player';
import { createClientSockets, createSocketPairs, createSocketServer } from './helpers';

describe('EventHandler tests', () => {

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
    players = [];

    game = new Game('Test Game', io);
    playerCount = 1;
    io.on('connect', (serverSocket) => {
      let newPlayer = new Player(serverSocket, 'Player ' + playerCount);
      game.addPlayer(newPlayer);
      players.push(newPlayer);
      playerCount++;
    });
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

  afterEach((done) => {
    playerCount = 1;
    clientSockets.forEach((socket) => socket.close());
    clientSockets = [];
    players = [];
    game.close();
    setTimeout(done, IN_BETWEEN_DELAY);
  });

  afterAll(() => {
    io.close();
  });

  describe('EventHandler handles events', () => {
    it('mirror handler handles mirror events', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      let mirrorPromise = new Promise<any>((resolve) => {
        clientSockets[0].emit('game action', 'mirror', 'test message', resolve);
      });
      let event = await mirrorPromise;
      expect(event.payload).toBe('test message');
    });

    it('get player list gets player list', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 3);
      let playersPromise = new Promise<string[]>((resolve) => {
        clientSockets[0].emit('game action', 'get player list', null, resolve);
      });
      let playersList = await playersPromise;
      let expectedPlayersList = players.map(player => player.name);
      expect(playersList).toEqual(expect.arrayContaining(expectedPlayersList));
    });

    it('update player name updates player name', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      let nameChangePromise = new Promise<void>((resolve) => {
        clientSockets[0].emit('game action', 'update player name', 'Large Bobby', resolve);
      });
      await nameChangePromise;
      expect(players[0].name).toBe('Large Bobby');
    });
  });
});