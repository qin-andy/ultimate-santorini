import { Server, Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { GameManager } from '../src/game/gameManager';
import { Player } from '../src/game/player';
import { ManagerResponse } from '../src/types/types';
import { createSocketPairs, createSocketServer } from './helpers';
import { Game } from '../src/game/game';

describe('game manager tests', () => {
  const IN_BETWEEN_DELAY = 100;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let serverSockets: ServerSocket[];
  let gameManager: GameManager;

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

  beforeEach(() => {
    gameManager = new GameManager(io);
  })

  afterEach((done) => {
    clientSockets.forEach((socket) => socket.close());
    clientSockets = [];
    serverSockets = [];
    gameManager.close();

    setTimeout(done, IN_BETWEEN_DELAY);
  });

  let sleepFactory = (delay: number) => {
    return new Promise<void>(resolve => { setTimeout(resolve, delay) });
  }

  let createGameFactory = (clientSocket: ClientSocket, gameId: string, type: string = '') => {
    return new Promise<ManagerResponse>((resolve, reject) => {
      let timeout = setTimeout(() => reject('timeout'), 200);
      let payload = { name: gameId, type: type }
      clientSocket.emit('manager action', 'create game', payload, (response: ManagerResponse) => {
        clearInterval(timeout);
        resolve(response);
      });
    });
  }

  let joinGameFactory = (clientSocket: ClientSocket, name: string) => {
    return new Promise<ManagerResponse>((resolve, reject) => {
      let timeout = setTimeout(() => reject('timeout'), 200);
      clientSocket.emit('manager action', 'join game', name, (response: ManagerResponse) => {
        clearInterval(timeout);
        resolve(response);
      });
    });
  }

  let pingPromiseFactory = (clientSocket: ClientSocket) => {
    return new Promise<ManagerResponse>((resolve, reject) => {
      let timeout = setTimeout(() => reject('timeout'), 200);
      clientSocket.emit('manager action', 'ping', null, (response: ManagerResponse) => {
        clearInterval(timeout);
        resolve(response);
      });
    });
  }

  let responsePromiseFactory = async (clientSocket: ClientSocket) => { // helper function for game responses
    let updatePromise = new Promise<ManagerResponse>((resolve, reject) => {
      clientSocket.once('game update', (response: ManagerResponse) => {
        if (response.error) {
          reject(response);
        } else {
          resolve(response)
        }
      });
    });
    return updatePromise;
  }

  let managerResponsePromiseFactory = async (clientSocket: ClientSocket) => { // helper function for game responses
    let updatePromise = new Promise<ManagerResponse>((resolve, reject) => {
      clientSocket.once('manager response', (response: ManagerResponse) => {
        if (response.error) {
          reject(response);
        } else {
          resolve(response)
        }
      });
    });
    return updatePromise;
  }

  let queuePromiseFactory = (clientSocket: ClientSocket) => {
    return new Promise<ManagerResponse>((resolve, reject) => {
      let timeout = setTimeout(() => reject('timeout'), 200);
      clientSocket.emit('manager action', 'join queue', null, (response: ManagerResponse) => {
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
      expect((await pingPromiseFactory(clientSockets[0])).payload).toBe('pong');
    });

    it('ping listener attached correctly to multiple sockets', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 4);
      expect((await pingPromiseFactory(clientSockets[0])).payload).toBe('pong');
      expect((await pingPromiseFactory(clientSockets[1])).payload).toBe('pong');
      expect((await pingPromiseFactory(clientSockets[2])).payload).toBe('pong');
      expect((await pingPromiseFactory(clientSockets[3])).payload).toBe('pong');
    });

    it('player disconnect removes them from their current game', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      let newGame = new Game('new game', io);
      gameManager.gamesMap.set(newGame.name, newGame);
      let player1 = gameManager.playersMap.get(clientSockets[0].id);
      let player2 = gameManager.playersMap.get(clientSockets[1].id);
      if (!player1 || !player2) {
        throw new Error('players not tracked by gamemanager playersmap!');
      }
      newGame.addPlayer(player1);
      newGame.addPlayer(player2);
      expect(newGame.playerManager.getIds()).toStrictEqual(expect.arrayContaining([player1.id, player2.id]));
      player1.socket.disconnect();
      expect(newGame.playerManager.getIds()).toStrictEqual(expect.arrayContaining([player2.id]));
      player2.socket.disconnect();
      expect(newGame.playerManager.getIds()).toStrictEqual(expect.arrayContaining([]));

    });

    it('player disconnect removes them from playermap', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      clientSockets[0].disconnect();
      expect(gameManager.playersMap.has(clientSockets[0].id)).toBe(false);
    });

    it('player disconnect closes current game if they are the last one in game', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      let player1 = gameManager.playersMap.get(clientSockets[0].id);
      let player2 = gameManager.playersMap.get(clientSockets[1].id);
      if (!player1 || !player2) throw new Error('player not added to gameManager correctly!');
      let newGame = new Game('new game', io, this);
      gameManager.gamesMap.set(newGame.name, newGame);
      newGame.addPlayer(player1);
      newGame.addPlayer(player2);
      player1.socket.disconnect();
      expect(gameManager.gamesMap.has(newGame.name)).toBe(true);
      player2.socket.disconnect();
      expect(gameManager.gamesMap.has(newGame.name)).toBe(false);
    });
  });

  describe('event handlers', () => {
    describe('event create game', () => {
      // create game adds game to gamesMap
      it('create game with unique id manager response no errors', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let response = await createGameFactory(clientSockets[0], 'Test Game');
        expect(response.error).toBe(false);
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

      it('two create games with same name, second response error is true', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        await createGameFactory(clientSockets[0], 'Same Name');
        let response = await createGameFactory(clientSockets[1], 'Same Name');
        expect(response.error).toBe(true);
      });

      it('multiple create games with same name, other response errors are true', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 4);
        await createGameFactory(clientSockets[0], 'Same Name');
        let responsePromises = [
          createGameFactory(clientSockets[1], 'Same Name'),
          createGameFactory(clientSockets[2], 'Same Name'),
          createGameFactory(clientSockets[3], 'Same Name'),
          createGameFactory(clientSockets[1], 'Same Name')
        ];

        let responses = await Promise.all(responsePromises);
        expect(responses[0].error).toBe(true);
        expect(responses[1].error).toBe(true);
        expect(responses[2].error).toBe(true);
        expect(responses[3].error).toBe(true);
      });

      it('create game while already in game response error is true', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        await createGameFactory(clientSockets[0], 'Game 2');
        let response = await createGameFactory(clientSockets[0], 'Game 1');
        expect(response.error).toBe(true);
      });
    });

    describe('event join game', () => {
      // game joined adds player successfully
      it('join game in gamesMap error is false', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let newGame = new Game('Direct Set Game', io)
        gameManager.gamesMap.set('Direct Set Game', newGame);
        let response = await joinGameFactory(clientSockets[0], 'Direct Set Game')
        expect(response.error).toBe(false);
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

      it('join nonexistent game response error is true', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let response = await joinGameFactory(clientSockets[0], 'Fake Game')
        expect(response.error).toBe(true);
      });

      it('one socket joining multiple games error is true', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let newGame1 = new Game('Direct Set Game 1', io)
        gameManager.gamesMap.set('Direct Set Game 1', newGame1);

        let newGame2 = new Game('Direct Set Game 2', io)
        gameManager.gamesMap.set('Direct Set Game 2', newGame2);

        let response1 = await joinGameFactory(clientSockets[0], 'Direct Set Game 1');
        let response2 = await joinGameFactory(clientSockets[0], 'Direct Set Game 1');
        expect(response1.error).toBe(false);
        expect(response2.error).toBe(true);
      });
    });

    describe('event player info', () => {
      it('player info returns correct id and ingame info 1', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let responsePromise = managerResponsePromiseFactory(clientSockets[0]);
        clientSockets[0].emit('manager action', 'player info');
        let response = await responsePromise;
        expect(response.payload.id).toBe(clientSockets[0].id);
        expect(response.payload.inGame).toBe(false);
      });
    });
  });

  describe('matchmatking queue', () => {
    describe('join queue event through socket emit', () => {
      it('new player join queue error is false', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let response = await queuePromiseFactory(clientSockets[0]);
        expect(response.error).toBe(false);
      });

      it('player join queue has id added to queue', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        await queuePromiseFactory(clientSockets[0]);
        expect(gameManager.matchmakingQueue[0]).toBe(clientSockets[0].id);
      });

      it('player join queue has inGame property set to true', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        await queuePromiseFactory(clientSockets[0]);
        let player = gameManager.playersMap.get(clientSockets[0].id);
        if (!player) {
          throw new Error('Player doesn\'t exist!');
        }
        expect(player.inGame).toBe(true);
      });

      it('player with ingame as false attempt join queue response error is true', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let player = gameManager.playersMap.get(clientSockets[0].id);
        if (!player) {
          throw new Error('Player doesn\'t exist!');
        }
        player.inGame = true;
        let response = await queuePromiseFactory(clientSockets[0]);
        expect(gameManager.matchmakingQueue.length).toBe(0);
        expect(response.error).toBe(true);
      });

      it('player not in playermap attempt join queue response error is true', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        gameManager.playersMap.delete(clientSockets[0].id);
        let response = await queuePromiseFactory(clientSockets[0]);
        expect(gameManager.matchmakingQueue.length).toBe(0);
        expect(response.error).toBe(true);
      });

      it('player disconnect removes them from queue', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        await queuePromiseFactory(clientSockets[0]);
        expect(gameManager.matchmakingQueue[0]).toBe(clientSockets[0].id);
        clientSockets[0].disconnect();
        await sleepFactory(200);
        expect(gameManager.matchmakingQueue.length).toBe(0);
      });
    });

    describe('matchmakeQueue function tests', () => {
      // MATCHMAKE PLAYERS IN QUEUE TESTS
      // matchmake queue returns true if both players exist, are connected, and not ingame
      it('matchmake queue returns true if both players exist, are connected, and not ingame', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        gameManager.matchmakingQueue.push(clientSockets[0].id);
        gameManager.matchmakingQueue.push(clientSockets[1].id);
        expect(gameManager.matchmakePlayersInQueue()).toBe(true);
      });

      it('matchmake queue creates new game in gamesMap with name as the player ids concatted', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        gameManager.matchmakingQueue.push(clientSockets[0].id);
        gameManager.matchmakingQueue.push(clientSockets[1].id);
        gameManager.matchmakePlayersInQueue();
        expect(gameManager.gamesMap.has(clientSockets[0].id + clientSockets[1].id)).toBe(true);
      });

      it('matchmake queue creates new game in gamesMap with correct players in playermanager', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        gameManager.matchmakingQueue.push(clientSockets[0].id);
        gameManager.matchmakingQueue.push(clientSockets[1].id);
        gameManager.matchmakePlayersInQueue();
        let newGame = gameManager.gamesMap.get(clientSockets[0].id + clientSockets[1].id);
        if (!newGame) throw new Error('New game not created!');
        let expectedIds = clientSockets.map(clientSocket => clientSocket.id);
        expect(newGame.playerManager.getIds()).toStrictEqual(expect.arrayContaining(expectedIds));
      });

      it('matchmake queue removes both players from queue if successful', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        gameManager.matchmakingQueue.push(clientSockets[0].id);
        gameManager.matchmakingQueue.push(clientSockets[1].id);
        gameManager.matchmakePlayersInQueue();
        expect(gameManager.matchmakingQueue).toStrictEqual([]);
      });

      // matchmake queue returns false if less than 2 players
      it('matchmake queue returns false if less than 2 players', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        expect(gameManager.matchmakePlayersInQueue()).toBe(false);
        gameManager.matchmakingQueue.push(clientSockets[0].id);
        expect(gameManager.matchmakePlayersInQueue()).toBe(false);

      });
      // matchmake queue returns false if player 1 doesnt exist in playersmap
      it('matchmake queue returns false if player 1 doesnt exist in playersMap', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        gameManager.matchmakingQueue.push(clientSockets[0].id);
        gameManager.matchmakingQueue.push(clientSockets[1].id);
        gameManager.playersMap.delete(clientSockets[0].id);
        expect(gameManager.matchmakePlayersInQueue()).toBe(false);
      });

      // matchmake queue returns false if player 1 is disconnected
      it('matchmake queue returns false if player 1 is disconnected', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        gameManager.matchmakingQueue.push(clientSockets[0].id);
        gameManager.matchmakingQueue.push(clientSockets[1].id);
        serverSockets[0].disconnect(); // not sure why doesn't clientSockets[0].disconnect work?
        sleepFactory(200);
        expect(gameManager.matchmakePlayersInQueue()).toBe(false);
      });

      // matchmake queue returns false if player 2 doesn't exist in playersmap
      it('matchmake queue returns false if player 2 doesnt exist in playersMap', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        gameManager.matchmakingQueue.push(clientSockets[0].id);
        gameManager.matchmakingQueue.push(clientSockets[1].id);
        gameManager.playersMap.delete(clientSockets[1].id);
        expect(gameManager.matchmakePlayersInQueue()).toBe(false);
      });

      // matchmake queue returns false if player 2 is disconnected
      it('matchmake queue returns false if player 2 is disconnected', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        gameManager.matchmakingQueue.push(clientSockets[0].id);
        gameManager.matchmakingQueue.push(clientSockets[1].id);
        serverSockets[1].disconnect(); // not sure why doesn't clientSockets[0].disconnect work?
        sleepFactory(200);
        expect(gameManager.matchmakePlayersInQueue()).toBe(false);
      });


      // matchmake queue readds player 1 if player 2 doesn't exist in playersmap
      it('matchmake queue readds player 1 if player 2 doesnt exist in playersMap', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        gameManager.matchmakingQueue.push(clientSockets[0].id);
        gameManager.matchmakingQueue.push(clientSockets[1].id);
        gameManager.playersMap.delete(clientSockets[1].id);
        expect(gameManager.matchmakePlayersInQueue()).toBe(false);
        expect(gameManager.matchmakingQueue).toStrictEqual([clientSockets[0].id]);
      });

      // matchmake queue readds player 1 if player 2 is disconnected
      it('matchmake queue readds player 1 if player 2 is disconnected', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        gameManager.matchmakingQueue.push(clientSockets[0].id);
        gameManager.matchmakingQueue.push(clientSockets[1].id);
        serverSockets[1].disconnect(); // not sure why doesn't clientSockets[0].disconnect work?
        sleepFactory(200);
        expect(gameManager.matchmakePlayersInQueue()).toBe(false);
        expect(gameManager.matchmakingQueue).toStrictEqual([clientSockets[0].id]);
      });

      it('matchmake queue with multiple players in queue has correct queue', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 6);
        clientSockets.forEach((clientSocket) => {
          gameManager.matchmakingQueue.push(clientSocket.id);
        });
        let expectedIds = clientSockets.map(clientSocket => clientSocket.id);
        expectedIds.shift();
        expectedIds.shift();
        gameManager.matchmakePlayersInQueue();
        expect(gameManager.matchmakingQueue).toStrictEqual(expectedIds);
      });

      it('multiple matchmake queue with multiple players has correct queue', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 6);
        clientSockets.forEach((clientSocket) => {
          gameManager.matchmakingQueue.push(clientSocket.id);
        });
        let expectedIds = clientSockets.map(clientSocket => clientSocket.id);
        expectedIds.shift();
        expectedIds.shift();
        expectedIds.shift();
        expectedIds.shift();
        gameManager.matchmakePlayersInQueue();
        gameManager.matchmakePlayersInQueue();
        expect(gameManager.matchmakingQueue).toStrictEqual(expectedIds);
      });

      it('failed matchmake queue with multiple players ' +
        'putting player 1 back in queue has correct queue', async () => {
          [clientSockets, serverSockets] = await createSocketPairs(io, port, 6);
          clientSockets.forEach((clientSocket) => {
            gameManager.matchmakingQueue.push(clientSocket.id);
          });
          let expectedIds = clientSockets.map(clientSocket => clientSocket.id);
          let replaced = expectedIds.shift();
          if (!replaced) {
            throw new Error('Error constructing expected id, shifted element is undefined!');
          }
          expectedIds.shift();
          expectedIds.push(replaced);
          gameManager.playersMap.delete(clientSockets[1].id);
          gameManager.matchmakePlayersInQueue();
          expect(gameManager.matchmakingQueue).toStrictEqual(expectedIds);
        });
    });
  });

  describe('close game', () => {
    it('close game updates player ingame to false', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      let player1 = gameManager.playersMap.get(clientSockets[0].id);
      let player2 = gameManager.playersMap.get(clientSockets[1].id);
      if (!player1 || !player2) throw new Error('player not added to gameManager correctly!');
      let newGame = new Game('new game', io, this);
      gameManager.gamesMap.set(newGame.name, newGame);
      newGame.addPlayer(player1);
      newGame.addPlayer(player2);
      expect(player1.inGame).toBe(true);
      expect(player2.inGame).toBe(true);
      gameManager.closeGame(newGame);
      expect(player1.inGame).toBe(false);
      expect(player2.inGame).toBe(false);
    });

    it('close game updates player currentgame to null', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      let player1 = gameManager.playersMap.get(clientSockets[0].id);
      let player2 = gameManager.playersMap.get(clientSockets[1].id);
      if (!player1 || !player2) throw new Error('player not added to gameManager correctly!');
      let newGame = new Game('new game', io, this);
      gameManager.gamesMap.set(newGame.name, newGame);

      newGame.addPlayer(player1);
      newGame.addPlayer(player2);
      expect(player1.currentGame).toBe(newGame);
      expect(player2.currentGame).toBe(newGame);
      gameManager.closeGame(newGame);
      expect(player2.currentGame).toBe(null);
      expect(player1.currentGame).toBe(null);
    });

    it('close game deletes game from gamesmap', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      let newGame = new Game('new game', io, this);
      gameManager.gamesMap.set(newGame.name, newGame);
      gameManager.closeGame(newGame);
      expect(gameManager.gamesMap.has(newGame.name)).toBe(false);

    });
  });

  describe('close self', () => {
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

    it('closing closes all games', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 6);
      await createGameFactory(clientSockets[0], 'Game 1', 'tictactoe');
      await joinGameFactory(clientSockets[1], 'Game 1');

      await createGameFactory(clientSockets[2], 'Game 2', 'tictactoe');
      await joinGameFactory(clientSockets[3], 'Game 2');

      await createGameFactory(clientSockets[4], 'Game 3', 'tictactoe');
      await joinGameFactory(clientSockets[5], 'Game 3');
      let game1 = gameManager.gamesMap.get('Game 1');
      let game2 = gameManager.gamesMap.get('Game 2');
      let game3 = gameManager.gamesMap.get('Game 3');

      game1?.start();
      game2?.start();
      game3?.start();

      gameManager.close();
      // only checks if running is toggled back to false. is there a more robust way to check game closure?
      expect(game1?.running).toBe(false);
      expect(game2?.running).toBe(false);
      expect(game3?.running).toBe(false);
    });

    it('closing clears queue', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      await queuePromiseFactory(clientSockets[0]);
      expect(gameManager.matchmakingQueue[0]).toBe(clientSockets[0].id);
      gameManager.close();
      await sleepFactory(200);
      expect(gameManager.matchmakingQueue).toStrictEqual([]);
    });

    it.todo('closing clears queue matchmaking loop');
  });

  describe('concurrent tictactoe games with multiple sockets', () => {
    it('full game set 1', async () => {
      // Two games, first has errors and wins, second ends on a mark
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 4);
      let DELAY = 100;
      let game1Promise = new Promise<ManagerResponse>(async resolve => {
        // direct game, repeated actions/moving out of turn

        await createGameFactory(clientSockets[0], 'Game 1', 'tictactoe');
        await joinGameFactory(clientSockets[1], 'Game 1');

        let startResponsePromise = responsePromiseFactory(clientSockets[0]);
        clientSockets[0].emit('game action', 'tictactoe start');
        await startResponsePromise;


        clientSockets[0].emit('game action', 'tictactoe mark', { x: 0, y: 0 });
        await sleepFactory(DELAY);

        // repeated
        clientSockets[0].emit('game action', 'tictactoe mark', { x: 0, y: 0 });
        await sleepFactory(DELAY);

        // mark existing
        clientSockets[1].emit('game action', 'tictactoe mark', { x: 0, y: 0 });
        await sleepFactory(DELAY);

        clientSockets[1].emit('game action', 'tictactoe mark', { x: 0, y: 1 });
        await sleepFactory(DELAY);

        // repeated
        clientSockets[1].emit('game action', 'tictactoe mark', { x: 0, y: 1 });
        await sleepFactory(DELAY);

        clientSockets[0].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
        await sleepFactory(DELAY);

        // mark existing
        clientSockets[1].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
        await sleepFactory(DELAY);

        clientSockets[1].emit('game action', 'tictactoe mark', { x: 2, y: 2 });
        await sleepFactory(DELAY);

        clientSockets[0].emit('game action', 'tictactoe mark', { x: 1, y: 0 });
        await sleepFactory(DELAY);

        clientSockets[1].emit('game action', 'tictactoe mark', { x: 2, y: 1 });
        await sleepFactory(DELAY);

        // repeated
        clientSockets[1].emit('game action', 'tictactoe mark', { x: 2, y: 1 });
        await sleepFactory(DELAY);

        let responsePromise = responsePromiseFactory(clientSockets[0]);
        clientSockets[0].emit('game action', 'tictactoe mark', { x: 2, y: 0 });
        let response = await responsePromise;
        resolve(response);
      });

      let game2Promise = new Promise<ManagerResponse>(async resolve => {
        // direct game, repeated actions/moving out of turn

        await createGameFactory(clientSockets[2], 'Game 2', 'tictactoe');
        await joinGameFactory(clientSockets[3], 'Game 2');

        let startResponsePromise = responsePromiseFactory(clientSockets[2]);
        clientSockets[2].emit('game action', 'tictactoe start');
        await startResponsePromise;

        clientSockets[2].emit('game action', 'tictactoe mark', { x: 0, y: 0 });
        await sleepFactory(DELAY);

        clientSockets[3].emit('game action', 'tictactoe mark', { x: 0, y: 1 });
        await sleepFactory(DELAY);

        clientSockets[2].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
        await sleepFactory(DELAY);

        clientSockets[3].emit('game action', 'tictactoe mark', { x: 2, y: 2 });
        await sleepFactory(DELAY);

        clientSockets[2].emit('game action', 'tictactoe mark', { x: 1, y: 0 });
        await sleepFactory(DELAY);

        clientSockets[3].emit('game action', 'tictactoe mark', { x: 2, y: 1 });
        await sleepFactory(DELAY);

        let responsePromise = responsePromiseFactory(clientSockets[2]);
        clientSockets[2].emit('game action', 'tictactoe mark', { x: 0, y: 2 });
        let response = await responsePromise;
        resolve(response);
      });

      let gameResponses = await Promise.all([game1Promise, game2Promise]);
      expect(gameResponses[0].payload.winner).toBe('o');
      expect(gameResponses[0].type).toBe('win');
      expect(gameResponses[1].type).toBe('mark');
    });

    it('full game set 2', async () => {
      // 5 of the same game played out with different sockets
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 10);
      let DELAY = 100;
      let duplicateGameTestFactory = (name: string, i: number, j: number) => {
        return new Promise<ManagerResponse>(async resolve => {
          // direct game, repeated actions/moving out of turn

          await createGameFactory(clientSockets[i], name, 'tictactoe');
          await joinGameFactory(clientSockets[j], name);

          let startResponsePromise = responsePromiseFactory(clientSockets[i]);
          clientSockets[i].emit('game action', 'tictactoe start');
          await startResponsePromise;

          clientSockets[i].emit('game action', 'tictactoe mark', { x: 0, y: 0 });
          await sleepFactory(DELAY);

          // repeated
          clientSockets[i].emit('game action', 'tictactoe mark', { x: 0, y: 0 });
          await sleepFactory(DELAY);

          // mark existing
          clientSockets[j].emit('game action', 'tictactoe mark', { x: 0, y: 0 });
          await sleepFactory(DELAY);

          clientSockets[j].emit('game action', 'tictactoe mark', { x: 0, y: 1 });
          await sleepFactory(DELAY);

          // repeated
          clientSockets[j].emit('game action', 'tictactoe mark', { x: 0, y: 1 });
          await sleepFactory(DELAY);

          clientSockets[i].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
          await sleepFactory(DELAY);

          // mark existing
          clientSockets[j].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
          await sleepFactory(DELAY);

          clientSockets[j].emit('game action', 'tictactoe mark', { x: 2, y: 2 });
          await sleepFactory(DELAY);

          clientSockets[i].emit('game action', 'tictactoe mark', { x: 1, y: 0 });
          await sleepFactory(DELAY);

          clientSockets[j].emit('game action', 'tictactoe mark', { x: 2, y: 1 });
          await sleepFactory(DELAY);

          // repeated
          clientSockets[j].emit('game action', 'tictactoe mark', { x: 2, y: 1 });
          await sleepFactory(DELAY);

          let responsePromise = responsePromiseFactory(clientSockets[i]);
          clientSockets[i].emit('game action', 'tictactoe mark', { x: 2, y: 0 });
          let response = await responsePromise;
          resolve(response);
        });
      }

      let responsePromises = [
        duplicateGameTestFactory('Game 1', 0, 1),
        duplicateGameTestFactory('Game 2', 2, 3),
        duplicateGameTestFactory('Game 3', 4, 5),
        duplicateGameTestFactory('Game 4', 6, 7),
        duplicateGameTestFactory('Game 5', 8, 9),
      ];
      let responses = await Promise.all(responsePromises);
      responses.forEach(response => {
        expect(response.payload.winner).toBe('o');
        expect(response.type).toBe('win');
      });
    });

    it('matchmake queue sets', async () => {
      let DELAY = 50;
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 5);
      // Promises are awaited sequentially to ensure order, (vs Promise.all([]))
      for (let i = 0; i < clientSockets.length; i++) {
        await queuePromiseFactory(clientSockets[i]);
      }
      gameManager.matchmakePlayersInQueue();
      gameManager.matchmakePlayersInQueue();
      expect(gameManager.matchmakingQueue).toStrictEqual([clientSockets[4].id]);
      let game1Promise = new Promise<ManagerResponse>(async resolve => {
        let gameName = clientSockets[0].id + clientSockets[1].id;
        let start = gameManager.gamesMap.get(gameName)?.start();

        clientSockets[0].emit('game action', 'tictactoe mark', { x: 0, y: 0 });
        await sleepFactory(DELAY);

        // repeated
        clientSockets[0].emit('game action', 'tictactoe mark', { x: 0, y: 0 });
        await sleepFactory(DELAY);

        // mark existing
        clientSockets[1].emit('game action', 'tictactoe mark', { x: 0, y: 0 });
        await sleepFactory(DELAY);

        clientSockets[1].emit('game action', 'tictactoe mark', { x: 0, y: 1 });
        await sleepFactory(DELAY);

        // repeated
        clientSockets[1].emit('game action', 'tictactoe mark', { x: 0, y: 1 });
        await sleepFactory(DELAY);

        clientSockets[0].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
        await sleepFactory(DELAY);

        // mark existing
        clientSockets[1].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
        await sleepFactory(DELAY);

        clientSockets[1].emit('game action', 'tictactoe mark', { x: 2, y: 2 });
        await sleepFactory(DELAY);

        clientSockets[0].emit('game action', 'tictactoe mark', { x: 1, y: 0 });
        await sleepFactory(DELAY);

        clientSockets[1].emit('game action', 'tictactoe mark', { x: 2, y: 1 });
        await sleepFactory(DELAY);

        // repeated
        clientSockets[1].emit('game action', 'tictactoe mark', { x: 2, y: 1 });
        await sleepFactory(DELAY);

        let responsePromise = responsePromiseFactory(clientSockets[0]);
        clientSockets[0].emit('game action', 'tictactoe mark', { x: 2, y: 0 });
        let response = await responsePromise;
        resolve(response);
      });

      let game2Promise = new Promise<ManagerResponse>(async resolve => {
        // direct game, repeated actions/moving out of turn
        let gameName = clientSockets[0].id + clientSockets[1].id;
        gameManager.gamesMap.get(gameName)?.start();

        clientSockets[2].emit('game action', 'tictactoe mark', { x: 0, y: 0 });
        await sleepFactory(DELAY);

        clientSockets[3].emit('game action', 'tictactoe mark', { x: 0, y: 1 });
        await sleepFactory(DELAY);

        clientSockets[2].emit('game action', 'tictactoe mark', { x: 1, y: 1 });
        await sleepFactory(DELAY);

        clientSockets[3].emit('game action', 'tictactoe mark', { x: 2, y: 2 });
        await sleepFactory(DELAY);

        clientSockets[2].emit('game action', 'tictactoe mark', { x: 1, y: 0 });
        await sleepFactory(DELAY);

        clientSockets[3].emit('game action', 'tictactoe mark', { x: 2, y: 1 });
        await sleepFactory(DELAY);

        let responsePromise = responsePromiseFactory(clientSockets[2]);
        clientSockets[2].emit('game action', 'tictactoe mark', { x: 0, y: 2 });
        let response = await responsePromise;
        resolve(response);
      });

      let gameResponses = await Promise.all([game1Promise, game2Promise]);
      expect(gameResponses[0].payload.winner).toBe('o');
      expect(gameResponses[0].type).toBe('win');
      expect(gameResponses[1].type).toBe('mark');
    });
  });
});