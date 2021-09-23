import { Server } from 'socket.io';
import { GameEvent, GameResponse } from '../types/types';
import { GameManager } from '../manager/gameManager';
import { Game } from './game';
import { SantoriniGame } from './santorini';
import { Player } from '../player/player';

export class SantoriniAdapter extends Game {
  game: SantoriniGame | undefined;
  constructor(name: string, io: Server, gameManager?: GameManager, settings?: any) {
    super(name, io, gameManager, settings);
  }

  initializeHandlers() {
    const startHandler = (event: GameEvent) => {
      return this.start();
    }

    const placementHandler = (event: GameEvent) => {
      return this.game?.placeWorker(event);
    }

    const moveHandler = (event: GameEvent) => {
      return this.game?.makeMove(event);
    }

    const winMoveHandler = (event: GameEvent) => {
      return this.game?.makeWinMove(event);
    }

    this.eventHandlerMap.set('santorini start', startHandler);
    this.eventHandlerMap.set('santorini place', placementHandler);
    this.eventHandlerMap.set('santorini move', moveHandler);
    this.eventHandlerMap.set('santorini win move', winMoveHandler);
  }

  handleEvent(event: GameEvent) {
    // default handles all existing events
    let handler = this.eventHandlerMap.get(event.type)
    if (handler) {
      console.log(event);
      let response = handler(event);
      console.log(response);
      if (response.error) this.io.to(event.id).emit('game update', response);
      else this.io.to(this.roomId).emit('game update', response);
    }
  }

  addPlayer(player: Player) {
    super.addPlayer(player);
    if (this.playerManager.getCount() === 2) {
      let response = this.start();
      this.io.to(this.roomId).emit('game update', response);
    }
  }

  start(): GameResponse {
    this.running = true;
    let players = this.playerManager.getIds();
    this.game = new SantoriniGame(players[0], players[1]);
    return {
      error: false,
      payload: {
        turn: this.game.turn,
        workers: this.game.getWorkerCoords(),
        board: this.game.board,
        players: {
          red: players[0],
          blue: players[1]
        }
      },
      type: 'start success',
      message: 'santorini started!'
    }
  };
}