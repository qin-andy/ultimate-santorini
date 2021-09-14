import { createSlice } from "@reduxjs/toolkit";
import { GameResponse, marking } from "../types";

interface TictactoeState {
  playerName: string,
  id: string,
  running: boolean,
  completed: boolean,
  winner: marking,
  winningMark: null | { x: number, y: number },
  winningSquares: Array<{ x: number, y: number }>,
  turn: marking,
  playerMark: marking,
  board: marking[],
  dimensions: { x: number, y: number },
  latestResponse: GameResponse | null
}

const initialState: TictactoeState = {
  playerName: '',
  id: '',
  running: false,
  completed: false,
  winner: '*',
  winningMark: null,
  winningSquares: [],
  turn: '*',
  playerMark: '*',
  board: [],
  dimensions: { x: 3, y: 3 },
  latestResponse: null
}

const tictactoeSlice = createSlice({
  name: 'tictactoe',
  initialState,
  reducers: {
    gameResponseReceived(state, action) {
      state.latestResponse = action.payload;
    },
    playerInfoReceived(state, action) {
      state.playerName = action.payload.name;
      state.id = action.payload.id;
    },
    gameStarted(state, action) {
      state.dimensions.x = action.payload.x;
      state.dimensions.y = action.payload.y;
      state.board = action.payload.board;
      state.winningSquares = [];
      state.running = true;
      state.turn = action.payload.turn;
      state.playerMark = state.playerName === action.payload.o ? 'o' : 'x';
    },
    boardUpdated(state, action) {
      state.turn = action.payload.turn;
      state.board = action.payload.board;
    },
    gameWon(state, action) {
      state.completed = true;
      state.winningMark = action.payload.winningMark;
      state.winningSquares = action.payload.winningSquares;
      state.board = action.payload.board;
      state.winner = action.payload.winner;
      state.running = false;
    },
    gameTied(state, action) {
      state.completed = true;
      state.board = action.payload.board;
      state.running = false;
    },
    opponentDisconnect(state, action) {
      state.completed = true;
      state.running = false;
    }
  }
});

export default tictactoeSlice.reducer;
export const { gameStarted, boardUpdated, gameResponseReceived } = tictactoeSlice.actions;