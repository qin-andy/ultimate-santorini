import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

io.on('connect', (socket) => {
  console.log(socket + ' connected!');
  socket.on('chat message', (msg: string) => {
    console.log('msg');
  })
})

app.get('/', (req, res) => {
  res.send("Hello, world!");
});

export default server;