import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { InkText } from '@/components/ink';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ink } from '@/theme/ink';

/**
 * The way back down in a chat (iMessage, Telegram): a round button over the bottom right of the
 * list once the reader is about a screen up, with how many lines came in since they left the
 * newest end. A tap scrolls to the newest line.
 */
export function JumpToNewest({ visible, unseen, onPress }: { visible: boolean; unseen: number; onPress: () => void }) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={styles.wrap}>
      <PressableScale
        scaleTo={0.92}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={unseen > 0 ? `${t('chat.jumpToNewest')}, ${unseen}` : t('chat.jumpToNewest')}
        hitSlop={8}
        style={styles.button}>
        <Ionicons name="chevron-down" size={22} color={ink.text} />
      </PressableScale>
      {unseen > 0 ? (
        <View style={styles.badge} pointerEvents="none">
          <InkText variant="caption" color={ink.onBadge} style={styles.figure}>
            {unseen > 99 ? '99+' : String(unseen)}
          </InkText>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 14, bottom: 12 },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28,28,30,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.badge,
  },
  figure: { fontVariant: ['tabular-nums'] },
});
