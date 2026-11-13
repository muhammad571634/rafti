import { Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { alertLayout, cancelButton, closeAlert, useCurrentAlert, type AlertButton } from '@/lib/alert';
import { haptic } from '@/lib/haptics';
import { isDark, systemColors, systemGround } from '@/theme';

import { Txt } from './text';

/** Apple's alert: 270 points wide on iPhone, a little wider here for long translations, never past the screen. */
const WIDTH = 290;
/** The alert's own grey, one step off the dimmed screen in both themes. */
const CARD = isDark ? '#2C2C2E' : '#F2F2F7';
const PRESSED = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

/**
 * The dialog `showAlert` asks for, on Android and the web (iPhone shows Apple's own), mounted once
 * at the root. It appears at once with the screen dimmed (popups never animate in), one at a time;
 * Android's back button and a tap on the dim ground answer with Cancel when there is one. A long
 * message or big text scrolls inside the card, which never grows past the screen.
 */
export function AlertHost() {
  const alert = useCurrentAlert();
  const { width, height } = useWindowDimensions();
  if (Platform.OS === 'ios' || !alert) return null;
  const { row, ordered } = alertLayout(alert.buttons);
  const cancel = cancelButton(alert.buttons);
  const press = (button: AlertButton) => {
    if (button.style === 'destructive') haptic.tap();
    closeAlert(button);
  };
  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => closeAlert(cancel)}>
      <Pressable
        style={styles.scrim}
        onPress={cancel ? () => closeAlert(cancel) : undefined}
        accessible={false}
        importantForAccessibility="no">
        {/* The card swallows taps, so only the dim ground cancels. */}
        <Pressable
          style={[styles.card, { width: Math.min(WIDTH, width - 48), maxHeight: height * 0.8 }]}
          onPress={() => {}}
          accessibilityRole="alert"
          accessibilityViewIsModal>
          <ScrollView style={styles.textScroll} contentContainerStyle={styles.text} bounces={false}>
            <Txt style={styles.title} accessibilityRole="header">
              {alert.title}
            </Txt>
            {alert.message ? <Txt style={styles.message}>{alert.message}</Txt> : null}
          </ScrollView>
          <View style={row ? styles.row : undefined}>
            {ordered.map((button, i) => (
              <Pressable
                key={`${button.text}-${i}`}
                onPress={() => press(button)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.button,
                  row ? styles.rowButton : null,
                  row && i > 0 ? styles.rowDivider : null,
                  pressed ? { backgroundColor: PRESSED } : null,
                ]}>
                <Txt
                  style={[styles.buttonText, button.style === 'cancel' && styles.cancelText, button.style === 'destructive' && styles.destructiveText]}
                  lines={2}>
                  {button.text}
                </Txt>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.32)', alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 16, backgroundColor: CARD, overflow: 'hidden' },
  textScroll: { flexGrow: 0, flexShrink: 1 },
  text: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 18, gap: 4 },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '700', textAlign: 'center', color: systemGround.label },
  message: { fontSize: 13.5, lineHeight: 18, textAlign: 'center', color: systemGround.label },
  row: { flexDirection: 'row' },
  button: {
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: systemGround.dash,
  },
  rowButton: { flex: 1 },
  rowDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: systemGround.dash },
  buttonText: { fontSize: 17, lineHeight: 22, textAlign: 'center', color: systemGround.label },
  cancelText: { fontWeight: '600' },
  destructiveText: { color: systemColors.red },
});
