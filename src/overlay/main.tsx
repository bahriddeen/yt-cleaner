import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BlockOverlay } from './BlockOverlay';
import '@/theme/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BlockOverlay />
  </StrictMode>,
);
