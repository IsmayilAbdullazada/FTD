import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from '@/app/App';
import './index.css';
import { ThemeProvider } from '@/app/providers/ThemeProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
