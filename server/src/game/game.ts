import { Server } from 'socket.io';
import { PlayerManager } from "./playerManager";
import { nanoid } from "nanoid";
import { Player } from "./player";
import { EventHandler } from "./eventHandler";
import { GameEvent } from '../types/types';

export class Game {
  playerManager: PlayerManager;
  eventHandler: EventHandler;
  name: string;
  roomId: string;
  io: Server;

  // tic tac toe game state
  turn: string;
  board: Array<Array<string>>;
  teamMap: Map<string, string>; // id to team

  constructor(name: string, io: Server) {
    // manageers
    this.name = name;
    this.playerManager = new PlayerManager();
    this.eventHandler = new EventHandler(this);
    this.roomId = nanoid();
    this.io = io;

    // game state
    this.turn = '*';
    this.teamMap = new Map<string, string>();
    this.board = [
      ['*', '*', '*'],
      ['*', '*', '*'],
      ['*', '*', '*']
    ];
  }

  addPlayer(player: Player) {
    player.socket.join(this.roomId); // TODO : do i have to clean this up on disconnect?
    player.socket.on('game action', (name: any, payload: any, acknowledger: Function) => {
      let event: GameEvent = {
        name: name,
        payload: payload,
        id: player.socket.id,
        acknowledger: acknowledger
      };
      this.eventHandler.handleEvent(event);
    });
    this.playerManager.addPlayer(player);
  }

  removePlayer(player: Player) {
    return this.playerManager.removePlayer(player.id);
  }

  close() {
    this.playerManager.close();
    this.eventHandler.close();
  }

  // tic tac toe logic
  start() {
    if (this.playerManager.getCount() === 2) {
      this.teamMap.set(this.playerManager.players[0].id, 'o');
      this.teamMap.set(this.playerManager.players[1].id, 'x');
      this.turn = 'o';
      return true;
    }
    return false;
  }

  mark(id: string, x: number, y: number): [string | null, string[][] | null] {
    if (this.teamMap.get(id) === this.turn) {
      if (this.board[y][x] === '*') {
        console.log('setting board at ' + x + ',' + y);
        this.board[y][x] = this.turn;
        this.turn = this.teamMap.get(id) === 'o' ? 'x' : 'o';
        return [null, this.board];
      }
      return ['Square is occupied!', null]; // todo: error handling on this?
    }
    return ['It is ' + this.turn + '\'s turn!', null]
  }
}