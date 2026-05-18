import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    plugins: [react()],
    resolve: {
        tsconfigPaths: true,
        alias: {
            'server-only': fileURLToPath(new URL('./test/server-only.ts', import.meta.url)),
        },
    },
    test: {
        environment: 'happy-dom',
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        exclude: ['node_modules', '.next', 'test/e2e', 'dist'],
    },
});
