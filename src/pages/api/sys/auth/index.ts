import { sendHttpOk } from 'multiverse/next-api-respond';
import { withSysMiddleware } from 'universe/backend/middleware';

// ? https://nextjs.org/docs/api-routes/api-middlewares#custom-config
export { defaultConfig as config } from 'universe/backend/api';

/**
 * An endpoint to test if the API is up and reachable.
 */
export default withSysMiddleware(
  async (req, res) => {
    // TODO
    void req, res, sendHttpOk;
  },
  { options: { allowedMethods: ['POST', 'DELETE', 'GET', 'PATCH'] } }
);
