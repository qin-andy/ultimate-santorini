import { createSlice } from "@reduxjs/toolkit";
import { GameResponse } from "../types";

type Coord = { x: number, y: number };

interface SantoriniSlice {
  player: 'red' | 'blue' | '',
  board: number[],
  workers: Coord[]
  turn: 'red' | 'blue',
  phase: 'pregame' | 'placement' | 'build'
}

const initialState: SantoriniSlice = {
  player: '',
  board: [0],
  workers: [],
  turn: 'red',
  phase: 'pregame'
}

const santoriniSlice = createSlice({
  name: 'santorini',
  initialState,
  reducers: {
    santoriniStarted(state, action) {
      state.phase = 'placement';
      state.board = action.payload.board;
      state.workers = action.payload.workers;
      state.turn = 'red';
      state.player = action.payload.playerColor;
    },
    santoriniWorkerPlaced(state, action) {
      state.board = action.payload.board;
      state.workers = action.payload.workers;
      state.turn = action.payload.turn;
      if (action.payload.done) state.phase = 'build';
    },
    santoriniMoved(state, action) {
      state.board = action.payload.board;
      state.workers = action.payload.workers;
      state.turn = action.payload.turn;
    }
  }
});

export default santoriniSlice.reducer;
export const { santoriniStarted, santoriniWorkerPlaced, santoriniMoved } = santoriniSlice.actions;