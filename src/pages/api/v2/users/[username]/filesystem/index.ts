import { withMiddleware } from 'universe/backend/middleware';
import { createNode } from 'universe/backend';
import { sendHttpOk } from 'multiverse/next-api-respond';

export { defaultConfig as config } from 'universe/backend/api';

export default withMiddleware(
  async (req, res) => {
    // * POST
    sendHttpOk(res, {
      node: await createNode({
        username: req.query.username?.toString(),
        data: req.body
      })
    });
  },
  {
    options: { allowedMethods: ['POST'], apiVersion: '2' }
  }
);
