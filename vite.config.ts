import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// base：GitHub Pages 服務在 /<repo-name>/ 路徑下，必須設定才能正確載入資源
// 本地開發 (vite dev) 仍用 /
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/mahjong-solitaire/' : '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
}));
