import Client, { Socket as ClientSocket } from 'socket.io-client';


/*
  returns a Promise which resolves to an array of client sockets which
  have ALL CONNECTED to the server on the given port. (count number of
  sockets are created).
*/
export const createNewClientSocketsArray = async (port: number, count: number) => {
  return new Promise<ClientSocket[]>(async (resolve, reject) => {
    let connectPromises: Promise<ClientSocket>[] = [];

    for (let i = 0; i < count; i++) {
      connectPromises.push(new Promise<ClientSocket>((resolve, reject) => {
        let clientSocket = Client(`http://localhost:${port}`);
        clientSocket.on('connect', () => resolve(clientSocket));
      }));
    };

    // Promises are run concurrently using Promise.all
    resolve(await Promise.all(connectPromises));
  });
}