import { createNode } from 'universe/backend';
import { withMiddleware } from 'universe/backend/middleware';

import { sendHttpOk } from 'multiverse/next-api-respond';

export { defaultConfig as config } from 'universe/backend/api';

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
    options: { allowedMethods: ['POST'], apiVersion: '1' }
  }
);
