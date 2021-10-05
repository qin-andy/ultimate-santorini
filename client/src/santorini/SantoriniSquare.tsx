import { motion } from "framer-motion";
import { useState } from "react";
import { santoriniPlace } from "../services/socket";
import { Coord } from "../types";
import { Building } from "./Building";

export const SantoriniSquare = (props: {
  index: number,
  elevation: number,
  worker: string,
  workerId: number,
  phase: string,
  player: string,
  turn: string,
  selectionDispatch: Function,
  moveHighlighted: boolean,
  buildHighlighted: boolean,
  highlightBuilds: boolean,
  highlightMoves: boolean,
  isWinningCoord: boolean
}) => {
  const [variant, setVariant] = useState('initial');
  const isPlayerTurn = props.turn === props.player;
  function indexToCoord(index: number): Coord {
    return { x: index % 5, y: Math.floor(index / 5) }
  }

  function onClick() {
    switch (props.phase) {
      case 'placement':
        console.log('sending placement request');
        santoriniPlace({ coord: indexToCoord(props.index) });
        break;
      case 'build':
        if (isPlayerTurn) {
          // if there is a worker on this space and nothing else is highlighted
          if (props.worker === props.player && !props.highlightMoves && !props.highlightBuilds) {
            props.selectionDispatch({ type: 'select worker', coord: props.index });
          } else if (props.moveHighlighted && !props.worker) {
            props.selectionDispatch({ type: 'select move', coord: props.index });
          } else if (props.buildHighlighted && !props.worker) {
            props.selectionDispatch({ type: 'select build', coord: props.index });
          } else {
            props.selectionDispatch({ type: 'deselect all' });
          }
        }
        break;
    }
  }

  let delay = props.index * 0.05;
  let cellVariants = {
    beforeEnter: {
      opacity: 0, x: 0, y: 100,
      scale: 0.9,
    },
    initial: {
      opacity: 1, x: 0, y: 0,
      scale: 0.9,
      transition: {
        type: 'spring',
        bounce: 0.25,
        duration: 1,
        delay: delay
      }
    },
    default: {
      x: 0, y: 0, opacity: 1,
      backgroundColor: '#FFFFFF',
      scale: 0.9,
      transition: {
        duration: 0.1
      }
    },
    hover: {
      x: 0, y: 0, opacity: 1,
      scale: 1,
      transition: {
        duration: 0.1
      }
    },
    popIn: {
      x: 0, y: 0, opacity: 1,
      scale: 0.87,
      transition: {
        duration: 0.1
      }
    },
    moveHighlighted: {
      x: 0, y: 0, opacity: 1,
      backgroundColor: '#DDDDDD',
      scale: 0.9,
      transition: {
        duration: 0.1
      }
    },
    buildHighlighted: {
      x: 0, y: 0, opacity: 1,
      backgroundColor: '#CCCCCC',
      scale: 0.9,
      transition: {
        duration: 0.1
      }
    },
    exit: {
      x: 0, y: 100, opacity: 0,
      transition: {
        duration: 0.5,
        delay: delay
      }
    }
  }

  return (
    <motion.div
      className={'santorini-cell'}
      variants={cellVariants}
      animate={props.moveHighlighted ? 'moveHighlighted' : props.buildHighlighted ? 'buildHighlighted' : variant}
      initial='beforeEnter'
      whileHover={variant === 'default' ? 'hover' : ''}
      whileTap={variant === 'default' ? 'popIn' : ''}
      onClick={onClick}
      onAnimationComplete={() => setVariant('default')}
      exit='exit'
      style={props.worker ? { zIndex: 3 } : {}}
    >
      <Building elevation={props.elevation}
        worker={props.worker}
        workerId={props.workerId}
        phase={props.phase}
        isWinningCoord={props.isWinningCoord}
        turn={props.turn}
      />
    </motion.div>
  )
}