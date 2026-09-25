// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions e Deno (jsr:/npm: imports), validado por `deno check`.
    ignores: ['dist/*', 'supabase/functions/**'],
  },
]);
