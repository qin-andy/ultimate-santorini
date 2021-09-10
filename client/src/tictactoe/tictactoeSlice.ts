import { createSlice } from "@reduxjs/toolkit";
import { marking } from "../types";

interface TictactoeState {
  running: boolean,
  completed: boolean,
  turn: marking,
  board: marking[],
  x: number,
  y: number
}

const initialState: TictactoeState = {
  running: false,
  completed: false,
  turn: '*',
  board: [],
  x: 0,
  y: 0,
}

const tictactoeSlice = createSlice({
  name: 'tictactoe',
  initialState,
  reducers: {
    gameStarted(state, action) {
      state.x = action.payload.x;
      state.y = action.payload.y;
      state.board = action.payload.board;
      state.running = true;
    },
    boardUpdated(state, action) {
      state.board = action.payload;
    }
  }
});

export default tictactoeSlice.reducer;
export const { gameStarted, boardUpdated } = tictactoeSlice.actions;