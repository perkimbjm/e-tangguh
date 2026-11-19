import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Batas 400 baris per berkas kode (konstitusi v1.3.0, Prinsip VI).
 * Hanya berkas migrasi hasil pembangkit yang dikecualikan.
 */
const maxLines = ['error', { max: 400, skipBlankLines: true, skipComments: true }];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'apps/api/src/db/migrations/**',
      'specs/**',
      '.specify/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'max-lines': maxLines,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports', disallowTypeAnnotations: false }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['apps/api/src/**/*.ts'],
    rules: {
      // NestJS membutuhkan impor nilai untuk metadata dekorator (injeksi dependensi).
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['tools/**/*.ts', '**/seed/**/*.ts', '**/*.config.{ts,js}'],
    rules: { 'no-console': 'off' },
  },
  prettier,
);
