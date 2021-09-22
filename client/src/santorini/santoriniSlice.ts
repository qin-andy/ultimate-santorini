import { createSlice } from "@reduxjs/toolkit";
import { GameResponse } from "../types";

type Coord = { x: number, y: number };

interface SantoriniSlice {
  board: number[],
  workers: Coord[]
  turn: 'red' | 'blue',
  phase: 'pregame' | 'placement' | 'build'
}

const initialState: SantoriniSlice = {
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
    },
    santoriniWorkerPlaced(state, action) {
      state.board = action.payload.board;
      state.workers = action.payload.workers;
      state.turn = action.payload.turns;
      if (action.payload.done) state.phase = 'build';
    },
    santoriniMoved(state, action) {
      state.board = action.payload.board;
      state.workers = action.payload.workers;
      state.turn = action.payload.turns;
    }
  }
});

export default santoriniSlice.reducer;
export const { santoriniStarted, santoriniWorkerPlaced, santoriniMoved } = santoriniSlice.actions;