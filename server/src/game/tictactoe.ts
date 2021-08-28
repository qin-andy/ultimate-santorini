import { Game } from "./game";
import { Server } from 'socket.io';
import { GameError, GameEvent, GameUpdate } from "../types/types";

export class TicTacToeGame extends Game {
  turn: string;
  board: Array<Array<string>>;

  constructor(name: string, io: Server) {
    super(name, io);

    this.turn = '*';
    this.board = [
      ['*', '*', '*'],
      ['*', '*', '*'],
      ['*', '*', '*']
    ];
  }

  initializeHandlers() {
    super.initializeHandlers();

    // tic tac toe handlers
    const handleMark = (event: GameEvent) => {
      let [error, update] = this.mark(event.id, event.payload.x, event.payload.y);
      if (error) {
        this.io.to(this.roomId).emit('game update', error, null);
      } else {
        this.io.to(this.roomId).emit('game update', null, update);
      }
    }
    this.eventHandlerMap.set('tictactoe mark', handleMark);
  }

  handleEvent(event: GameEvent) {
    super.handleEvent(event); // TODO: conditional logic? don't handle events?
  }

  close() {
    super.close();
    this.turn = '*';
    this.board = [
      ['*', '*', '*'],
      ['*', '*', '*'],
      ['*', '*', '*']
    ];
  }

  // tic tac toe logic
  start() {
    if (this.playerManager.getCount() === 2) {
      this.teamMap.set(this.playerManager.players[0].id, 'o');
      this.teamMap.set(this.playerManager.players[1].id, 'x');
      this.turn = 'o';
      this.running = true;
      return true;
    }
    return false;
  }

  mark(id: string, x: number, y: number): [GameError | null, GameUpdate | null] {
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
    if (this.board[y][x] !== '*') {
      let error: GameError = {
        payload: null,
        type: 'occupied',
        message: x + ', ' + y + ': Square is occupied!'
      }
      return [error, null];
    }

    this.board[y][x] = this.turn;
    this.turn = this.teamMap.get(id) === 'o' ? 'x' : 'o';
    let update: GameUpdate = {
      payload: this.board,
      type: 'mark',
      message: 'player marked, now it is ' + this.turn + '\'s turn'
    }
    // winner
    if (this.checkWin(x, y)) {
      update.message = (this.board[y][x] + ' has won!');
      update.type = 'win';
      update.payload = this.board[y][x];
    }
    return [null, update];
  }

  checkWin(x: number, y: number): boolean {
    //info
    let boardX = 2; // index, not length!
    let boardY = 2;
    let player = this.board[y][x]
    let winSize = 3;

    // columns nad rows
    // rows
    let consecutives = 0;
    for (let i = 0; i < boardX + 1; i++) { // boardX + 1 to loop through entire row/column
      let currX = i;
      let currY = y;
      if (this.board[currY][currX] === player) {
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
      let currX = x;
      let currY = i;
      if (this.board[currY][currX] === player) {
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
      if (this.board[currY][currX] === player) {
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
      if (this.board[currY][currX] === player) {
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