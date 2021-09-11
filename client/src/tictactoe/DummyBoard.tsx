import React, { useEffect, useState } from 'react';
import { marking } from '../types';
import { Button, Col, Row } from 'react-bootstrap';
import Cell from './Cell';
import './tictactoe.scss'
import { CSSTransition } from 'react-transition-group';
import { ReactElement } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';

interface BoardProps {
  x: number,
  y: number
}

const DummyBoard = (props: BoardProps) => {
  const [turn, setTurn] = useState<marking>('o');
  const [active, setActive] = useState<boolean>(false);
  let board: marking[] = useAppSelector(state => state.tictactoe.board);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const xImg = new Image();
    const oImg = new Image();
    xImg.src = 'x.svg';
    oImg.src = 'o.svg';

    let emptyBoard = Array<marking>(9);
    emptyBoard.fill('*');
    dispatch({ type: 'tictactoe/boardUpdated', payload: emptyBoard });
  }, []);

  function onCellClick(x: number, y: number) {
    console.log(board);
    let newBoard = [...board];
    if (board[y * 3 + x] === '*') {
      newBoard[y * 3 + x] = turn;
      let newTurn: marking = turn === 'o' ? 'x' : 'o';
      setTurn(newTurn);
    } else {
      newBoard[y * 3 + x] = '*';
    }
    dispatch({ type: 'tictactoe/boardUpdated', payload: newBoard });
  }

  function renderData(data: marking[]): ReactElement[] {
    let cells: ReactElement[] = [];
    for (let i = 0; i < props.y; i++) {
      for (let j = 0; j < props.x; j++) {
        let delay = (i * props.y + j) * 50;
        let cell =
          <CSSTransition
            key={i * props.y + j}
            in={active}
            timeout={900} // to account for delay on individual components
            classNames={'tictactoe-cell'}
            unmountOnExit>
            <Cell
              marking={data[i * props.y + j]}
              x={j} y={i}
              onClick={onCellClick}
              style={{ transitionDelay: `${delay}ms` }}
            />
          </CSSTransition>
        cells.push(cell);
      }
    }
    return cells;
  }

  return (
    <div className='d-flex flex-column align-items-center'>
      <Button onClick={() => {
        let emptyBoard = Array<marking>(9);
        emptyBoard.fill('*');
        dispatch({ type: 'tictactoe/boardUpdated', payload: emptyBoard });
      }}>Clear</Button>
      <Button onClick={() => {
        setActive(!active);
      }}>Toggle Board</Button>
      <div className='m-3 tictactoe-grid'>
        {renderData(board)}
      </div>
    </div>
  );
}

export default DummyBoard;