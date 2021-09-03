import { Game } from "./game";
import { Player } from "./player";
import { TicTacToeGame } from './tictactoe';
import { Server } from 'socket.io';

export class GameManager {
  gamesMap: Map<string, Game>;
  playersMap: Map<string, Player>;
  io: Server;
  constructor(io: Server) {
    this.io = io;
    this.gamesMap = new Map<string, Game>();
    this.playersMap = new Map<string, Player>();
    this.attachListeners(io);
  }

  attachListeners(io: Server) {
    io.on('connect', (socket) => {
      this.playersMap.set(socket.id, new Player(socket, 'New Player'));

      socket.on('ping', (acknowledger: Function) => {
        acknowledger('pong');
      });

      socket.on('join game', (gameId: string, acknowledger: Function) => {
        let game = this.gamesMap.get(gameId);
        let player = this.playersMap.get(socket.id);
        if (game && player && !player?.inGame) {
          player.inGame = true;
          game.addPlayer(player);
          acknowledger(true); // TODO : detailed acknowledgements
        } else {
          acknowledger(false);
        }
      });

      socket.on('create game', (gameId: string, acknowledger: Function) => {
        let player = this.playersMap.get(socket.id);
        if (!this.gamesMap.has(gameId) && player && !player?.inGame) {
          player.inGame = true;
          let game = new Game(gameId, io)
          this.gamesMap.set(gameId, game);
          game.addPlayer(player);
          acknowledger(true); // TODO : detailed acknowledgements
        } else {
          acknowledger(false);
        }
      });
    });
  }

  close() {
    this.gamesMap.forEach(game => {
      game.close();
    });
    this.playersMap.forEach(player => {
      player.socket.disconnect();
    });
    this.gamesMap.clear();
    this.playersMap.clear();
    this.io.removeAllListeners();
  }
}