import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ChatPoster, POSTER_H, POSTER_PIXELS, POSTER_SCRIPTS, POSTER_W } from '@/components/chat/chat-poster';
import { ShareCardSheet } from '@/components/share-card-sheet';
import { currentMood, temperamentFor } from '@/lib/reply-engine';
import { displayName, useAppStore } from '@/store/use-app-store';
import type { Character } from '@/types';

const POSTER = { width: POSTER_W, height: POSTER_H, pixels: POSTER_PIXELS };

/**
 * Share under their newest reply: a 9:16 story poster of this friend (canvas B, owner 2026-11-08):
 * their face, name and mood, a short FOMO exchange in the app's language (nothing from the real chat
 * for now, owner), their last line cut off and "still typing", over the Sigmazam band with "Free on
 * the App Store" and the peeking mascot. One of `POSTER_SCRIPTS` exchanges, picked each time it opens.
 */
export function ShareSheet({ visible, onClose, character }: { visible: boolean; onClose: () => void; character: Character }) {
  const { t } = useTranslation();
  const relationship = useAppStore((s) => s.relationships[character.id]);
  const name = displayName(character, relationship);
  const mood = currentMood(relationship?.mood, temperamentFor(character), Date.now()).emotion;
  // A new exchange each time the sheet opens; it stays put while it is open.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const script = useMemo(() => 1 + Math.floor(Math.random() * POSTER_SCRIPTS), [visible]);

  return (
    <ShareCardSheet
      visible={visible}
      onClose={onClose}
      poster={POSTER}
      rewardKey={`chat:${character.id}`}
      fallback={[t('sharePoster.typing', { name: name.split(' ')[0] || name }), t('sharePoster.store'), t('app.name')].join('\n\n')}>
      <ChatPoster character={character} name={name} mood={t(`chat.mood.${mood}`)} script={script} />
    </ShareCardSheet>
  );
}
