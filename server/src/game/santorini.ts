import { Player } from "../player/player";
import { GameEvent, GameResponse } from "../types/types";

export type Turn = 'red' | 'blue';
export type Coord = { x: number, y: number };

export class SantoriniGame {
  running: boolean;
  board: number[];
  phase: string;
  turn: Turn;
  turnMap: Map<string, Turn>;
  workersPlaced: number;
  redWorker1: Coord;
  redWorker2: Coord;
  blueWorker1: Coord;
  blueWorker2: Coord;

  constructor(player1: string, player2: string) {
    this.running = true;
    this.board = [
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0
    ];
    this.phase = 'placement';
    this.turn = 'red';
    this.turnMap = new Map<string, Turn>();
    this.turnMap.set(player1, 'red');
    this.turnMap.set(player2, 'blue');
    this.workersPlaced = 0;

    this.redWorker1 = { x: -1, y: -1 };
    this.redWorker2 = { x: -1, y: -1 };
    this.blueWorker1 = { x: -1, y: -1 };
    this.blueWorker2 = { x: -1, y: -1 };
  }

  // payload format:
  // coord: Coord
  // players alternate placing
  placeWorker(event: GameEvent) {
    let response = this.createBlankResponse();
    let coord = event.payload.coord;

    if (this.phase != 'placement') {
      response.error = true; // wrong phase
      response.message = 'no longer placement phase!'
      return response;
    } else if (this.turnMap.get(event.id) != this.turn) {
      response.error = true; // not your turn
      response.message = 'not your turn!'
      return response;
    } else if (this.getWorkerCoords().filter(worker => {
      return worker.x === coord.x && worker.y === coord.y;
    }).length > 0) {
      response.error = true; // worker occupies coord already
      response.message = 'that coord is occupied!'
      return response;
    }

    switch (this.workersPlaced) {
      case 0:
        this.redWorker1 = coord;
        this.turn = 'blue';
        break;
      case 1:
        this.blueWorker1 = coord;
        break;
      case 2:
        this.blueWorker2 = coord;
        this.turn = 'red';
        break;
      case 3:
        this.redWorker2 = coord;
        break;
    }

    this.workersPlaced += 1;

    let done = false;
    if (this.workersPlaced === 4) {
      this.phase = 'build';
      done = true;
    }
    response.error = false;
    response.type = 'placement update';
    response.payload = {
      turn: this.turn,
      workers: this.getWorkerCoords(),
      board: this.board,
      coord,
      done
    }
    return response;
  }

  // copied makemove, TODO:reefactor
  makeWinMove(event: GameEvent) {
    let response = this.createBlankResponse();
    response.type = 'santorini move';
    let player = this.turnMap.get(event.id);
    if (!this.running) {
      response.error = true;
      response.message = 'game no longer running!'
      return response;
    }
    else if (player !== this.turn) {
      response.error = true;
      response.message = 'not your turn!';
      return response;
    } else if (this.phase !== 'build') {
      response.error = true;
      response.message = 'its not the building phase yet!';
      return response;
    }

    let workerCoord = event.payload.workerCoord;
    let moveCoord = event.payload.moveCoord;

    // has to originate from a space with a worker
    if (this.turn === 'red') {
      if (!this.coordsAreEqual(workerCoord, this.redWorker1)
        && !this.coordsAreEqual(workerCoord, this.redWorker2)) {
        response.error = true;
        response.message = 'no red worker at that space!';
        return response;
      }
    } else if (this.turn === 'blue') {
      if (!this.coordsAreEqual(workerCoord, this.blueWorker1)
        && !this.coordsAreEqual(workerCoord, this.blueWorker2)) {
        response.error = true;
        response.message = 'no blue worker at that space!';
        return response;
      }
    }

    // cannot move or build more than one space away
    if (this.distBetweenCoords(workerCoord, moveCoord) !== 1) {
      response.error = true;
      response.message = 'coords are not adjacent!';
      return response;
    }

    // cannot move or build on spaces with workers
    let occupiedIndecies = new Set();
    this.getWorkerCoords().forEach(worker => {
      occupiedIndecies.add(this.getIndex(worker));
    });
    if (occupiedIndecies.has(this.getIndex(moveCoord))) {
      response.error = true;
      response.message = 'space is already occupied'
      return response;
    }

    // cannot move to spaces more than 1 above
    if (this.board[this.getIndex(moveCoord)] - this.board[this.getIndex(workerCoord)] > 1) {
      response.error = true;
      response.message = 'space is too high to move to!';
      return response;
    }

    if (this.coordsAreEqual(workerCoord, this.redWorker1)) this.redWorker1 = moveCoord;
    else if (this.coordsAreEqual(workerCoord, this.redWorker2)) this.redWorker2 = moveCoord;
    else if (this.coordsAreEqual(workerCoord, this.blueWorker1)) this.blueWorker1 = moveCoord;
    else if (this.coordsAreEqual(workerCoord, this.blueWorker2)) this.blueWorker2 = moveCoord;

    if (this.board[this.getIndex(moveCoord)] === 3) {
      response.type = 'santorini win';
      response.message = this.turn + ' player win!';
      response.payload = {
        board: this.board,
        workers: this.getWorkerCoords(),
        turn: this.turn,
        winningCoord: moveCoord,
        winner: this.turn
      }
      return response;
    } else {
      response.error = true
      response.message = 'win move invalid!';
      return response;
    }
  }

