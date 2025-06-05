import { testApiHandler } from 'next-test-api-route-handler';
import { toss } from 'toss-expression';

import { withDebugEnabled, withMockedOutput } from 'testverse/util';

import { middlewareFactory, withMiddleware } from 'multiverse/next-api-glue';

import type { NextApiRequest, NextApiResponse, NextConfig } from 'next';
import type { Middleware, MiddlewareContext } from 'multiverse/next-api-glue';

const MAX_CONTENT_LENGTH_BYTES = 100_000;
const MAX_CONTENT_LENGTH_BYTES_PLUS_1 = 100_001;

const noopHandler = async (_req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).send({});
};

describe('::withMiddleware', () => {
  it('throws on bad parameters', async () => {
    expect.hasAssertions();

    expect(() =>
      withMiddleware(async () => undefined, {
        // @ts-expect-error: testing bad param
        use: true
      })
    ).toThrow(/`use` parameter must be an array/);

    expect(() =>
      withMiddleware(async () => undefined, {
        descriptor: '/fake',
        use: [],
        // @ts-expect-error: testing bad param
        useOnError: true
      })
    ).toThrow(/`useOnError` parameter must be an array/);
  });

  it('rejects requests that are too big when exporting config (next.js)', async () => {
    expect.hasAssertions();

    const pagesHandler = withMiddleware(noopHandler, {
      descriptor: '/fake',
      use: []
    }) as ReturnType<typeof withMiddleware> & { config: NextConfig };

    pagesHandler.config = {
      api: {
        bodyParser: {
          get sizeLimit() {
            return MAX_CONTENT_LENGTH_BYTES;
          }
        }
      }
    };

    await testApiHandler({
      rejectOnHandlerError: true,
      pagesHandler,
      test: async ({ fetch }) => {
        await expect(
          fetch({
            method: 'POST',
            body: 'x'.repeat(MAX_CONTENT_LENGTH_BYTES_PLUS_1)
          }).then((r) => r.status)
        ).resolves.toBe(413);
      }
    });
  });

  it('lowercases headers automatically', async () => {
    expect.hasAssertions();

    await testApiHandler({
      rejectOnHandlerError: true,
      pagesHandler: withMiddleware(
        async (req, res) => {
          res.status(req.headers.key === '1234' ? 200 : 555).send({});
        },
        { descriptor: '/fake', use: [] }
      ),
      test: async ({ fetch }) =>
        expect((await fetch({ headers: { KEY: '1234' } })).status).toBe(200)
    });
  });

  it('parses url parameters', async () => {
    expect.hasAssertions();

    await testApiHandler({
      requestPatcher: (req) => {
        req.url = '/?some=url&yes';
      },
      rejectOnHandlerError: true,
      pagesHandler: withMiddleware(
        async (req, res) => {
          expect(req.query).toStrictEqual({ some: 'url', yes: '' });
          res.status(200).send({});
        },
        { descriptor: '/fake', use: [] }
      ),
      test: async ({ fetch }) => {
        expect((await fetch()).status).toBe(200);
      }
    });
  });

  it('runs one middleware in primary chain', async () => {
    expect.hasAssertions();

    const middleware = jest.fn();

    await testApiHandler({
      rejectOnHandlerError: true,
      pagesHandler: withMiddleware(noopHandler, {
        descriptor: '/fake',
        use: [middleware]
      }),
      test: async ({ fetch }) => {
        expect((await fetch()).status).toBe(200);
        expect(middleware).toHaveBeenCalledTimes(1);
      }
    });
  });

  it('runs multiple middleware in primary chain', async () => {
    expect.hasAssertions();

    const middleware = [jest.fn(), jest.fn()];

    await testApiHandler({
      rejectOnHandlerError: true,
      pagesHandler: withMiddleware(noopHandler, {
        descriptor: '/fake',
        use: middleware
      }),
      test: async ({ fetch }) => {
        expect((await fetch()).status).toBe(200);
        middleware.forEach((m) => expect(m).toHaveBeenCalledTimes(1));
      }
    });
  });

  it('runs primary chain middleware then handler', async () => {
    expect.hasAssertions();

    const middleware = jest.fn(() =>
      expect(handler).toHaveBeenCalledTimes(0)
    ) as Middleware;
    const handler = jest.fn(() => expect(middleware).toHaveBeenCalledTimes(1));

    await testApiHandler({
      rejectOnHandlerError: true,
      pagesHandler: withMiddleware(handler, {
        descriptor: '/fake',
        use: [middleware]
      }),
      test: async ({ fetch }) => {
        await fetch();
        expect(middleware).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledTimes(1);
      }
    });
  });

  it('runs handler even if no middleware used', async () => {
    expect.hasAssertions();

    const handler = jest.fn();

    await testApiHandler({
      rejectOnHandlerError: true,
      pagesHandler: withMiddleware(handler, { descriptor: '/fake', use: [] }),
      test: async ({ fetch }) => {
        await fetch();
        expect(handler).toHaveBeenCalledTimes(1);
      }
    });
  });

  it('skips running handler if not a function', async () => {
    expect.hasAssertions();

    await testApiHandler({
      rejectOnHandlerError: true,
      // @ts-expect-error: bad handler
      pagesHandler: withMiddleware(true, {
        descriptor: '/fake',
        use: [(_, res) => res.status(200).end()]
      }),
      test: async ({ fetch }) => {
        expect((await fetch()).status).toBe(200);
      }
    });
  });

  it('populates runtime.endpoint with endpoint metadata if available', async () => {
    expect.hasAssertions();

    await testApiHandler({
      rejectOnHandlerError: true,
      pagesHandler: withMiddleware(undefined, {
        descriptor: '/fake/:path',
        use: [
          (_, res, context) =>
            res.status(200).send({ endpoint: context.runtime.endpoint })
        ]
      }),
      test: async ({ fetch }) => {
        await expect((await fetch()).json()).resolves.toStrictEqual({
          endpoint: {
            descriptor: '/fake/:path'
          }
        });
      }
    });
  });

  it('skips running handler if primary chain was aborted', async () => {
    expect.hasAssertions();

    const handler = jest.fn();

    await testApiHandler({
      rejectOnHandlerError: true,
      pagesHandler: withMiddleware(handler, {
        descriptor: '/fake',
        use: [(_, __, context) => context.runtime.done()]
      }),
      test: async ({ fetch }) => {
        await fetch();
        expect(handler).toHaveBeenCalledTimes(0);
      }
    });

    await withMockedOutput(async ({ errorSpy }) => {
      await expect(
        testApiHandler({
          rejectOnHandlerError: true,
          pagesHandler: withMiddleware(handler, {
            descriptor: '/fake',
            use: [() => toss(new Error('bad'))]
          }),
          test: async ({ fetch }) => void (await fetch())
        })
      ).rejects.toMatchObject({ message: 'bad' });

      expect(handler).toHaveBeenCalledTimes(0);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  it('sends 501 if handler is undefined', async () => {
    expect.hasAssertions();

    await testApiHandler({
      rejectOnHandlerError: true,
      pagesHandler: withMiddleware(undefined, { descriptor: '/fake', use: [] }),
      test: async ({ fetch }) => expect((await fetch()).status).toBe(501)
    });
  });

  it('sends 501 if res.end not called by the time handler completes', async () => {
    expect.hasAssertions();

    await testApiHandler({
      rejectOnHandlerError: true,
      pagesHandler: withMiddleware(async () => undefined, {
        descriptor: '/fake',
        use: []
      }),
      test: async ({ fetch }) => expect((await fetch()).status).toBe(501)
    });
  });

  it('only populates runtime.error for error handling middleware (and not primary)', async () => {
    expect.hasAssertions();

    const error = new Error('bad stuff happened');

    await withMockedOutput(async ({ errorSpy }) => {
      await expect(
        testApiHandler({
          rejectOnHandlerError: true,
          pagesHandler: withMiddleware(noopHandler, {
            descriptor: '/fake',
            use: [
              (_, __, context) => expect(context.runtime.error).toBeUndefined(),
              (_, __, context) => expect(context.runtime.error).toBeUndefined(),
              () => toss(error)
            ],
            useOnError: [
              (_, __, context) => expect(context.runtime.error).toBe(error),
              (_, __, context) => expect(context.runtime.error).toBe(error)
            ]
          }),
          test: async ({ fetch }) => void (await fetch())
        })
      ).toReject();

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  it('runs one middleware in error handling chain on error in primary chain', async () => {
    expect.hasAssertions();

    const middleware = jest.fn();

    await withMockedOutput(async () => {
      await testApiHandler({
        rejectOnHandlerError: true,
        pagesHandler: withMiddleware(noopHandler, {
          descriptor: '/fake',
          use: [() => toss(new Error('error'))],
          useOnError: [middleware, (_, res) => res.end()]
        }),
        test: async ({ fetch }) => {
          await fetch();
          expect(middleware).toHaveBeenCalledTimes(1);
        }
      });
    });
  });

  it('runs multiple middleware in error handling chain on error in primary chain', async () => {
    expect.hasAssertions();

    const middleware = [jest.fn(), jest.fn(), ((_, res) => res.end()) as Middleware];

    await withMockedOutput(async () => {
      await testApiHandler({
        rejectOnHandlerError: true,
        pagesHandler: withMiddleware(noopHandler, {
          descriptor: '/fake',
          use: [() => toss(new Error('error'))],
          useOnError: middleware
        }),
        test: async ({ fetch }) => {
          await fetch();
          middleware.slice(0, -1).forEach((m) => expect(m).toHaveBeenCalledTimes(1));
        }
      });
    });
  });

  it('runs one middleware in error handling chain on error in handler', async () => {
    expect.hasAssertions();

    const middleware = jest.fn();

    await withMockedOutput(async () => {
      await testApiHandler({
        rejectOnHandlerError: true,
        pagesHandler: withMiddleware(() => toss(new Error('error')), {
          descriptor: '/fake',
          use: [],
          useOnError: [middleware, (_, res) => res.end()]
        }),
        test: async ({ fetch }) => {
          await fetch();
          expect(middleware).toHaveBeenCalledTimes(1);
        }
      });
    });
  });

  it('runs multiple middleware in error handling chain on error in handler', async () => {
    expect.hasAssertions();

    const middleware = [jest.fn(), jest.fn(), ((_, res) => res.end()) as Middleware];

    await withMockedOutput(async () => {
      await testApiHandler({
        rejectOnHandlerError: true,
        pagesHandler: withMiddleware(() => toss(new Error('error')), {
          descriptor: '/fake',
          use: [],
          useOnError: middleware
        }),
        test: async ({ fetch }) => {
          await fetch();
          middleware.slice(0, -1).forEach((m) => expect(m).toHaveBeenCalledTimes(1));
        }
      });
    });
  });

  it('skips remaining middleware if chain is aborted and aborts chain if runtime.done called', async () => {
    expect.hasAssertions();

    const middleware = jest.fn();

    await withMockedOutput(async ({ errorSpy }) => {
      await testApiHandler({
        rejectOnHandlerError: true,
        pagesHandler: withMiddleware(noopHandler, {
          descriptor: '/fake',
          use: [(_, __, context) => context.runtime.done(), middleware, middleware],
          useOnError: [
            (_, __, context) => context.runtime.done(),
            middleware,
            middleware
          ]
        }),
        test: async ({ fetch }) => {
          await fetch();
          expect(middleware).toHaveBeenCalledTimes(0);
        }
      });

      await expect(
        testApiHandler({
          rejectOnHandlerError: true,
          pagesHandler: withMiddleware(noopHandler, {
            descriptor: '/fake',
            use: [() => toss(new Error('bad')), middleware, middleware],
            useOnError: [() => toss(new Error('bad')), middleware, middleware]
          }),
          test: async ({ fetch }) => void (await fetch())
        })
      ).toReject();

      expect(middleware).toHaveBeenCalledTimes(0);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  it('throws on error in error handling chain', async () => {
    expect.hasAssertions();

    await withMockedOutput(async ({ errorSpy }) => {
      await expect(
        testApiHandler({
          rejectOnHandlerError: true,
          pagesHandler: withMiddleware(undefined, {
            descriptor: '/fake',
            use: [() => toss(new Error('bad'))],
            useOnError: [() => toss(new Error('worse'))]
          }),
          test: async ({ fetch }) => void (await fetch())
        })
      ).rejects.toMatchObject({ message: 'worse' });

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  it('throws on error in primary chain if no error handling middleware available', async () => {
    expect.hasAssertions();

    await withMockedOutput(async ({ errorSpy }) => {
      await expect(
        testApiHandler({
          rejectOnHandlerError: true,
          pagesHandler: withMiddleware(undefined, {
            descriptor: '/fake',
            use: [() => toss(new Error('bad'))],
            useOnError: []
          }),
          test: async ({ fetch }) => void (await fetch())
        })
      ).rejects.toMatchObject({ message: 'bad' });

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  it('throws if res.end not called by the time error handling chain completes', async () => {
    expect.hasAssertions();

    await withMockedOutput(async ({ errorSpy }) => {
      await expect(
        testApiHandler({
          rejectOnHandlerError: true,
          pagesHandler: withMiddleware(undefined, {
            descriptor: '/fake',
            use: [() => toss(new Error('bad'))],
            useOnError: [() => undefined]
          }),
          test: async ({ fetch }) => void (await fetch())
        })
      ).rejects.toMatchObject({ message: 'bad' });

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  it('makes runtime control functions noops if chain completes', async () => {
    expect.hasAssertions();

    const nextWarning = expect.stringContaining(
      'already finished executing; calling runtime.next() at this point is a noop'
    );

    const doneWarning = expect.stringContaining(
      'already finished executing; calling runtime.done() at this point is a noop'
    );

    let next: () => Promise<void>, done: () => void;

    await withDebugEnabled(async () => {
      await withMockedOutput(async ({ nodeErrorSpy }) => {
        await testApiHandler({
          rejectOnHandlerError: true,
          pagesHandler: withMiddleware(
            async () => {
              expect(nodeErrorSpy).not.toHaveBeenCalledWith(nextWarning);
              expect(nodeErrorSpy).not.toHaveBeenCalledWith(doneWarning);

              await next();
              expect(nodeErrorSpy).toHaveBeenCalledWith(nextWarning);

              done();
              expect(nodeErrorSpy).toHaveBeenCalledWith(doneWarning);

              throw new Error('badness');
            },
            {
              options: { callDoneOnEnd: false },
              descriptor: '/fake',
              use: [
                (_req, _res, { runtime }) => {
                  next = runtime.next;
                  done = runtime.done;
                }
              ],
              useOnError: [
                (_req, res, { runtime }) => {
                  expect(runtime.error).toMatchObject({ message: 'badness' });

                  next = runtime.next;
                  done = runtime.done;
                  res.end();
                }
              ]
            }
          ),
          test: async ({ fetch }) => {
            await fetch();

            nodeErrorSpy.mockClear();

            await next();
            expect(nodeErrorSpy).toHaveBeenCalledWith(nextWarning);

            done();
            expect(nodeErrorSpy).toHaveBeenCalledWith(doneWarning);
          }
        });
      });
    });
  });

  it('makes runtime control functions noops if chain aborts', async () => {
    expect.hasAssertions();

    const nextWarning = expect.stringContaining(
      'aborted; calling runtime.next() at this point is a noop'
    );

    const doneWarning = expect.stringContaining(
      'already aborted; calling runtime.done() at this point is a noop'
    );

    let next: () => Promise<void>, done: () => void;

    await withDebugEnabled(async () => {
      await withMockedOutput(async ({ errorSpy, nodeErrorSpy }) => {
        await expect(
          testApiHandler({
            rejectOnHandlerError: true,
            pagesHandler: withMiddleware(undefined, {
              descriptor: '/fake',
              use: [
                (_req, _res, { runtime }) => {
                  next = runtime.next;
                  done = runtime.done;
                  throw new Error('aborted');
                }
              ],
              useOnError: [
                async (_req, _res, { runtime }) => {
                  expect(nodeErrorSpy).not.toHaveBeenCalledWith(nextWarning);
                  expect(nodeErrorSpy).not.toHaveBeenCalledWith(doneWarning);

                  await next();
                  expect(nodeErrorSpy).toHaveBeenCalledWith(nextWarning);

                  done();
                  expect(nodeErrorSpy).toHaveBeenCalledWith(doneWarning);

                  next = runtime.next;
                  done = runtime.done;

                  throw new Error('aborted again');
                }
              ]
            }),
            test: async ({ fetch }) => void (await fetch())
          })
        ).rejects.toMatchObject({ message: 'aborted again' });

        nodeErrorSpy.mockClear();

        await next();
        expect(nodeErrorSpy).toHaveBeenCalledWith(nextWarning);

        done();
        expect(nodeErrorSpy).toHaveBeenCalledWith(doneWarning);
        expect(errorSpy).toHaveBeenCalled();
      });
    });
  });

  it('can pull entire chain (and then some) manually using runtime.next', async () => {
    expect.hasAssertions();

    const nextWarning = expect.stringContaining(
      'already finished executing; calling runtime.next() at this point is a noop'
    );

    await withDebugEnabled(async () => {
      await withMockedOutput(async ({ nodeErrorSpy }) => {
        await testApiHandler({
          rejectOnHandlerError: true,
          pagesHandler: withMiddleware(undefined, {
            descriptor: '/fake',
            use: [
              async (_req, res, { runtime: { next } }) => {
                await next();
                expect(nodeErrorSpy).not.toHaveBeenCalledWith(nextWarning);

                await next();
                expect(nodeErrorSpy).toHaveBeenCalledWith(nextWarning);

                nodeErrorSpy.mockClear();

                await next();
                expect(nodeErrorSpy).toHaveBeenCalledWith(nextWarning);

                res.status(200).end();
              }
            ]
          }),
          test: async ({ fetch }) => {
            expect((await fetch()).status).toBe(200);
          }
        });
      });
    });
  });

  it('can pull entire chain manually using runtime.next with warning if called multiple times', async () => {
    expect.hasAssertions();

    const middleware = jest.fn();
    const nextWarning = expect.stringContaining(
      'already finished executing; calling runtime.next() at this point is a noop'
    );

    await withMockedOutput(async ({ nodeErrorSpy }) => {
      await withDebugEnabled(async () => {
        await testApiHandler({
          rejectOnHandlerError: true,
          pagesHandler: withMiddleware(undefined, {
            descriptor: '/fake',
            use: [
              async (_req, _res, { runtime: { next } }) => {
                await next();
                expect(nodeErrorSpy).not.toHaveBeenCalledWith(nextWarning);

                nodeErrorSpy.mockClear();

                await next();
                expect(nodeErrorSpy).toHaveBeenCalledWith(nextWarning);

                throw new Error('not good bad bad');
              },
              middleware,
              middleware
            ],
            useOnError: [
              async (_req, _res, { runtime: { next, error } }) => {
                expect(middleware).toHaveBeenCalledTimes(2);
                expect(error).toMatchObject({ message: 'not good bad bad' });
                nodeErrorSpy.mockClear();

                await next();
                expect(nodeErrorSpy).not.toHaveBeenCalledWith(nextWarning);

                nodeErrorSpy.mockClear();

                await next();
                expect(nodeErrorSpy).toHaveBeenCalledWith(
                  expect.stringContaining(
                    'aborted; calling runtime.next() at this point is a noop'
                  )
                );
              },
              middleware,
              middleware,
              (_, res) => {
                expect(middleware).toHaveBeenCalledTimes(4);
                res.status(200).end();
              }
            ]
          }),
          test: async ({ fetch }) => {
            expect((await fetch()).status).toBe(200);
          }
        });
      });
    });
  });

  it('skips non-function middleware in chain', async () => {
    expect.hasAssertions();

    await withDebugEnabled(async () => {
      await withMockedOutput(async ({ nodeErrorSpy }) => {
        await testApiHandler({
          rejectOnHandlerError: true,
          pagesHandler: withMiddleware(undefined, {
            descriptor: '/fake',
            use: [
              // @ts-expect-error: bad middleware value
              'bad',
              // @ts-expect-error: bad middleware value
              null,
              // @ts-expect-error: bad middleware value
              {},
              (_, res) => res.status(403).end()
            ]
          }),
          test: async ({ fetch }) => {
            expect((await fetch()).status).toBe(403);
            expect(nodeErrorSpy).toHaveBeenCalledWith(
              expect.stringContaining('skipping execution of non-function item in chain')
            );
          }
        });
      });
    });
  });

  it('calls runtime.done on res.end only if options.callDoneOnEnd is true', async () => {
    expect.hasAssertions();

    const middleware = jest.fn();

    await testApiHandler({
      rejectOnHandlerError: true,
      pagesHandler: withMiddleware(undefined, {
        descriptor: '/fake',
        use: [(_, res) => res.status(404).end(), middleware],
        options: { callDoneOnEnd: false }
      }),
      test: async ({ fetch }) => {
        expect((await fetch()).status).toBe(404);
        expect(middleware).toHaveBeenCalledTimes(1);
      }
    });

    await testApiHandler({
      rejectOnHandlerError: true,
      pagesHandler: withMiddleware(undefined, {
        descriptor: '/fake',
        use: [(_, res) => res.status(403).end(), middleware],
        options: { callDoneOnEnd: true }
      }),
      test: async ({ fetch }) => {
        expect((await fetch()).status).toBe(403);
        expect(middleware).toHaveBeenCalledTimes(1);
      }
    });
  });

  it('calls runtime.done on res.end only if chain was not aborted', async () => {
    expect.hasAssertions();

    const skippedMessage = expect.stringContaining('skipped calling runtime.done');

    await withDebugEnabled(async () => {
      await withMockedOutput(async ({ nodeErrorSpy }) => {
        await testApiHandler({
          rejectOnHandlerError: true,
          pagesHandler: withMiddleware(undefined, {
            descriptor: '/fake',
            use: [
              async (_, res, { runtime: { done } }) => {
                done();
                expect(nodeErrorSpy).not.toHaveBeenCalledWith(skippedMessage);
                res.status(404).end();
                expect(nodeErrorSpy).toHaveBeenCalledWith(skippedMessage);
              }
            ]
          }),
          test: async ({ fetch }) => {
            expect((await fetch()).status).toBe(404);
          }
        });

        await testApiHandler({
          rejectOnHandlerError: true,
          pagesHandler: withMiddleware(undefined, {
            descriptor: '/fake',
            use: [
              async () => {
                throw new Error('contrived');
              }
            ],
            useOnError: [
              async (_, res, { runtime: { done, error } }) => {
                expect(error).toMatchObject({ message: 'contrived' });

                done();

                nodeErrorSpy.mockClear();
                expect(nodeErrorSpy).not.toHaveBeenCalledWith(skippedMessage);
                res.status(404).end();
                expect(nodeErrorSpy).toHaveBeenCalledWith(skippedMessage);
              }
            ]
          }),
          test: async ({ fetch }) => {
            expect((await fetch()).status).toBe(404);
          }
        });
      });
    });
  });

  it('calls runtime.done on res.end only if chain has not already completed', async () => {
    expect.hasAssertions();

    const skippedMessage = expect.stringContaining('skipped calling runtime.done');

    await withDebugEnabled(async () => {
      await withMockedOutput(async ({ nodeErrorSpy }) => {
        await testApiHandler({
          rejectOnHandlerError: true,
          pagesHandler: withMiddleware(
            async (_, res) => {
              expect(nodeErrorSpy).not.toHaveBeenCalledWith(skippedMessage);
              res.status(404).end();
              expect(nodeErrorSpy).toHaveBeenCalledWith(skippedMessage);
            },
            {
              descriptor: '/fake',
              use: []
            }
          ),
          test: async ({ fetch }) => {
            expect((await fetch()).status).toBe(404);
          }
        });
      });
    });
  });

  it('does not call runtime.done on res.end if response was already sent', async () => {
    expect.hasAssertions();

    const skippedMessage = expect.stringContaining('skipped calling runtime.done');

    await withDebugEnabled(async () => {
      await withMockedOutput(async ({ nodeErrorSpy }) => {
        await testApiHandler({
          rejectOnHandlerError: true,
          pagesHandler: withMiddleware(
            async (_, res) => {
              expect(nodeErrorSpy).not.toHaveBeenCalledWith(skippedMessage);
              res.status(404).end();
              expect(nodeErrorSpy).toHaveBeenCalledWith(skippedMessage);
              nodeErrorSpy.mockClear();
              expect(nodeErrorSpy).not.toHaveBeenCalledWith(skippedMessage);
              res.status(404).end();
              expect(nodeErrorSpy).not.toHaveBeenCalledWith(skippedMessage);
            },
            {
              descriptor: '/fake',
              use: []
            }
          ),
          test: async ({ fetch }) => {
            expect((await fetch()).status).toBe(404);
          }
        });
      });
    });
  });

  it('supports type generics', async () => {
    expect.assertions(0);

    type myMiddlewareOptions = { customOption: boolean };

    const myMiddleware = (
      _: NextApiRequest,
      res: NextApiResponse,
      { options: { customOption } }: MiddlewareContext<myMiddlewareOptions>
    ) => {
      res.status(200).send(customOption);
    };

    const myPartialMiddleware = (
      _: NextApiRequest,
      res: NextApiResponse,
      { options: { customOption } }: MiddlewareContext<Partial<myMiddlewareOptions>>
    ) => {
      res.status(200).send(customOption);
    };

    withMiddleware(undefined, {
      // @ts-expect-error: MiddlewareContext != MiddlewareContext<myMiddlewareOptions>
      use: [myMiddleware]
    });

    withMiddleware<myMiddlewareOptions>(undefined, {
      descriptor: '/fake',
      use: [myMiddleware]
      // TODO: simplify middleware and then enforce required options here
    });

    withMiddleware<myMiddlewareOptions>(undefined, {
      use: [myMiddleware],
      // @ts-expect-error: missing required property: customOption
      options: {}
    });

    withMiddleware<myMiddlewareOptions>(undefined, {
      use: [myMiddleware],
      // @ts-expect-error: bad type for required property: customOption
      options: { customOption: 5 }
    });

    withMiddleware<myMiddlewareOptions & { anotherOpt: boolean }>(undefined, {
      use: [
        myMiddleware,
        (_, __, { options: { anotherOpt } }) => {
          void anotherOpt;
        }
      ],
      // @ts-expect-error: missing required property: anotherOpt
      options: { customOption: true }
    });

    withMiddleware(undefined, {
      descriptor: '/fake',
      use: [myPartialMiddleware]
    });

    withMiddleware<Partial<myMiddlewareOptions>>(undefined, {
      descriptor: '/fake',
      use: [myPartialMiddleware],
      options: {}
    });
  });
});

describe('::middlewareFactory', () => {
  it('returns a pre-configured withMiddleware instance', async () => {
    expect.hasAssertions();

    type myMiddlewareOptions = { customOption: boolean };

    const myMiddleware = (
      _: NextApiRequest,
      res: NextApiResponse,
      { options: { customOption } }: MiddlewareContext<myMiddlewareOptions>
    ) => {
      res.status(200).send({ customOption });
    };

    const customOption = true;

    const pagesHandler = middlewareFactory<myMiddlewareOptions>({
      use: [myMiddleware],
      options: { customOption }
    })(undefined, {
      descriptor: '/fake'
    });

    await testApiHandler({
      pagesHandler,
      test: async ({ fetch }) => {
        await expect((await fetch()).json()).resolves.toStrictEqual({ customOption });
      }
    });
  });

  it('handles appending and prepending to middleware chains', async () => {
    expect.hasAssertions();

    type myMiddlewareOptions = { customOption: boolean };

    const myMiddleware = (
      _: NextApiRequest,
      res: NextApiResponse,
      { options: { customOption } }: MiddlewareContext<myMiddlewareOptions>
    ) => {
      res.status(200).send({ customOption });
    };

    const customOption = true;

    await testApiHandler({
      pagesHandler: middlewareFactory<myMiddlewareOptions>({
        use: [myMiddleware],
        options: { customOption }
      })(undefined, {
        descriptor: '/fake',
        prependUse: [(_, res) => res.status(201).send({ a: 1 })]
      }),
      test: async ({ fetch }) => {
        const res = await fetch();
        expect(res.status).toBe(201);
        await expect(res.json()).resolves.toStrictEqual({ a: 1 });
      }
    });

    await testApiHandler({
      pagesHandler: middlewareFactory({
        use: [(_, res) => void res.status(202)]
      })(undefined, {
        descriptor: '/fake',
        appendUse: [(_, res) => res.send({ b: 1 })]
      }),
      test: async ({ fetch }) => {
        const res = await fetch();
        expect(res.status).toBe(202);
        await expect(res.json()).resolves.toStrictEqual({ b: 1 });
      }
    });

    await testApiHandler({
      pagesHandler: middlewareFactory<myMiddlewareOptions>({
        use: [myMiddleware],
        options: { customOption }
      })(undefined, {
        descriptor: '/fake',
        prependUse: [() => toss(new Error('bad bad not good'))],
        prependUseOnError: [(_, res) => void res.status(203)],
        appendUseOnError: [(_, res) => res.send({ c: 1 })]
      }),
      test: async ({ fetch }) => {
        const res = await fetch();
        expect(res.status).toBe(203);
        await expect(res.json()).resolves.toStrictEqual({ c: 1 });
      }
    });
  });

  it('supports type generics', async () => {
    expect.assertions(0);

    type myMiddlewareOptions = { customOption: boolean };

    const myMiddleware = (
      _: NextApiRequest,
      res: NextApiResponse,
      { options: { customOption } }: MiddlewareContext<myMiddlewareOptions>
    ) => {
      res.status(200).send(customOption);
    };

    const myPartialMiddleware = (
      _: NextApiRequest,
      res: NextApiResponse,
      { options: { customOption } }: MiddlewareContext<Partial<myMiddlewareOptions>>
    ) => {
      res.status(200).send(customOption);
    };

    middlewareFactory({
      // @ts-expect-error: MiddlewareContext != MiddlewareContext<myMiddlewareOptions>
      use: [myMiddleware]
    })(undefined, {
      descriptor: '/fake'
    });

    middlewareFactory<myMiddlewareOptions>({
      use: [myMiddleware]
    })(undefined, {
      descriptor: '/fake'
    });

    middlewareFactory<myMiddlewareOptions>({
      use: [myMiddleware],
      // @ts-expect-error: missing required property: customOption
      options: {}
    })(undefined, {
      descriptor: '/fake'
    });

    middlewareFactory<myMiddlewareOptions>({
      use: [myMiddleware],
      // @ts-expect-error: bad type for required property: customOption
      options: { customOption: 5 }
    })(undefined, {
      descriptor: '/fake'
    });

    middlewareFactory<myMiddlewareOptions & { anotherOpt: boolean }>({
      use: [
        myMiddleware,
        (_, __, { options: { anotherOpt } }) => {
          void anotherOpt;
        }
      ],
      // @ts-expect-error: missing required property: anotherOpt
      options: { customOption: true }
    })(undefined, {
      descriptor: '/fake'
    });

    middlewareFactory({
      use: [myPartialMiddleware]
    })(undefined, {
      descriptor: '/fake'
    });

    middlewareFactory<Partial<myMiddlewareOptions>>({
      use: [myPartialMiddleware],
      options: {}
    })(undefined, {
      descriptor: '/fake'
    });

    middlewareFactory({
      use: [myPartialMiddleware]
    })(undefined, {
      descriptor: '/fake',
      // @ts-expect-error: MiddlewareContext !== MiddlewareContext<myMiddlewareOptions>
      appendUse: [myMiddleware]
    });

    middlewareFactory({
      use: [myPartialMiddleware]
    })(undefined, {
      descriptor: '/fake',
      appendUse: [myPartialMiddleware],
      appendUseOnError: [myPartialMiddleware]
    });

    middlewareFactory<myMiddlewareOptions>({
      use: [myPartialMiddleware]
    })(undefined, {
      descriptor: '/fake',
      prependUse: [myMiddleware],
      prependUseOnError: [myMiddleware]
    });

    middlewareFactory<myMiddlewareOptions>({
      use: [myPartialMiddleware]
    })(undefined, {
      descriptor: '/fake',
      // @ts-expect-error: bad type for required property: customOption
      options: { customOption: 5 }
    });
  });
});
