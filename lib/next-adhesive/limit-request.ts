import { getEnv } from '@-xun/next-env';
import { createDebugLogger } from 'rejoinder';

import { sendHttpRateLimited, sendHttpUnauthorized } from 'multiverse/next-api-respond';
import { clientIsRateLimited } from 'multiverse/next-limit';

import type { NextApiRequest, NextApiResponse } from 'next';
import type { EmptyObject } from 'type-fest';

const debug = createDebugLogger({ namespace: 'next-api:f:limit-request' });

export type Options = EmptyObject;

/**
 * Rejects requests from clients that have sent too many previous requests.
 */
export default async function middlewareFunction(
  req: NextApiRequest,
  res: NextApiResponse
) {
  debug('entered middleware runtime');

  if (getEnv().LOCKOUT_ALL_CLIENTS) {
    debug('rate-limit check failed: all clients locked out');
    sendHttpUnauthorized(res, {
      error: 'backend has temporarily locked out all clients'
    });
  } else if (getEnv().IGNORE_RATE_LIMITS) {
    debug('skipped rate-limit check');
  } else {
    const { isLimited, retryAfter } = await clientIsRateLimited(req);

    if (isLimited) {
      debug('rate-limit check failed: client is rate-limited');
      res.setHeader('Retry-After', Math.ceil(retryAfter / 1000));
      sendHttpRateLimited(res, { retryAfter });
    } else {
      debug('rate-limit check succeeded: client not rate-limited');
    }
  }
}
