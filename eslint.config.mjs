// Flat config (ESLint v9+). Shared across the whole monorepo.
// App-specific overrides (Next.js, NestJS) are layered in each app's own config.
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.mjs',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    // Plain-Node CLI scripts (e.g. scripts/dev.mjs): Node globals + console are expected.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly', setTimeout: 'readonly' },
    },
    rules: { 'no-console': 'off' },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // NOTE: `consistent-type-imports` is intentionally DISABLED. It forces `import type`
      // for constructor-injected services, but NestJS DI (emitDecoratorMetadata) needs those
      // classes as VALUE imports at runtime — forcing type-only imports breaks injection.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
);
