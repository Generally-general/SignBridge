
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    https: false,//{
    //   key: fs.readFileSync('./certs/frontend-key.pem'),
    //   cert: fs.readFileSync('./certs/frontend-cert.pem'),
    // },
  },
});
