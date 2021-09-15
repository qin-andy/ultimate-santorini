import { Server, Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { Game } from '../src/game/game';
import { Player } from '../src/player/player';
import { GameEvent, GameResponse } from '../src/types/types';
import { createSocketPairs, createSocketServer } from './helpers';

describe('game class tests', () => {
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

  describe('adding and removing players', () => {
    it('name returns right name', async () => {
      expect(game.name).toBe('Test Game 1');
    });

    it('after add player, player\'s current game references correct game', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 3);
      expect(players[0].currentGame).toStrictEqual(game);
    });

    it('after add player, player ingame is true', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 3);
      expect(players[0].inGame).toBe(true);
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

    it('on add player, current game is updated', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      const handleMirror = (event: GameEvent) => {
        event.acknowledger(event.payload);
      }
      game.eventHandlerMap.set('mirror test', handleMirror);
      let mirrorPromise = new Promise<string>((resolve) => {
        let payload = 'test message';
        clientSockets[0].emit('game action', 'mirror test', payload, resolve);
      });
      expect(await mirrorPromise).toBe('test message');
    });

    it('after add add remove player, game playerManager has correct info 2', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 3);
      game.removePlayer(players[0].id);
      game.removePlayer(players[1].id);
      expect(game.playerManager.getNames()[0]).toEqual(players[2].name);
      expect(game.playerManager.getCount()).toBe(1);
    });

    it('remove player returns removed player', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 3);
      let removedPlayer = game.removePlayer(players[0].id);
      if (!removedPlayer) throw new Error('player doesn\'t exist in game!');
      expect(removedPlayer).toStrictEqual(players[0]);
    });

    it('remove player sets removed player\'s current game to null', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 3);
      let removedPlayer = game.removePlayer(players[0].id);
      if (!removedPlayer) throw new Error('player doesn\'t exist in game!');
      expect(removedPlayer.currentGame).toBe(null);
    });

    it('remove last player closes game', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);;
      game.running = true;
      game.removePlayer(players[0].id);
      game.removePlayer(players[1].id);

      expect(game.running).toBe(false);
    });

    it('game start returns null game response payload', async () => {
      let response = game.start();
      expect(response.payload).toBe(null);
    });
  });

  describe('connecting and disconnecting', () => {
    it('on add player, event handler map correctly attached', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      const handleMirror = (event: GameEvent) => {
        event.acknowledger(event.payload);
      }
      game.eventHandlerMap.set('mirror test', handleMirror);
      let mirrorPromise = new Promise<string>((resolve) => {
        let payload = 'test message';
        clientSockets[0].emit('game action', 'mirror test', payload, resolve);
      });
      expect(await mirrorPromise).toBe('test message');
    });

    it('on add player, example event handlers attached (initalizeHandlers called)', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 1);
      let mirrorPromise = new Promise<GameResponse>((resolve) => {
        let payload = 'test message mirror';
        clientSockets[0].emit('game action', 'mirror', payload, resolve);
      });
      expect((await mirrorPromise).payload).toBe('test message mirror');
    });

    it('added players join socket room and recieve room emits', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      let pingRoomRecievedPromised = new Promise<string>(resolve => {
        clientSockets[1].once('ping room', payload => {
          resolve(payload);
        });
      });
      let pingRoomPromise = new Promise<string>(resolve => {
        let payload = 'test message';
        clientSockets[0].emit('game action', 'ping room', payload, resolve);
      });
      await pingRoomPromise;
      expect(await pingRoomRecievedPromised).toBe(clientSockets[0].id + ': test message');
    });

    it('removed players leave socket room and do not recieve room emits', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      let pingRoomRecievedPromised = new Promise<string>((resolve) => {
        let timeout = setTimeout(() => resolve('no message'), 300);
        clientSockets[1].once('ping room', payload => {
          clearTimeout(timeout);
          resolve(payload);
        });
      });
      game.removePlayer(clientSockets[1].id);
      let pingRoomPromise = new Promise<string>(resolve => {
        let payload = 'test message';
        clientSockets[0].emit('game action', 'ping room', payload, resolve);
      });
      await pingRoomPromise;
      expect(await pingRoomRecievedPromised).toBe('no message');
    });

    it('removed players have game action listener removed', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      game.removePlayer(clientSockets[1].id);
      let mirrorPromise = new Promise<string>(resolve => {
        let payload = 'test message';
        let timeout = setTimeout(() => resolve('no message'), 300);
        clientSockets[1].emit('game action', 'mirror', payload, (message: GameResponse) => {
          clearTimeout(timeout);
          resolve(message.payload);
        });
      });
      expect(await mirrorPromise).toBe('no message');
    });

    it('player disconnected while game is running emits to other players', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 3);
      function responsePromiseFactory(clientSocket: ClientSocket) {
        return new Promise<GameResponse>((resolve, reject) => {
          let timeout = setTimeout(() => reject('timeout'), 200);
          clientSocket.once('game update', (response: GameResponse) => {
            clearTimeout(timeout);
            resolve(response);
          });
        });
      }
      game.running = true;
      let [response1, response2] = [responsePromiseFactory(clientSockets[0]), responsePromiseFactory(clientSockets[1])];
      let expectedId = clientSockets[2].id;
      game.removePlayer(clientSockets[2].id);
      let responses = await Promise.all([response1, response2]);
      expect(responses[0].type).toBe('player disconnect');
      expect(responses[1].type).toBe('player disconnect');
      expect(responses[0].payload.id).toBe(expectedId);
    });
  });

  describe('closing and ending', () => {
    it('end sets running to false', () => {
      game.running = true;
      game.end();
      expect(game.running).toBe(false);
    });
  });
});