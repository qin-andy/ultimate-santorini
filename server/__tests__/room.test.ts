// import { createServer } from 'http';
// import { AddressInfo } from 'net';
// import { Server, Socket as ServerSocket } from 'socket.io';
// import Client, { Socket as ClientSocket } from 'socket.io-client';
// import { Player, PlayerManager } from "../src/socket/PlayerManager";
// import { Room } from '../src/socket/room';

// describe('player manager tests', () => {
//   const DONE_TIMEOUT = 300;
//   const CLIENTS_COUNT = 3;
//   let port: number;
//   let io: Server;
//   let clientSockets: ClientSocket[];
//   let room: Room;
//   let count = 1;

//   beforeAll((done) => {
//     // create playerManager
//     clientSockets = [];

//     // create server instance
//     const httpServer = createServer();
//     io = new Server(httpServer);

//     // once server is listening
//     httpServer.listen(() => {
//       io.on('connection', (socket) => {
//         // increment each socket connected name
//         let name = 'Player ' + count;
//         room = new Room('Test Room')
//         room.addPlayer(new Player(socket, name)));
//         count++;
//       });
//       port = (httpServer.address() as AddressInfo).port;
//       done();
//     });
//   });

//   afterAll(() => {
//     io.close();
//     clientSockets.forEach((clientSocket) => {
//       clientSocket.close();
//     });
//   });

//   beforeEach((done) => {
//     let connectedCount = 0; // track number of connected sockets
//     for (let i = 0; i < CLIENTS_COUNT; i++) {
//       let clientSocket = Client(`http://localhost:${port}`);
//       clientSockets.push(clientSocket);
//       clientSocket.on('connect', () => {
//         connectedCount++;
//         if (connectedCount === CLIENTS_COUNT) {
//           done(); // finish once all sockets are connected
//         }
//       });
//     }
//     count = 1;
//   });

//   afterEach(() => {
//     clientSockets.forEach((socket) => socket.close());
//     playerManager = new PlayerManager();
//     clientSockets = [];
//   });
// });