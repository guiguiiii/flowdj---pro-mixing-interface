import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import MonitorApp from './MonitorApp.tsx';
import './index.css';

const RootApp = window.location.pathname === '/monitor' ? MonitorApp : App;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);
