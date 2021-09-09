import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import HomePage from './pages/HomePage';
import JoinPage from './pages/JoinPage';
import CreatePage from './pages/CreatePage';
import ManagerPage from './pages/ManagerPage';


const App = () => {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/join">
          <JoinPage />
        </Route>
        <Route path="/create">
          <CreatePage />
        </Route>
        <Route path="/home">
          <HomePage />
        </Route>
        <Route path="/">
          <ManagerPage />
        </Route>
      </Switch>
    </BrowserRouter>
  );
}
export default App;
