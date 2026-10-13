import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureAuthStorage } from '@careconnect/api-client';
import { ToastProvider } from '@careconnect/design-system';
import '@careconnect/design-system/styles';
import App from './App';

configureAuthStorage('cc_portal_token');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
