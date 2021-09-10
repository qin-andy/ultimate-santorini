import { createSlice } from "@reduxjs/toolkit";
import { GameResponse } from "../types";

interface ManagerSlice {
  player: string,
  id: string,
  inGame: false,
  gameName: string | undefined,
  latestResponse: GameResponse | null
}

const initialState: ManagerSlice = {
  player: '',
  id: '',
  inGame: false,
  gameName: undefined,
  latestResponse: null
}

const managerSlice = createSlice({
  name: 'manager',
  initialState,
  reducers: {
    managerResponseReceived(state, action) {
      state.latestResponse = action.payload;
    },
    playerInfoReceived(state, action) {
      state.player = action.payload.name;
      state.id = action.payload.id;
      state.inGame = action.payload.inGame;
      state.gameName = action.payload.gameName;
    }
  }
});

export default managerSlice.reducer;
export const { managerResponseReceived, playerInfoReceived } = managerSlice.actions;