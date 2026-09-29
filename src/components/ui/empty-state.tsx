import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme';

import { Button } from './button';
import { BrandArt } from './mascot';
import { Txt } from './text';

export interface EmptyStateProps {
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function EmptyState({
  title,
  hint,
  actionLabel,
  onAction,
  compact,
}: EmptyStateProps) {
  return (
    <View style={[styles.root, compact && styles.compact]}>
      <BrandArt name="empty" width={compact ? 132 : 200} bob />
      <Txt variant="title" center style={styles.title}>
        {title}
      </Txt>
      {hint ? (
        <Txt variant="small" color={colors.textMuted} center>
          {hint}
        </Txt>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} size="sm" variant="soft" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xxxl,
    paddingVertical: space.huge,
    gap: space.xs,
  },
  compact: {
    flex: 0,
    paddingVertical: space.xxl,
  },
  title: { marginTop: space.md },
  action: { marginTop: space.lg },
});
