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

  let sleepFactory = (delay: number) => {
    return new Promise<void>(resolve => { setTimeout(resolve, delay) });
  }

  // it('mega test', async () => {
  //   [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
  //   let pingPromise = new Promise<any>(resolve => {
  //     clientSockets[0].emit('ping', resolve)
  //   });
  //   expect(await pingPromise).toBe('pong');
  // });

  describe('constructor', () => {
    it('maps are initialized empty', async () => {
      expect(gameManager.gamesMap.size).toBe(0);
      expect(gameManager.playersMap.size).toBe(0);
    });
  });

  describe('player connection and disconnection', () => {
    it('playersMap is correct size after sockets conect', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 5);
      expect(gameManager.playersMap.size).toBe(5);
    });

    it('created player sockets match connected server sockets', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      let players: Player[] = [];
      gameManager.playersMap.forEach((player) => {
        players.push(player);
      });
      expect(players[0].socket).toBe(serverSockets[0]);
      expect(players[1].socket).toBe(serverSockets[1]);
    });

    it('created player ids match connected socket ids', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      let players: Player[] = [];
      gameManager.playersMap.forEach((player) => {
        players.push(player);
      });
      expect(players[0].id).toBe(serverSockets[0].id);
      expect(players[1].id).toBe(serverSockets[1].id);
    });


    let pingPromiseFactory = (clientSocket: ClientSocket) => {
      return new Promise<string>((resolve, reject) => {
        let timeout = setTimeout(() => reject('timeout'), 200);
        clientSocket.emit('ping', (response: string) => {
          clearInterval(timeout);
          resolve(response);
        });
      });
    }

    it('ping listener attached correctly to first socket', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      expect(await pingPromiseFactory(clientSockets[0])).toBe('pong');
    });

    it('ping listener attached correctly to multiple sockets', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 4);
      expect(await pingPromiseFactory(clientSockets[0])).toBe('pong');
      expect(await pingPromiseFactory(clientSockets[1])).toBe('pong');
      expect(await pingPromiseFactory(clientSockets[2])).toBe('pong');
      expect(await pingPromiseFactory(clientSockets[3])).toBe('pong');
    });
  });

  describe('event create game', () => {
    // create game adds game to gamesMap
    // it('create game creates new game with correct info', async () => {

    // });
    // create game has player added to game
    // create game has player inGame toggled properly
    // cannot create game with the same name as another game
    // cannot create game if already in game

  });

  describe('event join game', () => {
    // cannot join non existent game
    // cannot join multiple games at once
    // game joined adds player successfully
    // create game has player inGame toggled properly
  });

  describe('closing', () => {
    it('closing disconnects all sockets', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 4);
      gameManager.close();
      // sleep for 100ms
      await sleepFactory(100);
      let connected = clientSockets.map(clientSocket => {
        return clientSocket.connected;
      });
      expect(connected).not.toContain(true);
    });

    it('closing clears playerMap', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 4);
      gameManager.close();
      expect(gameManager.playersMap.size).toBe(0);
    });

    // it('closing ends all games', async () => {
    //   [clientSockets, serverSockets] = await createSocketPairs(io, port, 5);
    // });

    // it('closing clears gamesMap', async () => {
    //   [clientSockets, serverSockets] = await createSocketPairs(io, port, 5);
    // });

    it('closing removes listeners from sockets', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      gameManager.close();
      await sleepFactory(100);
      let pingPromise = new Promise<string>((resolve, reject) => {
        let timeout = setTimeout(() => reject('timeout'), 200);
        clientSockets[0].emit('ping', (response: string) => {
          clearInterval(timeout);
          resolve(response);
        });
      });
      expect(pingPromise).rejects.toBe('timeout');
    });
  });
});