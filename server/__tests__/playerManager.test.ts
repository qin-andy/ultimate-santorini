import { createServer } from 'http';
import { AddressInfo } from 'net';
import { disconnect } from 'process';
import { Server, Socket as ServerSocket } from 'socket.io';
import Client, { Socket as ClientSocket } from 'socket.io-client';
import { Player, PlayerManager } from "../src/socket/PlayerManager";

describe('player manager tests', () => {
  const DONE_DELAY = 300;
  const IN_BETWEEN_DELAY = 300;
  const CLIENTS_COUNT = 70;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let playerManager: PlayerManager;
  let count = 1;

  beforeAll((done) => {
    // create playerManager
    playerManager = new PlayerManager();
    clientSockets = [];

    // create server instance
    const httpServer = createServer();
    io = new Server(httpServer);

    // once server is listening
    httpServer.listen(() => {
      io.on('connection', (socket) => {
        // increment each socket connected name
        let name = 'Player ' + count;
        playerManager.addPlayer(new Player(socket, name));
        count++;
      });
      port = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  afterAll(() => {
    io.close();
    clientSockets.forEach((clientSocket) => {
      clientSocket.close();
    });
  });

  beforeEach((done) => {
    let connectedCount = 0; // track number of connected sockets
    for (let i = 0; i < CLIENTS_COUNT; i++) {
      let clientSocket = Client(`http://localhost:${port}`);
      clientSockets.push(clientSocket);
      clientSocket.on('connect', () => {
        connectedCount++;
        if (connectedCount === CLIENTS_COUNT) {
          setTimeout(done, IN_BETWEEN_DELAY); // finish once all sockets are connected
        }
      });
    }
    count = 1;

  });

  afterEach((done) => {
    clientSockets.forEach((socket) => socket.close());
    playerManager = new PlayerManager();
    clientSockets = [];
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
        expect(player.getSocketId()).toBe(clientSocket.id);
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

    it('remove first player get names doesnt include first player', (done) => {
      playerManager.removePlayer(clientSockets[0].id);
      clientSockets[0].close();
      clientSockets.shift();
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

    it('get nonexisent player throws error', () => {
      expect(() => playerManager.getPlayerById('invalid player name')).toThrowError();
    });
  });

  describe('player listener management', () => {// listener function
    let testFn = (message: string) => io.emit('test2', message);
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

    it('add listener to all', (done) => {
      let recievedCount = 0;
      clientSockets.forEach((clientSocket) => {
        clientSocket.on('all', () => {
          recievedCount++;
          if (recievedCount === clientSockets.length) {
            done();
          }
        });
      });
      playerManager.addListenerToAll('all', (data) => io.emit('all'));
      clientSockets[0].emit('all');
    });

    it('remove listener from all', (done) => {
      let timer = setTimeout(done, DONE_DELAY); // waits for 500 ms
      clientSockets.forEach((clientSocket) => {
        clientSocket.on('all', () => {
          clearTimeout(timer);
          done('error, message still recieved on handler all!');
        });
      });
      playerManager.addListenerToAll('all', (data) => io.emit('all'));
      playerManager.removeListenerFromAll('all');
      clientSockets[0].emit('all');
    });

    it('disconnectAll disconnects all sockets', (done) => {
      // check sockets are connected
      clientSockets.forEach((clientSocket) => {
        expect(clientSocket.connected).toBe(true);
      });
      try {
        playerManager.disconnectAll();
        let disconnectedCount = 0;
        // check sockets are disconnected after a time
        clientSockets.forEach((clientSocket) => {
          clientSocket.on('disconnect', () => {
            disconnectedCount++;
            if (disconnectedCount === CLIENTS_COUNT) {
              done();
            }
          });
        });
      } catch (err) {
        done(err);
      }
    });
  });
});