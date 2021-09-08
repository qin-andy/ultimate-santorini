import { Server, Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { Game } from '../src/game/game';
import { Player } from '../src/game/player';
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

  describe('basic info', () => {
    it('name returns right name', async () => {
      expect(game.name).toBe('Test Game 1');
    });

    it('after add player, player\'s current game references correct game', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 3);
      expect(players[0].currentGame).toStrictEqual(game);
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

    it('game start returns null game response payload', async () => {
      expect(game.start().type).toBe('null');
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

    it.only('removed players leave socket room and do not recieve room emits', async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, 2);
      let pingRoomRecievedPromised = new Promise<string>((resolve, reject) => {
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
  });
});