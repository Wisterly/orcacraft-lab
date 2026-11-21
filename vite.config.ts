import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { geminiOrcamentoApiPlugin } from './server/viteApiPlugin';

export default defineConfig({
  plugins: [react(), geminiOrcamentoApiPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});
