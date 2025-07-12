import { sendHttpOk } from '@-xun/respond';
import { deleteNodes, getNodes, updateNode } from '@nhscc/backend-drive~npm';

import { withMiddleware } from 'universe:route-wrapper.ts';

export { defaultConfig as config } from '@nhscc/backend-drive~npm/api';

export const metadata = {
  descriptor: '/v2/users/:username/filesystem/:...node_ids'
};

export default withMiddleware(
  async (req, res) => {
    switch (req.method) {
      case 'GET': {
        sendHttpOk(res, {
          nodes: await getNodes({
            username: req.query.username?.toString(),
            node_ids: req.query.node_ids ? [req.query.node_ids].flat() : undefined
          })
        });
        break;
      }

      case 'DELETE': {
        await deleteNodes({
          username: req.query.username?.toString(),
          node_ids: req.query.node_ids ? [req.query.node_ids].flat() : undefined
        });
        sendHttpOk(res);
        break;
      }

      case 'PUT': {
        await updateNode({
          username: req.query.username?.toString(),
          node_id: [req.query.node_ids].flat()[0],
          data: req.body
        });
        sendHttpOk(res);
        break;
      }
    }
  },
  {
    descriptor: metadata.descriptor,
    options: {
      requiresAuth: true,
      allowedMethods: ['GET', 'PUT', 'DELETE'],
      apiVersion: '2'
    }
  }
);
