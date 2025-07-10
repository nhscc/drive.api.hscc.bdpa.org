import { sendHttpOk } from '@-xun/respond';

import { createNode } from 'universe+backend';
import { withMiddleware } from 'universe:middleware.ts';

export { defaultConfig as config } from 'universe+backend:api.ts';

export const metadata = {
  descriptor: '/v2/users/:username/filesystem'
};

export default withMiddleware(
  async (req, res) => {
    switch (req.method) {
      case 'POST': {
        sendHttpOk(res, {
          node: await createNode({
            username: req.query.username?.toString(),
            data: req.body
          })
        });
        break;
      }
    }
  },
  {
    descriptor: metadata.descriptor,
    options: { requiresAuth: true, allowedMethods: ['POST'], apiVersion: '2' }
  }
);
