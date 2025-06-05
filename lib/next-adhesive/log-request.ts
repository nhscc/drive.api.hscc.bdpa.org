import { randomUUID } from 'node:crypto';
import { performance as perf } from 'node:perf_hooks';

import { getEnv } from '@-xun/next-env';
import { MongoClientClosedError } from 'mongodb';
import { createDebugLogger } from 'rejoinder';

import { addToRequestLog } from 'multiverse/next-log';

import type { NextApiRequest, NextApiResponse } from 'next';
import type { EmptyObject } from 'type-fest';
import type { MiddlewareContext } from 'multiverse/next-api-glue';

const debug = createDebugLogger({ namespace: 'next-api:f:log-request' });

export type Options = EmptyObject;

/**
 * Logs the response to each request after it is sent (i.e. `res.end()`).
 */
export default async function middlewareFunction(
  req: NextApiRequest,
  res: NextApiResponse,
  context: MiddlewareContext<Options>
) {
  debug('entered middleware runtime');

  const perfUUID = randomUUID();
  perf.mark(perfUUID);

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const send = res.end;
  res.end = ((...args: Parameters<typeof res.end>) => {
    const sent = res.writableEnded;
    send(...args);

    if (!sent) {
      debug('logging request after initial call to res.end');
      // ! Note that this async function is NOT awaited!!!
      void addToRequestLog({
        req,
        res,
        endpoint: context.runtime.endpoint.descriptor,
        durationMs: Math.floor(perf.measure(randomUUID(), perfUUID).duration)
      }).catch((error: unknown) => {
        // ! It is possible that the above task fails during testing because
        // ! this middleware tends to live on the microtask queue since that's
        // ! the most efficient way to deliver the log to an endpoint while not
        // ! holding up responding to the active request. It fails because the
        // ! testing environment will get cleaned up while this thing is still
        // ! enqueued. We will explicitly ignore that specific type of error
        // ! below.

        if (getEnv().NODE_ENV === 'test' && error instanceof MongoClientClosedError) {
          debug.warn(
            'database connection was cleaned up before request logging could complete (ok in a test environment)'
          );
        } else {
          throw error;
        }
      });
    }
  }) as typeof res.end;
}
