import { Server, Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { TicTacToeGame } from '../src/game/tictactoe';
import { GameManager } from '../src/game/gameManager';
import { Player } from '../src/game/player';
import { GameEvent, GameResponse } from '../src/types/types';
import { createSocketPairs, createSocketServer } from './helpers';

describe('game manager tests', () => {
  const IN_BETWEEN_DELAY = 100;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let serverSockets: ServerSocket[];
  let gameManager: GameManager;
  let playerCount: number;

  beforeAll(async () => {
    [io, port] = await createSocketServer();
    clientSockets = [];
    serverSockets = [];
    playerCount = 1;
  });

  afterAll(() => {
    io.close();
    clientSockets.forEach((clientSocket) => {
      clientSocket.close();
    });
    if (global.gc) { global.gc() }
  });

  beforeEach(() => {
    gameManager = new GameManager(io);
  })

  afterEach((done) => {
    playerCount = 1;
    clientSockets.forEach((socket) => socket.close());
    clientSockets = [];
    serverSockets = [];
    gameManager.close();

    setTimeout(done, IN_BETWEEN_DELAY);
  });

  it('mega test', async () => {
    [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
    let pingPromise = new Promise<any>(resolve => {
      clientSockets[0].emit('ping', resolve)
    });
    expect(await pingPromise).toBe('pong');
  });

  describe('constructor', () => {
    // gamesMap created empty
    // playerMap created empty
  });

  describe('player connection', () => {
    // players are tracked by playerMap after connecting
    // listeners are attached to player sockets (ping listener works)
  });

  describe('create game', () => {
    // cannot create game with the same name as another game
    // cannot create game if already in game
    // create game adds game to gamesMap
    // create game has player added to game
    // create game has player inGame toggled properly
  });

  describe('join game', () => {
    // cannot join non existent game
    // cannot join multiple games at once
    // game joined adds player successfully
        // create game has player inGame toggled properly
  });

  describe('closing', () => {
    // close disconnects all sockets
    // close ends all games
    // close removes all server event listeners (connect)
    // close clears playersMap and gamesMap
  });
});