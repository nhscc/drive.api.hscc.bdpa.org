import { asMockedFunction } from '@xunnamius/jest-types';
import { withMiddleware } from 'multiverse/next-api-glue';
import { addToRequestLog } from 'multiverse/next-log';
import { testApiHandler } from 'next-test-api-route-handler';
import { toss } from 'toss-expression';

import { noopHandler, wrapHandler } from 'testverse/setup';

import logRequest from 'multiverse/next-adhesive/log-request';

jest.mock('multiverse/next-log');

const mockAddToRequestLog = asMockedFunction(addToRequestLog);

beforeEach(() => {
  mockAddToRequestLog.mockReturnValue(Promise.resolve());
});

it('logs requests on call to res.send', async () => {
  expect.hasAssertions();

  await testApiHandler({
    pagesHandler: wrapHandler(
      wrapHandler(
        withMiddleware(async (_req, res) => res.status(404).send({}), {
          use: [logRequest]
        })
      )
    ),
    test: async ({ fetch }) => {
      await Promise.all([fetch(), fetch(), fetch()]);
      expect(mockAddToRequestLog).toHaveBeenCalledTimes(3);
    }
  });
});

it('logs requests on call to res.end', async () => {
  expect.hasAssertions();

  await testApiHandler({
    pagesHandler: wrapHandler(
      wrapHandler(
        withMiddleware(async (_req, res) => void res.status(404).end(), {
          use: [logRequest]
        })
      )
    ),
    test: async ({ fetch }) => {
      await Promise.all([fetch(), fetch(), fetch()]);
      expect(mockAddToRequestLog).toHaveBeenCalledTimes(3);
    }
  });
});

it('logs requests once on multiple calls to res.end', async () => {
  expect.hasAssertions();

  await testApiHandler({
    pagesHandler: wrapHandler(
      wrapHandler(
        withMiddleware(
          async (_req, res) => {
            res.status(404).end();
            res.end();
          },
          {
            use: [logRequest]
          }
        )
      )
    ),
    test: async ({ fetch }) => {
      await Promise.all([fetch(), fetch(), fetch()]);
      expect(mockAddToRequestLog).toHaveBeenCalledTimes(3);
    }
  });
});

it('handles request log errors after res.end as gracefully as possible', async () => {
  expect.hasAssertions();

  mockAddToRequestLog.mockImplementation(() => toss(new Error('fake error')));
  let called = false;

  await testApiHandler({
    pagesHandler: wrapHandler(
      withMiddleware(noopHandler, {
        use: [logRequest],
        useOnError: [
          (_req, _res, ctx) => {
            expect(ctx.runtime.error).toMatchObject({ message: 'fake error' });
            called = true;
          }
        ]
      })
    ),
    test: async ({ fetch }) => {
      expect((await fetch()).status).toBe(200);
      expect(called).toBeTrue();
    }
  });
});
