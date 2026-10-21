// Lets Node run the app's TypeScript modules in tests: resolves extensionless imports to .ts files.
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`
  export async function resolve(spec, ctx, next) {
    try { return await next(spec, ctx); }
    catch (e) { if (spec.startsWith('.') && !/\\.\\w+$/.test(spec)) return next(spec + '.ts', ctx); throw e; }
  }`));
