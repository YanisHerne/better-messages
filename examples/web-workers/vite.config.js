import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

const copyStaticAssets = () => {
    return {
        name: 'copy-static-assets',
        closeBundle() {
            const sourceDir = resolve(__dirname, 'static');
            const destDir = resolve(__dirname, 'dist');
            if (fs.existsSync(sourceDir)) {
                fs.cpSync(sourceDir, destDir, { recursive: true });
            }
        },
    };
};

//export default defineConfig({
//    build: {
//        rollupOptions: {
//            input: {
//                index: resolve(__dirname, 'src/main.ts'),
//                worker: resolve(__dirname, 'src/worker.ts'),
//            },
//            output: {
//                entryFileNames: `[name].js`,
//                chunkFileNames: `[name]-[hash].js`,
//                assetFileNames: `[name].[ext]`,
//                sourcemap: true,
//            },
//        },
//        outDir: 'dist',
//        sourcemap: true,
//    },
//    plugins: [
//        copyStaticAssets(),
//    ],
//});
//
export default defineConfig({
    build: {
        sourcemap: true,
    },
    preview: {
        port: 3000,
    },
});
