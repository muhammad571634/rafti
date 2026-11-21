// Rewrites .expo/types/router.d.ts from src/app, the way `expo start` does on launch.
// Why: on Windows the dev server's file watcher compares paths with '/', so a route added or
// edited in a sub-folder while it runs is typed wrong (`/personas/index` instead of `/personas`,
// plus `/../lib/...` entries) and tsc then rejects valid router.push calls. Run it after adding
// routes: `node scripts/regen-route-types.mjs`.
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
process.env.EXPO_ROUTER_APP_ROOT = path.resolve('src/app');
const generator = require('../node_modules/expo/node_modules/@expo/cli/node_modules/@expo/router-server/build/typed-routes/index.js');

generator.regenerateDeclarations(path.resolve('.expo/types'));
// The call is debounced; give it time to write before the process ends.
setTimeout(() => console.log('Route types written to .expo/types/router.d.ts'), 1200);
