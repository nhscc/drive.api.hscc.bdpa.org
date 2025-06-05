import { getEnv } from '@-xun/next-env';
import { createDebugLogger } from 'rejoinder';

import { sendHttpNotFound } from 'multiverse/next-api-respond';

import type { NextApiRequest, NextApiResponse } from 'next';
import type { MiddlewareContext } from 'multiverse/next-api-glue';

const debug = createDebugLogger({ namespace: 'next-api:f:check-version' });

export type Options = {
  /**
   * The version of the api this endpoint serves.
   */
  apiVersion?: string;
};

/**
 * Rejects requests to disabled versions of the API.
 */
export default async function middlewareFunction(
  _req: NextApiRequest,
  res: NextApiResponse,
  context: MiddlewareContext<Options>
) {
  debug('entered middleware runtime');

  if (context.options.apiVersion !== undefined) {
    if (getEnv().DISABLED_API_VERSIONS.includes(context.options.apiVersion)) {
      debug('version check failed: endpoint is disabled');
      sendHttpNotFound(res);
    } else {
      debug('version check succeeded: endpoint is available');
    }
  } else {
    debug('skipped version check');
  }
}
