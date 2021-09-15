import { marking } from "../types";
import { useState } from "react";
import { AnimatePresence, motion } from 'framer-motion';

interface MarkingProps {
  marking: marking,
  winningSquare?: boolean
}

const Marking = (props: MarkingProps) => {
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
    <AnimatePresence>
      {props.marking !== 'x' && props.marking !== 'o' ? null :
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
  );
}

export default Marking;