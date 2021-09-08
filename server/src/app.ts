import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { GameManager } from './game/gameManager';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

app.get('/', (req, res) => {
  res.send("Hello, world!");
});

let gameManager = new GameManager(io);

export default server;