import { sendHttpOk } from '@-xun/respond';
import { createUser, getAllUsers } from '@nhscc/backend-drive~npm';

import { withMiddleware } from 'universe:route-wrapper.ts';

export { defaultConfig as config } from '@nhscc/backend-drive~npm/api';

export const metadata = {
  descriptor: '/v1/users'
};

export default withMiddleware(
  async (req, res) => {
    // TODO: provenance
    // const provenance = await authorizationHeaderToOwnerAttribute(
    //   req.headers.authorization
    // );

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
    options: { allowedMethods: ['GET', 'POST'], apiVersion: '1' }
  }
);
