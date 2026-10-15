import { Image, type ImageContentPosition } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { LIVE_SCENES } from '@/assets/live/registry';

/**
 * A character's picture, alive when they have a live scene: a silent clip that loops over
 * the still (`assets/live`). The still shows until the first frame is ready, for characters
 * without a clip, and when the phone asks for reduced motion. Fills its parent.
 */
export function LiveScene({
  characterId,
  still,
  contentPosition,
}: {
  characterId: string;
  still: string | number;
  contentPosition?: ImageContentPosition;
}) {
  const clip = LIVE_SCENES[characterId];
  const reduceMotion = useReducedMotion();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={typeof still === 'string' ? { uri: still } : still}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition={contentPosition}
      />
      {clip != null && !reduceMotion ? <LiveClip key={characterId} clip={clip} /> : null}
    </View>
  );
}

/** Plays only while its screen is in front, muted and without taking the phone's audio. */
function LiveClip({ clip }: { clip: number }) {
  const focused = useIsFocused();
  const [ready, setReady] = useState(false);
  const player = useVideoPlayer(clip, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
  });

  useEffect(() => {
    if (focused) player.play();
    else player.pause();
  }, [focused, player]);

  return (
    <VideoView
      player={player}
      style={[StyleSheet.absoluteFill, !ready && styles.waiting]}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
      // A TextureView keeps the card's rounded corners on Android.
      surfaceType="textureView"
      onFirstFrameRender={() => setReady(true)}
    />
  );
}

const styles = StyleSheet.create({
  // Hidden until the first frame, so a black frame never flashes over the still.
  waiting: { opacity: 0 },
});
