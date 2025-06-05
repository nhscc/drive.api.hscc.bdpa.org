import { AssertionError } from 'node:assert';

import { testApiHandler } from 'next-test-api-route-handler';
import { toss } from 'toss-expression';

import {
  AppError,
  AppValidationError,
  AuthError,
  NotFoundError,
  NotImplementedError,
  ValidationError
} from 'universe/error';

import { itemFactory, noopHandler, withMockedOutput, wrapHandler } from 'testverse/util';

import handleError from 'multiverse/next-adhesive/handle-error';
import { withMiddleware } from 'multiverse/next-api-glue';

import type { Options } from 'multiverse/next-adhesive/handle-error';

it('sends correct HTTP error codes when certain errors occur', async () => {
  expect.hasAssertions();

  const factory = itemFactory<[AppError | string, number]>([
    [new ValidationError(), 400],
    [new AppValidationError(), 500],
    [new AuthError(), 403],
    [new NotFoundError(), 404],
    [new AppError(), 500],
    [new AssertionError({}), 500],
    [new NotImplementedError(), 501],
    [new Error('dummy'), 500], // ? Every other error type should return 500
    ['strange error', 500] // ? This too
  ]);

  await withMockedOutput(async () => {
    await Promise.all(
      factory.items.map(async (item) => {
        const [expectedError, expectedStatus] = item;

        await testApiHandler({
          pagesHandler: wrapHandler(
            withMiddleware(async () => toss(expectedError), {
              descriptor: '/fake',
              use: [],
              useOnError: [handleError]
            })
          ),
          test: async ({ fetch }) =>
            fetch().then((res) => expect(res.status).toStrictEqual(expectedStatus))
        });
      })
    );
  });
});

it('throws without calling res.end if response is no longer writable', async () => {
  expect.hasAssertions();

  await testApiHandler({
    pagesHandler: async (rq, rs) => {
      await expect(
        withMiddleware(noopHandler, {
          descriptor: '/fake',
          use: [
            (_req, res) => {
              // eslint-disable-next-line jest/unbound-method
              const send = res.end;
              res.end = ((...args: Parameters<typeof res.end>) => {
                send(...args);
                throw new Error('bad bad not good');
              }) as unknown as typeof res.end;
            }
          ],
          useOnError: [handleError]
        })(rq, rs)
      ).rejects.toMatchObject({ message: 'bad bad not good' });
    },
    test: async ({ fetch }) => {
      expect((await fetch()).status).toBe(200);
    }
  });
});

it('supports pluggable error handlers', async () => {
  expect.hasAssertions();

  const MyError = class extends ValidationError {};

  const MyUnusedError = class extends Error {};

  await testApiHandler({
    rejectOnHandlerError: true,
    pagesHandler: withMiddleware<Options>(undefined, {
      descriptor: '/fake',
      use: [
        () => {
          throw new MyError('bad bad not good');
        }
      ],
      useOnError: [handleError],
      options: {
        errorHandlers: new Map([
          [
            MyUnusedError,
            (res) => {
              res.status(555).end();
            }
          ],
          [
            MyError,
            (res, errorJson) => {
              res.status(200).send(errorJson);
            }
          ]
        ])
      }
    }),
    test: async ({ fetch }) => {
      expect((await fetch()).status).toBe(200);
      await expect((await fetch()).json()).resolves.toStrictEqual({
        error: 'bad bad not good'
      });
    }
  });

  await testApiHandler({
    rejectOnHandlerError: true,
    pagesHandler: withMiddleware<Options>(undefined, {
      descriptor: '/fake',
      use: [
        () => {
          throw new MyError('bad good not good');
        }
      ],
      useOnError: [handleError],
      options: {
        errorHandlers: new Map([
          [
            // ? Should catch every error
            Error,
            (res, errorJson) => {
              res.status(201).send(errorJson);
            }
          ]
        ])
      }
    }),
    test: async ({ fetch }) => {
      expect((await fetch()).status).toBe(201);
      await expect((await fetch()).json()).resolves.toStrictEqual({
        error: 'bad good not good'
      });
    }
  });
});
