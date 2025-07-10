import { sendHttpOk } from '@-xun/respond';

import { searchNodes } from 'universe+backend';
import { ClientValidationError, ErrorMessage } from 'universe+shared:error.ts';
import { withMiddleware } from 'universe:middleware.ts';

export { defaultConfig as config } from 'universe+backend:api.ts';

export const metadata = {
  descriptor: '/v1/filesystem/:username/search'
};

export default withMiddleware(
  async (req, res) => {
    const username = req.query.username?.toString();

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

    const nodes = await searchNodes({
      after: req.query.after?.toString(),
      username,
      match,
      regexMatch
    });

    switch (req.method) {
      case 'GET': {
        sendHttpOk(res, { nodes: nodes.filter((node) => node.owner === username) });
        break;
      }
    }
  },
  {
    descriptor: metadata.descriptor,
    options: { requiresAuth: true, allowedMethods: ['GET'], apiVersion: '1' }
  }
);
