import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isRepeatOfFocused, noDuplicatePush } from './no-duplicate-push';

const state = {
  key: 'root',
  index: 1,
  routes: [
    { key: 'tabs-1', name: '(tabs)' },
    { key: 'chat-1', name: 'chat/[id]', params: { id: 'sam', __internal_expo_router_preview_id: 'p1' } },
  ],
};
const push = (name: string, params?: object, extra: object = {}) => ({ type: 'PUSH', payload: { name, params, ...extra } });

describe('a double tap opens a screen once', () => {
  it('drops a push of the focused screen with the same params', () => {
    assert.equal(isRepeatOfFocused(state, push('chat/[id]', { id: 'sam' })), true);
    assert.equal(isRepeatOfFocused(state, { type: 'NAVIGATE', payload: { name: 'chat/[id]', params: { id: 'sam' } } }), true);
  });
  it('lets another screen, or the same screen for someone else, through', () => {
    assert.equal(isRepeatOfFocused(state, push('chat/[id]', { id: 'mia' })), false);
    assert.equal(isRepeatOfFocused(state, push('character/[id]', { id: 'sam' })), false);
    assert.equal(isRepeatOfFocused(state, push('chat/[id]', { id: 'sam', scene: 'beach' })), false);
  });
  it('leaves back, replace, dismiss-to and other navigators alone', () => {
    assert.equal(isRepeatOfFocused(state, { type: 'GO_BACK' }), false);
    assert.equal(isRepeatOfFocused(state, { type: 'REPLACE', payload: { name: 'chat/[id]', params: { id: 'sam' } } }), false);
    assert.equal(isRepeatOfFocused(state, push('chat/[id]', { id: 'sam' }, { pop: true })), false);
    assert.equal(isRepeatOfFocused(state, { ...push('chat/[id]', { id: 'sam' }), target: 'tabs-nav' }), false);
    const onTabs = { key: 'root', index: 0, routes: [{ key: 't', name: '(tabs)' }] };
    assert.equal(isRepeatOfFocused(onTabs, push('(tabs)', undefined, { state: { routes: [{ name: 'find' }] } })), false);
  });
  it('compares nested params by value', () => {
    const nested = { key: 'root', index: 0, routes: [{ key: 'g', name: 'group/[id]', params: { id: 'g1', screen: 'index', params: { tab: 'a' } } }] };
    assert.equal(isRepeatOfFocused(nested, push('group/[id]', { id: 'g1', screen: 'index', params: { tab: 'a' } })), true);
    assert.equal(isRepeatOfFocused(nested, push('group/[id]', { id: 'g1', screen: 'index', params: { tab: 'b' } })), false);
  });
  it('answers a repeat as handled with the state unchanged, and passes the rest to the stack router', () => {
    const calls: string[] = [];
    const original = { getStateForAction: (s: typeof state, a: { type: string }) => (calls.push(a.type), { state: s, affectedRouteKey: 'new' }) };
    const router = noDuplicatePush(original);
    const repeat = router.getStateForAction(state, push('chat/[id]', { id: 'sam' }), undefined as never);
    assert.deepEqual(repeat, { state, affectedRouteKey: 'chat-1' });
    assert.deepEqual(calls, []);
    router.getStateForAction(state, push('chat/[id]', { id: 'mia' }), undefined as never);
    assert.deepEqual(calls, ['PUSH']);
  });
});
