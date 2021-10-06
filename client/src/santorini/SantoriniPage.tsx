import React, { Reducer, useEffect, useReducer, useState } from 'react';
import './santorini.scss';

import socket, { getPlayerInfo } from '../services/socket';
import { GameResponse, ManagerResponse, SantoriniState } from '../types';
import { SantoriniBoard } from './SantoriniBoard';

const SantoriniPage = () => {

  const initialState: SantoriniState = {
    player: '',
    board: [0],
    workers: [],
    turn: 'red',
    phase: 'pregame',
    winner: '',
    winningCoord: { x: -1, y: -1 }
  }

  const reducer: Reducer<SantoriniState, any> = (state: SantoriniState, action: any) => {
    let newState: SantoriniState;
    switch (action.type) {
      case 'start':
        newState = {
          ...state,
          phase: 'placement',
          board: action.payload.board,
          workers: action.payload.workers,
          turn: 'red',
          player: action.payload.playerColor,
        }
        return newState;
      case 'placement':
        newState = {
          ...state,
          board: action.payload.board,
          workers: action.payload.workers,
          turn: action.payload.turn,
        }
        if (action.payload.done) newState.phase = 'build';
        return newState;
      case 'move':
        newState = {
          ...state,
          board: action.payload.board,
          workers: action.payload.workers,
          turn: action.payload.turn,
        }
        return newState;
      case 'won':
        newState = {
          ...state,
          winner: action.payload.winner,
          winningCoord: action.payload.winningCoord,
          phase: 'postgame',
        }
        return newState;
      case 'reset':
        newState = {
          ...state,
          phase: 'pregame'
        }
        return newState;
    }
    return state;
  }

  const [gameState, gameDispatch] = useReducer(reducer, initialState);
  const [showPage, setShowPage] = useState(false);

  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];
    socket.on('manager response', (response: ManagerResponse) => {
      console.log(response);
    });

    socket.on('game update', (response: GameResponse) => {
      console.log(response);
      if (response.type === 'start success') {
        console.log('start receieved, dispatching action');
        let payload = { ...response.payload, playerColor: response.payload.players.red === socket.id ? 'red' : 'blue' };
        gameDispatch({ type: 'start', payload: payload });
      } else if (response.type === 'placement update') {
        console.log('placement recieved');
        gameDispatch({ type: 'placement', payload: response.payload });
      } else if (response.type === 'santorini move') {
        console.log('move receieved');
        if (!response.error) gameDispatch({ type: 'move', payload: response.payload });
      } else if (response.type === 'santorini win') {
        console.log('move receieved');
        if (!response.error) {
          gameDispatch({ type: 'move', payload: response.payload });
          gameDispatch({ type: 'won', payload: response.payload });
        }
      } else if (response.type === 'win disconnect') {
        timeouts.push(setTimeout(() => {
          // autorejoin queue after 
          // dispatch({ type: 'santorini/santoriniReset', payload: {} });
          // joinQueue();
        }, 1000));
      }
    });

    // timeouts.push(setTimeout(() => joinQueue(), 0)); // auto join queue on page load
    timeouts.push(setTimeout(() => setShowPage(true), 500));
    return () => {
      socket.off('game update')
      socket.off('manager response')
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return (
    <div className='my-row'>
      {showPage ? <SantoriniBoard state={gameState} /> : <></>}
    </div>
  );
}

export default SantoriniPage;