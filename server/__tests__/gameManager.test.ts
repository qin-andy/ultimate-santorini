import { Server, Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { TicTacToeGame } from '../src/game/tictactoe';
import { GameManager } from '../src/game/gameManager';
import { Player } from '../src/game/player';
import { GameEvent, GameResponse } from '../src/types/types';
import { createSocketPairs, createSocketServer } from './helpers';
import { Game } from '../src/game/game';

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


  // Promise Factories
  let sleepFactory = (delay: number) => {
    return new Promise<void>(resolve => { setTimeout(resolve, delay) });
  }

  let createGameFactory = (clientSocket: ClientSocket, gameId: string) => {
    return new Promise<boolean>((resolve, reject) => {
      let timeout = setTimeout(() => reject('timeout'), 200);
      clientSocket.emit('create game', gameId, (response: boolean) => {
        clearInterval(timeout);
        resolve(response);
      });
    });
  }

  let joinGameFactory = (clientSocket: ClientSocket, gameId: string) => {
    return new Promise<boolean>((resolve, reject) => {
      let timeout = setTimeout(() => reject('timeout'), 200);
      clientSocket.emit('join game', gameId, (response: boolean) => {
        clearInterval(timeout);
        resolve(response);
      });
    });
  }

  let pingPromiseFactory = (clientSocket: ClientSocket) => {
    return new Promise<string>((resolve, reject) => {
      let timeout = setTimeout(() => reject('timeout'), 200);
      clientSocket.emit('ping', (response: string) => {
        clearInterval(timeout);
        resolve(response);
      });
    });
  }

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
    it('create game with unique id acknowledges true', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      let acknowledged = await createGameFactory(clientSockets[0], 'Test Game');
      expect(acknowledged).toBe(true);
    });

    it('create game adds a new game to gamesMap', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      await createGameFactory(clientSockets[0], 'Test Game');
      expect(gameManager.gamesMap.size).toBe(1);
    });

    it('create game creates new game object with correct info (get from gamesMap, correct id)', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      await createGameFactory(clientSockets[0], 'Test Game');
      expect(gameManager.gamesMap.get('Test Game')).toBeTruthy();
      expect(gameManager.gamesMap.get('Test Game')?.name).toBe('Test Game');
    });

    it('create game adds player with correct socket to newly created game', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      await createGameFactory(clientSockets[0], 'Test Game');
      let gamePlayerIds = gameManager.gamesMap.get('Test Game')?.playerManager.getIds();
      expect(gamePlayerIds?.includes(clientSockets[0].id)).toBe(true);
    });

    it('create game toggles players inGame status to true', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      await createGameFactory(clientSockets[0], 'Test Game');
      let player = gameManager.playersMap.get(clientSockets[0].id);
      expect(player?.inGame).toBe(true);
    });

    it('multiple create games with unique names acknowledges true', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 4);
      let createGamePromises = clientSockets.map((clientSocket, index) => {
        return createGameFactory(clientSocket, 'Test Game ' + index);
      });
      let acknowledgedArray = await Promise.all(createGamePromises);
      expect(acknowledgedArray).not.toContain(false);
    });

    it('multiple create games with unique names have correct names', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 4);
      let createGamePromises = clientSockets.map((clientSocket, index) => {
        return createGameFactory(clientSocket, 'Test Game ' + index);
      });
      await Promise.all(createGamePromises);
      let gamesList = Array.from(gameManager.gamesMap.values());
      let namesList = gamesList.map(game => { return game.name });
      expect(namesList).toStrictEqual(expect.arrayContaining([
        'Test Game 0',
        'Test Game 1',
        'Test Game 2',
        'Test Game 3',
      ]));
    });

    it('two create games with same name, second acknowledges fail', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      await createGameFactory(clientSockets[0], 'Same Name');
      expect(await createGameFactory(clientSockets[1], 'Same Name')).toBe(false);
    });

    it('multiple create games with same name, other acknowledges fail', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 4);
      await createGameFactory(clientSockets[0], 'Same Name');
      expect(await createGameFactory(clientSockets[1], 'Same Name')).toBe(false);
      expect(await createGameFactory(clientSockets[2], 'Same Name')).toBe(false);
      expect(await createGameFactory(clientSockets[3], 'Same Name')).toBe(false);
      expect(await createGameFactory(clientSockets[1], 'Same Name')).toBe(false);
    });

    it('create game while already in game acknowledges fail', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      await createGameFactory(clientSockets[0], 'Game 1');
      expect(await createGameFactory(clientSockets[0], 'Game 2')).toBe(false);
    });
  });

  describe('event join game', () => {
    // game joined adds player successfully
    it('join game in gamesMap acknowledges true', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      let newGame = new Game('Direct Set Game', io)
      gameManager.gamesMap.set('Direct Set Game', newGame);
      expect(await joinGameFactory(clientSockets[0], 'Direct Set Game')).toBe(true);
    });

    it('join game in gamesMap adds player with correct id to game', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      let newGame = new Game('Direct Set Game', io)
      gameManager.gamesMap.set('Direct Set Game', newGame);
      await joinGameFactory(clientSockets[0], 'Direct Set Game');
      let playerIds = newGame.playerManager.getIds();
      expect(playerIds).toStrictEqual(expect.arrayContaining([clientSockets[0].id]));
    });

    it('join game in gamesMap toggles player inGame property to true', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      let newGame = new Game('Direct Set Game', io)
      gameManager.gamesMap.set('Direct Set Game', newGame);
      await joinGameFactory(clientSockets[0], 'Direct Set Game');
      let player = gameManager.playersMap.get(clientSockets[0].id);
      expect(player?.inGame).toBe(true);
    });

    it('multiple join game in gamesMap adds players with correct ids to game', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 5);
      let newGame = new Game('Direct Set Game', io)
      gameManager.gamesMap.set('Direct Set Game', newGame);
      let joinPromises = clientSockets.map(clientSocket => {
        return joinGameFactory(clientSocket, 'Direct Set Game');
      });
      await Promise.all(joinPromises);
      let playerIds = newGame.playerManager.getIds();
      let expectedIds = clientSockets.map(clientSocket => clientSocket.id)
      expect(playerIds).toStrictEqual(expect.arrayContaining(expectedIds));
    });

    it('join nonexistnet game acknolwedges false', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      expect(await joinGameFactory(clientSockets[0], 'Fake Game')).toBe(false);
    });

    it('one socket joining multiple games acknowledges false', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      let newGame1 = new Game('Direct Set Game 1', io)
      gameManager.gamesMap.set('Direct Set Game 1', newGame1);

      let newGame2 = new Game('Direct Set Game 2', io)
      gameManager.gamesMap.set('Direct Set Game 2', newGame2);

      expect(await joinGameFactory(clientSockets[0], 'Direct Set Game 1')).toBe(true);
      expect(await joinGameFactory(clientSockets[0], 'Direct Set Game 2')).toBe(false);
    });
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

    it('closing clears gamesMap', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      let acknowledged = await createGameFactory(clientSockets[0], 'Test Game');
      gameManager.close();
      await sleepFactory(100);
      expect(gameManager.gamesMap.size).toBe(0);
    });

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

    it.todo('closing ends all games');
  });
});