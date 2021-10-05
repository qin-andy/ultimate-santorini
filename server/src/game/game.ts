import { Server } from 'socket.io';
import { PlayerManager } from "../player/playerManager";
import { nanoid } from "nanoid";
import { Player } from "../player/player";
import { GameEvent, GameResponse } from '../types/types';
import { GameManager } from '../manager/gameManager';

export class Game {
  io: Server;
  playerManager: PlayerManager;
  name: string;
  roomId: string;
  running: boolean;
  active: boolean;
  eventHandlerMap: Map<string, Function> // event name to handler
  teamMap: Map<string, string>; // id to team
  gameManager: undefined | GameManager;

  constructor(name: string, io: Server, gameManager?: GameManager, settings?: any) {
    this.name = name;
    this.playerManager = new PlayerManager();
    this.roomId = nanoid();
    this.io = io;
    this.running = false;
    this.active = false;
    this.eventHandlerMap = new Map<string, Function>(); // event name to callback
    this.teamMap = new Map<string, string>(); // id to team
    this.gameManager = gameManager;
    this.initializeHandlers();
  }

  initializeHandlers() {
    // to be overriden
  }

  handleEvent(event: GameEvent) {
    // default handles all existing events
    let handler = this.eventHandlerMap.get(event.type)
    if (handler) handler(event);
  }

  addPlayer(player: Player) {
    player.socket.join(this.roomId);
    player.socket.on('game action', (name: any, payload: any, acknowledger: Function) => {
      if (typeof payload === 'string') { // for unity parsing
        try {
          console.log("Attempting parse");
          let parsedPayload = JSON.parse(payload);
          console.log("Parsed: " + parsedPayload);
          payload = parsedPayload;
        } catch (e) { console.log(e) }
      }
      let event: GameEvent = {
        type: name,
        payload: payload,
        id: player.socket.id,
      };
      this.handleEvent(event);
    });
    player.currentGame = this;
    player.inGame = true;
    this.playerManager.addPlayer(player);
  }

  removePlayer(id: string): Player | undefined {
    // To be extended by children for additional behaviors on player disconnects
    let player = this.playerManager.getPlayerById(id);
    player?.socket.leave(this.roomId);
    player?.socket.removeAllListeners('game action');
    if (player) { player.currentGame = null; player.inGame = false }
    if (this.running) this.io.to(this.roomId).emit('game update', {
      error: false,
      type: 'player disconnect',
      payload: { name: player?.name, id: player?.id },
      message: 'player left the game!'
    });
    this.playerManager.removePlayer(id);
    // if game is empty, end it
    if (this.playerManager.getCount() === 0) {
      this.close();
      if (this.gameManager) {
        this.gameManager.closeGame(this);
      }
    }
    return player;
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
    this.running = false;
  }

  close() {
    this.running = false;
    this.active = false;
    this.playerManager.close();
    this.teamMap.clear();
    this.eventHandlerMap.clear();
  }
}