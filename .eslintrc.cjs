module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  settings: {
    react: {
      version: '18.3'
    }
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
  },
  overrides: [
    {
      files: ['src/renderer/src/apps/**/*', 'src/renderer/src/widgets/**/*'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '*os/kernel*',
                  '**/os/kernel/**',
                  '@os/kernel*',
                  '*os/shell*',
                  '**/os/shell/**',
                  '@os/shell*',
                  '**/apps/**',
                  '**/widgets/**'
                ],
                message: 'Apps and widgets can only import from @os/sdk, @os/ui, react, allowed dependencies, or their own local directory.'
              }
            ]
          }
        ]
      }
    }
  ]
}
