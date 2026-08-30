import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {editorContentApiPlugin} from './apps/editor/dev/content-api-plugin.ts';
import {execFileSync} from 'node:child_process';

const productionContentValidationPlugin = {
  name: 'neon-ether-production-content-validation',
  apply: 'build' as const,
  buildStart() {
    execFileSync('bun', ['scripts/validate-content.ts'], {cwd: __dirname, stdio: 'inherit'});
  },
};

export default defineConfig(({ mode, command }) => {
  const isEditorBuild = mode === 'editor';
  return {
    plugins: [react(), tailwindcss(), ...(command === 'serve' ? [editorContentApiPlugin(__dirname)] : []), ...(!isEditorBuild && command === 'build' ? [productionContentValidationPlugin] : [])],
    build: {
      rollupOptions: {
        input: isEditorBuild ? path.resolve(__dirname, 'editor.html') : path.resolve(__dirname, 'index.html'),
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@neon-ether/engine': path.resolve(__dirname, 'packages/engine/src'),
        '@neon-ether/game-schema': path.resolve(__dirname, 'packages/game-schema/src'),
        '@neon-ether/game-runtime': path.resolve(__dirname, 'packages/game-runtime/src'),
        '@neon-ether/shared-ui': path.resolve(__dirname, 'packages/shared-ui/src'),
        '@neon-ether/content': path.resolve(__dirname, 'content'),
        '@apps/game': path.resolve(__dirname, 'apps/game/src'),
        '@apps/editor': path.resolve(__dirname, 'apps/editor/src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
