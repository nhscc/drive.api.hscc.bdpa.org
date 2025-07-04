// @ts-check

import assert from 'node:assert';

import {
  assertEnvironment,
  moduleExport
} from '@-xun/symbiote/assets/eslint.config.mjs';

import { createDebugLogger } from 'rejoinder';

const debug = createDebugLogger({ namespace: 'symbiote:config:eslint' });

const config = await moduleExport({
  derivedAliases: getEslintAliases(),
  ...(await assertEnvironment())
});

config.push(
  // TODO: delete this the next time you see it (unless webpack is still around)
  { ignores: ['**/webpack.config.js', '**/ban-hammer.js'] },
  {
    /* Add custom config here, such as disabling certain rules */
    rules: {
      'import/extensions': 'off',
      'no-restricted-syntax': 'off'
    }
  }
);

// TODO: delete this the next time you see it (unless /test/fixtures/ still
// TODO: unwisely contains integration.ts)
assert(config[0]);
config[0].ignores = config[0].ignores?.filter((p) => !p.includes('/test/fixtures/'));
assert(config[0].ignores);

export default config;

debug('exported config: %O', config);

function getEslintAliases() {
  // ! These aliases are auto-generated by symbiote. Instead of modifying them
  // ! directly, consider regenerating aliases across the entire project with:
  // ! `npx symbiote project renovate --regenerate-assets --assets-preset ...`
  return [
    ['rootverse:*', './*'],
    ['universe:*', './src/*'],
    ['universe', './src/index.ts'],
    ['testverse:*', './test/*'],
    ['typeverse:*', './types/*']
  ];
}
