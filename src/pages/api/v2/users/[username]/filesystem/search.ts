import { withMiddleware } from 'universe/backend/middleware';
import { searchNodes } from 'universe/backend';
import { sendHttpOk } from 'multiverse/next-api-respond';
import { ValidationError, ErrorMessage } from 'universe/error';

// ? This is a NextJS special "config" export
export { defaultConfig as config } from 'universe/backend/api';

export default withMiddleware(
  async (req, res) => {
    const match = (() => {
      try {
        return JSON.parse((req.query.match || '{}').toString());
      } catch {
        throw new ValidationError(ErrorMessage.InvalidMatcher('match'));
      }
    })();

    const regexMatch = (() => {
      try {
        return JSON.parse((req.query.regexMatch || '{}').toString());
      } catch {
        throw new ValidationError(ErrorMessage.InvalidMatcher('regexMatch'));
      }
    })();

    // * GET
    sendHttpOk(res, {
      nodes: await searchNodes({
        after: req.query.after?.toString(),
        username: req.query.username.toString(),
        match,
        regexMatch
      })
    });
  },
  {
    options: { allowedMethods: ['GET'], apiVersion: '2' }
  }
);
