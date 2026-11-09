import { ActionSheetIOS, Platform } from 'react-native';

import { showAlert } from './alert';

/**
 * Asks before a destructive choice the user started. iOS shows an action sheet, as HIG Action
 * sheets asks for "choices related to an intentional action" (the red choice on top, Cancel at
 * the bottom); Android and the web show the app's own alert (`showAlert`, drawn like Apple's), where
 * the back button and a tap on the dim ground cancel.
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
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, message, options: [action, cancel], destructiveButtonIndex: 0, cancelButtonIndex: 1 },
      (index) => {
        if (index === 0) onConfirm();
      },
    );
    return;
  }
  showAlert(title, message, [
    { text: cancel, style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}
