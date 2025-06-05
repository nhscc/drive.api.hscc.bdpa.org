import { getEnv } from 'universe/backend/env';

import type { IncomingHttpHeaders } from 'node:http';
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

// TODO: this should become part of next-api's auth component

/**
 * Returns the owner token attribute cross-referenced by the
 * `authorizationHeader`.
 */
export async function authorizationHeaderToOwnerAttribute(
  authorizationHeader: Required<IncomingHttpHeaders['authorization']>
) {
  // ? Ensure these are not imported unless and until they're needed thanks to:
  // ? https://github.com/jsdom/jsdom/issues/2524
  const { getTokenByDerivation } = await import('multiverse/next-auth/index.js');

  try {
    const {
      attributes: { owner }
    } = await getTokenByDerivation({ from: authorizationHeader });

    return owner;
  } catch {
    return '<invalid Authorization header>';
  }
}
