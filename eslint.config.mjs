import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

// Consume eslint-config-next's native flat configs directly. The previous
// FlatCompat.extends() bridge routed these through @eslint/eslintrc, whose
// validator JSON.stringify's the resolved config and choked on a circular
// `react` plugin reference under ESLint 9 + Next 16 (#107).
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    // Payload generates migrations with the full `({ payload, req })` signature
    // whether or not the body uses it; don't warn on the generated shape.
    files: ['src/migrations/**'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
  {
    // migration/ is the gitignored Webflow export — vendored, not part of the
    // build, and not ours to lint. .claude/ holds session worktrees (full repo
    // copies) that would otherwise get linted twice.
    ignores: [
      '.next/',
      '.claude/',
      'migration/',
      'src/payload-types.ts',
      'src/payload-generated-schema.ts',
    ],
  },
]

export default eslintConfig
