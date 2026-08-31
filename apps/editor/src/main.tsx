import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorApp } from './EditorApp.tsx';
import { AuthoringPresetProvider } from './presets/authoring-presets.tsx';
import '../../../src/index.css';

createRoot(document.getElementById('root')!).render(<StrictMode><AuthoringPresetProvider><EditorApp /></AuthoringPresetProvider></StrictMode>);
