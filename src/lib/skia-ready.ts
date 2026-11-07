import { TurboModuleRegistry } from 'react-native';

/**
 * Skia's native side is in builds from 1.1.0 on. Loading Skia's JavaScript on an older build takes
 * the whole app down (a missing native module is fatal at import, and `catch` does not save it), so
 * every Skia component is required behind this check, and the caller keeps a plain fallback.
 */
export const skiaReady = TurboModuleRegistry.get('RNSkiaModule') != null;
