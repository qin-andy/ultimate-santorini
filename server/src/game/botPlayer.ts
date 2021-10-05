import { GameEvent, GameResponse } from "../types/types";
import { Coord, SantoriniGame } from "./santorini";
import fetch from 'cross-fetch';

export class BotPlayer {
  workersPlaced: number;
  game: SantoriniGame;
  thinking: boolean;
  constructor(game: SantoriniGame) {
    this.thinking = false;
    this.workersPlaced = 0;
    this.game = game;
  }

  sleep(time: number) {
    return new Promise<void>(resolve => {
      setTimeout(resolve, time);
    });
  }

  async getBotEvent(response: GameResponse) {
    if (this.thinking) {
      return undefined;
    }
    await this.sleep(500);
    switch (response.type) {
      case 'placement update':
        console.log(this.workersPlaced);
        this.workersPlaced += 1;
        if (this.workersPlaced === 1) return this.genPlacementEvent({ x: 0, y: 0 });
        else if (this.workersPlaced === 2) return this.genPlacementEvent({ x: 0, y: 1 });
        break;
      case 'santorini move':
        this.thinking = true;
        let boardJson = this.serializeGameState();
        let payload = await this.getMinimaxMove(boardJson);
        let event: GameEvent = {
          type: 'santorini move',
          id: 'bot',
          payload: payload,
        }
        this.thinking = false;
        return event;
    }
    return undefined;
  }

  genPlacementEvent(location: Coord) {
    let event: GameEvent = {
      type: 'santorini place',
      payload: { coord: location },
      id: 'bot',
    }
    return event;
  }

  serializeGameState(): string {
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
    board = {
      Worker1: { X: workers[2].x, Y: workers[2].y },
      Worker2: { X: workers[3].x, Y: workers[3].y },
      OpponentWorker1: { X: workers[0].x, Y: workers[0].y },
      OpponentWorker2: { X: workers[1].x, Y: workers[1].y },
      Cells: elevations2d
    }

    let boardJson = JSON.stringify(board);
    return boardJson
  }

  async getMinimaxMove(boardJson: string) {
    let apiResponse = await fetch('https://localhost:5001/MoveGenerator', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: boardJson
    })
    let action = await apiResponse.json();

    let botAction = JSON.parse(action);
    let payload = {
      workerCoord: { x: botAction.Worker.X, y: botAction.Worker.Y },
      moveCoord: { x: botAction.Move.X, y: botAction.Move.Y },
      buildCoord: { x: botAction.Build.X, y: botAction.Build.Y },
    }
    return payload;
  }
}