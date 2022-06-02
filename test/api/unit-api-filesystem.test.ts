import { testApiHandler } from 'next-test-api-route-handler';
import { api, setupMockBackend } from 'testverse/fixtures';

import type { PublicNode } from 'universe/backend/db';

jest.mock('universe/backend');
jest.mock('universe/backend/middleware', () => {
  const { middlewareFactory } = require('multiverse/next-api-glue');
  const { default: handleError } = require('multiverse/next-adhesive/handle-error');

  return {
    withMiddleware: jest
      .fn()
      .mockImplementation(middlewareFactory({ use: [], useOnError: [handleError] }))
  };
});

const { mockedSearchNodes } = setupMockBackend();

describe('api/v1/filesystem/:username', () => {
  describe('/ [POST]', () => {
    it('accepts POST requests', async () => {
      expect.hasAssertions();

      await testApiHandler({
        handler: api.v1.filesystemUsername,
        params: { username: 'User1' },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'POST' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(200);
          expect(json.success).toBeTrue();
          expect(json.node).toBeObject();
          expect(Object.keys(json)).toHaveLength(2);
        }
      });
    });
  });

  describe('/search [GET]', () => {
    it('accepts GET requests', async () => {
      expect.hasAssertions();

      await testApiHandler({
        handler: api.v1.filesystemUsernameSearch,
        params: { username: 'User1' },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'GET' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(200);
          expect(json.success).toBeTrue();
          expect(json.nodes).toBeArray();
          expect(Object.keys(json)).toHaveLength(2);
        }
      });

      await testApiHandler({
        handler: api.v1.filesystemUsernameSearch,
        params: {
          username: 'User1',
          after: 'id',
          match: '{"a":1}',
          regexMatch: '{"b":1}'
        },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'GET' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(200);
          expect(json.success).toBeTrue();
          expect(json.nodes).toBeArray();
          expect(Object.keys(json)).toHaveLength(2);
        }
      });

      await testApiHandler({
        handler: api.v1.filesystemUsernameSearch,
        params: { username: 'User1', match: 'x' },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'GET' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(400);
          expect(json.success).toBeFalse();
          expect(json.error).toBeString();
          expect(Object.keys(json)).toHaveLength(2);
        }
      });

      await testApiHandler({
        handler: api.v1.filesystemUsernameSearch,
        params: { username: 'User1', regexMatch: 'x' },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'GET' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(400);
          expect(json.success).toBeFalse();
          expect(json.error).toBeString();
          expect(Object.keys(json)).toHaveLength(2);
        }
      });
    });

    it('only returns nodes owned by username', async () => {
      expect.hasAssertions();

      mockedSearchNodes.mockReturnValue(
        Promise.resolve([{ owner: 'User1' }, { owner: 'User2' }] as PublicNode[])
      );

      await testApiHandler({
        handler: api.v1.filesystemUsernameSearch,
        params: { username: 'User1' },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'GET' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(200);
          expect(json.success).toBeTrue();
          expect(json.nodes).toStrictEqual([{ owner: 'User1' }]);
          expect(Object.keys(json)).toHaveLength(2);
        }
      });
    });
  });

  describe('/:node_id1/:node_id2/.../:node_idN [GET]', () => {
    it('accepts GET requests', async () => {
      expect.hasAssertions();

      await testApiHandler({
        handler: api.v1.filesystemUsernameNodeId,
        params: { username: 'User1', node_ids: ['id'] },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'GET' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(200);
          expect(json.success).toBeTrue();
          expect(json.nodes).toBeArray();
          expect(Object.keys(json)).toHaveLength(2);
        }
      });
    });
  });

  describe('/:node_id [PUT]', () => {
    it('accepts PUT requests', async () => {
      expect.hasAssertions();

      await testApiHandler({
        handler: api.v1.filesystemUsernameNodeId,
        params: { username: 'User1', node_ids: ['id'] },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'PUT' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(200);
          expect(json.success).toBeTrue();
          expect(Object.keys(json)).toHaveLength(1);
        }
      });
    });
  });

  describe('/:node_id1/:node_id2/.../:node_idN [DELETE]', () => {
    it('accepts DELETE requests', async () => {
      expect.hasAssertions();

      await testApiHandler({
        handler: api.v1.filesystemUsernameNodeId,
        params: { username: 'User1', node_ids: ['id'] },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'DELETE' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(200);
          expect(json.success).toBeTrue();
          expect(Object.keys(json)).toHaveLength(1);
        }
      });
    });
  });
});

