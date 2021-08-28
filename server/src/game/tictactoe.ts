import { Game } from "./game";
import { Server } from 'socket.io';
import { GameError, GameEvent, GameUpdate } from "../types/types";

export class TicTacToeGame extends Game {
  turn: string;
  board: Array<string>;
  dimensions: [x: number, y: number];

  constructor(name: string, io: Server) {
    super(name, io);
    this.turn = '*';
    this.board = [];
    this.dimensions = [0, 0];
    this.initializeHandlers();
  }

  initializeHandlers() {
    super.initializeHandlers();

    // tic tac toe handlers
    const handleMark = (event: GameEvent) => {
      let [error, update] = this.mark(event.id, event.payload.x, event.payload.y);
      if (error) {
        this.io.to(this.roomId).emit('game update', error, null);
      } else {
        this.io.to(event.id).emit('game update', null, update);
      }
    }
    this.eventHandlerMap.set('tictactoe mark', handleMark);
  }

  handleEvent(event: GameEvent) {
     super.handleEvent(event);
  }

  end() {
    super.end();
    this.turn = '*';
    this.board = [
      '*', '*', '*',
      '*', '*', '*',
      '*', '*', '*'
    ];
    this.running = false;
  }

  // tic tac toe logic
  start(x = 3, y = 3) {
    if (this.playerManager.getCount() === 2) {
      this.teamMap.set(this.playerManager.players[0].id, 'o');
      this.teamMap.set(this.playerManager.players[1].id, 'x');

      this.dimensions = [x, y]; // TODO : validation to cap board size?
      this.board = new Array<string>(x*y);
      this.board.fill('*');
      this.turn = 'o';
      this.running = true;
      return true;
    }
    return false;
  }

  getBoardIndex(x: number, y: number): number {
    let xSize = 3;
    return x + y*xSize;
  }

  mark(id: string, x: number, y: number): [GameError | null, GameUpdate | null] {
    // game must be running
    if(!this.running) {
      let error: GameError = {
        payload: [x, y],
        type: 'not running', // TODO : square error?
        message: 'Game is over' // TODO : include board dimensions and squares
      }
      return [error, null];
    }

    // coordinate must exist on board
    let squareIndex = this.getBoardIndex(x, y);
    if (squareIndex >= this.board.length) {
      let error: GameError = {
        payload: [x, y],
        type: 'out of bounds', // TODO : square error?
        message: 'Invalid square' // TODO : include board dimensions and squares
      }
      return [error, null];
    }

    // It must be the player's turn to mark
    if (this.teamMap.get(id) !== this.turn) {
      let error: GameError = {
        payload: this.turn,
        type: 'turn',
        message: 'Cannot mark for ' + this.teamMap.get(id) + ': It is ' + this.turn + '\'s turn!'
      }
      return [error, null];
    }

    // Space must be empty
    if (this.board[squareIndex] !== '*') {
      let error: GameError = {
        payload: null,
        type: 'occupied',
        message: x + ', ' + y + ': Square is occupied!'
      }
      return [error, null];
    }

    this.board[squareIndex] = this.turn;
    this.turn = this.teamMap.get(id) === 'o' ? 'x' : 'o';
    let update: GameUpdate = {
      payload: this.board,
      type: 'mark',
      message: 'player marked, now it is ' + this.turn + '\'s turn'
    }
    // winner
    if (this.checkWin(x, y)) {
      update.message = (this.board[squareIndex] + ' has won!');
      update.type = 'win';
      update.payload = this.board[squareIndex];
      this.end();
    }
    return [null, update];
  }

  checkWin(x: number, y: number): boolean {
    let squareIndex = this.getBoardIndex(x, y);
    //info
    let boardX = this.dimensions[0] - 1; // index, not length!
    let boardY = this.dimensions[1] - 1;
    let player = this.board[squareIndex];
    let winSize = 3;

    // columns nad rows
    // rows
    let consecutives = 0;
    for (let i = 0; i < boardX + 1; i++) { // boardX + 1 to loop through entire row/column
      if (this.board[this.getBoardIndex(i, y)] === player) {
        consecutives++;
        if (consecutives === winSize) {
          return true;
        }
      } else {
        consecutives = 0;
      }
    }

    //columns
    consecutives = 0;
    for (let i = 0; i < boardY + 1; i++) {
      if (this.board[this.getBoardIndex(x, i)] === player) {
        consecutives++;
        if (consecutives === winSize) {
          return true;
        }
      } else {
        consecutives = 0;
      }
    }

    // diagonal topleft
    // distance to top left
    let distance = Math.min(x, y);
    let topLeft: [number, number] = [x - distance, y - distance];
    // totl length of digaongal is distance ot top left + dist to bottom right + 1 (current)
    let diagonalLength = distance + Math.min(boardX - x, boardY - y) + 1;

    consecutives = 0;
    for (let i = 0; i < diagonalLength; i++) {
      let currX = topLeft[0] + i;
      let currY = topLeft[1] + i;
      if (this.board[this.getBoardIndex(currY, currX)] === player) {
        consecutives++;
        if (consecutives === winSize) {
          return true;
        }
      } else {
        consecutives = 0;
      }
    }
    //diagonal top right

    // distance to top right
    distance = Math.min(boardX - x, y);
    let topRight: [number, number] = [x + distance, y - distance];
    // totl length of digaongal is distance ot top left + dist to bottom right + 1 (current)
    diagonalLength = distance + Math.min(x, boardY - y) + 1;

    consecutives = 0;
    for (let i = 0; i < diagonalLength; i++) {
      let currX = topRight[0] - i;
      let currY = topRight[1] + i;
      if (this.board[this.getBoardIndex(currY, currX)] === player) {
        consecutives++;
        if (consecutives === winSize) {
          return true;
        }
      } else {
        consecutives = 0;
      }
    }
    return false;
  }
}