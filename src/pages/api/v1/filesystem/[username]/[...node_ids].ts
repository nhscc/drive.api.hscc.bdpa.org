import { deleteNodes, getNodes, updateNode } from 'universe/backend';
import { withMiddleware } from 'universe/backend/middleware';

import { sendHttpOk } from 'multiverse/next-api-respond';

export { defaultConfig as config } from 'universe/backend/api';

export const metadata = {
  descriptor: '/v1/filesystem/:username/:...node_ids'
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
    options: { allowedMethods: ['GET', 'PUT', 'DELETE'], apiVersion: '1' }
  }
);
