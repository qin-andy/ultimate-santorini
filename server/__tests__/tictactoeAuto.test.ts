
import { Server, Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { TicTacToeAutoGame } from '../src/game/tictactoeAuto';
import { Player } from '../src/game/player';
import { GameEvent, GameResponse } from '../src/types/types';
import { createSocketPairs, createSocketServer } from './helpers';

describe('tictactoe tests', () => {
  const IN_BETWEEN_DELAY = 100;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let serverSockets: ServerSocket[];
  let players: Player[];
  let game: TicTacToeAutoGame;
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
    game = new TicTacToeAutoGame('Test Game', io);
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
    game = new TicTacToeAutoGame('Test Game 1', io);
  })

  afterEach((done) => {
    playerCount = 1;
    clientSockets.forEach((socket) => socket.close());
    clientSockets = [];
    serverSockets = [];
    players = [];
    game.close();
    setTimeout(done, IN_BETWEEN_DELAY);
  });

  let responsePromiseFactory = async (i: number) => { // helper function for game responses
    let updatePromise = new Promise<GameResponse>((resolve) => {
      clientSockets[i].once('game update', (response: GameResponse) => {
        resolve(response);
      });
    });
    return updatePromise;
  }

  let boardPromiseFactory = async (i: number) => { // helper function for game responses
    return new Promise<string[]>(async (resolve, reject) => {
      let update = await responsePromiseFactory(i);
      resolve(update.payload.board);
    });
  }

  let sleepFactory = (delay: number) => {
    return new Promise<void>(resolve => { setTimeout(resolve, delay) });
  }

  describe('tictactoeauto game performs the same as a tictactoegame', () => {
    describe('direct game tests', () => {
      describe('player mangement', () => {
        it('game cannot start without 2 players', async () => {
          [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
          expect(game.start().error).toBe(true);
        });

        it('game start players are assigned respective turns', async () => {
          [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
          game.start();
          expect(game.teamMap.get(clientSockets[0].id)).toBe('o');
          expect(game.teamMap.get(clientSockets[1].id)).toBe('x');
        });

        it('remove player midgame ends game and wins other player', async () => {
          [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
          game.start();
          expect(game.running).toBe(true);
          expect(game.active).toBe(true);
          game.removePlayer(clientSockets[0].id);
          expect(game.running).toBe(false);
          expect(game.active).toBe(false);
        });

        it('remove player midgame emits disconnect notifies other player', async () => {
          [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
          game.start();
          let responsePromise = responsePromiseFactory(1);
          game.removePlayer(clientSockets[0].id);
          let response = await responsePromise;
          expect(response.type).toBe('player disconnect');
        });
      });
      
      describe('win checking', () => {
        it('board win test 1, diagonal', async () => {
          game.dimensions = { x: 3, y: 3 };
          game.board = [
            'o', 'x', 'o',
            'x', 'o', 'x',
            'o', 'x', 'o'
          ];
          expect(game.checkWin(0, 0)).toBeTruthy();
          expect(game.checkWin(1, 1)).toBeTruthy();
          expect(game.checkWin(2, 2)).toBeTruthy();

          let expectedWinningSquares = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
          expect(game.checkWin(0, 0)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));
          expect(game.checkWin(1, 1)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));
          expect(game.checkWin(2, 2)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));


          expect(game.checkWin(0, 2)).toBeTruthy();
          expect(game.checkWin(2, 0)).toBeTruthy();

          expectedWinningSquares = [{ x: 0, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 0 }];
          expect(game.checkWin(0, 2)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));
          expect(game.checkWin(2, 0)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));

          expect(game.checkWin(0, 1)).toBeFalsy();
          expect(game.checkWin(1, 2)).toBeFalsy();
        });

        it('board win test 2, rows', () => {
          game.dimensions = { x: 3, y: 3 };
          game.board = [
            'o', 'o', 'o',
            'x', 'x', 'x',
            'o', 'o', 'o'
          ];
          expect(game.checkWin(0, 0)).toBeTruthy();
          expect(game.checkWin(1, 0)).toBeTruthy();
          expect(game.checkWin(2, 0)).toBeTruthy();
          let expectedWinningSquares = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
          expect(game.checkWin(0, 0)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));
          expect(game.checkWin(1, 0)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));
          expect(game.checkWin(2, 0)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));


          expect(game.checkWin(0, 1)).toBeTruthy();
          expect(game.checkWin(1, 1)).toBeTruthy();
          expect(game.checkWin(2, 1)).toBeTruthy();
          expectedWinningSquares = [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }];
          expect(game.checkWin(0, 1)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));
          expect(game.checkWin(1, 1)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));
          expect(game.checkWin(2, 1)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));

          expect(game.checkWin(0, 2)).toBeTruthy();
          expect(game.checkWin(1, 2)).toBeTruthy();
          expect(game.checkWin(2, 2)).toBeTruthy();
          expectedWinningSquares = [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }];
          expect(game.checkWin(0, 2)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));
          expect(game.checkWin(1, 2)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));
          expect(game.checkWin(2, 2)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));

        });

        it('board win test 3, columns', () => {
          game.dimensions = { x: 3, y: 3 };
          game.board = [
            'o', 'x', 'o',
            'o', 'x', 'o',
            'o', 'x', 'o'
          ];

          expect(game.checkWin(0, 0)).toBeTruthy();
          expect(game.checkWin(0, 1)).toBeTruthy();
          expect(game.checkWin(0, 2)).toBeTruthy();
          let expectedWinningSquares = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }];
          expect(game.checkWin(0, 0)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));
          expect(game.checkWin(0, 1)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));
          expect(game.checkWin(0, 2)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));


          expect(game.checkWin(1, 0)).toBeTruthy();
          expect(game.checkWin(1, 1)).toBeTruthy();
          expect(game.checkWin(1, 2)).toBeTruthy();
          expectedWinningSquares = [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }];
          expect(game.checkWin(1, 0)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));
          expect(game.checkWin(1, 1)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));
          expect(game.checkWin(1, 2)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));

          expect(game.checkWin(2, 0)).toBeTruthy();
          expect(game.checkWin(2, 1)).toBeTruthy();
          expect(game.checkWin(2, 2)).toBeTruthy();
          expectedWinningSquares = [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }];
          expect(game.checkWin(2, 0)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));
          expect(game.checkWin(2, 1)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));
          expect(game.checkWin(2, 2)).toStrictEqual(expect.arrayContaining(expectedWinningSquares));
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
          let response = game.mark(clientSockets[0].id, 1, 1);
          let expectedBoard = [
            '*', '*', '*',
            '*', 'o', '*',
            '*', '*', '*'
          ];
          expect(response.error).toBe(false);
          expect(response.payload.turn).toBe('x');
          expect(response.payload.mark).toStrictEqual({ x: 1, y: 1 });
          expect(response.payload.board).toStrictEqual(expectedBoard);
          expect(response.type).toBe('mark');
        });

        it('multiple marks affects board', async () => {
          [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
          game.start();
          game.mark(clientSockets[0].id, 1, 1);
          game.mark(clientSockets[1].id, 0, 1);
          game.mark(clientSockets[0].id, 0, 2);
          game.mark(clientSockets[1].id, 1, 2);
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
          let response = game.mark(clientSockets[0].id, 2, 0);
          expect(response.error).toBe(false);
          expect(response.type).toBe('win');
          expect(response.payload.winner).toBe('o');
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
          let response = game.mark(clientSockets[1].id, 0, 0);
          expect(response.error).toBe(false);
          expect(response.type).toBe('win');
          expect(response.payload.winner).toBe('x');
        });

        it('mark board when its not your turn gives "turn" error', async () => {
          [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
          game.start();
          let response = game.mark(clientSockets[1].id, 1, 1);
          expect(response.error).toBe(true);
          expect(response.type).toBe('turn');
          expect(response.payload).toBe('o');
        });

        it('mark occupied square gives "occupied" error', async () => {
          [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
          game.start();
          game.mark(clientSockets[0].id, 1, 1)
          let response = game.mark(clientSockets[1].id, 1, 1);
          expect(response.error).toBe(true);
          expect(response.type).toBe('occupied');
        });

        it('mark out of bounds gives "out of bounds" error', async () => {
          [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
          game.start();
          let response = game.mark(clientSockets[0].id, 5, 5);
          expect(response.error).toBe(true);
          expect(response.type).toBe('out of bounds');
          expect(response.payload).toStrictEqual({ x: 5, y: 5 });
        });

        it('mark game with running false gives "not running" error', async () => {
          [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
          game.running = false;
          let response = game.mark(clientSockets[0].id, 0, 0);
          expect(response.error).toBe(true);
          expect(response.type).toBe('not running');
        });

        it('mark game before start gives "not running" error', async () => {
          [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
          let response = game.mark(clientSockets[0].id, 0, 0);
          expect(response.error).toBe(true);
          expect(response.type).toBe('not running');
        });

        it('mark game after close gives "not running" error', async () => {
          [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
          game.start();
          game.end();
          let response = game.mark(clientSockets[0].id, 0, 0);
          expect(response.error).toBe(true);
          expect(response.type).toBe('not running');
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
          let response = game.mark(clientSockets[1].id, 0, 0);
          expect(response.error).toBe(true);
          expect(response.type).toBe('not running');
        });
      });
    });
  });

  describe('autoplay, active, and reset', () => {
    describe('active state', () => {
      it('active state true on start, false on player disconnect', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        expect(game.active).toBe(true);
        game.removePlayer(clientSockets[0].id);
        expect(game.active).toBe(false);
      });
    });

    describe('reset response', () => {
      it('reset successful on active games after ended once', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start();
        game.end();
        let response = game.reset();

        expect(response.error).toBe(false);
        expect(response.type).toBe('reset success');
      });

      it('reset successful resets game state and allows new marks, and starts with loser', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start();
        game.mark(clientSockets[0].id, 0, 0);
        game.mark(clientSockets[1].id, 1, 2);

        game.end();
        let response = game.reset();

        expect(response.error).toBe(false);
        expect(response.type).toBe('reset success');
        game.mark(clientSockets[1].id, 1, 1,);
        expect(game.board).toStrictEqual([
          '*', '*', '*',
          '*', 'x', '*',
          '*', '*', '*'
        ])
      });

      it('reset fail on active games before start', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        let response = game.reset();
        expect(response.error).toBe(true);
        expect(response.type).toBe('reset fail');
      });

      it('reset fail on active games after ended once without enough players', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start();
        game.end();
        game.removePlayer(clientSockets[0].id);
        let response = game.reset();
        expect(response.error).toBe(true);
        expect(response.type).toBe('reset fail');
      });

      it('reset fails on games that are already running', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start();
        game.removePlayer(clientSockets[0].id);
        let response = game.reset();
        expect(response.error).toBe(true);
        expect(response.type).toBe('reset fail');
      });
    });

    describe('autoplay state and tests', () => {
      it('autoplay game automatically starts when two players join', async () => {
        expect(game.running).toBe(false);
        expect(game.active).toBe(false);
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        expect(game.running).toBe(true);
        expect(game.active).toBe(true);
      });

      // end emits correct info
      it('end with autoplay delays reset and emits correctly', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        game.start();
        game.end(true, 100);
        let p1 = responsePromiseFactory(0);
        let p2 = responsePromiseFactory(1);
        await sleepFactory(100);
        let response1 = await p1;
        let response2 = await p2;
        expect(response1.error).toBe(false);
        expect(response1.type).toBe('reset success');
        expect(response2.error).toBe(false);
        expect(response2.type).toBe('reset success');
        game.mark(clientSockets[1].id, 1, 1);
        expect(game.board).toStrictEqual([
          '*', '*', '*',
          '*', 'x', '*',
          '*', '*', '*'
        ]);
      });
    });
  });
});