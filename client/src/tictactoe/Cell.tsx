import { marking } from "../types";
import { CSSTransition } from 'react-transition-group';
import { useEffect, useRef, useState } from "react";

interface CellProps {
  marking: marking,
  x: number,
  y: number,
  onClick: Function,
  style?: any,
}

const Cell = (props: CellProps) => {
  const svgRef = useRef(null);
  const [svg, setSvg] = useState(<img ref={svgRef}></img>);
  const [marked, setMarked] = useState(false);

  useEffect(() => {
    if (props.marking === 'x' || props.marking === 'o') {
      setSvg(<img ref={svgRef} className='cell-mark' src={`${props.marking}.svg`} alt={props.marking} />);
      setMarked(true);
    } else {
      setMarked(false);
    }
  }, [props.marking]);

  return (
    <div
      className='tictactoe-cell d-flex align-items-center justify-content-center'
      onClick={() => props.onClick(props.x, props.y)}
      style={props.style}
    >
      <CSSTransition
        in={marked}
        timeout={300}
        classNames={'cell-mark'}
        nodeRef={svgRef}
        unmountOnExit
      >
        {svg}
      </CSSTransition>
    </div>
  );
}

export default Cell;