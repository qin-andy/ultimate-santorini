import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { GameManager } from './game/gameManager';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

let gameManager = new GameManager(io);

const publicPath = path.join(__dirname, '..', '..', 'client', 'build');
app.use(express.static(publicPath));

app.get('/info', (req, res) => {
  let info: any = {};
  let games = Array.from(gameManager.gamesMap.values());
  let gamesInfoArray = games.map(game => {
    let gameInfo: any = {};
    gameInfo.name = game.name;
    gameInfo.players = game.playerManager.getIds();
    return gameInfo;
  });
  info.gamesInfo = gamesInfoArray;
  info.players = Array.from(gameManager.playersMap.keys());
  res.json(info);
});

io.on('connect', (socket) => {
  console.log(socket.id + ': connected!');
});

io.on('disconnect', (socket) => {
  console.log(socket.id + ': disconnected!');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

export default server;