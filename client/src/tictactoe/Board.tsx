import React from 'react';
import { marking } from '../types';
import { Col, Row } from 'react-bootstrap';
import Cell from './Cell';
import './tictactoe.scss'
import { ReactElement } from 'react';

interface BoardProps {
  x: number,
  y: number,
  data: marking[],
  onClick: Function
}

const Board = (props: BoardProps) => {
  function renderData(data: marking[]): ReactElement[] {
    let rows: ReactElement[] = [];
    for (let i = 0; i < props.y; i++) {
      let cells: ReactElement[] = [];
      for (let j = 0; j < props.x; j++) {
        cells.push(
          <Col key={i * props.y + j} className='p-0'>
            <Cell
              marking={props.data[i * props.y + j]}
              x={j} y={i}
              onClick={props.onClick}
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
      {
        renderData(props.data)
      }
    </div>
  );
}

export default Board;