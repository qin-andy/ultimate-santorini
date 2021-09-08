import { Game } from "./game";
import { Player } from "./player";
import { TicTacToeGame } from './tictactoe';
import { Server } from 'socket.io';

export class GameManager {
  gamesMap: Map<string, Game>;
  playersMap: Map<string, Player>;
  matchmakingQueue: Array<string>;
  queueLoopId: NodeJS.Timer;

  io: Server;
  constructor(io: Server) {
    this.io = io;
    this.gamesMap = new Map<string, Game>();
    this.playersMap = new Map<string, Player>();
    this.matchmakingQueue = [];

    this.queueLoopId = this.startQueueLoop();
    this.attachListeners(io);
  }

  startQueueLoop(time: number = 10000) {
    let timer = setInterval(() => {
      // this.matchmakePlayersInQueue();
    }, time);
    return timer;
  }

  closeGame(game: Game) {
    let remainingPlayers = game.playerManager.getIds();
    remainingPlayers.forEach(id => {
      let player = this.playersMap.get(id);
      if (player) {
        player.inGame = false;
        player.currentGame = null;
      }
    });
    game.close();
    this.gamesMap.delete(game.name);
  }

  matchmakePlayersInQueue(): boolean {
    if (this.matchmakingQueue.length >= 2) {
      let player1id = this.matchmakingQueue.shift();
      if (!player1id) return false;
      let player1 = this.playersMap.get(player1id);
      if (!player1 || !player1.socket.connected) return false;

      let player2id = this.matchmakingQueue.shift();
      if (!player2id) {
        this.matchmakingQueue.push(player1id);
        return false;
      }
      let player2 = this.playersMap.get(player2id);
      if (!player2 || !player2.socket.connected) {
        this.matchmakingQueue.push(player1id);
        return false;
      }

      let newGame = new TicTacToeGame(player1id + player2id, this.io);
      newGame.addPlayer(player1);
      newGame.addPlayer(player2);
      newGame.start(); // TODO : someone might join the game by chance before game start?
      this.gamesMap.set(newGame.name, newGame);
      return true;
    }
    return false;
  }

  attachListeners(io: Server, dev: boolean = false) {
    io.on('connect', (socket) => {
      this.playersMap.set(socket.id, new Player(socket, 'New Player'));

      socket.on('ping', (acknowledger: Function) => {
        acknowledger('pong');
      });

      socket.on('join queue', (acknowledger: Function) => {
        let player = this.playersMap.get(socket.id);
        if (player) {
          if (!player.inGame) {
            player.inGame = true;
            this.matchmakingQueue.push(player.id);
            acknowledger(true);
          } else {
            acknowledger(false);
          }
        } else {
          acknowledger(false);
        }
      });

      socket.on('join game', (gameId: string, acknowledger: Function) => {
        let game = this.gamesMap.get(gameId);
        let player = this.playersMap.get(socket.id);
        if (game && player && !player?.inGame) {
          player.inGame = true;
          game.addPlayer(player);
          acknowledger(true);
        } else {
          acknowledger(false);
        }
      });

      socket.on('create game', (gameId: string, type: string = '', acknowledger: Function) => {
        let player = this.playersMap.get(socket.id);
        if (!this.gamesMap.has(gameId) && player && !player?.inGame) {
          player.inGame = true;
          let game: Game;
          if (type === 'tictactoe') {
            game = new TicTacToeGame(gameId, io)
          } else {
            game = new Game(gameId, io)
          }
          this.gamesMap.set(gameId, game);
          game.addPlayer(player);
          acknowledger(true);
        } else {
          acknowledger(false);
        }
      });

      socket.on('disconnect', () => {
        // game removal handled in playerManagement class
        let index = this.matchmakingQueue.indexOf(socket.id);
        if (index !== -1) {
          this.matchmakingQueue.splice(index, 1);
        }
        socket.removeAllListeners();
        let player = this.playersMap.get(socket.id);
        let currentGame = player?.currentGame;
        player?.currentGame?.removePlayer(socket.id);
        if (currentGame?.playerManager.getCount() === 0) {
          this.closeGame(currentGame);
        }
        this.playersMap.delete(socket.id);
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
    this.matchmakingQueue = [];
    clearInterval(this.queueLoopId);
    this.io.removeAllListeners();
  }
}