import { Game } from "./game";
import { Player } from "./player";
import { TicTacToeGame } from './tictactoe';
import { Server } from 'socket.io';
import { ManagerEvent, ManagerResponse } from "../types/types";

export class GameManager {
  gamesMap: Map<string, Game>;
  playersMap: Map<string, Player>;
  matchmakingQueue: Array<string>;
  eventHandlerMap: Map<string, Function>;
  queueLoopId: NodeJS.Timer;

  io: Server;
  constructor(io: Server) {
    this.io = io;
    this.gamesMap = new Map<string, Game>();
    this.playersMap = new Map<string, Player>();
    this.matchmakingQueue = [];
    this.eventHandlerMap = new Map<string, Function>();
    this.queueLoopId = this.startQueueLoop();
    this.attachListeners(io);
    this.initializeHandlers();
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

  initializeHandlers() {
    let pingHandler = (event: ManagerEvent) => {
      // payload: null
      let response: ManagerResponse = {
        error: false,
        type: 'ping',
        payload: 'pong',
        message: 'ping response is pong'
      }
      event.acknowledger(response);
    };

    let joinQueueHandler = (event: ManagerEvent) => {
      // payload: null
      let response: ManagerResponse = {
        error: false,
        type: 'join queue',
        payload: null,
        message: ''
      }
      let player = this.playersMap.get(event.id);
      if (player) {
        if (!player.inGame) {
          player.inGame = true;
          this.matchmakingQueue.push(player.id);
          event.acknowledger(response);
        } else {
          response.message = 'player already in game!';
          response.error = true;
          event.acknowledger(response);
        }
      } else {
        response.message = 'player does not exist!';
        response.error = true;
        event.acknowledger(response);
      }
    };

    let joinGameHandler = (event: ManagerEvent) => {
      // payload: game name that the player is attempting tojoin
      let response: ManagerResponse = {
        error: false,
        type: 'join game',
        payload: event.payload,
        message: ''
      }
      let game = this.gamesMap.get(event.payload);
      let player = this.playersMap.get(event.id);
      if (game && player && !player?.inGame) {
        player.inGame = true;
        game.addPlayer(player);
        event.acknowledger(response);
      } else {
        response.error = true;
        event.acknowledger(response);
      }
    };

    let createGameHandler = (event: ManagerEvent) => {
      // payload: { name: string, type: string }
      let response: ManagerResponse = {
        error: false,
        type: 'create game',
        payload: null,
        message: ''
      }

      let player = this.playersMap.get(event.id);
      if (!this.gamesMap.has(event.payload.name) && player && !player?.inGame) {
        player.inGame = true;
        let game: Game;
        if (event.payload.type === 'tictactoe') {
          game = new TicTacToeGame(event.payload.name, this.io)
        } else {
          game = new Game(event.payload.name, this.io)
        }
        this.gamesMap.set(event.payload.name, game);
        game.addPlayer(player);
        event.acknowledger(response);
      } else {
        response.error = true;
        event.acknowledger(response);
      }
    };

    this.eventHandlerMap.set('ping', pingHandler);
    this.eventHandlerMap.set('join queue', joinQueueHandler);
    this.eventHandlerMap.set('join game', joinGameHandler);
    this.eventHandlerMap.set('create game', createGameHandler);

  }

  attachListeners(io: Server, dev: boolean = false) {
    io.on('connect', (socket) => {
      this.playersMap.set(socket.id, new Player(socket, 'New Player'));
      socket.on('manager action', (type: string, payload: any, acknowledger: Function) => {
        let handler = this.eventHandlerMap.get(type);
        if (handler) {
          let event: ManagerEvent = {
            type,
            payload,
            id: socket.id,
            acknowledger
          }
          this.handleEvent(event);
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

  handleEvent(event: ManagerEvent) {
    let handler = this.eventHandlerMap.get(event.type);
    if (handler) handler(event);
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