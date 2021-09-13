import React, { useEffect, useState } from 'react';
import { marking } from '../types';
import Cell from './Cell';
import './tictactoe.scss'
import { ReactElement } from 'react';
import { useAppSelector } from '../hooks/hooks';
import { tictactoeMark } from '../services/socket';
import { AnimatePresence } from 'framer-motion';

interface BoardProps {
  dimensions: { x: number, y: number }
}

const Board = (props: BoardProps) => {
  const board: marking[] = useAppSelector(state => state.tictactoe.board);
  const inGame = useAppSelector(state => state.manager.inGame);
  console.log(board);

  useEffect(() => {
    const xImg = new Image();
    const oImg = new Image();
    xImg.src = 'x.svg';
    oImg.src = 'o.svg';
  });

  function onCellClick(x: number, y: number) {
    if (board) console.log(board[y * props.dimensions.x + x]);
    tictactoeMark(x, y);
  }

  function renderData(data: marking[]): ReactElement[] {
    let cells = [];
    for (let i = 0; i < props.dimensions.y; i++) {
      for (let j = 0; j < props.dimensions.x; j++) {
        let cell =
          <Cell
            key={i * props.dimensions.x + j}
            marking={data[i * props.dimensions.x + j]}
            x={j} y={i}
            active={inGame}
            dimensions={props.dimensions}
            onClick={onCellClick}
          />
        cells.push(cell);
      }
    }
    return cells;
  }

  return (
    <div className='m-3 tictactoe-grid' style={{
      display: `grid`,
      gridTemplateColumns: `repeat(${props.dimensions.x}, 1fr)`
    }}>
      <AnimatePresence>
        {inGame ? renderData(board) : null}
      </AnimatePresence>
    </div>
  );
}

export default Board;