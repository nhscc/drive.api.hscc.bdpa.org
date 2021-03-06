import { withMiddleware } from 'universe/backend/middleware';
import { getNodes, updateNode, deleteNodes } from 'universe/backend';
import { sendHttpOk } from 'multiverse/next-api-respond';

// ? This is a NextJS special "config" export
export { defaultConfig as config } from 'universe/backend/api';

export default withMiddleware(
  async (req, res) => {
    if (req.method == 'GET') {
      sendHttpOk(res, {
        nodes: await getNodes({
          username: req.query.username?.toString(),
          node_ids: req.query.node_ids ? [req.query.node_ids].flat() : undefined
        })
      });
    } else if (req.method == 'DELETE') {
      await deleteNodes({
        username: req.query.username?.toString(),
        node_ids: req.query.node_ids ? [req.query.node_ids].flat() : undefined
      });
      sendHttpOk(res);
    } // * PUT
    else {
      await updateNode({
        username: req.query.username?.toString(),
        node_id: [req.query.node_ids].flat()[0],
        data: req.body
      });
      sendHttpOk(res);
    }
  },
  {
    options: { allowedMethods: ['GET', 'PUT', 'DELETE'], apiVersion: '1' }
  }
);
