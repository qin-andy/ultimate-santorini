import { Server, Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { Game } from '../src/game/game';
import { Player } from '../src/game/player';
import { GameEvent } from '../src/types/types';
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
    players = [];
    io.on('connect', (serverSocket) => {
      let newPlayer = new Player(serverSocket, 'Player ' + playerCount);
      game.addPlayer(newPlayer);
      players.push(newPlayer);
      playerCount++;
    });
    game = new Game('Test Game', io);
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
    game.close();
    game = new Game('Test Game 1', io);
  })

  afterEach((done) => {
    playerCount = 1;
    clientSockets.forEach((socket) => socket.close());
    clientSockets = [];
    players = [];
    game.close();
    setTimeout(done, IN_BETWEEN_DELAY);
  });

  describe('basic info', () => {
    it('name returns right name', async () => {
      expect(game.name).toBe('Test Game 1');
    });

    it('after add player, game playerManager has correct info 1', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 3);
      expect(game.playerManager.getCount()).toBe(3);
    });

    it('after add player, game playerManager has correct info 2', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 3);
      let expectedPlayerNames = players.map(player => {
        return player.name;
      });
      expect(game.playerManager.getNames()).toEqual(expect.arrayContaining(expectedPlayerNames));
    });

    it('after add add remove player, game playerManager has correct info 2', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 3);
      game.removePlayer(players[0]);
      game.removePlayer(players[1]);
      expect(game.playerManager.getNames()[0]).toEqual(players[2].name);
      expect(game.playerManager.getCount()).toBe(1);
    });
  });

  describe('event handling', () => {
    it('event handler correctly attached', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      const handleMirror = (event: GameEvent) => {
        event.acknowledger(event.payload);
      }
      game.eventHandler.eventMap.set('mirror test', handleMirror);
      let mirrorPromise = new Promise<string>((resolve) => {
        let payload = 'test message';
        clientSockets[0].emit('game action', 'mirror test', payload, resolve);
      });
      expect(await mirrorPromise).toBe('test message');
    });
  });

  describe('tic tac toe tests', () => {
    beforeEach(() => {
      game.close();
      game = new Game('Tic Tac Toe Game', io);
    });

    it('game cannot start without 2 players', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      expect(game.start()).toBe(false);
    });

    it('game start with 2 players', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      expect(game.start()).toBe(true);
    });

    it('multiple marking board directly', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      game.start();
      game.mark(clientSockets[0].id, 1, 1);
      game.mark(clientSockets[1].id, 0, 1);
      game.mark(clientSockets[0].id, 0, 2);
      game.mark(clientSockets[1].id, 1, 2);
      let expectedBoard = [
        ['*', '*', '*'],
        ['x', 'o', '*'],
        ['o', 'x', '*']
      ];
      expect(game.board).toStrictEqual(expectedBoard);
    });

    let boardPromiseFactory = async (i: number) => { // helper function for game responses
      return new Promise<string[][]>((resolve, reject) => {
        clientSockets[i].once('game update', (err: string | null, response: string[][] | null) => {
          if (response) {
            console.log('promise resolved ' + i);
            resolve(response)
          } else {
            reject(err);
          }
        });
      });
    }

    function sleep(time: number) {
      return new Promise<void>(resolve => {
        setTimeout(resolve, time);
      })
    }

    it('mark board after game start updates board', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      game.start();
      let expectedBoard = [
        ['*', '*', '*'],
        ['*', 'o', '*'],
        ['*', '*', '*']
      ];
      let boardPromise = boardPromiseFactory(0);
      clientSockets[0].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
      let board = await boardPromise;
      expect(board).toStrictEqual(expectedBoard);
    });

    it('mark board switches turns', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      game.start();
      let boardPromise = boardPromiseFactory(0);
      clientSockets[0].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
      let board = await boardPromise;
      expect(game.turn).toBe('x');
    });

    it('multiple board marks through events', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      game.start();
      let expectedBoard = [
        ['*', '*', '*'],
        ['x', 'o', '*'],
        ['o', 'x', '*']
      ];
      const SLEEP_DELAY = 100;
      let boardPromise = boardPromiseFactory(0);
      console.log('sending action 1');
      clientSockets[0].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
      await sleep(SLEEP_DELAY);
      await boardPromise;

      boardPromise = boardPromiseFactory(1);
      console.log('sending action 2');
      clientSockets[1].emit('game action', 'tictactoe mark', { x: 0, y: 1 });
      await sleep(SLEEP_DELAY);
      await boardPromise;

      boardPromise = boardPromiseFactory(0);
      console.log('sending action 3');
      clientSockets[0].emit('game action', 'tictactoe mark', { x: 0, y: 2 });
      await sleep(SLEEP_DELAY);
      await boardPromise;

      boardPromise = boardPromiseFactory(1);
      console.log('sending action 4');
      clientSockets[1].emit('game action', 'tictactoe mark', { x: 1, y: 2 });
      await sleep(SLEEP_DELAY);
      let board = await boardPromise;
      console.log(board);
      expect(board).toStrictEqual(expectedBoard);
    });

    it('mark board when its not your turn gives error', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      game.start();

      let boardPromise = boardPromiseFactory(1);
      clientSockets[1].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
      expect(boardPromise).rejects.toBeTruthy(); // is there a way to read the error?
    });

    it('mark already occupied square gives error', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      game.start();

      let boardPromise = boardPromiseFactory(0);
      clientSockets[0].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
      await boardPromise;

      boardPromise = boardPromiseFactory(1);
      clientSockets[1].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
      expect(boardPromise).rejects.toBeTruthy(); // is there a way to read the error?
    });
  });
});