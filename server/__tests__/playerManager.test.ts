import { createServer } from 'http';
import { AddressInfo } from 'net';
import { disconnect } from 'process';
import { Server, Socket as ServerSocket } from 'socket.io';
import Client, { Socket as ClientSocket } from 'socket.io-client';
import { Player, PlayerManager } from "../src/socket/PlayerManager";
import { createNewClientSocketsArray } from './helpers';

describe('player manager tests', () => {
  const DONE_DELAY = 100;
  const IN_BETWEEN_DELAY = 100;
  const CLIENTS_COUNT = 10;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let playerManager: PlayerManager;
  let playerCount = 1;

  beforeAll((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);
    playerManager = new PlayerManager();

    httpServer.listen(() => {
      io.on('connection', (socket) => {
        // increment each socket connected name
        let name = 'Player ' + playerCount;
        playerManager.addPlayer(new Player(socket, name));
        playerCount++;
      });
      port = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  afterAll(() => {
    io.close();
    playerManager.disconnectAll();
    clientSockets.forEach((clientSocket) => {
      clientSocket.close();
    });
  });

  beforeEach(async () => {
    playerManager = new PlayerManager();
    playerCount = 1;
    clientSockets = await createNewClientSocketsArray(port, CLIENTS_COUNT);
  });

  afterEach((done) => {
    clientSockets.forEach((socket) => socket.close());
    setTimeout(done, IN_BETWEEN_DELAY);
  });

  describe('player manager info', () => {
    it('get count returns correct number of players (' + CLIENTS_COUNT + ')', () => {
      expect(playerManager.getCount()).toBe(CLIENTS_COUNT);
    });

    it('get names returns correct player names', () => {
      let expectedNames: string[] = [];
      for (let count = 0; count < CLIENTS_COUNT; count++) {
        // Assuming names are ordered
        expectedNames.push('Player ' + (count + 1));
      }
      expect(playerManager.getNames()).toEqual(expect.arrayContaining(expectedNames));
    });

    it('get names returns correct socket ids', () => {
      let expectedIds = clientSockets.map((socket) => {
        return socket.id;
      });
      expect(playerManager.getIds()).toEqual(expect.arrayContaining(expectedIds));
    });

    it('get player by socket id returns correct player and socket', () => {
      clientSockets.forEach((clientSocket, index) => {
        let player = playerManager.getPlayerById(clientSocket.id);
        expect(player.getId()).toBe(clientSocket.id);
      });
    });
  });

  describe('adding and removing players', () => {
    it('add new players get names returns new ids', (done) => {
      // add playeres is called automatically when a client connects.
      let newClientSocket = Client(`http://localhost:${port}`);
      clientSockets.push(newClientSocket);
      newClientSocket.on('connect', () => {
        let expectedIds = clientSockets.map((socket) => {
          return socket.id;
        });
        try {
          expect(playerManager.getIds()).toEqual(expect.arrayContaining(expectedIds));
          done();
        } catch (err) { // since we're using done, have to catch the error and pass it to done
          done(err);
        }
      });
    });

    it.only('remove first player get names doesnt include first player', () => {
      playerManager.removePlayer(clientSockets[0].id);
      clientSockets[0].close();
      clientSockets.shift();
      let expectedIds = clientSockets.map((socket) => {
        return socket.id;
      });
      expect(playerManager.getIds()).toEqual(expect.arrayContaining(expectedIds));
    });

    it('remove first player twice throws error', () => {
      // DOUBLE CHECK THIS; does disconnecting this client socket cause any issues
      // in teardown?
      playerManager.removePlayer(clientSockets[0].id);
      expect(() => playerManager.removePlayer(clientSockets[0].id)).toThrowError();
    });

    it('get nonexisent player throws error', () => {
      expect(() => playerManager.getPlayerById('invalid player name')).toThrowError();
    });

    it('remove nonexistaent player throws error', () => {
      expect(() => playerManager.removePlayer('invalid player name')).toThrowError();
    })
  });

  describe('player listener management', () => {// listener function
    let testFn = () => (message: string) => io.emit('test2', message);
    it('add listener to single player', (done) => {
      // when client receives test2, check data message
      clientSockets[0].on('test2', (message) => {
        try {
          expect(message).toBe('test message');
          done();
        } catch (err) { // since we're using done, have to catch the error and pass it to done
          done(err);
        }
      });
      playerManager.addListener(clientSockets[0].id, 'test1', testFn);
      clientSockets[0].emit('test1', 'test message');
    });

    it('remove listener from single player', (done) => {
      let timer = setTimeout(done, DONE_DELAY); // waits for 500 ms
      clientSockets[0].on('test2', (message) => {
        clearTimeout(timer);
        done('message recieved on same listener!');
      });

      playerManager.addListener(clientSockets[0].id, 'test1', testFn);
      playerManager.removeListener(clientSockets[0].id, 'test1');
      clientSockets[0].emit('test1', 'test message');
    });

    it('add listener to all', async () => {
      let receievedPromises = clientSockets.map((clientSocket) => {
        return new Promise<void>((resolve, reject) => {
          clientSocket.on('all', () => {
            resolve();
          });
        });
      });
      playerManager.addListenerToAll('all', (data) => () => io.emit('all'));
      clientSockets[0].emit('all');
      await Promise.all(receievedPromises);
    });

    it('remove listener from all', (done) => {
      let timer = setTimeout(done, DONE_DELAY); // waits for 500 ms
      clientSockets.forEach((clientSocket) => {
        clientSocket.on('all', () => {
          clearTimeout(timer);
          done('error, message still recieved on handler all!');
        });
      });
      playerManager.addListenerToAll('all', () => (data) => io.emit('all'));
      playerManager.removeListenerFromAll('all');
      clientSockets[0].emit('all');
    });

    it('add and remove listeners to all multiple times', async () => {
      let receievedPromises = clientSockets.map((clientSocket) => {
        return new Promise<void>((resolve, reject) => {
          clientSocket.on('all', () => {
            resolve();
          });
        });
      });
      for (let i = 0; i < 10; i++) {
        playerManager.addListenerToAll('all', () => (data) => io.emit('all'));
        playerManager.removeListenerFromAll('all');
      }
      playerManager.addListenerToAll('all', () => (data) => io.emit('all'));
      clientSockets[0].emit('all');
      await Promise.all(receievedPromises);
    });

    it('disconnectAll disconnects all sockets', async () => {
      // check sockets are connected
      clientSockets.forEach((clientSocket) => {
        expect(clientSocket.connected).toBe(true);
      });
      playerManager.disconnectAll();
      let disconnectPromises = clientSockets.map((clientSocket) => {
        return new Promise<void>((resolve, reject) => {
          clientSocket.on('all', () => {
            resolve();
          });
        });
      });
      Promise.all(disconnectPromises);
    });
  });
});