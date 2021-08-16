import Client, { Socket as ClientSocket } from 'socket.io-client';

export const createNewClientSockets = async (port: number, count: number) => {
  return new Promise<ClientSocket[]>(async (resolve, reject) => {
    let clientSockets: ClientSocket[] = [];
    let connectPromises = [];
    for (let i = 0; i < count; i++) {
      let connectPromise = new Promise<void>((resolve, reject) => {
        let clientSocket = Client(`http://localhost:${port}`);
        clientSocket.on('connect', () => {
          clientSockets.push(clientSocket);
          resolve();
        });
      });
      connectPromises.push(connectPromise);
    };
    await Promise.all(connectPromises);
    resolve(clientSockets);
  });
}