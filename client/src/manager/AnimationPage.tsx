import React from 'react';
import DummyBoard from '../tictactoe/DummyBoard';
const AnimationPage = () => {
  return (
    <div className='w-100'>
      <div className=''>
        <DummyBoard dimensions={{ x: 9, y: 9 }} />
      </div>
    </div>
  );
}

export default AnimationPage;

