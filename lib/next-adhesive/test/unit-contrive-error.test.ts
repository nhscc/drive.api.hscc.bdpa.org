import { testApiHandler } from 'next-test-api-route-handler';

import { asMocked, noopHandler, wrapHandler } from 'testverse/util';

import contriveError from 'multiverse/next-adhesive/contrive-error';
import { withMiddleware } from 'multiverse/next-api-glue';
import { isDueForContrivedError } from 'multiverse/next-contrived';

import type { Options } from 'multiverse/next-adhesive/contrive-error';

jest.mock('multiverse/next-contrived');

const mockIsDueForContrivedError = asMocked(isDueForContrivedError);

beforeEach(() => {
  mockIsDueForContrivedError.mockReturnValue(Promise.resolve(false));
});

it('does not inject contrived errors by default', async () => {
  expect.hasAssertions();

  await testApiHandler({
    pagesHandler: wrapHandler(
      withMiddleware<Options>(noopHandler, {
        descriptor: '/fake',
        use: [contriveError]
      })
    ),
    test: async ({ fetch }) => {
      mockIsDueForContrivedError.mockReturnValue(Promise.resolve(true));
      await expect(fetch().then((r) => r.status)).resolves.toBe(200);
    }
  });
});

it('injects contrived errors when due if enabled', async () => {
  expect.hasAssertions();

  await testApiHandler({
    pagesHandler: wrapHandler(
      withMiddleware<Options>(noopHandler, {
        descriptor: '/fake',
        use: [contriveError],
        options: { enableContrivedErrors: true }
      })
    ),
    test: async ({ fetch }) => {
      mockIsDueForContrivedError.mockReturnValue(Promise.resolve(false));
      await expect(fetch().then((r) => r.status)).resolves.toBe(200);
      mockIsDueForContrivedError.mockReturnValue(Promise.resolve(true));
      await expect(fetch().then((r) => r.status)).resolves.toBe(555);
      mockIsDueForContrivedError.mockReturnValue(Promise.resolve(false));
      await expect(fetch().then((r) => r.status)).resolves.toBe(200);
    }
  });
});
