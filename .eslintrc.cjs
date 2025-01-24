module.exports = {
  env: { browser: true, es2020: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  extends: [
    'airbnb',
    'airbnb/hooks',
    'prettier',
    'plugin:react/jsx-runtime', // Disallow missing React import when using JSX
  ],
  plugins: ['react-refresh', 'prettier'],
  rules: {
    'react/jsx-no-target-blank': 'off',
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    'import/no-unresolved': [2, { ignore: ['\\?url$'] }], // can't resolve ?url for some reason
    'no-console': 'warn',
    'no-unused-expressions': ['error', { allowTernary: true }],
    'react/jsx-props-no-spreading': 'off',
    // 'react/prop-types': [0],
  },
};
