import { compose, configureStore } from '@reduxjs/toolkit'
import tictactoeSlice from '../tictactoe/tictactoeSlice';
import managerSlice from '../manager/managerSlice';

const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;


const store = configureStore({
  reducer: {
    tictactoe: tictactoeSlice,
    manager: managerSlice
  },
  enhancers: composeEnhancers
});

export default store;
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
