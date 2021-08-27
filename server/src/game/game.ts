import { Server } from 'socket.io';
import { PlayerManager } from "./playerManager";
import { nanoid } from "nanoid";
import { Player } from "./player";
import { GameEvent, GameUpdate, GameError } from '../types/types';

export class Game {
  playerManager: PlayerManager;
  name: string;
  roomId: string;
  io: Server;
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
    this.initializeHandlers();
  }

  initializeHandlers() {
    const handleListPlayers = (event: any, acknowledger: Function) => {
      event.acknowledger(this.playerManager.getNames());
    }

    const handleChangeName = (event: any, acknowledger: Function) => {
      let player = this.playerManager.getPlayerById(event.id);
      player.name = event.payload;
      event.acknowledger();
    }

    const handleMirror = (event: any) => {
      event.acknowledger(event);
    }

    this.eventHandlerMap.set('get player list', handleListPlayers);
    this.eventHandlerMap.set('update player name', handleChangeName);
    this.eventHandlerMap.set('mirror', handleMirror);
  }

  handleEvent(event: any) {
    let handler = this.eventHandlerMap.get(event.name)
    if (handler) {
      handler(event); // catch errors here somehow?
    }
  }

  addPlayer(player: Player) {
    player.socket.join(this.roomId); // TODO : do i have to clean this up on disconnect?
    // add game action listener for each socket
    player.socket.on('game action', (name: any, payload: any, acknowledger: Function) => {
      let event: GameEvent = {
        name: name,
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

  close() {
    this.playerManager.close();
  }
}