  // payload:
  // workerCoord: coord
  // moveCoord: coord,
  // buildCoord: coord,
  makeMove(event: GameEvent) {
    let response = this.createBlankResponse();
    response.type = 'santorini move';
    let player = this.turnMap.get(event.id);
    if (!this.running) {
      response.error = true;
      response.message = 'game no longer running!'
      return response;
    }
    else if (player !== this.turn) {
      response.error = true;
      response.message = 'not your turn!';
      return response;
    } else if (this.phase !== 'build') {
      response.error = true;
      response.message = 'its not the building phase yet!';
      return response;
    }

    let workerCoord = event.payload.workerCoord;
    let moveCoord = event.payload.moveCoord;
    let buildCoord = event.payload.buildCoord;

    // has to originate from a space with a worker
    if (this.turn === 'red') {
      if (!this.coordsAreEqual(workerCoord, this.redWorker1)
        && !this.coordsAreEqual(workerCoord, this.redWorker2)) {
        response.error = true;
        response.message = 'no red worker at that space!';
        return response;
      }
    } else if (this.turn === 'blue') {
      if (!this.coordsAreEqual(workerCoord, this.blueWorker1)
        && !this.coordsAreEqual(workerCoord, this.blueWorker2)) {
        response.error = true;
        response.message = 'no blue worker at that space!';
        return response;
      }
    }

    // cannot move or build more than one space away
    if (this.distBetweenCoords(workerCoord, moveCoord) !== 1) {
      response.error = true;
      response.message = 'coords are not adjacent!';
      return response;
    } else if (this.distBetweenCoords(moveCoord, buildCoord) !== 1) {
      response.error = true;
      response.message = 'coords are not adjacent!';
      return response;
    }

    // cannot move or build on spaces with workers
    if (!this.coordsAreEqual(buildCoord, workerCoord)) { // can buildon the original coord space
      let occupiedIndecies = new Set();
      this.getWorkerCoords().forEach(worker => {
        occupiedIndecies.add(this.getIndex(worker));
      });
      if (occupiedIndecies.has(this.getIndex(moveCoord)) || occupiedIndecies.has(this.getIndex(buildCoord))) {
        response.error = true;
        response.message = 'space is already occupied'
        return response;
      }
    }

    // cannot move to spaces more than 1 above
    if (this.board[this.getIndex(moveCoord)] - this.board[this.getIndex(workerCoord)] > 1) {
      response.error = true;
      response.message = 'space is too high to move to!';
      return response;
    }

    // cannot build or move on domed tile with height >=4
    if (this.board[this.getIndex(buildCoord)] > 3 || this.board[this.getIndex(moveCoord)] >= 4) {
      response.error = true;
      response.message = 'cannot build or move to domed!';
      return response;
    }

    if (this.coordsAreEqual(workerCoord, this.redWorker1)) this.redWorker1 = moveCoord;
    else if (this.coordsAreEqual(workerCoord, this.redWorker2)) this.redWorker2 = moveCoord;
    else if (this.coordsAreEqual(workerCoord, this.blueWorker1)) this.blueWorker1 = moveCoord;
    else if (this.coordsAreEqual(workerCoord, this.blueWorker2)) this.blueWorker2 = moveCoord;
    this.board[this.getIndex(buildCoord)] += 1;

    if (this.board[this.getIndex(moveCoord)] === 3) {
      response.type = 'santorini win';
      response.message = this.turn + ' player win!';
      response.payload = {
        board: this.board,
        workers: this.getWorkerCoords(),
        turn: this.turn,
        winningCoord: moveCoord,
        winner: this.turn
      }
    } else {
      this.turn = this.nextTurn();
      response.payload = {
        board: this.board,
        workers: this.getWorkerCoords(),
        turn: this.turn,
        move: {
          workerCoord,
          moveCoord,
          buildCoord
        }
      }
      response.message = 'successful move';
    }
    return response;
  }

  coordsAreEqual(coord1: Coord, coord2: Coord) {
    return coord1.x === coord2.x && coord1.y === coord2.y;
  }

  distBetweenCoords(coord1: Coord, coord2: Coord) {
    return Math.max(Math.abs(coord1.x - coord2.x), Math.abs(coord1.y - coord2.y));
  }

  getWorkerCoords() {
    return [this.redWorker1, this.redWorker2, this.blueWorker1, this.blueWorker2];
  }

  nextTurn() {
    return this.turn === 'red' ? 'blue' : 'red';
  }

  getIndex(coord: Coord) {
    return coord.y * 5 + coord.x;
  }

  createBlankResponse(): GameResponse {
    return { error: false, payload: {}, type: '', message: '' };
  }
}