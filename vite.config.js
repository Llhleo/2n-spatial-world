import {defineConfig} from 'vite';
export default defineConfig({build:{rollupOptions:{input:{world:'index.html',study:'studies/model-01/index.html',review:'studies/model-01/review.html',study02:'studies/model-02/index.html',review02:'studies/model-02/review.html',gardenArt:'studies/garden-art/index.html'}}}});
