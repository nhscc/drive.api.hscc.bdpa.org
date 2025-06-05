import { deleteUser, getUser, updateUser } from 'universe/backend';
import { withMiddleware } from 'universe/backend/middleware';

import { sendHttpOk } from 'multiverse/next-api-respond';

export { defaultConfig as config } from 'universe/backend/api';

export const metadata = {
  descriptor: '/v1/users/:username'
};

export default withMiddleware(
  async (req, res) => {
    const username = req.query.username?.toString();

    switch (req.method) {
      case 'GET': {
        sendHttpOk(res, { user: await getUser({ username }) });
        break;
      }

      case 'DELETE': {
        await deleteUser({ username });
        sendHttpOk(res);
        break;
      }

      case 'PUT': {
        await updateUser({ username, data: req.body });
        sendHttpOk(res);
        break;
      }
    }
  },
  {
    descriptor: metadata.descriptor,
    options: { allowedMethods: ['GET', 'DELETE', 'PUT'], apiVersion: '1' }
  }
);
