/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable unicorn/no-anonymous-default-export */
import { debugFactory } from 'multiverse/debug-extended';
import { addToRequestLog } from 'multiverse/next-log';

import type { NextApiRequest, NextApiResponse } from 'next';

const debug = debugFactory('next-adhesive:log-request');

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Options = {
  // No options
};

/**
 * Logs the response to each request after it is sent (i.e. `res.end()`).
 */
export default async function (req: NextApiRequest, res: NextApiResponse) {
  debug('entered middleware runtime');

  const send = res.end;
  res.end = ((...args: Parameters<typeof res.end>) => {
    const sent = res.writableEnded;
    send(...args);

    if (!sent) {
      debug('logging request after initial call to res.end');
      void addToRequestLog({ req, res });
    }
  }) as typeof res.end;
}
