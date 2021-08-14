import { Server, Socket as ServerSocket } from 'socket.io';

export function testHandlers(io: Server, socket: ServerSocket) {
  socket.on('chat message', (msg: string) => {
    io.to(socket.id).emit('status', 200);
  });
}