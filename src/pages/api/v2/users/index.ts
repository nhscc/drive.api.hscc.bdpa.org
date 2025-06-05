import { createUser, getAllUsers } from 'universe/backend';
import { withMiddleware } from 'universe/backend/middleware';

import { sendHttpOk } from 'multiverse/next-api-respond';

export { defaultConfig as config } from 'universe/backend/api';

export const metadata = {
  descriptor: '/v2/users'
};

export default withMiddleware(
  async (req, res) => {
    switch (req.method) {
      case 'GET': {
        sendHttpOk(res, {
          users: await getAllUsers({ after: req.query.after?.toString() })
        });
        break;
      }
      case 'POST': {
        sendHttpOk(res, { user: await createUser({ data: req.body }) });
        break;
      }
    }
  },
  {
    descriptor: metadata.descriptor,
    options: { allowedMethods: ['GET', 'POST'], apiVersion: '2' }
  }
);
