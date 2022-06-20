import { testApiHandler } from 'next-test-api-route-handler';
import { noopHandler, wrapHandler } from 'testverse/setup';
import { withMiddleware } from 'multiverse/next-api-glue';
import checkContentType, { Options } from 'multiverse/next-adhesive/check-content-type';

it('sends 200 for allowed Content-Type headers', async () => {
  expect.hasAssertions();

  await testApiHandler({
    handler: wrapHandler(
      withMiddleware<Options>(noopHandler, {
        use: [checkContentType],
        options: { allowedContentTypes: ['allowed/type-1', 'allowed/type-2'] }
      })
    ),
    test: async ({ fetch }) => {
      expect(
        (await fetch({ headers: { 'content-type': 'allowed/type-1' } })).status
      ).toBe(200);

      expect(
        (await fetch({ headers: { 'content-type': 'allowed/type-2' } })).status
      ).toBe(200);
    }
  });
});

it('is restrictive by default', async () => {
  expect.hasAssertions();

  await testApiHandler({
    handler: wrapHandler(
      withMiddleware<Options>(noopHandler, { use: [checkContentType] })
    ),
    test: async ({ fetch }) => {
      expect((await fetch({ method: 'GET' })).status).toBe(400);
      expect((await fetch({ method: 'POST' })).status).toBe(400);
      expect((await fetch({ method: 'PUT' })).status).toBe(400);
      expect((await fetch({ method: 'DELETE' })).status).toBe(400);
    }
  });
});

it('allows all (even empty) Content-Type header if set to "any"', async () => {
  expect.hasAssertions();

  await testApiHandler({
    handler: wrapHandler(
      withMiddleware<Options>(noopHandler, {
        use: [checkContentType],
        options: { allowedContentTypes: 'any' }
      })
    ),
    test: async ({ fetch }) => {
      expect((await fetch({ headers: { 'content-type': 'a/b' } })).status).toBe(200);

      expect((await fetch({ headers: { 'content-type': 'c' } })).status).toBe(200);

      expect((await fetch()).status).toBe(200);
    }
  });
});

it('sends 400 when Content-Type header is not specified', async () => {
  expect.hasAssertions();

  await testApiHandler({
    requestPatcher: (req) => (req.method = undefined),
    handler: wrapHandler(
      withMiddleware<Options>(noopHandler, { use: [checkContentType] })
    ),
    test: async ({ fetch }) => {
      expect((await fetch()).status).toBe(400);
    }
  });
});

it('sends 400 when encountering unlisted Content-Type headers', async () => {
  expect.hasAssertions();

  await testApiHandler({
    handler: wrapHandler(
      withMiddleware<Options>(noopHandler, {
        use: [checkContentType],
        options: { allowedContentTypes: ['application/json'] }
      })
    ),
    test: async ({ fetch }) => {
      expect((await fetch({ headers: { 'content-type': 'application/j' } })).status).toBe(
        400
      );

      expect(
        (await fetch({ headers: { 'content-type': 'application/jsonn' } })).status
      ).toBe(400);

      expect(
        (await fetch({ headers: { 'content-type': 'application/jsonc' } })).status
      ).toBe(400);

      expect((await fetch({ headers: { 'content-type': 'application' } })).status).toBe(
        400
      );
    }
  });
});

it('ignores case', async () => {
  expect.hasAssertions();

  await testApiHandler({
    handler: wrapHandler(
      withMiddleware<Options>(noopHandler, {
        use: [checkContentType],
        options: { allowedContentTypes: ['application/json'] }
      })
    ),
    test: async ({ fetch }) => {
      expect(
        (await fetch({ headers: { 'content-type': 'APPLICATION/JSON' } })).status
      ).toBe(200);

      expect(
        (await fetch({ headers: { 'content-type': 'aPpLiCaTiOn/JsOn' } })).status
      ).toBe(200);
    }
  });
});
