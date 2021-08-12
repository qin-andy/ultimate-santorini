import { Server, Socket as ServerSocket } from 'socket.io';

export function testHandlers(io: Server, socket: ServerSocket) {
  socket.on('chat message', (msg: string) => {
    console.log(msg);
    //socket.emit('status', 200);
    io.to(socket.id).emit('status', 200);
  });
}