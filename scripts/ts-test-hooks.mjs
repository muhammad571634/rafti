// Lets `node --test` run TypeScript tests with no extra packages: Node 24 strips the
// types itself, and this hook resolves extensionless relative imports to `.ts` files.
import { register } from 'node:module';

register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(specifier, context, next) {
        try {
          return await next(specifier, context);
        } catch (error) {
          if (specifier.startsWith('.') && !/\\.[cm]?[jt]sx?$/.test(specifier)) {
            return next(specifier + '.ts', context);
          }
          throw error;
        }
      }
    `),
);
