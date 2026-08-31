import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorApp } from './EditorApp.tsx';
import '../../../src/index.css';

createRoot(document.getElementById('root')!).render(<StrictMode><EditorApp /></StrictMode>);
