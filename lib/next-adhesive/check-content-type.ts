import { sendHttpBadRequest } from 'multiverse/next-api-respond';
import { debugFactory } from 'multiverse/debug-extended';

import type { NextApiRequest, NextApiResponse } from 'next';
import type { MiddlewareContext } from 'multiverse/next-api-glue';

const debug = debugFactory('next-adhesive:check-content-type');

export type Options = {
  /**
   * An array of HTTP Content-Type values this endpoint is allowed to serve. If
   * the string `"any"` is provided, content-type checking will be disabled.
   *
   * @see https://www.iana.org/assignments/media-types/media-types.xhtml
   */
  // ! Note that content types must be specified in lowercase!
  allowedContentTypes?: string[] | 'any';
};

/**
 * Rejects requests that are not using an allowed content type.
 */
export default async function (
  req: NextApiRequest,
  res: NextApiResponse,
  context: MiddlewareContext<Options>
) {
  debug('entered middleware runtime');
  const type = req.headers['content-type'];

  if (
    context.options.allowedContentTypes != 'any' &&
    (!type || !context.options.allowedContentTypes?.includes(type.toLowerCase()))
  ) {
    const error = `unrecognized or disallowed content type ${
      type ? `"${type}"` : '(none)'
    }`;

    debug(`content-type check failed: ${error}`);
    sendHttpBadRequest(res, { error });
  } else {
    debug(`content-type check succeeded: type "${type}" is allowed`);
  }
}
