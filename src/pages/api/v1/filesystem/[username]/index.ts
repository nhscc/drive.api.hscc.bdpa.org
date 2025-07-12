import { sendHttpOk } from '@-xun/respond';
import { createNode } from '@nhscc/backend-drive~npm';

import { withMiddleware } from 'universe:route-wrapper.ts';

export { defaultConfig as config } from '@nhscc/backend-drive~npm/api';

export const metadata = {
  descriptor: '/v1/filesystem/:username'
};

export default withMiddleware(
  async (req, res) => {
    switch (req.method) {
      case 'POST': {
        sendHttpOk(res, {
          node: await createNode({
            username: req.query.username?.toString(),
            data: { permissions: {}, ...req.body }
          })
        });
        break;
      }
    }
  },
  {
    descriptor: metadata.descriptor,
    options: { requiresAuth: true, allowedMethods: ['POST'], apiVersion: '1' }
  }
);
