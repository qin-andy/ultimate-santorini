import React, { useEffect } from 'react';
import { marking } from '../types';
import { Col, Row } from 'react-bootstrap';
import Cell from './Cell';
import './tictactoe.scss'
import { ReactElement } from 'react';
import { useAppSelector } from '../hooks/hooks';
import { tictactoeMark } from '../services/socket';

interface BoardProps {
  dimensions: {x: number, y: number}
}

const Board = (props: BoardProps) => {
  let board: marking[] = useAppSelector(state => state.tictactoe.board);
  console.log(board);

  useEffect(() => {
    const xImg = new Image();
    const oImg = new Image();
    xImg.src = 'x.svg';
    oImg.src = 'o.svg';
  });

  function onCellClick(x: number, y: number) {
    console.log(x, y);
    if (board) console.log(board[y * props.dimensions.x + x]);
    tictactoeMark(x, y);
  }

  function renderData(data: marking[]): ReactElement[] {
    let rows: ReactElement[] = [];
    for (let i = 0; i < props.dimensions.y; i++) {
      let cells: ReactElement[] = [];
      for (let j = 0; j < props.dimensions.x; j++) {
        cells.push(
          <Col key={i * props.dimensions.y + j} className='p-0'>
            <Cell
              marking={data[i * props.dimensions.x + j]}
              dimensions={props.dimensions}
              x={j} y={i}
              onClick={onCellClick}
            />
          </Col>
        )
      }
      rows.push(
        <Row key={i} className='flex-row'>
          {cells}
        </Row>
      );
    }
    return rows;
  }

  return (
    <div className='m-3 tictactoe-grid'>
      {renderData(board)}
    </div>
  );
}

export default Board;