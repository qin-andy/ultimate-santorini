import { Col, Row } from 'react-bootstrap';
import LinkButton from '../components/LinkButton';
import DefaultPage from './DefaultPage';
import Board from '../tictactoe/Board';
import { marking } from '../types';

const HomePage = () => {

  let boardData: marking[] = [
    'x', 'x', 'o',
    '*', 'x', 'x',
    '*', 'o', 'o'
  ]

  return (
    <DefaultPage>
      <Row>
        <Col className='text-center'>
          <h1>Board</h1>
          <Board data={boardData} x={3} y={3} />
          <LinkButton to='/join' variant='outline-primary'>
            Join
          </LinkButton>
          <LinkButton to='/create' variant='outline-primary'>
            Create
          </LinkButton>
        </Col>
      </Row>
    </DefaultPage>
  );
}
export default HomePage;
