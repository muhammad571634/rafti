import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { freshStack, routeHref, stackOf } from './theme-restore';

describe('the place kept across a theme reload', () => {
  it('turns routes into hrefs with their params', () => {
    assert.equal(routeHref({ name: 'chat/[id]', params: { id: 'c1' } }), '/chat/c1');
    assert.equal(routeHref({ name: 'character/[id]/index', params: { id: 'c_hana' } }), '/character/c_hana');
    assert.equal(routeHref({ name: 'store/shell', params: { tab: 'plans' } }), '/store/shell?tab=plans');
    assert.equal(routeHref({ name: 'world/[series]', params: { series: 'Seaside Academy' } }), '/world/Seaside%20Academy');
  });

  it('never reopens a call, a ring or onboarding, nor a route missing its id', () => {
    assert.equal(routeHref({ name: 'call/[id]', params: { id: 'c1' } }), null);
    assert.equal(routeHref({ name: 'alarms/ring' }), null);
    assert.equal(routeHref({ name: 'onboarding' }), null);
    assert.equal(routeHref({ name: 'chat/[id]' }), null);
  });

  it('keeps the open tab and the screens above it, stopping at one it cannot reopen', () => {
    const routes = [
      { name: '(tabs)', state: { index: 3, routes: [{ name: 'index' }, { name: 'chat' }, { name: 'us' }, { name: 'find' }] } },
      { name: 'world/[series]', params: { series: 'Neon Tide' } },
      { name: 'chat/[id]', params: { id: 'c9' } },
      { name: 'call/[id]', params: { id: 'c9' } },
      { name: 'store/shell' },
    ];
    assert.deepEqual(stackOf(routes, 5), { at: 5, tab: '/find', screens: ['/world/Neon%20Tide', '/chat/c9'] });
  });

  it('finds the app stack inside the __root slot of expo-router', () => {
    const root = [{ name: '__root', state: { index: 0, routes: [{ name: '(tabs)', state: { index: 1, routes: [{ name: 'index' }, { name: 'chat' }] } }, { name: 'chat/[id]', params: { id: 'c1' } }] } }];
    assert.deepEqual(stackOf(root, 7), { at: 7, tab: '/chat', screens: ['/chat/c1'] });
  });

  it('reopens only a fresh place that is not Today alone', () => {
    const saved = { at: 1_000, tab: '/', screens: ['/chat/c1'] };
    assert.deepEqual(freshStack(saved, 2_000), saved);
    assert.equal(freshStack(saved, 1_000 + 61_000), null);
    assert.equal(freshStack({ at: 1_000, tab: '/', screens: [] }, 2_000), null);
    assert.equal(freshStack(null), null);
  });
});
