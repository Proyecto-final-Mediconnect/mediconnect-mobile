// ESLint flat config — Sprint 0 §3.4.2:
// @typescript-eslint/recommended + react + react-hooks, consistente entre repos.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'web-build/**', 'babel.config.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser, ...globals.es2021 },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // React Native / nuevo JSX transform: no hace falta importar React.
      'react/react-in-jsx-scope': 'off',
      // 3.4.1: reglas de lenguaje.
      'no-var': 'error',
      'prefer-const': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Tests: relajamos algunas reglas propias del entorno de testing.
    files: ['**/*.spec.{ts,tsx}', 'vitest.setup.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  prettier,
);
