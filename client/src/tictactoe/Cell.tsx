import { marking } from "../types";

interface CellProps {
  marking: marking,
  x: number,
  y: number,
  onClick: Function,
}

const Cell = (props: CellProps) => {
  let svg = null;
  if (props.marking === 'x') {
    svg = <img src='x.svg' alt='x' />;
  } else if (props.marking === 'o') {
    svg = <img src='o.svg' alt='o' />;
  }
  return (
    <div
      className='tictactoe-cell'
      onClick={() => props.onClick(props.x, props.y)}
    >
      {svg}
    </div>
  );
}

export default Cell;