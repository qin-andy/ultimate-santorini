import { createSlice } from "@reduxjs/toolkit";
import { GameResponse, marking } from "../types";

interface TictactoeState {
  running: boolean,
  completed: boolean,
  winner: marking,
  winningMark: null | {x: number, y: number},
  winningSquares: Array<{x: number, y: number}>,
  turn: marking,
  board: marking[],
  dimensions: {x: number, y: number},
  latestResponse: GameResponse | null
}

const initialState: TictactoeState = {
  running: false,
  completed: false,
  winner: '*',
  winningMark: null,
  winningSquares: [],
  turn: '*',
  board: [],
  dimensions: {x: 3, y: 3},
  latestResponse: null
}

const tictactoeSlice = createSlice({
  name: 'tictactoe',
  initialState,
  reducers: {
    gameResponseReceived(state, action) {
      state.latestResponse = action.payload;
    },
    gameStarted(state, action) {
      state.dimensions.x = action.payload.x;
      state.dimensions.y = action.payload.y;
      state.board = action.payload.board;
      state.winningSquares = [];
      state.running = true;
    },
    boardUpdated(state, action) {
      state.board = action.payload;
    },
    gameWon(state, action) {
      console.log(action.payload);
      state.completed = true;
      state.winningMark = action.payload.winningMark;
      state.winningSquares = action.payload.winningSquares;
      state.board = action.payload.board;
      state.winner = action.payload.winner;
    }
  }
});

export default tictactoeSlice.reducer;
export const { gameStarted, boardUpdated, gameResponseReceived } = tictactoeSlice.actions;