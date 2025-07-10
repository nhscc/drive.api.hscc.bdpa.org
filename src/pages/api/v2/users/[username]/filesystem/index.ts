import { sendHttpOk } from '@-xun/respond';

import { withMiddleware } from 'universe:middleware.ts';

import { createNode } from '@nhscc/backend-drive';

export { defaultConfig as config } from '@nhscc/backend-drive/api';

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
