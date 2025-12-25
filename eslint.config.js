import eslintCore from '@kitiumai/lint/configs/eslint-core';
import { nodeConfig } from '@kitiumai/lint/eslint';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.js', '**/*.d.ts', 'bin/**'],
  },
  // Use eslint-core directly to avoid plugin redefinition issues
  ...eslintCore,
  // Add node-specific config (for .js files if any)
  ...nodeConfig,
  {
    name: 'scripts/overrides',
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
      // Allow relative imports from parent directories within the same package
      'import/no-relative-parent-imports': 'off',
      // Allow common abbreviations in variable names
      'unicorn/prevent-abbreviations': [
        'warn',
        {
          allowList: {
            dir: true,
            Dir: true,
            pkg: true,
            Pkg: true,
            msg: true,
            Msg: true,
            env: true,
            Env: true,
            val: true,
            Val: true,
            acc: true,
            dist: true,
            args: true,
            Args: true,
            fn: true,
            Fn: true,
            getEnv: true,
            rootDir: true,
            packageDir: true,
            startDir: true,
            currentDir: true,
            parentDir: true,
            hookDir: true,
            packagesDir: true,
            toolingDir: true,
          },
        },
      ],
      // Allow __filename and __dirname (Node.js globals)
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
          filter: {
            regex: '^(__filename|__dirname)$',
            match: false, // Don't apply to these
          },
        },
        {
          selector: 'variable',
          // Allow __filename and __dirname
          filter: {
            regex: '^(__filename|__dirname)$',
            match: true,
          },
          format: null, // Allow any format for these
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['PascalCase', 'UPPER_CASE'],
        },
        {
          selector: 'objectLiteralProperty',
          format: null, // Allow any format for object literal properties (npm package names, etc.)
        },
        {
          selector: 'typeProperty',
          format: null, // Allow any format for type properties (API response types, etc.)
        },
      ],
      // Reduce strictness on complexity and function length (warnings instead of errors)
      complexity: ['warn', { max: 15 }],
      'max-statements': ['warn', { max: 30 }],
      'max-lines-per-function': ['warn', { max: 100 }],
      'max-depth': ['warn', { max: 4 }],
      // Allow missing return types in some cases (reduce to warning)
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
    },
  },
];
