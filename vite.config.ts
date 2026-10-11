import { defineConfig } from 'vite';

// 相对资源路径让产物能部署在 GitHub Pages 等静态站点的任意子路径下。
export default defineConfig({
  base: './',
  server: {
    proxy: { '/api/image': { target: 'http://127.0.0.1:8787' } },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});
