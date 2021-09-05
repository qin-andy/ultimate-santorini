import { Button, ButtonProps } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";

interface LinkbuttonProps extends ButtonProps {
  to: string
}
const LinkButton = (props: LinkbuttonProps) => {
  let {to, ...buttonProps} = props;
  return (
    <LinkContainer to={to}>
      <Button {...buttonProps}>
        {props.children}
      </Button>
    </LinkContainer>
  );
}

export default LinkButton;