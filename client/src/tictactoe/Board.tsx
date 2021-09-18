import React, { useEffect } from 'react';
import { marking } from '../types';
import Cell from './Cell';
import './tictactoe.scss'
import { ReactElement } from 'react';
import { useAppSelector } from '../hooks/hooks';
import { tictactoeMark } from '../services/socket';
import { motion, AnimatePresence } from 'framer-motion';

interface BoardProps {
  dimensions: { x: number, y: number }
  board: marking[]
  active?: boolean;
}

const Board = (props: BoardProps) => {
  const winningSquares = useAppSelector(state => state.tictactoe.winningSquares);

  useEffect(() => {
    // Preload images
    const xImg = new Image();
    const oImg = new Image();
    xImg.src = 'x.svg';
    oImg.src = 'o.svg';
  });

  function onCellClick(x: number, y: number) {
    tictactoeMark(x, y);
    console.log(x, y);
  }

  let winningIndexes: number[] = [];
  if (winningSquares) {
    for (let i = 0; i < winningSquares.length; i++) {
      let index = winningSquares[i].y * props.dimensions.x + winningSquares[i].x;
      winningIndexes.push(index);
    }
  }

  function buildBoardCells(data: marking[]): ReactElement[] {
    let cells = [];
    for (let i = 0; i < props.dimensions.y; i++) {
      for (let j = 0; j < props.dimensions.x; j++) {
        let index = i * props.dimensions.x + j;
        let cell =
          <Cell
            key={index}
            marking={data[index]}
            x={j} y={i}
            dimensions={props.dimensions}
            winningSquare={winningIndexes.includes(index)}
            onClick={onCellClick}
          />
        cells.push(cell);
      }
    }
    return cells;
  }

  return (
    <motion.div layout className="my-column">
      <div className='tictactoe-grid' style={{
        display: `grid`,
        gridTemplateColumns: `repeat(${props.dimensions.x}, 1fr)`
      }}>
        <AnimatePresence>
          {props.active ? buildBoardCells(props.board) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default Board;