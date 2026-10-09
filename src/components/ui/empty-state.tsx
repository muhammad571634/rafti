import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme';

import { Button } from './button';
import { ClayIcon, type ClayIconName } from './clay-icon';
import { BrandArt } from './mascot';
import { Txt } from './text';

export interface EmptyStateProps {
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  /** A clay icon for what is missing, in place of the Rafti mascot. */
  icon?: ClayIconName;
}

export function EmptyState({
  title,
  hint,
  actionLabel,
  onAction,
  compact,
  icon,
}: EmptyStateProps) {
  return (
    <View style={[styles.root, compact ? styles.compact : styles.fill]}>
      {icon ? (
        <ClayIcon name={icon} size={compact ? 88 : 120} tile={false} />
      ) : (
        <BrandArt name="empty" width={compact ? 112 : 150} bob />
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
