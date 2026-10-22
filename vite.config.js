import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      fs: {
        deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/server/**', '**/scripts/**', '**/tests/**', '**/*.md', '**/audit-security.json'],
      },
      proxy: {
        '/api': { target: `http://localhost:${env.PORT || 3000}`, changeOrigin: true },
      },
    },
  };
});
