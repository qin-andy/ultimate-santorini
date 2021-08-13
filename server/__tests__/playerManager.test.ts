import { createServer } from 'http';
import { AddressInfo } from 'net';
import { Server, Socket as ServerSocket } from 'socket.io';
import Client, { Socket as ClientSocket } from 'socket.io-client';
import { Player, PlayerManager } from "../src/socket/PlayerManager";

describe('player manager tests', () => {
  const CLIENTS_COUNT = 5;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let playerManager: PlayerManager;

  beforeAll((done) => {
    // create playerManager
    playerManager = new PlayerManager();
    clientSockets = [];
    let nextName = '1';

    // create server instance
    const httpServer = createServer();
    io = new Server(httpServer);

    // once server is listening
    httpServer.listen(() => {
      io.on('connection', (socket) => {
        // increment each socket connected name
        nextName = '' + (playerManager.addPlayer(socket, 'Player ' + nextName) + 1);
      });

      port = (httpServer.address() as AddressInfo).port;
      let count = 0;

      // store each client socket in clientSockets array
      // once all sockets are connected, done
      for (let i = 0; i < CLIENTS_COUNT; i++) {
        let clientSocket = Client(`http://localhost:${port}`);
        clientSocket.on('connect', () => {
          clientSockets.push(clientSocket);
          count++;
          if (count === CLIENTS_COUNT) {
            done();
          }
        });
      }
    });
  });

  afterAll(() => {
    io.close();
    clientSockets.forEach((clientSocket) => {
      clientSocket.close();
    });
  });

  it('get count returns correct number of players (' + CLIENTS_COUNT + ')', () => {
    expect(playerManager.getCount()).toBe(CLIENTS_COUNT);
  });

  it('get names returns correct player names', () => {
    let expectedNames: string[] = [];
    for (let count = 0; count < CLIENTS_COUNT; count++) {
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
});