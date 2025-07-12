import { sendHttpOk } from '@-xun/respond';

import { withMiddleware } from 'universe:route-wrapper.ts';

import { deleteUser, getUser, updateUser } from '@nhscc/backend-drive';

export { defaultConfig as config } from '@nhscc/backend-drive/api';

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
    options: {
      requiresAuth: true,
      allowedMethods: ['GET', 'DELETE', 'PUT'],
      apiVersion: '1'
    }
  }
);
