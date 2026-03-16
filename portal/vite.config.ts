import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const funcAppUrl = env.VITE_FUNC_APP_URL;

  return {
    plugins: [react()],
    server: {
      port: 5174,
      strictPort: true,
      proxy: funcAppUrl
        ? {
            '/funcproxy': {
              target: funcAppUrl,
              changeOrigin: true,
              rewrite: (path: string) => path.replace(/^\/funcproxy/, ''),
              timeout: 300_000, // 5 min — PaaS AddPack creates alert rules per resource
            },
          }
        : undefined,
    },
  };
});
