import { useSyncExternalStore } from 'react';
import { Switch, Route, Redirect } from 'wouter';
import { getToken, onAuthChange } from '../api/client';
import { LoginPage } from '../pages/login';
import { RegisterPage } from '../pages/register';
import { BoardPage } from '../pages/board';
import { SettingsPage } from '../pages/settings';
import { WikiPage } from '../pages/wiki';
import { CanvasPage } from '../pages/canvas';
import { AppLayout } from '../components/layout/app-layout';
// NOTE: CanvasPage rebuilt in V2-6; route kept below.

export function App() {
  const token = useSyncExternalStore(onAuthChange, getToken, getToken);

  if (!token) {
    return (
      <Switch>
        <Route path="/register" component={RegisterPage} />
        <Route path="/login" component={LoginPage} />
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/boards/:boardId/cards/:cardKey" component={BoardPage} />
        <Route path="/boards/:boardId" component={BoardPage} />
        <Route path="/projects/:projectId/wiki" component={WikiPage} />
        <Route path="/projects/:projectId/canvas" component={CanvasPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route>
          <Redirect to="/boards/select" />
        </Route>
      </Switch>
    </AppLayout>
  );
}

export default App;
