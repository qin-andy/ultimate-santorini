import { Server } from 'socket.io';
import { PlayerManager } from "./playerManager";
import { nanoid } from "nanoid";
import { Player } from "./player";
import { GameEvent, GameResponse } from '../types/types';

export class Game {
  io: Server;
  playerManager: PlayerManager;
  name: string;
  roomId: string;
  running: boolean;
  eventHandlerMap: Map<string, Function> // event name to handler
  teamMap: Map<string, string>; // id to team

  constructor(name: string, io: Server) {
    this.name = name;
    this.playerManager = new PlayerManager();
    this.roomId = nanoid();
    this.io = io;
    this.running = false;
    this.eventHandlerMap = new Map<string, Function>(); // event name to callback
    this.teamMap = new Map<string, string>(); // id to team
    this.initializeHandlers();
  }

  initializeHandlers() {
    // default handlers for testing
    const handleMirror = (event: any) => {
      event.acknowledger(event);
    }

    const pingRoom = (event: GameEvent) => {
      let fromPlayer = this.playerManager.getPlayerById(event.id)
      fromPlayer?.socket.to(this.roomId).emit('ping room', fromPlayer.id + ': ' + event.payload);
      event.acknowledger(true);
    }

    this.eventHandlerMap.set('mirror', handleMirror);
    this.eventHandlerMap.set('ping room', pingRoom);
  }

  handleEvent(event: GameEvent) {
    // default handles all existing events
    let handler = this.eventHandlerMap.get(event.type)
    if (handler) handler(event);
  }

  addPlayer(player: Player) {
    player.socket.join(this.roomId);
    player.socket.on('game action', (name: any, payload: any, acknowledger: Function) => {
      let event: GameEvent = {
        type: name,
        payload: payload,
        id: player.socket.id,
        acknowledger: acknowledger
      };
      this.handleEvent(event);
    });
    player.currentGame = this;
    this.playerManager.addPlayer(player);
  }

  removePlayer(id: string): Player | undefined {
    // To be extended by children for additional behaviors on player disconnects
    let player = this.playerManager.getPlayerById(id);
    player?.socket.leave(this.roomId);
    player?.socket.removeAllListeners('game action');
    if (player) player.currentGame = null;
    return this.playerManager.removePlayer(id);
  }

  start(): GameResponse {
    // initalizes game's custom settings
    return {
      error: true,
      payload: null,
      type: 'null',
      message: 'this game has no start feature yet!'
    }
  };

  end() {
    // resets game data
    // to be implemented in children
  }

  close() {
    // TODO : on player disconnect, if room is empty, close self?
    this.end();
    this.playerManager.close();
    this.teamMap.clear();
    this.eventHandlerMap.clear();
  }
}