import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import HomePage from './pages/HomePage';
import JoinPage from './pages/JoinPage';
import CreatePage from './pages/CreatePage';


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
        <Route path="/">
          <HomePage />
        </Route>
      </Switch>
    </BrowserRouter>
  );
}
export default App;
