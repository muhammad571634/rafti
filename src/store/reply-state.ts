import { replyBatcher } from '@/lib/reply-batch';
import type { ReplyRequest } from './use-app-store';

/** When each chat's current reply burst finishes; replies queue behind it. */
export const replyingUntil = new Map<string, number>();

/** Replies waiting a beat for the next text (src/lib/reply-batch.ts). */
export const replyBatch = replyBatcher();

/** The reply each chat could not get, kept for "Try again" (`retryReply`). */
export const failedTurns = new Map<string, ReplyRequest>();