describe('api/v2/users/:username/filesystem', () => {
  describe('/ [POST]', () => {
    it('accepts POST requests', async () => {
      expect.hasAssertions();

      await testApiHandler({
        handler: api.v2.usersUsernameFilesystem,
        params: { username: 'User1' },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'POST' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(200);
          expect(json.success).toBeTrue();
          expect(json.node).toBeObject();
          expect(Object.keys(json)).toHaveLength(2);
        }
      });
    });
  });

  describe('/search [GET]', () => {
    it('accepts GET requests', async () => {
      expect.hasAssertions();

      await testApiHandler({
        handler: api.v2.usersUsernameFilesystemSearch,
        params: { username: 'User1' },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'GET' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(200);
          expect(json.success).toBeTrue();
          expect(json.nodes).toBeArray();
          expect(Object.keys(json)).toHaveLength(2);
        }
      });

      await testApiHandler({
        handler: api.v2.usersUsernameFilesystemSearch,
        params: {
          username: 'User1',
          after: 'id',
          match: '{"a":1}',
          regexMatch: '{"b":1}'
        },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'GET' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(200);
          expect(json.success).toBeTrue();
          expect(json.nodes).toBeArray();
          expect(Object.keys(json)).toHaveLength(2);
        }
      });

      await testApiHandler({
        handler: api.v2.usersUsernameFilesystemSearch,
        params: { username: 'User1', match: 'x' },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'GET' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(400);
          expect(json.success).toBeFalse();
          expect(json.error).toBeString();
          expect(Object.keys(json)).toHaveLength(2);
        }
      });

      await testApiHandler({
        handler: api.v2.usersUsernameFilesystemSearch,
        params: { username: 'User1', regexMatch: 'x' },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'GET' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(400);
          expect(json.success).toBeFalse();
          expect(json.error).toBeString();
          expect(Object.keys(json)).toHaveLength(2);
        }
      });
    });

    it('does not filter returned nodes by username', async () => {
      expect.hasAssertions();

      mockedSearchNodes.mockReturnValue(
        Promise.resolve([{ owner: 'User1' }, { owner: 'User2' }] as PublicNode[])
      );

      await testApiHandler({
        handler: api.v2.usersUsernameFilesystemSearch,
        params: { username: 'User1' },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'GET' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(200);
          expect(json.success).toBeTrue();
          expect(json.nodes).toStrictEqual([{ owner: 'User1' }, { owner: 'User2' }]);
          expect(Object.keys(json)).toHaveLength(2);
        }
      });
    });
  });

  describe('/:node_id1/:node_id2/.../:node_idN [GET]', () => {
    it('accepts GET requests', async () => {
      expect.hasAssertions();

      await testApiHandler({
        handler: api.v2.usersUsernameFilesystemNodeId,
        params: { username: 'User1', node_ids: ['id'] },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'GET' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(200);
          expect(json.success).toBeTrue();
          expect(json.nodes).toBeArray();
          expect(Object.keys(json)).toHaveLength(2);
        }
      });
    });
  });

  describe('/:node_id [PUT]', () => {
    it('accepts PUT requests', async () => {
      expect.hasAssertions();

      await testApiHandler({
        handler: api.v2.usersUsernameFilesystemNodeId,
        params: { username: 'User1', node_ids: ['id'] },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'PUT' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(200);
          expect(json.success).toBeTrue();
          expect(Object.keys(json)).toHaveLength(1);
        }
      });
    });
  });

  describe('/:node_id1/:node_id2/.../:node_idN [DELETE]', () => {
    it('accepts DELETE requests', async () => {
      expect.hasAssertions();

      await testApiHandler({
        handler: api.v2.usersUsernameFilesystemNodeId,
        params: { username: 'User1', node_ids: ['id'] },
        test: async ({ fetch }) => {
          const [status, json] = await fetch({ method: 'DELETE' }).then(
            async (r) => [r.status, await r.json()] as [status: number, json: any]
          );

          expect(status).toBe(200);
          expect(json.success).toBeTrue();
          expect(Object.keys(json)).toHaveLength(1);
        }
      });
    });
  });
});
