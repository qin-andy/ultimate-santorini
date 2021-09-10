import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import ManagerPage from './manager/ManagerPage';


const App = () => {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/">
          <ManagerPage />
        </Route>
      </Switch>
    </BrowserRouter>
  );
}
export default App;
