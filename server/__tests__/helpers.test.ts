import { Server, Socket as ServerSocket } from 'socket.io';
import Client, { Socket as ClientSocket } from 'socket.io-client';
import { createSocketPairs, createSocketServer } from './helpers';

describe('player manager tests', () => {
  const CLIENTS_COUNT = 2;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let serverSockets: ServerSocket[];

  beforeAll(() => {
    clientSockets = [];
    serverSockets = [];
  });

  describe('manual server setup tests', () => {
    afterEach(() => {
      clientSockets.forEach((socket) => {
        socket.close();
      });
      io.close();
      clientSockets = [];
      serverSockets = [];
    });

    it('createSocketServer server allows socket connections (server socket check)', async () => {
      [io, port] = await createSocketServer();
      let ioConnectPromise = new Promise<ServerSocket>((resolve) => {
        io.on('connect', resolve);
        clientSockets.push(Client(`http://localhost:${port}`));
      })
      let serverSocket = await ioConnectPromise;
      expect(serverSocket.connected).toBe(true);
      serverSocket.disconnect();
      expect(serverSocket.connected).toBe(false);
    });

    it('createSocketServer server allows socket connections (client socket check)', async () => {
      [io, port] = await createSocketServer();
      let clientConnectPromise = new Promise<ClientSocket>((resolve) => {
        let clientSocket = Client(`http://localhost:${port}`)
        clientSocket.on('connect', () => resolve(clientSocket));
      });

      let clientSocket = await clientConnectPromise;
      clientSockets.push(clientSocket);
      expect(clientSocket.connected).toBe(true);
      clientSocket.close();
      expect(clientSocket.connected).toBe(false);
    });
  });

  describe('persistent server and sockets between tests', () => {
    beforeAll(async () => {
      [io, port] = await createSocketServer();
    });

    afterAll(() => {
      clientSockets.forEach((socket) => {
        socket.close();
      });
      io.close();
      if (global.gc) { global.gc() }
    });

    beforeEach(async () => {
      [clientSockets, serverSockets] = await createSocketPairs(io, port, CLIENTS_COUNT);
    });

    it('createSocketPairs creates sockets with matching ids on the same indecies', async () => {
      for (let i = 0; i < clientSockets.length; i++) {
        expect(clientSockets[i].id).toBe(serverSockets[i].id);
      }
    });
  });
});