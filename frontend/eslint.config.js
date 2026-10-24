import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', '*.cjs'] },
  js.configs.recommended,
  ...tseslint.configs['flat/recommended'],
  reactHooks.configs.flat.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  // Entry point: renders the app, exports nothing by design
  { files: ['src/main.tsx'], rules: { 'react-refresh/only-export-components': 'off' } },
]
