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
    this.eventHandlerMap = new Map<string, Function>();
    this.teamMap = new Map<string, string>(); // id to team
  }

  initializeHandlers() {
    // // default handlers
    // const handleListPlayers = (event: any, acknowledger: Function) => {
    //   event.acknowledger(this.playerManager.getNames());
    // }

    // const handleMirror = (event: any) => {
    //   event.acknowledger(event);
    // }

    // this.eventHandlerMap.set('get player list', handleListPlayers);
    // this.eventHandlerMap.set('mirror', handleMirror);
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
    this.playerManager.addPlayer(player);
  }

  removePlayer(player: Player) {
    return this.playerManager.removePlayer(player.id);
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
  }

  close() {
    // TODO : on player disconnect, if room is empty, close self?
    this.end();
    this.playerManager.close();
    this.teamMap.clear();
    this.eventHandlerMap.clear();
  }
}