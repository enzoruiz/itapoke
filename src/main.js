import './styles.css';
import { createApp } from './app.js';
import { registerServiceWorker } from './sw-register.js';
import { reportWebVitals } from './vitals.js';

createApp(document.querySelector('#app'));
reportWebVitals();
registerServiceWorker();
