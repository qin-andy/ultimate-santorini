import { motion } from "framer-motion";

export const Building = (props: {
  elevation: number,
  worker: string,
  workerId: number,
  phase: string,
  turn: string,
  isWinningCoord: boolean,
}) => {
  let buildingVariants = {
    initial: {
      scale: 0
    },
    default: {
      scale: 1,
      transition: {
        type: 'spring',
        bounce: 0.5,
        duration: 0.75
      }
    },
    winning: {
      rotate: 360,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 1.5,
        repeat: Infinity,
        type: 'spring',
        bounce: 0.5
      }
    }
  }

  let child = <div></div>;
  if (props.worker) child = <motion.div
    variants={buildingVariants}
    initial={props.phase === 'placement' ? 'initial' : 'default'} // animation should trigger after phase change
    animate={props.isWinningCoord ? 'winning' : 'default'}
    layoutId={'worker-' + props.workerId}
    className={'worker-' + props.worker}
  />
  if (props.elevation >= 4) child = <motion.img
    src='x.svg'
    alt='capped tower'
    variants={buildingVariants}
    initial='initial'
    animate='default'
    className='elevation-4'>
  </motion.img>
  if (props.elevation >= 3) child = <motion.div
    variants={buildingVariants}
    initial='initial'
    animate={props.isWinningCoord ? 'winning' : 'default'}
    className='elevation-3'>
    {child}
  </motion.div>
  if (props.elevation >= 2) child = <motion.div
    variants={buildingVariants}
    initial='initial'
    animate={props.isWinningCoord ? 'winning' : 'default'}
    className='elevation-2'>
    {child}
  </motion.div>
  if (props.elevation >= 1) child = <motion.div
    variants={buildingVariants}
    initial='initial'
    animate={props.isWinningCoord ? 'winning' : 'default'}
    className='elevation-1'>
    {child}
  </motion.div>
  return child;
}