import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const KEY = 'sigmazam.toneTipSeen';

let seen: Promise<boolean> | null = null;
const readSeen = () => (seen ??= AsyncStorage.getItem(KEY).then(Boolean).catch(() => false));

/**
 * A hold has no sign of its own (HIG Gestures: make custom gestures easy to learn), so the first
 * line anyone writes shows once that send can be held. It is done when that line goes or the hold
 * is found; a field emptied by hand brings it back with the next line.
 */
export function useToneTip(wanted: boolean) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!wanted) return setShow(false);
    let live = true;
    void readSeen().then((done) => {
      if (live && !done) setShow(true);
    });
    return () => {
      live = false;
    };
  }, [wanted]);

  const done = () => {
    if (!show) return;
    setShow(false);
    seen = Promise.resolve(true);
    AsyncStorage.setItem(KEY, '1').catch(() => {});
  };

  return { show, done };
}
