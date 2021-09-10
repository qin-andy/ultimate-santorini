import { compose, configureStore } from '@reduxjs/toolkit'
import tictactoeSlice from '../tictactoe/tictactoeSlice';

const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;


const store = configureStore({
  reducer: {
    tictactoe: tictactoeSlice
  },
  enhancers: composeEnhancers
});

export default store;
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
