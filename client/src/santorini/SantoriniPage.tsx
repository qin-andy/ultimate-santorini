import React, { useEffect, useState } from 'react';

import socket, { getPlayerInfo, joinQueue, santoriniMove, santoriniPlace, santoriniStart } from '../services/socket';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { GameResponse, ManagerResponse, marking } from '../types';
import './santorini.scss';

type Coord = { x: number, y: number };

interface SquareData {
  index: number,
  coord: Coord,
  worker: '' | 'red' | 'blue',
  elevation: number,
  moveHighlighted: boolean,
  buildHighlighted: boolean
}

const SantoriniPage = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];
    socket.on('manager response', (response: ManagerResponse) => {
      console.log(response);
      if (response.type === 'player info') {
        dispatch({
          type: 'manager/playerInfoReceived',
          payload: response.payload
        });
        dispatch({
          type: 'tictactoe/playerInfoReceived',
          payload: response.payload
        });
      }
      dispatch({ type: 'manager/managerResponseReceived', payload: response });
    });

    socket.on('game update', (response: GameResponse) => {
      console.log(response);
      dispatch({ type: 'tictactoe/gameResponseReceived', payload: response });
      if (response.type === 'start success') {
        console.log('start receieved, dispatching action');
        let payload = { ...response.payload, playerColor: response.payload.players.red === socket.id ? 'red' : 'blue' };
        console.log(payload);
        dispatch({ type: 'santorini/santoriniStarted', payload: payload });
      } else if (response.type === 'placement update') {
        console.log('placement recieved');
        dispatch({ type: 'santorini/santoriniWorkerPlaced', payload: response.payload });
      } else if (response.type === 'santorini move') {
        console.log('move receieved');
        if (!response.error) dispatch({ type: 'santorini/santoriniMoved', payload: response.payload })
      }
    });

    getPlayerInfo();
    timeouts.push(setTimeout(() => joinQueue(), 1000));
    return () => {
      socket.off('game update')
      socket.off('manager response')
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return (
    <div className='my-row'>
      <button onClick={santoriniStart}>
        Start
      </button>
      <SantoriniBoard />
    </div>
  );
}

const SantoriniBoard = (props: {}) => {
  const [selectedWorker, setSelectedWorker] = useState(-1);
  const [selectedMove, setSelectedMove] = useState(-1);
  const [highlightMoves, setHighlightMoves] = useState(false);
  const [highlightBuilds, setHighlightBuilds] = useState(false);

  const turn = useAppSelector(state => state.santorini.turn);

  useEffect(() => {
    socket.on('game update', (response: GameResponse) => {
      if (response.type === 'santorini move') {
        setHighlightBuilds(false)
        setHighlightMoves(false);
        setSelectedMove(-1);
        setSelectedWorker(-1);
      }
    });
    return () => {
      socket.off('game update')
    };
  }, []);

  function indexToCoord(index: number): Coord {
    return { x: index % 5, y: Math.floor(index / 5) }
  }

  function sendAction(buildIndex: number) {
    let payload = {
      workerCoord: indexToCoord(selectedWorker),
      moveCoord: indexToCoord(selectedMove),
      buildCoord: indexToCoord(buildIndex)
    }
    santoriniMove(payload);
    console.log(payload);
  }

  const elevations = useAppSelector(state => state.santorini.board);
  const phase = useAppSelector(state => state.santorini.phase);
  const workers = useAppSelector(state => state.santorini.workers);

  // Build board data
  let boardData: SquareData[] = [];
  for (let i = 0; i < 25; i++) {
    let squareData: SquareData = {
      index: i,
      coord: { x: i % 5, y: Math.floor(i / 5) },
      worker: '',
      elevation: 0,
      moveHighlighted: false,
      buildHighlighted: false
    }
    boardData.push(squareData)
  }

  // populate elevation
  elevations.forEach((level, index) => {
    boardData[index].elevation = level;
  });

  // populate workers
  const workerIndexes = workers.map(coord => {
    return coord.x + coord.y * 5;
  });
  workerIndexes.forEach((i, index) => {
    if (i >= 0) {
      if (index <= 1) boardData[i].worker = 'red'
      else boardData[i].worker = 'blue'
    }
  });

  function getAdjIndexes(index: number): number[] {
    let coord = { x: index % 5, y: Math.floor(index / 5) }
    let adjacentIndexes: number[] = [];
    for (let i = -1; i < 2; i++) {
      for (let j = -1; j < 2; j++) {
        let x = coord.x + i;
        let y = coord.y + j;
        if (x >= 0 && x <= 4
          && y >= 0 && y <= 4
          && (x + y * 5 !== index)) {
          adjacentIndexes.push(x + y * 5);
        }
      }
    }
    return adjacentIndexes;
  }

  // highlight square around selected worker
  if (selectedWorker >= 0 && highlightMoves) {
    let adjacentIndexes = getAdjIndexes(selectedWorker);
    adjacentIndexes.forEach(index => {
      if (boardData[index].elevation - boardData[selectedWorker].elevation <= 1) {
        boardData[index].moveHighlighted = true;
      }
    });
  }
  // highlight biulds 
  if (selectedMove >= 0 && highlightBuilds) {
    boardData[selectedWorker].worker = '';
    boardData[selectedMove].worker = turn;
    let adjacentIndexes = getAdjIndexes(selectedMove);
    adjacentIndexes.forEach(index => {
      boardData[index].buildHighlighted = true;
    });
  }

  let boardSquares = boardData.map(squareData => {
    return (
      <SantoriniSquare
        key={squareData.index}
        index={squareData.index}
        elevation={squareData.elevation}
        worker={squareData.worker}
        phase={phase}
        moveHighlighted={squareData.moveHighlighted}
        buildHighlighted={squareData.buildHighlighted}
        highlightBuilds={highlightBuilds}
        highlightMoves={highlightMoves}
        setSelectedWorker={setSelectedWorker}
        setSelectedMove={setSelectedMove}
        setHighlightBuilds={setHighlightBuilds}
        setHighlightMoves={setHighlightMoves}
        sendAction={sendAction}
      />
    )
  });

  return (
    <div className='santorini-grid' style={{
      display: `grid`,
      gridTemplateColumns: `repeat(5, 1fr)`
    }}>
      {boardSquares}
    </div>
  )
}

