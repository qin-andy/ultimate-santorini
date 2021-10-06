import { motion } from "framer-motion"
import { useEffect, useState } from "react"

export const MenuButton = (props: { onClick: any, text: string }) => {
  const [defaultVariant, setDefaultVariant] = useState('show');
  useEffect(() => {
    setTimeout(() => setDefaultVariant('default'), 500);
  }, []);
  let buttonVariants = {
    initial: {
      opacity: 0,
      scale: 0,
      transition: {
        duration: 1,
        type: 'spring',
        bounce: 0.25
      }
    },
    default: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        type: 'spring',
        bounce: 0.25
      }
    },
    show: {
      opacity: 1,
      scale: 1,
    },
    hover: {
      opacity: 1,
      scale: 1.1,
      transition: {
        duration: 0.3,
        type: 'spring',
        bounce: 0.25
      }
    },
    tap: {
      opacity: 0.9,
      scale: 0.9,
      transition: {
        duration: 0.3,
        type: 'spring',
        bounce: 0.25
      }
    },
    exit: {
      opacity: 0,
      scale: 0,
      transition: {
        duration: 0.5
      }
    }
  }

  return (
    <motion.button
      layout
      className="menu-button"
      onClick={props.onClick}
      variants={buttonVariants}
      initial='initial'
      animate={defaultVariant}
      whileHover='hover'
      whileTap='tap'
      exit='exit'
    >
      {props.text}
    </motion.button>
  )
}