import * as Updates from 'expo-updates';

/**
 * The community library is open on dev and preview builds only (0z300): production stays off until
 * the owner turns it on after seeing moderation work (docs/agent-tasks/community-library.md).
 */
export const COMMUNITY_OPEN = __DEV__ || Updates.channel === 'preview';
