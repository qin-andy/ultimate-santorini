import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import AnimationPage from './manager/AnimationPage';
import GamePage from './manager/GamePage';
import ManagerPage from './manager/ManagerPage';


const App = () => {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/manager">
          <ManagerPage />
        </Route>
        <Route path="/animation">
          <AnimationPage />
        </Route>
        <Route path="/">
          <GamePage />
        </Route>
      </Switch>
    </BrowserRouter>
  );
}
export default App;
