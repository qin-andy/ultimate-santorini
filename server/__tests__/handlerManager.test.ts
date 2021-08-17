import { Server, Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { createClientSockets, createSocketPairs, createSocketServer } from './helpers';

describe('player manager tests', () => {
  const CLIENTS_COUNT = 5;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let serverSockets: ServerSocket[];
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

  beforeEach(async () => {
    [clientSockets, serverSockets] = await createSocketPairs(io, port, CLIENTS_COUNT);
  });

  afterEach(() => {
    clientSockets.forEach((socket) => socket.close());
  });
});