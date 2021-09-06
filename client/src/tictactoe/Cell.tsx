import { marking } from "../types";

interface CellProps {
  marking: marking
}

const Board = (props: CellProps) => {
  let svg = null;
  if (props.marking === 'x') {
    svg = <img src='x.svg' alt='x' />;
  } else if (props.marking === 'o') {
    svg = <img src='o.svg' alt='o'/>;
  }
  return (
    <div className='tictactoe-cell'>
      {svg}
    </div>
  );
}

export default Board;