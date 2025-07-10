/* eslint-disable jest/require-hook */

import { testApiHandler } from 'next-test-api-route-handler';

import { api, setupMockBackend } from 'testverse:fixtures/index.ts';

jest.mock('universe+backend');
jest.mock('universe+backend:api.ts', (): typeof import('universe+backend:api.ts') => {
  return {
    ...jest.requireActual('universe+backend:api.ts')
    //authorizationHeaderToOwnerAttribute: jest.fn(() => Promise.resolve('mock-owner'))
  };
});

jest.mock('universe:middleware.ts', (): typeof import('universe:middleware.ts') => {
  const { middlewareFactory } = require('@-xun/api') as typeof import('@-xun/api');
  const { makeMiddleware: makeErrorHandlingMiddleware } =
    require('@-xun/api/middleware/handle-error') as typeof import('@-xun/api/middleware/handle-error');

  return {
    withMiddleware: jest.fn().mockImplementation(
      middlewareFactory({
        use: [],
        useOnError: [makeErrorHandlingMiddleware()],
        options: { legacyMode: true }
      })
    )
  } as unknown as typeof import('universe:middleware.ts');
});

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
