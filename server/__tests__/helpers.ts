import Client, { Socket as ClientSocket } from 'socket.io-client';


/*
  returns a Promise which resolves to an array of client sockets which
  have ALL CONNECTED to the server on the given port. (count number of
  sockets are created).
*/
export const createNewClientSocketsArray = async (port: number, count: number) => {
  return new Promise<ClientSocket[]>(async (resolve, reject) => {
    let clientSockets: ClientSocket[] = [];
    let connectPromises = [];
    for (let i = 0; i < count; i++) {

      // Each socket connection is wrapped in its own promise
      let connectPromise = new Promise<void>((resolve, reject) => {
        let clientSocket = Client(`http://localhost:${port}`);
        clientSockets.push(clientSocket);
        clientSocket.on('connect', resolve);
      });
      connectPromises.push(connectPromise);
    };

    // Promises are run concurrently using Promise.all
    await Promise.all(connectPromises);
    resolve(clientSockets);
  });
}