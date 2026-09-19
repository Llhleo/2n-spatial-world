import {defineConfig} from 'vite';
export default defineConfig({build:{rollupOptions:{input:{world:'index.html',study:'studies/model-01/index.html',review:'studies/model-01/review.html'}}}});
