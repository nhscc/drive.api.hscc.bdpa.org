import { sendHttpOk } from '@-xun/respond';

import { ClientValidationError, ErrorMessage } from 'multiverse+shared:error.ts';

import { searchNodes } from '@nhscc/backend-drive';

import { withMiddleware } from 'universe:middleware.ts';

export { defaultConfig as config } from '@nhscc/backend-drive/api.ts';

export const metadata = {
  descriptor: '/v2/users/:username/filesystem/search'
};

export default withMiddleware(
  async (req, res) => {
    const match = (() => {
      try {
        return JSON.parse((req.query.match || '{}').toString());
      } catch {
        throw new ClientValidationError(ErrorMessage.InvalidMatcher('match'));
      }
    })();

    const regexMatch = (() => {
      try {
        return JSON.parse((req.query.regexMatch || '{}').toString());
      } catch {
        throw new ClientValidationError(ErrorMessage.InvalidMatcher('regexMatch'));
      }
    })();

    switch (req.method) {
      case 'GET': {
        sendHttpOk(res, {
          nodes: await searchNodes({
            after: req.query.after?.toString(),
            username: req.query.username?.toString(),
            match,
            regexMatch
          })
        });
        break;
      }
    }
  },
  {
    descriptor: metadata.descriptor,
    options: { requiresAuth: true, allowedMethods: ['GET'], apiVersion: '2' }
  }
);
