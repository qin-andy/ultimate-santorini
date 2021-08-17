import { createServer } from 'http';
import { AddressInfo } from 'net';

import Client, { Socket as ClientSocket } from 'socket.io-client';
import { Server, Socket as ServerSocket } from 'socket.io';

export const createClientSockets = async(port: number, count: number) => {
  let connectPromises: Array<Promise<ClientSocket>> = [];
  for (let i = 0; i < count; i++) {
    let clientConnectPromise = new Promise<ClientSocket>((resolve) => {
      let clientSocket = Client(`http://localhost:${port}`);
      clientSocket.once('connect', () => resolve(clientSocket));
    });
    connectPromises.push(clientConnectPromise);
  };
  return await Promise.all(connectPromises);
}

// For when access to server sockets is necessary
export const createSocketPairs = async (io: Server, port: number, count: number) => {
  let clientSockets: ClientSocket[] = [];
  let serverSockets: ServerSocket[] = [];
  for (let i = 0; i < count; i++) {
    let serverConnectPromise = new Promise<ServerSocket>((resolve) => {
      io.once('connect', resolve);
    });
    let clientConnectPromise = new Promise<ClientSocket>((resolve) => {
      let clientSocket = Client(`http://localhost:${port}`);
      clientSocket.once('connect', () => resolve(clientSocket));
    });
    let socketPair = await Promise.all([clientConnectPromise, serverConnectPromise]);
    clientSockets.push(socketPair[0]);
    serverSockets.push(socketPair[1]);
  };
  let socketTuple: [ClientSocket[], ServerSocket[]] = [clientSockets, serverSockets]
  return socketTuple;
}

export const createSocketServer = async () => {
  return new Promise<[Server, number]>((resolve) => {
    const httpServer = createServer();
    let io = new Server(httpServer);
    httpServer.listen(() => {
      let port = (httpServer.address() as AddressInfo).port;
      resolve([io, port]);
    });
  });
}