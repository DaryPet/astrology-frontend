import parser from '@typescript-eslint/parser'
import plugin from '@typescript-eslint/eslint-plugin'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.git/**',
      'build/**',
      'coverage/**',
      '*.config.*',
      'kilo.config.*',
      '.kilo/**',
      '*.d.ts',
      '.env.*',
      '*.log',
      '*.css',
      '*.scss',
      '*.png',
      '*.jpg',
      '*.jpeg',
      '*.gif',
      '*.svg',
      '*.ico',
      '*.woff',
      '*.woff2',
      '*.ttf',
      '*.eot',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: parser,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': plugin,
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      // Base rules
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'indent': ['error', 2],
      'no-mixed-spaces-and-tabs': 'error',
      'no-trailing-spaces': 'error',
      'no-console': 'warn',
      'no-debugger': 'error',

      // TypeScript
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',

      // React
      'react/prop-types': 'off',
      'react/jsx-no-target-blank': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
]
