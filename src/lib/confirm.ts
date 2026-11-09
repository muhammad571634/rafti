import { ActionSheetIOS, Alert, Platform } from 'react-native';

/**
 * Asks before a destructive choice the user started. iOS shows an action sheet, as HIG Action
 * sheets asks for "choices related to an intentional action" (the red choice on top, Cancel at
 * the bottom); Android shows its dialog, and the web the browser's confirm, since Alert.alert
 * does nothing there.
 */
export function confirmAction({
  title,
  message,
  action,
  cancel,
  onConfirm,
}: {
  title: string;
  /** What goes, in a line under the title. */
  message?: string;
  action: string;
  cancel: string;
  onConfirm: () => void;
}) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(message ? `${title}

${message}` : title)) onConfirm();
    return;
  }
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, message, options: [action, cancel], destructiveButtonIndex: 0, cancelButtonIndex: 1 },
      (index) => {
        if (index === 0) onConfirm();
      },
    );
    return;
  }
  Alert.alert(title, message, [
    { text: cancel, style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
    // Android's back button and a tap outside close it, as Cancel does.
  ], { cancelable: true });
}
