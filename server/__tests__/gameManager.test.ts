import { Server, Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { GameManager } from '../src/manager/gameManager';
import { Player } from '../src/player/player';
import { ManagerEvent, ManagerResponse, ManagerHandler } from '../src/types/types';
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

  let managerResponseFactory = async (clientSocket: ClientSocket) => { // helper function for game responses
    let updatePromise = new Promise<ManagerResponse>((resolve, reject) => {
      clientSocket.on('manager response', (response: ManagerResponse) => {
        clientSocket.off('manager response');
        resolve(response);
      });
    });
    return updatePromise;
  }

  function createManagerEvent(id: string, type: string, payload?: any): ManagerEvent {
    let event: ManagerEvent = {
      type: type,
      payload: payload,
      id: id,
      acknowledger: () => { }
    }
    return event;
  }

  function getHandler(type: string): ManagerHandler {
    let handler = gameManager.eventHandlerMap.get(type);
    if (!handler) throw new Error(type + ' event handler does not exist!');
    return handler;
  }

  function sendEvent(id: string, type: string, payload?: any): ManagerResponse {
    let event = createManagerEvent(id, type, payload);
    let handler = getHandler(event.type);
    let response = handler(event);
    return response;
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

    it('ping handler works', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      let response = sendEvent(clientSockets[0].id, 'ping');
      expect(response.payload).toBe('pong');
    });

    it('ping event handler listeners attached correctly to socket', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      let promise = managerResponseFactory(clientSockets[0]);
      clientSockets[0].emit('manager action', 'ping');
      let response = await promise;
      expect(response.payload).toBe('pong');
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

  describe('game management updates', () => {
    describe('event create game', () => {
      it('create game adds a new game to gamesMap with correct info', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let payload = { name: 'Test Game' };
        let response = sendEvent(clientSockets[0].id, 'create game', payload);
        expect(gameManager.gamesMap.size).toBe(1);
        expect(gameManager.gamesMap.get('Test Game')).toBeTruthy();
        expect(gameManager.gamesMap.get('Test Game')?.name).toBe('Test Game');
        expect(response.error).toBe(false);
      });

      it('create game adds players with correct socket to newly created game', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let payload = { name: 'Test Game' };
        sendEvent(clientSockets[0].id, 'create game', payload);
        let gamePlayerIds = gameManager.gamesMap.get('Test Game')?.playerManager.getIds();
        expect(gamePlayerIds?.includes(clientSockets[0].id)).toBe(true);
      });

      it('create game toggles players inGame status to true', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let payload = { name: 'Test Game' };
        sendEvent(clientSockets[0].id, 'create game', payload);
        let player = gameManager.playersMap.get(clientSockets[0].id);
        expect(player?.inGame).toBe(true);
      });

      it('multiple create games with unique names acknowledges true', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        let response1 = sendEvent(clientSockets[0].id, 'create game', { name: 'Test Game' });
        let response2 = sendEvent(clientSockets[1].id, 'create game', { name: 'Test Game 2' });
        expect(response1.error).toBe(false);
        expect(response2.error).toBe(false);
      });

      it('two create games with same name, second response error is true', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        let response1 = sendEvent(clientSockets[0].id, 'create game', { name: 'Test Game' });
        let response2 = sendEvent(clientSockets[1].id, 'create game', { name: 'Test Game' });
        expect(response1.error).toBe(false);
        expect(response2.error).toBe(true);
      });

      it('create game while already in game response error is true', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let response1 = sendEvent(clientSockets[0].id, 'create game', { name: 'Test Game' });
        let response2 = sendEvent(clientSockets[0].id, 'create game', { name: 'Test Game 2' });
        expect(response1.error).toBe(false);
        expect(response2.error).toBe(true);
      });

      it('cannot create game if player does not exist', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let player = gameManager.playersMap.get(clientSockets[0].id);
        if (!player) throw new Error('player does not exist!');
        gameManager.playersMap.delete(player.id);
        let response = sendEvent(clientSockets[0].id, 'create game', { name: 'Test Game' });
        expect(response.payload).toBe(player.id);
        expect(response.error).toBe(true);
      });

      it('create autoplay game adds a new autoplay tictactoegame', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        let response = sendEvent(clientSockets[0].id, 'create game', {
          name: 'Test Game', type: 'tictactoe', autoplay: true
        });
        expect(response.error).toBe(false);
        let joinResponse = sendEvent(clientSockets[1].id, 'join game', { name: 'Test Game' });
        let newGame = gameManager.gamesMap.get('Test Game');
        expect(newGame?.active).toBe(true);
        expect(newGame?.running).toBe(true);
      });
    });

    describe('event join game', () => {
      // game joined adds player successfully
      it('join game in gamesMap adds player with correct id to game', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let newGame = new Game('Direct Set Game', io)
        gameManager.gamesMap.set('Direct Set Game', newGame);
        let response = sendEvent(clientSockets[0].id, 'join game', { name: 'Direct Set Game' });
        let playerIds = newGame.playerManager.getIds();
        expect(response.error).toBe(false);
        expect(playerIds).toStrictEqual(expect.arrayContaining([clientSockets[0].id]));
      });

      it('join game in gamesMap toggles player inGame property to true', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let newGame = new Game('Direct Set Game', io)
        gameManager.gamesMap.set('Direct Set Game', newGame);
        let response = sendEvent(clientSockets[0].id, 'join game', { name: 'Direct Set Game' });
        let player = gameManager.playersMap.get(clientSockets[0].id);
        expect(player?.inGame).toBe(true);
      });

      it('multiple join game in gamesMap adds players with correct ids to game', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 5);
        let newGame = new Game('Direct Set Game', io)
        gameManager.gamesMap.set('Direct Set Game', newGame);
        let joinPromises = clientSockets.map(clientSocket => {
          sendEvent(clientSocket.id, 'join game', { name: 'Direct Set Game' });
        });
        let playerIds = newGame.playerManager.getIds();
        let expectedIds = clientSockets.map(clientSocket => clientSocket.id)
        expect(playerIds).toStrictEqual(expect.arrayContaining(expectedIds));
      });

      it('join nonexistent game response error is true', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let response = sendEvent(clientSockets[0].id, 'join game', { name: 'Direct Set Game' });
        expect(response.error).toBe(true);
      });

      it('one socket joining multiple games error is true', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let newGame1 = new Game('Direct Set Game 1', io)
        gameManager.gamesMap.set('Direct Set Game 1', newGame1);

        let newGame2 = new Game('Direct Set Game 2', io)
        gameManager.gamesMap.set('Direct Set Game 2', newGame2);

        let response1 = sendEvent(clientSockets[0].id, 'join game', { name: 'Direct Set Game 1' });
        let response2 = sendEvent(clientSockets[0].id, 'join game', { name: 'Direct Set Game 2' });
        expect(response1.error).toBe(false);
        expect(response2.error).toBe(true);
      });

      it('cannot join game if player does not exist', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let player = gameManager.playersMap.get(clientSockets[0].id);
        if (!player) throw new Error('player does not exist!');
        gameManager.playersMap.delete(player.id);
        let response = sendEvent(clientSockets[0].id, 'join game', { name: 'Direct Set Game' });

        expect(response.type).toBe('does not exist');
        expect(response.payload).toBe(player.id);
        expect(response.error).toBe(true);
      });

      it('join active game gives error', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let newGame = new Game('Direct Set Game', io)
        gameManager.gamesMap.set('Direct Set Game', newGame);
        newGame.active = true;
        let response = sendEvent(clientSockets[0].id, 'join game', { name: 'Direct Set Game' });
        expect(response.error).toBe(true);
      });
    });

    describe('event player info', () => {
      it('player info returns correct id and ingame info 1', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let response = sendEvent(clientSockets[0].id, 'player info');
        expect(response.payload.id).toBe(clientSockets[0].id);
        expect(response.payload.inGame).toBe(false);
      });

      it('cannot get info if player does not exist', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let player = gameManager.playersMap.get(clientSockets[0].id);
        if (!player) throw new Error('player does not exist!');
        gameManager.playersMap.delete(player.id);
        let response = sendEvent(clientSockets[0].id, 'player info');
        expect(response.type).toBe('does not exist');
        expect(response.payload).toBe(player.id);
        expect(response.error).toBe(true);
      });
    });

    describe('event leave game', () => {
      it('leave game while in game leaves game', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        let newGame = new Game('Direct Set Game', io)
        gameManager.gamesMap.set('Direct Set Game', newGame);
        sendEvent(clientSockets[0].id, 'join game', { name: 'Direct Set Game' });
        sendEvent(clientSockets[1].id, 'join game', { name: 'Direct Set Game' });
        let response = sendEvent(clientSockets[0].id, 'leave game');
        expect(newGame.playerManager.getCount()).toBe(1);
        expect(gameManager.playersMap.get(clientSockets[0].id)?.inGame).toBe(false);
        expect(gameManager.playersMap.get(clientSockets[0].id)?.currentGame).toBe(null);

        expect(response.type).toBe('leave game');
        expect(response.error).toBe(false);
        expect(response.payload).toBe('Direct Set Game');
      });

      it('cannot leave game while not in game', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        let response = sendEvent(clientSockets[0].id, 'leave game');
        expect(response.type).toBe('leave game');
        expect(response.error).toBe(true);
      });

      it('cannot leave game if player does not exist', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let player = gameManager.playersMap.get(clientSockets[0].id);
        if (!player) throw new Error('player does not exist!');
        gameManager.playersMap.delete(player.id);
        let response = sendEvent(clientSockets[0].id, 'leave game');

        expect(response.type).toBe('does not exist');
        expect(response.payload).toBe(player.id);
        expect(response.error).toBe(true);
      });
    });
  });

  describe('matchmatking queue', () => {
    describe('join queue event joins queue', () => {
      it('new player join queue successful', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let player = gameManager.playersMap.get(clientSockets[0].id);
        if (!player) throw new Error('Player doesn\'t exist!');

        let response = sendEvent(clientSockets[0].id, 'join queue');
        expect(response.error).toBe(false);
        expect(gameManager.matchmakingQueue[0]).toBe(clientSockets[0].id);
        expect(player.inGame).toBe(true);
      });

      it('join queue calls matchmake queue and makes new game if there are two people', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        let player1 = gameManager.playersMap.get(clientSockets[0].id);
        if (!player1) throw new Error('Player doesnt exist!');
        let player2 = gameManager.playersMap.get(clientSockets[1].id);
        if (!player2) throw new Error('Player doesnt exist!');
        sendEvent(clientSockets[0].id, 'join queue');
        sendEvent(clientSockets[1].id, 'join queue');

        expect(gameManager.matchmakingQueue.length).toBe(0);
        expect(player1.inGame).toBe(true);
        expect(player2.inGame).toBe(true);
      });

      it('player with ingame as false attempt join queue response error is true', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let player = gameManager.playersMap.get(clientSockets[0].id);
        if (!player) throw new Error('Player doesn\'t exist!');
        player.inGame = true;
        let response = sendEvent(clientSockets[0].id, 'join queue');
        expect(gameManager.matchmakingQueue.length).toBe(0);
        expect(response.error).toBe(true);
      });

      it('player not in playermap attempt join queue response error is true', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        gameManager.playersMap.delete(clientSockets[0].id);
        let response = sendEvent(clientSockets[0].id, 'join queue');
        expect(gameManager.matchmakingQueue.length).toBe(0);
        expect(response.error).toBe(true);
      });

      it('player disconnect removes them from queue', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
        let response = sendEvent(clientSockets[0].id, 'join queue');
        expect(gameManager.matchmakingQueue[0]).toBe(clientSockets[0].id);
        clientSockets[0].disconnect();
        await sleepFactory(200);
        expect(gameManager.matchmakingQueue.length).toBe(0);
      });
    });

    describe('matchmakeQueue function tests', () => {
      it('matchmake queue returns true if both players exist, are connected, and not ingame', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        gameManager.matchmakingQueue.push(clientSockets[0].id);
        gameManager.matchmakingQueue.push(clientSockets[1].id);
        expect(gameManager.matchmakePlayersInQueue()).toBe(true);
      });

      it('matchmake queue creates new game with correct name and players', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        gameManager.matchmakingQueue.push(clientSockets[0].id);
        gameManager.matchmakingQueue.push(clientSockets[1].id);
        let expectedIds = clientSockets.map(clientSocket => clientSocket.id);
        gameManager.matchmakePlayersInQueue();
        expect(gameManager.gamesMap.has(clientSockets[0].id + clientSockets[1].id)).toBe(true);
        let newGame = gameManager.gamesMap.get(clientSockets[0].id + clientSockets[1].id);
        expect(newGame?.playerManager.getIds()).toStrictEqual(expect.arrayContaining(expectedIds));
      });

      it('matchmake queue removes both players from queue if successful', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        gameManager.matchmakingQueue.push(clientSockets[0].id);
        gameManager.matchmakingQueue.push(clientSockets[1].id);
        gameManager.matchmakePlayersInQueue();
        expect(gameManager.matchmakingQueue).toStrictEqual([]);
      });

      it('matchmake queue emits queue game found event to both players', async () => {
        [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
        gameManager.matchmakingQueue.push(clientSockets[0].id);
        gameManager.matchmakingQueue.push(clientSockets[1].id);
        let promise1 = managerResponseFactory(clientSockets[0]);
        let promise2 = managerResponseFactory(clientSockets[1]);
        gameManager.matchmakePlayersInQueue();
        let response1 = await promise1;
        let response2 = await promise2;
        expect(gameManager.matchmakingQueue.length).toBe(0);
        expect(response1.error).toBe(false);
        expect(response1.type).toBe('queue game found');
        expect(response2.error).toBe(false);
        expect(response2.type).toBe('queue game found');
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
      sendEvent(clientSockets[0].id, 'create game', { name: 'Game to be Closed' });
      expect(gameManager.gamesMap.size).toBe(1);
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

    it('closing closes games', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 6);
      sendEvent(clientSockets[0].id, 'create game', { name: 'Game 1' });
      let game1 = gameManager.gamesMap.get('Game 1');
      if (!game1) throw new Error('Game not found in gamesMap!');
      game1.running = true;
      gameManager.close();
      // only checks if running is toggled back to false. is there a more robust way to check game closure?
      expect(game1.running).toBe(false);
    });

    it('closing clears queue', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      sendEvent(clientSockets[0].id, 'join queue');
      expect(gameManager.matchmakingQueue[0]).toBe(clientSockets[0].id);
      gameManager.close();
      await sleepFactory(200);
      expect(gameManager.matchmakingQueue).toStrictEqual([]);
    });
  });
});