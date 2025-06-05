/* eslint-disable jest/require-hook */

import { testApiHandler } from 'next-test-api-route-handler';

import { api, setupMockBackend } from 'testverse/fixtures';

jest.mock('universe/backend');
jest.mock('universe/backend/api', (): typeof import('universe/backend/api') => {
  return {
    ...jest.requireActual('universe/backend/api')
    //authorizationHeaderToOwnerAttribute: jest.fn(() => Promise.resolve('mock-owner'))
  };
});

jest.mock(
  'universe/backend/middleware',
  (): typeof import('universe/backend/middleware') => {
    const { middlewareFactory } = require('multiverse/next-api-glue');
    const { default: handleError } = require('multiverse/next-adhesive/handle-error');

    return {
      withMiddleware: jest
        .fn()
        .mockImplementation(middlewareFactory({ use: [], useOnError: [handleError] }))
    } as unknown as typeof import('universe/backend/middleware');
  }
);

setupMockBackend();

it('sends 404 regardless of method', async () => {
  expect.hasAssertions();

  await testApiHandler({
    pagesHandler: api.catchAllForNotFound,
    test: async ({ fetch }) => {
      await Promise.all(
        ['DELETE', 'GET', 'PATCH', 'POST', 'PUT'].map((method) => {
          return fetch({ method }).then(async (r) => {
            const status = r.status;
            const json = await r.json().catch(() => ({}));

            expect([method, status]).toStrictEqual([method, 404]);
            expect([method, json.success]).toStrictEqual([method, false]);
            expect([method, json.error]).toStrictEqual([method, expect.any(String)]);
            expect([method, Object.keys(json).length]).toStrictEqual([method, 2]);
          });
        })
      );

      await Promise.all(
        ['HEAD', 'OPTIONS' /* , 'TRACE' */].map((method) => {
          return fetch({ method }).then(async ({ status }) => {
            expect([method, status]).toStrictEqual([method, 404]);
          });
        })
      );
    }
  });
});
