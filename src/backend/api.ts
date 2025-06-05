import { getEnv } from 'universe/backend/env';

import type { PageConfig } from 'next';

// ! Since this is imported via jsdom for some tests, beware imports with
// ! respect to https://github.com/jsdom/jsdom/issues/2524.

/**
 * The default app-wide Next.js API configuration object.
 *
 * @see https://nextjs.org/docs/api-routes/api-middlewares#custom-config
 */
export const defaultConfig: PageConfig = {
  api: {
    bodyParser: {
      get sizeLimit() {
        return getEnv().MAX_CONTENT_LENGTH_BYTES;
      }
    }
  }
};
