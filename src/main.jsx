import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/base.css';
import './styles/shell.css';
import './styles/components.css';
import './styles/animations.css';
import './styles/landing.css';
import './styles/design-system.css';
import { App } from './App.jsx';
import { registerServiceWorker } from './sw-register.js';
import { reportWebVitals } from './vitals.js';

createRoot(document.querySelector('#app')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
registerServiceWorker();
