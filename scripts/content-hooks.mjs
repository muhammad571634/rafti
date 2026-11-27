// Lets scripts/content-extract.ts load src/mock/* in plain Node: '@/x' -> src/x, React Native stubbed.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const src = pathToFileURL(process.cwd() + '/src/').href;
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const SRC = ${JSON.stringify(src)};
      const STUB = 'data:text/javascript,' + encodeURIComponent("export const Appearance={getColorScheme:()=>'light'};export const Platform={OS:'ios',select:(o)=>o.ios??o.default};export const TextStyle=undefined;export const ViewStyle=undefined;export const ImageStyle=undefined;export const StyleSheet={create:(s)=>s,hairlineWidth:1};export default {};");
      export async function resolve(specifier, context, next) {
        if (specifier === 'react-native' || specifier.startsWith('@expo/') || specifier.startsWith('expo-')) return { url: STUB, shortCircuit: true };
        if (specifier.startsWith('@/')) specifier = SRC + specifier.slice(2);
        for (const s of [specifier, specifier + '.ts', specifier + '/index.ts']) {
          try { return await next(s, context); } catch {}
        }
        return next(specifier, context);
      }
    `),
);
