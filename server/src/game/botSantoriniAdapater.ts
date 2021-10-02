import { Server } from 'socket.io';
import { GameEvent, GameResponse } from '../types/types';
import { GameManager } from '../manager/gameManager';
import { Game } from './game';
import { SantoriniGame } from './santorini';
import { Player } from '../player/player';
import fetch from 'cross-fetch';

export class BotSantoriniAdapter extends Game {
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
      else {
        this.io.to(this.roomId).emit('game update', response);
        this.getBotResponse(response);
      }
    }
  }

  getBotResponse(response: GameResponse) {
    // Triggers on initial placement, will send two staggered placments;
    if (response.type === 'placement update') {
      setTimeout(() => { // TODO: cleanup on game close
        let botResponse = this.generateBotPlacement(response, { x: 0, y: 0 });
        console.log("Bot response:");
        console.log(botResponse);
        this.io.to(this.roomId).emit('game update', botResponse);
      }, 500);
      setTimeout(() => { // TODO: cleanup on game close
        let botResponse = this.generateBotPlacement(response, { x: 1, y: 1 });
        console.log("Bot response:");
        console.log(botResponse);
        this.io.to(this.roomId).emit('game update', botResponse);
      }, 1000);
    } else if (response.type === "santorini move") {
      let move = this.boardToAPI();
    }
  }

  generateBotPlacement(response: GameResponse, location: { x: number, y: number }) {
    if (!this.game) {
      throw new Error("gamenot wrunnign!"); // TODO: better;
    }
    let botResponse = this.game.createBlankResponse();
    if (response.type === 'placement update') {
      let event: GameEvent = {
        type: 'santorini place',
        payload: { coord: location },
        id: 'bot',
        acknowledger: () => { }
      }
      botResponse = this.game.placeWorker(event);
      return botResponse;
    }
    botResponse.error = true; // not your turn
    botResponse.message = 'not your turn!'
    return botResponse;
  }

  boardToAPI() {
    if (!this.game) {
      throw new Error("game not running!");
    }

    let workers = this.game.getWorkerCoords();
    let elevations2d: Array<Array<number>> = [];
    for (let i = 0; i < 5; i++) {
      let row: Array<number> = [];
      for (let j = 0; j < 5; j++) {
        row.push(this.game.board[j + i * 5]);
      }
      elevations2d.push(row);
    }

    let board = {
      Worker1: { X: workers[2].x, Y: workers[2].y },
      Worker2: { X: workers[3].x, Y: workers[3].y },
      OpponentWorker1: { X: workers[0].x, Y: workers[0].y },
      OpponentWorker2: { X: workers[1].x, Y: workers[1].y },
      Cells: elevations2d
    }

    // let preBoard = '{"Worker1": { "X": 0, "Y": 1 },"Worker2": { "X": 2, "Y": 2 },"OpponentWorker1": { "X": 1, "Y": 1 },"OpponentWorker2": { "X": 3, "Y": 3 },"Cells": [[ 2, 0, 0, 3, 0], [ 3, 0, 0, 3, 0], [ 3, 2, 0, 2, 0],[ 0, 2, 3, 0, 0],[ 0, 0, 0, 0, 0 ]]}'
    let boardJson = JSON.stringify(board);
    console.log(boardJson);
    
    fetch('https://localhost:5001/MoveGenerator', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: boardJson
    })
      .then(response => response.json())
      .then(json => {
        console.log("Bot move: ");
        console.log(json);
      });
  }

  addPlayer(player: Player) {
    super.addPlayer(player);
    if (this.playerManager.getCount() === 1) {
      let response = this.start();
      this.io.to(this.roomId).emit('game update', response);
    }
  }

  // auto end game when one player is disconnected
  removePlayer(id: string) {
    let removedPlayer = super.removePlayer(id);
    if (this.playerManager.getCount() <= 1) {
      let response = {
        error: false,
        payload: {
          name: removedPlayer?.name
        },
        type: 'win disconnect',
        message: removedPlayer?.name + ' has disconnected!',
      }
      this.io.to(this.roomId).emit('game update', response);
      this.active = false;
      this.end();
      this.playerManager.removePlayer(this.playerManager.getIds()[0]);
    }
    return removedPlayer;
  }

  start(): GameResponse {
    this.running = true;
    let players = this.playerManager.getIds();
    this.game = new SantoriniGame(players[0], 'bot');
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