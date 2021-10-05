import { motion } from "framer-motion"

export const MenuButton = (props: { onClick: any, text: string }) => {
  let buttonVariants = {
    initial: {
      opacity: 1,
      transition: {
        duration: 1
      }
    },
    show: {
      opacity: 1,
      transition: {
        duration: 1
      }
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 1
      }
    }
  }

  return (
    <motion.button
      layout
      className=""
      onClick={props.onClick}
      variants={buttonVariants}
      initial='initial'
      animate='show'
      exit='exit'
    >
      {props.text}
    </motion.button>
  )
}