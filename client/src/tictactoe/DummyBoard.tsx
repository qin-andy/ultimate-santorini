import React, { useEffect, useState } from 'react';
import { marking } from '../types';
import { Button } from 'react-bootstrap';
import Cell from './Cell';
import './tictactoe.scss'
import { ReactElement } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';

interface BoardProps {
  dimensions: { x: number, y: number }
}

const DummyBoard = (props: BoardProps) => {
  const [turn, setTurn] = useState<marking>('o');
  const [active, setActive] = useState<boolean>(true);
  const dimensions = useAppSelector(state => state.tictactoe.dimensions);
  let board: marking[] = useAppSelector(state => state.tictactoe.board);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const xImg = new Image();
    const oImg = new Image();
    xImg.src = 'x.svg';
    oImg.src = 'o.svg';

    let emptyBoard = Array<marking>(props.dimensions.x * props.dimensions.y);
    emptyBoard.fill('*');
    dispatch({ type: 'tictactoe/boardUpdated', payload: emptyBoard });
  }, []);

  function onCellClick(x: number, y: number) {
    let newBoard = [...board];
    if (board[y * props.dimensions.x + x] === '*') {
      newBoard[y * props.dimensions.x + x] = turn;
      let newTurn: marking = turn === 'o' ? 'x' : 'o';
      setTurn(newTurn);
    } else {
      newBoard[y * props.dimensions.x + x] = '*';
    }
    console.log(board);

    dispatch({ type: 'tictactoe/boardUpdated', payload: newBoard });
  }

  function renderData(data: marking[]): ReactElement[] {
    let cells = [];
    for (let i = 0; i < props.dimensions.y; i++) {
      for (let j = 0; j < props.dimensions.x; j++) {
        let cell =
          <Cell
            key={i * props.dimensions.x + j}
            active={active}
            marking={data[i * props.dimensions.x + j]}
            x={j} y={i}
            dimensions={props.dimensions}
            onClick={onCellClick}
          />
        cells.push(cell);
      }
    }
    return cells;
  }

  return (
    <div className=''>
      <Button onClick={() => {
        let emptyBoard = Array<marking>(9);
        emptyBoard.fill('*');
        dispatch({ type: 'tictactoe/boardUpdated', payload: emptyBoard });
      }}>Clear</Button>
      <Button onClick={() => {
        setActive(!active);
      }}>Toggle Board</Button>
      <div className='d-flex flex-column align-items-center justify-content-center'>
        <div className='m-3 tictactoe-grid' style={{
          display: `grid`,
          gridTemplateColumns: `repeat(${props.dimensions.x}, 1fr)`
        }}>
          {renderData(board)}
        </div>
      </div>
    </div>
  );
}

export default DummyBoard;