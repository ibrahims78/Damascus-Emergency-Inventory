import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';

import { installOfflineApi } from './lib/offline-api';

if (import.meta.env.VITE_OFFLINE_MODE === '1') {
  installOfflineApi();
}

createRoot(document.getElementById('root')!).render(<App />);
