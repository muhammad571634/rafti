import { ActionSheetIOS, Alert, Platform } from 'react-native';

/**
 * Asks before a destructive choice the user started. iOS shows an action sheet, as HIG Action
 * sheets asks for "choices related to an intentional action" (the red choice on top, Cancel at
 * the bottom); Android shows its dialog, and the web the browser's confirm, since Alert.alert
 * does nothing there.
 */
export function confirmAction({
  title,
  action,
  cancel,
  onConfirm,
}: {
  title: string;
  action: string;
  cancel: string;
  onConfirm: () => void;
}) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(title)) onConfirm();
    return;
  }
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: [action, cancel], destructiveButtonIndex: 0, cancelButtonIndex: 1 },
      (index) => {
        if (index === 0) onConfirm();
      },
    );
    return;
  }
  Alert.alert(title, undefined, [
    { text: cancel, style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}
