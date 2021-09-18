import { Server } from 'socket.io';
import { GameManager } from "../manager/gameManager";
import { Player } from "../player/player";
import { TicTacToeGame } from "./tictactoe";

export class TicTacToeAutoGame extends TicTacToeGame {
  resetTimeout: NodeJS.Timeout | undefined;

  addPlayer(player: Player) {
    // Automatically fires a game start event whenter a player joins
    // TODO : prevent join ifthere's already too people?
    super.addPlayer(player);
    let response = this.start();
    if (!response.error) {
      this.io.to(this.roomId).emit('game update', response);
    }
  }

  // Override, calls end with reset flag as true
  win(x: number, y: number, winningSquares: Array<{ x: number, y: number }>) {
    let squareIndex = this.getBoardIndex(x, y);
    this.end(true);
    let response = {
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
    return response;
  }

  tie(x: number, y: number) {
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
    this.end(true);
    return response;
  }

  // Override, includes reset flag which will reset game
  end(reset = false, delay = 8000) {
    this.running = false;
    if (reset) {
      this.resetTimeout = setTimeout(() => {
        let response = this.reset();
        this.io.to(this.roomId).emit('game update', response);
      }, delay);
    }
  }

  reset() {
    if (!this.active) {
      let response = {
        error: true,
        payload: null,
        type: 'reset fail',
        message: 'game is no longer active!'
      }
      return response;
    }
    let loser = this.turn === 'o' ? 'x' : 'o';
    let response = this.start(this.dimensions.x, this.dimensions.y, loser);
    if (response.error) {
      response.type = 'reset fail';
      return response;
    }
    response.type = 'reset success';
    return response;
  }

  close() {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }
    super.close();
  }
}