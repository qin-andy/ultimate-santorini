import { Game } from "./game";
import { Server } from 'socket.io';
import { GameError, GameEvent, GameUpdate } from "../types/types";

export class TicTacToeGame extends Game {
  turn: string;
  board: Array<Array<string>>;

  constructor(name: string, io: Server) {
    super(name, io);

    this.turn = '*';
    this.board = [ // TODO : switch to 1d array?
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

  close() {
    super.close();
    this.running = false;
    this.turn = '*';
    this.teamMap = new Map<string, string>();
    this.board = [
      ['*', '*', '*'],
      ['*', '*', '*'],
      ['*', '*', '*']
    ];
  }

  // tic tac toe logic
  start() {
    // assigns teams
    // returns true if started, false if not
    if (this.playerManager.getCount() === 2) {
      this.teamMap.set(this.playerManager.players[0].id, 'o');
      this.teamMap.set(this.playerManager.players[1].id, 'x');
      this.turn = 'o';
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
    /*
      idea: check diagonal left, check diagonal right, check column, chcek row
        check row/column: iterate from bottom to top and count consecutives. if consectuveis = 3, win
        check diagonal left/right:
          Get tot he topmost diagonal entry in either left or right
            left: find the distnace to travel in diagonal left
              thedistance able to travel is the minimum distance from either of the edges
                determined by the minimum of x and y ( distance from x and y axis)
              to travel in that direction, subtract that distance from both x and y coords
            right:
              distnace to the right edge is determined by xMax - x
              find the minimum of either to xedge right or y axis
              to travel in that direction, add that distance to x but subtrac t it from y
            note for large boards, might wanna limit max distance to a certain valueto prevent searching entire board
            (unecessary array accesses)
            , but adds code complexity
          traverse in that direction down and count consectutives
          when the bottom edges is reached
    */

    //info
    let boardX = 2; // index, not length!
    let boardY = 2;
    let player = this.board[y][x] // todo: use currentPlayer or pass in as paramter?
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