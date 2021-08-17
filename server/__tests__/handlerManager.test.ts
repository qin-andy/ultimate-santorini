import { Server, Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { Game } from '../src/game/game';
import { Player } from '../src/game/player';
import { mirrorAcknowledger } from '../src/handlers/mirror';
import { createClientSockets, createSocketPairs, createSocketServer } from './helpers';

describe('player manager tests', () => {
  const CLIENTS_COUNT = 5;
  const DELAY = 300;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let serverSockets: ServerSocket[];
  let players: Player[];
  let playerCount: number;
  let game: Game;

  beforeAll(async () => {
    [io, port] = await createSocketServer();
    playerCount = 1;
    clientSockets = [];
    serverSockets = [];
    players = [];
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
    clientSockets = [];
    serverSockets = [];
    players = [];
  });

  describe('handler management on a single player', () => {
    beforeAll(() => {
      players = [];
      game = new Game('Test Game');
      io.on('connect', (serverSocket) => {
        let newPlayer = new Player(serverSocket, 'Player ' + playerCount);
        game.playerManager.addPlayer(newPlayer);
        players.push(newPlayer);
        playerCount++;
      });
    });

    it('add mirror handler to a single player is acknowledged', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      game.handlerManager.addHandler(players[0], mirrorAcknowledger);
      let mirrorPromise = new Promise<string>(resolve => {
        clientSockets[0].emit('mirror', 'test message', resolve);
      });
      expect(await mirrorPromise).toBe('test message');
    });

    it('add mirror handler to a single player is not acknowledged by other players', (done) => {
      createSocketPairs(io, port, 2).then(tuple => {
        try {
          [clientSockets, serverSockets] = tuple;
          game.handlerManager.addHandler(players[0], mirrorAcknowledger);
          clientSockets[1].emit('mirror', 'should not be recieved', done);
          setTimeout(done, DELAY);
        } catch (err) {
          done(err);
        }
      });
    });

    it('remove mirror handler from a single player no longer acknowledged', (done) => {
      createSocketPairs(io, port, 1).then(tuple => {
        try {
          [clientSockets, serverSockets] = tuple;
          game.handlerManager.addHandler(players[0], mirrorAcknowledger);
          game.handlerManager.removeHandler(players[0], mirrorAcknowledger);
          clientSockets[0].emit('mirror', 'should not be recieved', done);
          setTimeout(done, DELAY);
        } catch (err) {
          done(err);
        }
      });
    });
  });

  describe('handler management on all players', () => {
    beforeAll(() => {
      players = [];
      game = new Game('Test Game');
      io.on('connect', (serverSocket) => {
        let newPlayer = new Player(serverSocket, 'Player ' + playerCount);
        game.playerManager.addPlayer(newPlayer);
        players.push(newPlayer);
        playerCount++;
      });
    });

    it('add mirror handler to all players is acknowledged by all players', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, CLIENTS_COUNT);
      game.handlerManager.addHandlerToAll(mirrorAcknowledger);
      let mirrorPromises: Promise<string>[] = [];
      for (let i = 0; i < CLIENTS_COUNT; i++) {
        let mirrorPromise = new Promise<string>(resolve => {
          clientSockets[i].emit('mirror', 'test message', resolve);
        });
        mirrorPromises.push(mirrorPromise)
      }
      let testMessages = await Promise.all(mirrorPromises);
      let expectedMessages = (new Array(CLIENTS_COUNT)).fill('test message');
      expect(testMessages).toEqual(expect.arrayContaining(expectedMessages));
    });

    it('add then remove handler from all no longer works', (done) => {
      createSocketPairs(io, port, CLIENTS_COUNT).then(tuple => {
        try {
          [clientSockets, serverSockets] = tuple;
          game.handlerManager.addHandlerToAll(mirrorAcknowledger);
          game.handlerManager.removeHandlerFromAll(mirrorAcknowledger);
          for (let i = 0; i < CLIENTS_COUNT; i++) {
            clientSockets[i].emit('mirror', 'should not be recieved', done);
          }
          setTimeout(done, DELAY);
        } catch (err) {
          done(err);
        }
      });
    });
  });
});