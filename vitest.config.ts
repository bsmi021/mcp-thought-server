/**
 * Vitest Configuration
 * @description Configuration for Vitest test runner
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Enable TypeScript support
        include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: ['node_modules', 'build'],

        // Environment configuration
        environment: 'node',

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'build/',
                '**/*.d.ts',
                '**/*.test.ts',
                '**/*.spec.ts',
            ],
        },

        // Test timeout
        testTimeout: 10000,

        // Parallel execution
        pool: 'threads',
        poolOptions: {
            threads: {
                singleThread: false,
            },
        },
    },
}); 