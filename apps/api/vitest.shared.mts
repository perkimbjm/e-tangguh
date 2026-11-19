import { fileURLToPath } from 'node:url';

export const sharedAlias = {
  '@etangguh/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
};
