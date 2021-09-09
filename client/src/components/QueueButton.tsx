import { useState } from "react";
import { Button, ButtonProps, Spinner } from "react-bootstrap";

interface QueueButtonProps extends ButtonProps {
  
}

const QueueButton = (props: QueueButtonProps) => {
  let [inQueue, setInQueue] = useState<boolean>(false);
  return (
    <Button
      variant='outline-primary'
      disabled={inQueue}
      className={inQueue ? 'lh-1' : ''}
      onClick={() => {
        setInQueue(true);
      }}
    >
      {inQueue ? <Spinner animation='border' size='sm' role='status'></Spinner> : 'Start'}
    </Button>
  );
}

export default QueueButton;