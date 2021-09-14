import { marking } from "../types";
import { useState } from "react";
import { AnimatePresence, motion } from 'framer-motion';

interface CellProps {
  marking: marking,
  x: number,
  y: number,
  onClick: Function,
  dimensions: { x: number, y: number }
  active?: boolean,
  winningSquare?: boolean
}

const Cell = (props: CellProps) => {
  const [cellVariant, setCellVariant] = useState('initial');
  let delay = (props.y*props.dimensions.x + props.x) * 0.04;

  const cellVariants = {
    initial: {
      opacity: 1, x: 0, y: 0,
      transition: {
        type: 'spring',
        bounce: 0.25,
        duration: 0.5,
        delay: delay
      }
    },
    open: {
      opacity: 1, x: 0, y: 0,
      transition: {
        duration: 0.1
      }
    },
    openHover: {
      opacity: 1, scale: 1.08, x: 0, y: 0,
      transition: {
        duration: 0.2
      }
    },
    mouseDown: {
      opacity: 1, scale: 0.90, x: 0, y: 0,
      transition: {
        duration: 0.1
      }
    },
    beforeEnter: {
      opacity: 0, x: 0, y: 100,
      transition: {
        duration: 0.75,
        delay: delay
      }
    },
    afterExit: {
      opacity: 0, x: 0, y: -150,
      transition: {
        duration: 0.4,
        delay: delay * 2
      }
    }
  }

  const markingVariants = {
    marked: {
      opacity: 1, scale: 1, rotate: 0,
      transition: {
        repeat: 0,
        type: 'spring',
        bounce: 0.5,
        duration: 0.5
      }
    },
    unmarked: {
      opacity: 0, scale: 0.8, rotate: 25,
      transition: {
        duration: 0.2
      }
    },
    winningSquare: {
      rotate: 360,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 1.5,
        type: 'spring',
        bounce: 0.5
      }
    }
  }

  return (
    <motion.div
      className='tictactoe-cell d-flex align-items-center justify-content-center'
      key={'' + props.y * props.dimensions.x + props.x}
      initial={'beforeEnter'}
      animate={cellVariant}
      exit={'afterExit'}
      variants={cellVariants}
      onClick={() => props.onClick(props.x, props.y)}
      onMouseEnter={() => setCellVariant('openHover')}
      onMouseLeave={() => setCellVariant('open')}
      onMouseDown={() => setCellVariant('mouseDown')}
      onMouseUp={() => setCellVariant('openHover')}
      layout
    >
      <AnimatePresence>
        {props.marking !== 'x' && props.marking !=='o' ? null :
          <motion.img
            className='cell-mark'
            key='svg image'
            initial={props.winningSquare ? 'marked' : 'unmarked'}
            animate={props.winningSquare ? 'winningSquare' : 'marked'}
            exit={'unmarked'}
            variants={markingVariants}
            src={`${props.marking}.svg`}
            alt={props.marking}
          />
        }
      </AnimatePresence>
    </motion.div>
  );
}

export default Cell;