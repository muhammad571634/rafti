import type { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { colors, space } from '@/theme';

import { Button } from './button';
import { BrandArt } from './mascot';
import { SFIcon } from './symbol';
import { Txt } from './text';

export interface EmptyStateProps {
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  /**
   * What is missing, as a large grey SF Symbol (an Ionicon off iPhone), the way iOS's
   * ContentUnavailableView draws it; without one the mascot stands in.
   */
  symbol?: { ios: SFSymbol; icon: keyof typeof Ionicons.glyphMap };
}

export function EmptyState({
  title,
  hint,
  actionLabel,
  onAction,
  compact,
  symbol,
}: EmptyStateProps) {
  return (
    <View style={[styles.root, compact ? styles.compact : styles.fill]}>
      {symbol ? (
        <SFIcon ios={symbol.ios} icon={symbol.icon} size={compact ? 44 : 56} color={colors.textMuted} />
      ) : (
        <BrandArt name="empty" width={compact ? 82 : 111} bob />
      )}
      <Txt variant="title" center style={styles.title}>
        {title}
      </Txt>
      {hint ? (
        <Txt variant="small" color={colors.textMuted} center>
          {hint}
        </Txt>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} size="sm" variant="secondary" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xxxl,
    paddingVertical: space.huge,
    gap: space.xs,
  },
  // Full-screen states fill their parent. Compact ones size to their content: `flex: 0`
  // would become `flex-basis: 0%` on web, collapse the box and let the art spill upward.
  fill: { flex: 1 },
  compact: { paddingVertical: space.xxl },
  title: { marginTop: space.md },
  action: { marginTop: space.lg },
});
