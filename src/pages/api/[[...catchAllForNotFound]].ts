import { sendHttpNotFound } from '@-xun/respond';

import { withMiddleware } from 'universe:middleware.ts';

import type { NextApiRequest } from 'next';

// ? This is a NextJS special "config" export
export { defaultConfig as config } from '@nhscc/backend-drive/api';

export const metadata = {
  descriptor: 'catch-all-for-not-found'
};

const descriptorPrefix = '404:';

export default withMiddleware(async (_req, res) => sendHttpNotFound(res), {
  prependUse: [
    (req_, _res, context_) => {
      const req = req_ as NextApiRequest;
      const context = context_!;

      context.runtime.endpoint.descriptor = `${descriptorPrefix}/${
        [req.query.catchAllForNotFound].flat().join('/') || '/'
      }`;
    }
  ],
  descriptor: descriptorPrefix,
  options: {
    requiresAuth: true,
    allowedMethods: [
      'CONNECT',
      'DELETE',
      'GET',
      'HEAD',
      'OPTIONS',
      'PATCH',
      'POST',
      'PUT',
      'TRACE'
    ]
  }
});
