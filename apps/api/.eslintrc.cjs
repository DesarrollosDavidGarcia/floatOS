/* ESLint para @flotaos/api (NestJS).
 * Pensado para ESLint 8.57.x. El formato lo gobierna Prettier (.prettierrc en la raíz);
 * `eslint-config-prettier` desactiva aquí cualquier regla de estilo que pudiera chocar.
 * Reglas en `warn` (no `error`) para no romper el código existente: limpiar de forma incremental.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs', 'prisma'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    // Desactivada a propósito en la API: con `emitDecoratorMetadata` (NestJS DI),
    // convertir a `import type` un símbolo inyectado borra su metadata en runtime
    // y rompe la inyección de dependencias. Su `--fix` sería peligroso aquí.
    '@typescript-eslint/consistent-type-imports': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // Permitir guardas vacías típicas de Nest (interfaces, clases marker).
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
