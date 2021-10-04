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
      if (response.error) { this.io.to(event.id).emit('game update', response); }
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

      // When the player makes a move
    } else if (response.type === "santorini move") {
      // this.makeBotMove(); for default bot responses
      // start bot loop
      this.startBotLoop();
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

  async startBotLoop() {
    let sleepFactory = (time: number) => {
      return new Promise<void>(resolve => {
        setTimeout(resolve, time);
      });
    }
    while (this.game?.running) {
      await this.makeBotMove(false);
      await sleepFactory(500);
      await this.makeBotMove(true);
      await sleepFactory(500);
    }
  }

  async makeBotMove(player1: boolean = false) {
    if (!this.game) {
      throw new Error("game not running!");
    }

    // Serialize game state into json
    let workers = this.game.getWorkerCoords();
    let elevations2d: Array<Array<number>> = [];
    for (let y = 0; y < 5; y++) {
      let row: Array<number> = [];
      for (let x = 0; x < 5; x++) {
        row.push(this.game.board[x + y * 5]);
      }
      elevations2d.push(row);
    }
    let board = {};
    if (player1) {
      board = {
        Worker1: { X: workers[0].x, Y: workers[0].y },
        Worker2: { X: workers[1].x, Y: workers[1].y },
        OpponentWorker1: { X: workers[2].x, Y: workers[2].y },
        OpponentWorker2: { X: workers[3].x, Y: workers[3].y },
        Cells: elevations2d
      }
    } else {
      board = {
        Worker1: { X: workers[2].x, Y: workers[2].y },
        Worker2: { X: workers[3].x, Y: workers[3].y },
        OpponentWorker1: { X: workers[0].x, Y: workers[0].y },
        OpponentWorker2: { X: workers[1].x, Y: workers[1].y },
        Cells: elevations2d
      }
    }

    // let preBoard = '{"Worker1": { "X": 0, "Y": 1 },"Worker2": { "X": 2, "Y": 2 },"OpponentWorker1": { "X": 1, "Y": 1 },"OpponentWorker2": { "X": 3, "Y": 3 },"Cells": [[ 2, 0, 0, 3, 0], [ 3, 0, 0, 3, 0], [ 3, 2, 0, 2, 0],[ 0, 2, 3, 0, 0],[ 0, 0, 0, 0, 0 ]]}'
    let boardJson = JSON.stringify(board);
    console.log(boardJson);
    // Send board to API
    let apiResponse = await fetch('https://localhost:5001/MoveGenerator', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: boardJson
    })
    let action = await apiResponse.json();

    let botAction: any = JSON.parse(action);
    console.log("Recieved bot action:");
    console.log(botAction);
    let payload = {
      workerCoord: { x: botAction.Worker.X, y: botAction.Worker.Y },
      moveCoord: { x: botAction.Move.X, y: botAction.Move.Y },
      buildCoord: { x: botAction.Build.X, y: botAction.Build.Y },
    }
    let event: GameEvent = {
      type: 'santorini move',
      id: player1 ? this.playerManager.getIds()[0] : 'bot', // DO NOT FORGET THIS
      payload: payload,
      acknowledger: () => { }
    }
    console.log(payload);
    let response = this.game?.makeMove(event);
    this.io.to(this.roomId).emit('game update', response);
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