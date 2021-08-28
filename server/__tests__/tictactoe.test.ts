import { Server, Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { TicTacToeGame } from '../src/game/tictactoe';
import { Player } from '../src/game/player';
import { GameError, GameEvent, GameUpdate } from '../src/types/types';
import { createSocketPairs, createSocketServer } from './helpers';

describe('tictactoe tests', () => {
  const IN_BETWEEN_DELAY = 100;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let serverSockets: ServerSocket[];
  let players: Player[];
  let game: TicTacToeGame;
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
    game = new TicTacToeGame('Test Game', io);
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
    game = new TicTacToeGame('Test Game 1', io);
  })

  afterEach((done) => {
    playerCount = 1;
    clientSockets.forEach((socket) => socket.close());
    clientSockets = [];
    players = [];
    game.close();
    setTimeout(done, IN_BETWEEN_DELAY);
  });

  describe('direct game tests', () => {
    describe('player mangement', () => {
      it('game cannot start without 2 players', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        expect(game.start()).toBe(false);
      });

      it('game start with 2 players', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        expect(game.start()).toBe(true);
      });

      it('game cannot start with 3 players', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 3);
        expect(game.start()).toBe(false);
      });

      it('game start players are assigned respective turns', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start();
        expect(game.teamMap.get(clientSockets[0].id)).toBe('o');
        expect(game.teamMap.get(clientSockets[1].id)).toBe('x');
      });
    });

    describe('win checking', () => {
      it('board win test 1, diagonal', async () => {
        game.dimensions = [3, 3];
        game.board = [
          'o', 'x', 'o',
          'x', 'o', 'x',
          'o', 'x', 'o'
        ];
        expect(game.checkWin(0, 0)).toBe(true);
        expect(game.checkWin(1, 1)).toBe(true);
        expect(game.checkWin(2, 2)).toBe(true);

        expect(game.checkWin(0, 2)).toBe(true);
        expect(game.checkWin(2, 0)).toBe(true);

        expect(game.checkWin(0, 1)).toBe(false);
        expect(game.checkWin(1, 2)).toBe(false);
      });

      it('board win test 2, rows', () => {
        game.dimensions = [3, 3];
        game.board = [
          'o', 'o', 'o',
          'x', 'x', 'x',
          'o', 'o', 'o'
        ];
        expect(game.checkWin(0, 0)).toBe(true);
        expect(game.checkWin(1, 0)).toBe(true);
        expect(game.checkWin(2, 0)).toBe(true);

        expect(game.checkWin(0, 1)).toBe(true);
        expect(game.checkWin(1, 1)).toBe(true);
        expect(game.checkWin(2, 1)).toBe(true);

        expect(game.checkWin(0, 2)).toBe(true);
        expect(game.checkWin(1, 2)).toBe(true);
        expect(game.checkWin(2, 2)).toBe(true);
      });

      it('board win test 3, columns', () => {
        game.dimensions = [3, 3];
        game.board = [
          'o', 'x', 'o',
          'o', 'x', 'o',
          'o', 'x', 'o'
        ];
        expect(game.checkWin(0, 0)).toBe(true);
        expect(game.checkWin(0, 1)).toBe(true);
        expect(game.checkWin(0, 2)).toBe(true);

        expect(game.checkWin(1, 0)).toBe(true);
        expect(game.checkWin(1, 1)).toBe(true);
        expect(game.checkWin(1, 2)).toBe(true);

        expect(game.checkWin(2, 0)).toBe(true);
        expect(game.checkWin(2, 1)).toBe(true);
        expect(game.checkWin(2, 2)).toBe(true);
      });
    });

    describe('board marking', () => {
      it('single mark updates board', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start();
        game.mark(clientSockets[0].id, 1, 1);
        let expectedBoard = [
          '*', '*', '*',
          '*', 'o', '*',
          '*', '*', '*'
        ];
        expect(game.board).toStrictEqual(expectedBoard);
      });

      it('single mark GameUpdate has correct contents', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start();
        let [error, update] = game.mark(clientSockets[0].id, 1, 1);
        let expectedBoard = [
          '*', '*', '*',
          '*', 'o', '*',
          '*', '*', '*'
        ];
        expect(error).toBe(null);
        expect(update?.payload).toStrictEqual(expectedBoard);
        expect(update?.type).toBe('mark');
      });

      it('multiple marks', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start();
        game.mark(clientSockets[0].id, 1, 1);
        game.mark(clientSockets[1].id, 0, 1);
        game.mark(clientSockets[0].id, 0, 2);
        let [error, update] = game.mark(clientSockets[1].id, 1, 2);
        let expectedBoard = [
          '*', '*', '*',
          'x', 'o', '*',
          'o', 'x', '*'
        ];
        expect(game.board).toStrictEqual(expectedBoard);
      });

      it('mark board switches turns 1', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start();
        game.mark(clientSockets[0].id, 1, 1);
        expect(game.turn).toBe('x');
      });

      it('mark board winning mark wins game o', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start();
        game.board = [
          '*', 'x', '*',
          'x', 'o', '*',
          'o', '*', '*'
        ];
        let [error, update] = game.mark(clientSockets[0].id, 2, 0);
        expect(error).toBe(null);
        expect(update?.type).toBe('win');
        expect(update?.payload).toBe('o');
      });

      it('mark board winning mark wins game x', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start();
        game.board = [
          '*', 'x', 'x',
          'x', 'o', '*',
          'o', '*', '*'
        ];
        game.turn = 'x';
        let [error, update] = game.mark(clientSockets[1].id, 0, 0);
        expect(error).toBe(null);
        expect(update?.type).toBe('win');
        expect(update?.payload).toBe('x');
      });

      it('mark board when its not your turn gives "turn" error', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start();
        let [error, update] = game.mark(clientSockets[1].id, 1, 1);
        expect(update).toBe(null);
        expect(error?.type).toBe('turn');
        expect(error?.payload).toBe('o');
      });

      it('mark occupied square gives "occupied" error', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start();
        game.mark(clientSockets[0].id, 1, 1)
        let [error, update] = game.mark(clientSockets[1].id, 1, 1);
        expect(update).toBe(null);
        expect(error?.type).toBe('occupied');
      });

      it('mark out of bounds gives "out of bounds" error', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start();
        let [error, update] = game.mark(clientSockets[0].id, 5, 5);
        expect(update).toBe(null);
        expect(error?.type).toBe('out of bounds');
        expect(error?.payload).toStrictEqual([5, 5]);
      });

      it('mark game with running false gives "not running" error', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.running = false;
        let [error, update] = game.mark(clientSockets[0].id, 0, 0);
        expect(update).toBe(null);
        expect(error?.type).toBe('not running');
      });

      it('mark game before start gives "not running" error', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        let [error, update] = game.mark(clientSockets[0].id, 0, 0);
        expect(update).toBe(null);
        expect(error?.type).toBe('not running');
      });

      it('mark game after close gives "not running" error', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start();
        game.end();
        let [error, update] = game.mark(clientSockets[0].id, 0, 0);
        expect(update).toBe(null);
        expect(error?.type).toBe('not running');
      });

      it('mark game after win gives "not running" error', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start();
        game.board = [
          '*', '*', '*',
          '*', 'o', '*',
          'o', '*', '*'
        ];
        game.mark(clientSockets[0].id, 2, 0);
        let [error, update] = game.mark(clientSockets[1].id, 0, 0);
        expect(update).toBe(null);
        expect(error?.type).toBe('not running');
      });
    });

    describe('board size customization', () => {
      it('start 1x1 board ', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        let expectedBoard = [
          '*'
        ];
        game.start(1, 1);
        expect(game.board).toStrictEqual(expectedBoard);
      });

      it('start 2x2 board ', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        let expectedBoard = [
          '*', '*',
          '*', '*'
        ];
        game.start(2, 2);
        expect(game.board).toStrictEqual(expectedBoard);
      });

      it('start 4x2 board ', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        let expectedBoard = [
          '*', '*', '*', '*',
          '*', '*', '*', '*'
        ];
        game.start(4, 2);
        expect(game.board).toStrictEqual(expectedBoard);
      });

      it('mark 1x1 board', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        let expectedBoard = [
          'o'
        ];
        game.start(1, 1);
        game.mark(clientSockets[0].id, 0, 0);
        expect(game.board).toStrictEqual(expectedBoard);
      });

      it('mark 4x2 board ', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        let expectedBoard = [
          '*', '*', '*', 'o',
          '*', '*', '*', '*'
        ];
        game.start(4, 2);
        game.mark(clientSockets[0].id, 3, 0);
        expect(game.board).toStrictEqual(expectedBoard);
      });

      it('mark 1x1 out of bounds', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start(1, 1);
        let [error, update] = game.mark(clientSockets[0].id, 2, 3);
        expect(update).toBe(null);
        expect(error?.payload).toStrictEqual([2, 3]);
        expect(error?.type).toBe('out of bounds');
      });

      it('mark 4x2 out of bounds', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start(4, 2);
        let [error, update] = game.mark(clientSockets[0].id, 24, 3);
        expect(update).toBe(null);
        expect(error?.payload).toStrictEqual([24, 3]);
        expect(error?.type).toBe('out of bounds');
      });
    });
  });

  describe('event tests', () => {

    // with timeout
    let updatePromiseFactory = async (i: number) => { // helper function for game responses
      let timeout = new Promise<GameUpdate>((resolve, reject) => {
        let id = setTimeout(() => {
          clearTimeout(id);
          reject('Promise timed out!');
        }, 1000);
      });

      let updatePromise = new Promise<GameUpdate>((resolve, reject) => {
        clientSockets[i].once('game update', (err: GameError | null, update: GameUpdate | null) => {
          if (update) {
            resolve(update)
          } else {
            reject(err);
          }
        });
      });

      return Promise.race([updatePromise, timeout]);
    }

    let boardPromiseFactory = async (i: number) => { // helper function for game responses
      return new Promise<string[]>(async (resolve, reject) => {
        let update = await updatePromiseFactory(i);
        if (update.type === 'mark') {
          resolve(update.payload);
        } else {
          reject(update.payload);
        }
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
        '*', '*', '*',
        '*', 'o', '*',
        '*', '*', '*'
      ];
      let boardPromise = boardPromiseFactory(0);
      clientSockets[0].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
      let board = await boardPromise;
      expect(board).toStrictEqual(expectedBoard);
    });

    it.only('multiple board marks through events has correct board', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      game.start();
      let expectedBoard = [
        '*', '*', '*',
        'x', 'o', '*',
        'o', 'x', '*'
      ];
      let board: string[];

      let boardPromise = boardPromiseFactory(0);
      clientSockets[0].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
      board = await boardPromise;

      boardPromise = boardPromiseFactory(1);
      clientSockets[1].emit('game action', 'tictactoe mark', { x: 0, y: 1 });
      board = await boardPromise;

      boardPromise = boardPromiseFactory(0);
      clientSockets[0].emit('game action', 'tictactoe mark', { x: 0, y: 2 });
      board = await boardPromise;

      boardPromise = boardPromiseFactory(1);
      clientSockets[1].emit('game action', 'tictactoe mark', { x: 1, y: 2 });
      board = await boardPromise;
      expect(board).toStrictEqual(expectedBoard);
    });

    it('mark board when its not your turn gives error', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      game.start();

      let boardPromise = boardPromiseFactory(1);
      clientSockets[1].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
      expect(boardPromise).rejects.toBeTruthy(); // is there a way to read the error?
    });

    it.only('full game 1', async () => {
      // direct game, no errors
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      game.start();

      let boardPromise = boardPromiseFactory(0);
      clientSockets[0].emit('game action', 'tictactoe mark', { x: 0, y: 0 });
      await boardPromise;

      boardPromise = boardPromiseFactory(1);
      clientSockets[1].emit('game action', 'tictactoe mark', { x: 0, y: 1 });
      await boardPromise;

      boardPromise = boardPromiseFactory(0);
      clientSockets[0].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
      await boardPromise;

      boardPromise = boardPromiseFactory(1);
      clientSockets[1].emit('game action', 'tictactoe mark', { x: 2, y: 2 });
      await boardPromise;

      boardPromise = boardPromiseFactory(0);
      clientSockets[0].emit('game action', 'tictactoe mark', { x: 1, y: 0 });
      await boardPromise;

      boardPromise = boardPromiseFactory(1);
      clientSockets[1].emit('game action', 'tictactoe mark', { x: 2, y: 1 });
      await boardPromise;

      let updatePromise = updatePromiseFactory(0);
      clientSockets[0].emit('game action', 'tictactoe mark', { x: 2, y: 0 });
      let update = await updatePromise;

      expect(update.payload).toBe('o');
      expect(update.type).toBe('win');
    });
  });
});