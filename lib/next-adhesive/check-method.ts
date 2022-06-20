import { getEnv } from 'multiverse/next-env';
import { sendHttpBadMethod } from 'multiverse/next-api-respond';
import { debugFactory } from 'multiverse/debug-extended';

import type { ValidHttpMethod } from '@xunnamius/types';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { MiddlewareContext } from 'multiverse/next-api-glue';

const debug = debugFactory('next-adhesive:check-method');

export type Options = {
  /**
   * An array of HTTP methods this endpoint is allowed to serve.
   */
  allowedMethods?: ValidHttpMethod[];
};

/**
 * Rejects requests that are either using a disallowed method or not using an
 * allowed method.
 */
export default async function (
  req: NextApiRequest,
  res: NextApiResponse,
  context: MiddlewareContext<Options>
) {
  debug('entered middleware runtime');

  if (
    !req.method ||
    getEnv().DISALLOWED_METHODS.includes(req.method) ||
    !context.options.allowedMethods ||
    !context.options.allowedMethods.includes(req.method as ValidHttpMethod)
  ) {
    debug(`method check failed: unrecognized or disallowed method "${req.method}"`);
    sendHttpBadMethod(res);
  } else {
    debug(`method check succeeded: method "${req.method}" is allowed`);
  }
}