const SantoriniSquare = (props: {
  index: number,
  elevation: number,
  worker: string,
  phase: string,
  moveHighlighted: boolean,
  buildHighlighted: boolean,
  setSelectedWorker: Function,
  setSelectedMove: Function,
  setHighlightBuilds: Function,
  setHighlightMoves: Function,
  sendAction: Function,
  highlightBuilds: boolean,
  highlightMoves: boolean
}) => {

  // TODO : raise props
  const turn = useAppSelector(state => state.santorini.turn);
  const player = useAppSelector(state => state.santorini.player);
  const isPlayerTurn = turn === player;
  function indexToCoord(index: number): Coord {
    return { x: index % 5, y: Math.floor(index / 5) }
  }

  function onclick() {
    switch (props.phase) {
      case 'placement':
        console.log('sending placement request');
        santoriniPlace({ coord: indexToCoord(props.index) });
        break;
      case 'build':
        if (isPlayerTurn) {
          if (props.worker === player && !props.highlightMoves && !props.highlightBuilds) {
            console.log('worker selected, showing moves');
            props.setHighlightMoves(true);
            props.setHighlightBuilds(false);
            props.setSelectedWorker(props.index);
          } else if (props.moveHighlighted && !props.worker) {
            console.log('move selected, showing builds');
            props.setHighlightMoves(false);
            props.setHighlightBuilds(true);
            props.setSelectedMove(props.index);
          } else if (props.buildHighlighted && !props.worker) {
            console.log('action dispatched');
            props.setHighlightMoves(false);
            props.sendAction(props.index);
          } else {
            console.log('all deselected');

            props.setHighlightMoves(false);
            props.setHighlightBuilds(false);
            props.setSelectedMove(-1);
            props.setSelectedWorker(-1);
          }
        }
        break;
    }
  }

  let moveHighlighted = (props.moveHighlighted ? ' move-highlighted' : '');
  let buildHighlighted = (props.buildHighlighted ? ' build-highlighted' : '');

  return (
    <div
      className={'santorini-cell ' + props.worker + moveHighlighted + buildHighlighted}
      onClick={onclick}
    >
      <p>{props.elevation}</p>
      <p>{props.worker}</p>
    </div>
  )
}

export default SantoriniPage;