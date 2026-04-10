import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
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
