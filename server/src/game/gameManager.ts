import { Game } from "./game";
import { Player } from "./player";
import { TicTacToeGame } from './tictactoe';
import { Server } from 'socket.io';
import { GameResponse, ManagerEvent, ManagerResponse, ManagerHandler } from "../types/types";
import { TicTacToeAutoGame } from "./tictactoeAuto";
import { nanoid } from "nanoid";

const DISCONNECT_TIMEOUT = 300000; // 5 minutes
const QUEUE_TICTACTOE_SETTINGS = { x: 3, y: 3, winSize: 3 };

export class GameManager {
  gamesMap: Map<string, Game>;
  playersMap: Map<string, Player>;
  matchmakingQueue: Array<string>;
  eventHandlerMap: Map<string, ManagerHandler>;

  io: Server;
  constructor(io: Server) {
    this.io = io;
    this.gamesMap = new Map<string, Game>();
    this.playersMap = new Map<string, Player>();
    this.matchmakingQueue = [];
    this.eventHandlerMap = new Map<string, ManagerHandler>();
    this.attachListeners(io);
    this.initializeHandlers();
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
      let player2 = this.playersMap.get('' + player2id);
      if (!player2 || !player2.socket.connected) {
        this.matchmakingQueue.push(player1id);
        return false;
      }

      // Mokugo variant:
      // let newGame = new TicTacToeAutoGame(player1id + player2id, this.io, this, {x: 9, y: 9, winSize: 5});
      let newGame = new TicTacToeAutoGame(player1id + player2id, this.io, this, QUEUE_TICTACTOE_SETTINGS);
      newGame.addPlayer(player1);
      newGame.addPlayer(player2);
      this.gamesMap.set(newGame.name, newGame);

      let response = {
        error: false,
        payload: player1id + player2id,
        type: 'queue game found',
        message: 'game found!'
      }
      this.io.to(player1.socket.id).emit('manager response', response);
      this.io.to(player2.socket.id).emit('manager response', response);
      return true;
    }
    return false;
  }

  initializeHandlers() {
    let pingHandler: ManagerHandler = (event) => {
      let response: ManagerResponse = {
        error: false,
        type: 'ping',
        payload: 'pong',
        message: 'ping response is pong'
      }
      return response;
    };

    let joinQueueHandler: ManagerHandler = (event)=> {
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
          this.matchmakePlayersInQueue();
        } else {
          response.message = 'player already in game!';
          response.error = true;
        }
      } else {
        response.message = 'player does not exist!';
        response.error = true;
      }
      return response;
    };

    let joinGameHandler: ManagerHandler = (event) => {
      // payload: game name that the player is attempting tojoin
      let game = this.gamesMap.get(event.payload.name);
      let player = this.playersMap.get(event.id);

      if (!player) {
        let response = {
          error: true,
          type: 'does not exist',
          payload: event.id,
          message: 'player does not exist!'
        }
        return response;
      }

      if (player?.inGame) {
        let response = {
          error: true,
          type: 'join game',
          payload: player.currentGame?.name,
          message: 'Player already in game: ' + player.currentGame?.name
        }
        return response;
      }

      if (!game) {
        let response = {
          error: true,
          type: 'join game',
          payload: event.payload,
          message: 'game does not exist: ' + event.payload
        }
        return response;
      }

      if (game.active) {
        let response = {
          error: true,
          type: 'join game',
          payload: event.payload,
          message: 'Game actively in progress: ' + event.payload
        }
        return response;
      }

      let response: ManagerResponse = {
        error: false,
        type: 'join game',
        payload: event.payload,
        message: ''
      }

      player.inGame = true;
      game.addPlayer(player);
      return response;
    };

    let leaveGameHandler: ManagerHandler = (event) => {
      let player = this.playersMap.get(event.id);
      // if player doesn't exist
      if (!player) {
        let response = {
          error: true,
          type: 'does not exist',
          payload: event.id,
          message: 'player does not exist!'
        }
        return response;
      }

      // if player is not in game
      if (!player?.inGame || !player.currentGame) {
        let response = {
          error: true,
          type: 'leave game',
          payload: null,
          message: 'player not in game!'
        }
        return response;
      }

      // leave game logic
      let game = player.currentGame;
      let gameName = game.name;
      player.currentGame.removePlayer(player.id);
      let response = {
        error: false,
        type: 'leave game',
        payload: gameName,
        message: 'left game ' + gameName
      };
      return response;
    };

    let createGameHandler: ManagerHandler = (event) => {
      let player = this.playersMap.get(event.id);
      if (!player) {
        let response = {
          error: true,
          type: 'does not exist',
          payload: event.id,
          message: 'player does not exist!'
        }
        return response;
      }

      if (player?.inGame) {
        let response = {
          error: true,
          type: 'create game',
          payload: player.currentGame?.name,
          message: 'Player already in game: ' + player.currentGame?.name
        }
        return response;
      }

      if (this.gamesMap.has(event.payload.name)) {
        let response = {
          error: true,
          type: 'create game',
          payload: event.payload.name,
          message: 'Game name already exists: ' + event.payload.name
        }
        return response;
      }

      player.inGame = true;
      let game: Game;
      if (event.payload.type === 'tictactoe') {
        if (event.payload.autoplay) {
          game = new TicTacToeAutoGame(event.payload.name, this.io, this);
        } else {
          game = new TicTacToeGame(event.payload.name, this.io, this);
        }
      } else {
        game = new Game(event.payload.name, this.io, this)
      }
      this.gamesMap.set(event.payload.name, game);
      game.addPlayer(player);
      let response = {
        error: false,
        type: 'create game',
        payload: event.payload.name,
        message: 'Game created: ' + event.payload.name
      }
      return response;
    };

    let playerInfoHandler: ManagerHandler = (event) => {
      let player = this.playersMap.get(event.id);
      if (!player) return {
        error: true,
        type: 'does not exist',
        payload: event.id,
        message: 'player id does not exist!'
      }

      let payload = {
        name: player.name,
        id: player.id,
        inGame: player.inGame,
        gameName: player.currentGame?.name
      }

      return {
        error: false,
        type: 'player info',
        payload,
        message: ''
      }
    }

    this.eventHandlerMap.set('ping', pingHandler);
    this.eventHandlerMap.set('join queue', joinQueueHandler);
    this.eventHandlerMap.set('join game', joinGameHandler);
    this.eventHandlerMap.set('create game', createGameHandler);
    this.eventHandlerMap.set('leave game', leaveGameHandler);
    this.eventHandlerMap.set('player info', playerInfoHandler);
  }

  attachListeners(io: Server, dev: boolean = false) {
    io.on('connect', (socket) => {
      this.playersMap.set(socket.id, new Player(socket, nanoid()));
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

      let disconnectTimeout: NodeJS.Timeout;
      socket.onAny(() => {
        clearTimeout(disconnectTimeout);
        disconnectTimeout = setTimeout(() => {
          this.playersMap.get(socket.id)?.currentGame?.removePlayer(socket.id);
          socket.disconnect();
        }, DISCONNECT_TIMEOUT);
      });
    });
  }

  handleEvent(event: ManagerEvent) {
    let handler = this.eventHandlerMap.get(event.type);
    if (handler) {
      let response = handler(event);
      this.io.to(event.id).emit('manager response', response);
    }
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
    this.io.removeAllListeners();
  }
}