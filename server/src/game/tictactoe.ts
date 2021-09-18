import { Game } from "./game";
import { Server } from 'socket.io';
import { GameEvent, GameResponse } from "../types/types";
import { GameManager } from "../manager/gameManager";

export class TicTacToeGame extends Game {
  turn: string;
  board: Array<string>;
  dimensions: { x: number, y: number };
  settings: any;
  squaresMarked: number;

  constructor(name: string, io: Server, gameManager?: GameManager, settings = {x: 3, y: 3, winSize: 3}) {
    super(name, io, gameManager);
    this.turn = '*';
    this.board = [];
    this.dimensions = { x: 0, y: 0 };
    this.squaresMarked = 0;
    this.settings = settings;
  }

  initializeHandlers() {
    super.initializeHandlers();
    const markHandler = (event: GameEvent) => {
      let response = this.mark(event.id, event.payload.x, event.payload.y);
      if (!response.error) {
        this.io.to(this.roomId).emit('game update', response);
      } else {
        this.io.to(event.id).emit('game update', response);
      }
    }

    const startHandler = (event: GameEvent) => {
      let response = this.start();
      if (response.payload) {
        this.io.to(this.roomId).emit('game update', response);
      } else {
        this.io.to(event.id).emit('game update', response);
      }
    }

    this.eventHandlerMap.set('tictactoe mark', markHandler);
    this.eventHandlerMap.set('tictactoe start', startHandler);
  }

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
    }
    return removedPlayer;
  }

  start(x = this.settings.x, y = this.settings.y, firstTurn = 'o'): GameResponse {
    if (this.running) {
      return {
        error: true,
        payload: null,
        type: 'start fail',
        message: 'game already started!'
      }
    }

    if (this.playerManager.getCount() !== 2) {
      return {
        error: true,
        payload: this.playerManager.getCount(),
        type: 'start fail',
        message: 'Game can only start with 2 players!'
      };
    }

    let players = Array.from(this.playerManager.playerMap.values());
    this.squaresMarked = 0;
    this.teamMap.set(players[0].id, 'o');
    this.teamMap.set(players[1].id, 'x');

    this.dimensions = { x, y };
    this.board = new Array<string>(x * y);
    this.board.fill('*');
    this.turn = firstTurn;
    this.running = true;
    this.active = true;
    let response: GameResponse = {
      error: false,
      payload: {
        size: { x, y },
        board: this.board,
        turn: this.turn,
        o: players[0].name,
        x: players[1].name,
        firstTurn: 'o',
      },
      type: 'start success',
      message: 'Game started!'
    }
    return response;
  }

  end() {
    this.running = false;
  }

  getBoardIndex(x: number, y: number): number {
    return x + y * this.dimensions.x;
  }

  mark(id: string, x: number, y: number): GameResponse {
    // game must be running
    if (!this.running) {
      return {
        error: true,
        payload: null,
        type: 'not running',
        message: 'Game is not running!'
      }
    }

    // coordinate must exist on board
    let squareIndex = this.getBoardIndex(x, y);
    if (squareIndex >= this.board.length) {
      return {
        error: true,
        payload: { x, y },
        type: 'out of bounds',
        message: 'Invalid square, out of bounds'
      }
    }

    // It must be the player's turn to mark
    if (this.teamMap.get(id) !== this.turn) {
      let error: GameResponse = {
        error: true,
        payload: this.turn,
        type: 'turn',
        message: 'Cannot mark for ' + this.teamMap.get(id) + ': It is ' + this.turn + '\'s turn!'
      }
      return error;
    }

    // Space must be empty
    if (this.board[squareIndex] !== '*') {
      let error: GameResponse = {
        error: true,
        payload: null,
        type: 'occupied',
        message: x + ', ' + y + ': Square is occupied!'
      }
      return error;
    }

    this.board[squareIndex] = this.turn; // actual marking
    this.squaresMarked += 1;
    // check winner
    let win = this.checkWin(x, y);
    if (win) {
      return this.win(x, y, win);
    }

    if (this.squaresMarked >= this.dimensions.x*this.dimensions.y) {
      return this.tie(x, y);
    }

    // otherwise, toggle turn and send full state
    this.turn = this.teamMap.get(id) === 'o' ? 'x' : 'o';
    return {
      error: false,
      payload: {
        board: this.board,
        mark: { x, y },
        turn: this.turn,
      },
      type: 'mark',
      message: 'player marked, now it is ' + this.turn + '\'s turn'
    };
  }

  tie(x: number, y: number): GameResponse {
    let response = {
      error: false,
      payload: {
        board: this.board,
        mark: { x, y },
        turn: this.turn,
      },
      type: 'tie',
      message: 'tie game!'
    }
    this.end();
    return response;
  }

  win(x: number, y: number, winningSquares: Array<{ x: number, y: number }>): GameResponse {
    let squareIndex = this.getBoardIndex(x, y);
    this.end();
    return {
      error: false,
      payload: {
        board: this.board,
        mark: { x, y },
        winner: this.board[squareIndex],
        winningSquares
      },
      type: 'win',
      message: this.board[squareIndex] + ' has won!',
    }
  }

  checkWin(x: number, y: number): Array<{ x: number, y: number }> | undefined {
    let squareIndex = this.getBoardIndex(x, y);
    //info
    let boardX = this.dimensions.x - 1; // index, not length!
    let boardY = this.dimensions.y - 1;
    let player = this.board[squareIndex];
    let winSize = this.settings.winSize;
    let winningSquares: Array<{ x: number, y: number }> = [];

    // columns nad rows
    // rows
    let consecutives = 0;
    for (let i = 0; i < boardX + 1; i++) { // boardX + 1 to loop through entire row/column
      if (this.board[this.getBoardIndex(i, y)] === player) {
        consecutives++;
        if (consecutives >= winSize) { // greater equals vs stric equals?
          for (let j = 0; j < consecutives; j++) {
            winningSquares.push({ x: i - j, y });
          }
          return winningSquares;
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
          for (let j = 0; j < consecutives; j++) {
            winningSquares.push({ x: x, y: i - j });
          }
          return winningSquares;
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
      if (this.board[this.getBoardIndex(currX, currY)] === player) {

        consecutives++;
        if (consecutives === winSize) {
          for (let j = 0; j < consecutives; j++) {
            winningSquares.push({ x: currX - j, y: currY - j });
          }
          return winningSquares;
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
      if (this.board[this.getBoardIndex(currX, currY)] === player) {
        consecutives++;
        if (consecutives === winSize) {
          for (let j = 0; j < consecutives; j++) {
            winningSquares.push({ x: currX + j, y: currY - j });
          }
          return winningSquares;
        }
      } else {
        consecutives = 0;
      }
    }
    return undefined;
  }
}