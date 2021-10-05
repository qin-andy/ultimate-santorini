import { Game } from "../game/game";
import { Player } from "../player/player";
import { Server } from 'socket.io';
import { ManagerEvent, ManagerResponse, ManagerHandler } from "../types/types";
import { nanoid } from "nanoid";
import { SantoriniAdapter } from "../game/santoriniAdapater";
import { BotSantoriniAdapter } from "../game/botSantoriniAdapater";

const DISCONNECT_TIMEOUT = 300000; // 5 minutes

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

  // matchmakePlayersInQueue(): boolean {
  //   if (this.matchmakingQueue.length >= 2) {
  //     let player1id = this.matchmakingQueue.shift();
  //     if (!player1id) return false;
  //     let player1 = this.playersMap.get(player1id);
  //     if (!player1 || !player1.socket.connected) return false;

  //     let player2id = this.matchmakingQueue.shift();
  //     let player2 = this.playersMap.get('' + player2id);
  //     if (!player2 || !player2.socket.connected) {
  //       this.matchmakingQueue.push(player1id);
  //       return false;
  //     }

  //     // Mokugo variant:
  //     // let newGame = new TicTacToeAutoGame(player1id + player2id, this.io, this, {x: 9, y: 9, winSize: 5});
  //     let newGame = new SantoriniAdapter('santorini', this.io, this);
  //     newGame.addPlayer(player1);
  //     newGame.addPlayer(player2);
  //     this.gamesMap.set(newGame.name, newGame);

  //     let response = {
  //       error: false,
  //       payload: player1id + player2id,
  //       type: 'queue game found',
  //       message: 'game found!'
  //     }
  //     this.io.to(player1.socket.id).emit('manager response', response);
  //     this.io.to(player2.socket.id).emit('manager response', response);
  //     return true;
  //   }
  //   return false;
  // }

  matchmakePlayersInQueue(): boolean {
    if (this.matchmakingQueue.length > 0) {
      let player1id = this.matchmakingQueue.shift();
      if (!player1id) return false;
      let player1 = this.playersMap.get(player1id);
      if (!player1 || !player1.socket.connected) return false;

      let newGame = new BotSantoriniAdapter(player1.socket.id, this.io, this);
      newGame.addPlayer(player1);
      this.gamesMap.set(newGame.name, newGame);

      let response = {
        error: false,
        payload: player1id,
        type: 'queue game found',
        message: 'game found!'
      }
      this.io.to(player1.socket.id).emit('manager response', response);
      return true;
    }
    return false;
  }

  initializeHandlers() {
    let joinQueueHandler: ManagerHandler = (event) => {
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

    this.eventHandlerMap.set('join queue', joinQueueHandler);
    this.eventHandlerMap.set('leave game', leaveGameHandler);
  }

  handleEvent(event: ManagerEvent) {
    let handler = this.eventHandlerMap.get(event.type);
    if (handler) {
      let response = handler(event);
      this.io.to(event.id).emit('manager response', response);
    }
  }

  attachListeners(io: Server) {
    io.on('connect', (socket) => {
      this.playersMap.set(socket.id, new Player(socket, nanoid()));
      socket.on('manager action', (type: string, payload: any) => {
        let event: ManagerEvent = {
          type,
          payload,
          id: socket.id,
        }
        this.handleEvent(event);
      });

      let disconnectTimeout: NodeJS.Timeout;
      socket.onAny(() => {
        clearTimeout(disconnectTimeout);
        disconnectTimeout = setTimeout(() => {
          this.playersMap.get(socket.id)?.currentGame?.removePlayer(socket.id);
          socket.disconnect();
        }, DISCONNECT_TIMEOUT);
      });

      socket.on('disconnect', () => {
        // game removal handled in playerManagement class
        clearTimeout(disconnectTimeout); // clear timeout timer
        let index = this.matchmakingQueue.indexOf(socket.id); // remove from matchmaking queue
        if (index !== -1) {
          this.matchmakingQueue.splice(index, 1);
        }
        socket.removeAllListeners();
        let player = this.playersMap.get(socket.id);
        //remove from current game
        let currentGame = player?.currentGame;
        player?.currentGame?.removePlayer(socket.id);
        if (currentGame?.playerManager.getCount() === 0) {
          // close dead rooms
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
    this.io.removeAllListeners();
  }
}