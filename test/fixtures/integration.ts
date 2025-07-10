import assert from 'node:assert';

import createDebugLogger from 'debug';
import { ObjectId } from 'mongodb';

import { name as packageName } from 'rootverse:package.json';

import { toPublicUser } from '@nhscc/backend-drive/db.ts';
import { getEnv } from '@nhscc/backend-drive/env.ts';

import { dummyAppData } from 'testverse:db.ts';

import type { Promisable } from 'type-fest';

import type {
  NewFileNode,
  NewMetaNode,
  NewUser,
  NodeLock,
  PatchMetaNode,
  PatchUser,
  PublicFileNode,
  PublicMetaNode,
  PublicNode,
  PublicUser
} from '@nhscc/backend-drive/db.ts';

import type { NextApiHandlerMixin } from 'testverse:fixtures/index.ts';

// TODO: XXX: turn a lot of this into some kind of package; needs to be generic
// TODO: XXX: enough to handle various use cases though :) Maybe
// TODO: XXX: @-xun/fable for the generic version, @-xun/fable-next. Initial
// TODO: XXX: version of @-xun/fable would just be the next API version.

// TODO: XXX: add an `id` param that allows getResultAt using that `id` (along
// TODO: XXX: with index)

// TODO: XXX: document functionality: RUN_ONLY='#, ##,###,...'
// TODO: XXX: "fail fast" should be optional

const debug = createDebugLogger(`${packageName}:integration-fixtures`);

/**
 * A single test result stored in `memory`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TestResult<T = any> = {
  status: number;
  json: T | undefined;
};

/**
 * Stored results from past fixtures runs made available for future fixtures
 * runs via `memory`.
 */
export type TestResultset = TestResult[] & {
  /**
   * A property containing a mapping between optional test ids and their
   * results.
   */
  idMap: Record<string, TestResult>;
  /**
   * A property containing the most previous resultset.
   */
  latest: TestResult;
  /**
   * Get the HTTP response status and json result from previously run tests by
   * index. You can pass a negative index to begin counting backwards from the
   * current test. Tests are zero-indexed, i.e. use `getResultAt(0)` to refer to
   * the very first resultset. `getResultAt(1)` will return the second
   * resultset. `getResultAt(-1)` will return the immediately previous resultset
   * (same as what the `latest` property returns).
   *
   * @param index Specify a previous test result index starting at 1 (not zero!)
   */
  getResultAt<T = unknown>(this: void, index: number): TestResult<T>;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  getResultAt<T = unknown>(this: void, index: number, property: string): T;
  getResultAt<T = unknown>(this: void, index: string): TestResult<T>;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  getResultAt<T = unknown>(this: void, index: string, property: string): T;
};

/**
 * Represents a test that executes an HTTP request and evaluate the response
 * for correctness.
 */
export type TestFixture = {
  /**
   * An optional id that can be used to reference the result from this fixture
   * directly as opposed to by index.
   *
   * @example getResultAt('my-id') === getResultAt(22)
   */
  id?: string;
  /**
   * If `invisible === true`, the test is not counted when generating positional
   * fixtures.
   *
   * @default false
   */
  invisible?: boolean;
  /**
   * The test index X (as in "#X") that is reported to the user when a test
   * fails.
   */
  displayIndex: number;
  /**
   * A very brief couple of words added to the end of the test title.
   */
  subject?: string;
  /**
   * The handler under test.
   */
  pagesHandler?: NextApiHandlerMixin;
  /**
   * The method of the mock request.
   */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /**
   * Represents mock "processed" dynamic route components and query params.
   */
  params?:
    | Record<string, string | string[]>
    | ((
        previousResults: TestResultset
      ) => Promisable<Record<string, string | string[]>>);
  /**
   * The body of the mock request. Automatically stringified.
   */
  body?:
    | Record<string, unknown>
    | ((previousResults: TestResultset) => Promisable<Record<string, unknown>>);
  /**
   * The expected shape of the HTTP response.
   */
  response?: {
    /**
     * The expected response status. If status !== 200, we expect `json.success`
     * to be `false`. Otherwise, we expect it to be `true`. All status-related
     * checks are skipped if a callback is provided that returns `undefined`.
     */
    status?:
      | number
      | ((
          status: number,
          previousResults: TestResultset
        ) => Promisable<number | undefined>);
    /**
     * The expected JSON response body. No need to test for `success` as that is
     * handled automatically (unless a status callback was used and it returned
     * `undefined`). Jest async matchers are also supported. All json-related
     * checks are skipped if a callback is provided that returns `undefined` or
     * `json` itself is `undefined`.
     */
    json?:
      | Record<string, unknown>
      | jest.AsymmetricMatcher
      | ((
          json: Record<string, unknown> | undefined,
          previousResults: TestResultset
        ) => Promisable<Record<string, unknown> | jest.AsymmetricMatcher | undefined>);
  };
};

export function getFixtures(
  api: typeof import('testverse:fixtures/index.ts').api
): TestFixture[] {
  const runOnly = process.env.RUN_ONLY?.split(',')
    .flatMap((n) => {
      const range = n
        .split('-')
        .map((m) => Number.parseInt(m))
        .filter((m) => !Number.isNaN(m));

      const min = Math.min(...range);
      const max = Math.max(...range);

      debug('min: %O', min);
      debug('max: %O', max);
      debug('range: %O', range);

      if (!(0 < min && min <= max && max < Infinity)) {
        throw new Error(`invalid RUN_ONLY range "${min}-${max}"`);
      } else {
        const finalRange = Array.from({ length: max - min + 1 }).map(
          (_, ndx) => min + ndx
        );
        debug('final range: %O', finalRange);
        return finalRange;
      }
    })
    .sort((a, b) => a - b);

  // * Note: user passwords are their usernames
  const fixtures: Omit<TestFixture, 'displayIndex'>[] = [
    {
      id: 'user-hillary',
      subject: 'valid create user #1',
      pagesHandler: api.v1.users,
      method: 'POST',
      body: {
        username: 'the-hill',
        email: 'h@hillaryclinton.com',
        key: '3ffd270e595ef1e485437d90e788d2965acb602a7412f50760140304f4b1f039998ee471de8ddb7c3115f3dee86ba487a213be9604db0ef23ccb99414e47d452',
        salt: 'd63a897a76ece8b9a503913db68c95af'
      } as NewUser,
      response: {
        status: 200,
        json: {
          user: {
            user_id: expect.any(String),
            username: 'the-hill',
            email: 'h@hillaryclinton.com',
            salt: 'd63a897a76ece8b9a503913db68c95af'
          } as PublicUser
        }
      }
    },
    {
      subject: 'fetch created user',
      pagesHandler: api.v1.usersUsername,
      params: { username: 'the-hill' },
      method: 'GET',
      response: {
        status: 200,
        json: (_json, { getResultAt }) => {
          return { user: getResultAt('user-hillary', 'user') };
        }
      }
    },
    {
      subject: 'get all users in LIFO order',
      pagesHandler: api.v1.users,
      method: 'GET',
      response: {
        status: 200,
        json: (_json, { getResultAt }) => {
          return {
            users: [
              getResultAt('user-hillary', 'user'),
              ...dummyAppData.users
                .slice()
                .reverse()
                .map((u) => toPublicUser(u))
            ]
          };
        }
      }
    },
    {
      subject: 'update user',
      pagesHandler: api.v1.usersUsername,
      method: 'PUT',
      params: { username: 'the-hill' },
      body: {
        salt: '2a9e8128c6641c2fe7642abd14b09e14',
        key: '8df1042284e5cc64ff722e473bba9deebb7ef06927c96a004faa1f4dc60f3b1c01fc42612f495cd91ac7041060860b4626e6a5af04b6e31104e6f896b4e3d153'
      } as PatchUser,
      response: { status: 200 }
    },
    {
      id: 'updated-user-hillary',
      subject: 'get updated user #1',
      pagesHandler: api.v1.usersUsername,
      params: { username: 'the-hill' },
      method: 'GET',
      response: { status: 200 }
    },
    {
      subject: 'auth user',
      pagesHandler: api.v1.usersUsernameAuth,
      method: 'POST',
      params: { username: 'the-hill' },
      body: {
        key: '8df1042284e5cc64ff722e473bba9deebb7ef06927c96a004faa1f4dc60f3b1c01fc42612f495cd91ac7041060860b4626e6a5af04b6e31104e6f896b4e3d153'
      },
      response: { status: 200 }
    },
    {
      subject: 'auth user (case-insensitively)',
      pagesHandler: api.v1.usersUsernameAuth,
      method: 'POST',
      params: { username: 'the-hill' },
      body: {
        key: '8DF1042284E5CC64FF722E473BBA9DEEBB7EF06927C96A004FAA1F4DC60F3B1C01FC42612F495CD91AC7041060860B4626E6A5AF04B6E31104E6F896B4E3D153'
      },
      response: { status: 200 }
    },
    {
      subject: 'bad auth',
      pagesHandler: api.v1.usersUsernameAuth,
      method: 'POST',
      params: { username: 'the-hill' },
      body: { key: 'x' },
      response: { status: 403 }
    },
    {
      subject: 'attempt to delete non-existent user',
      pagesHandler: api.v1.usersUsername,
      method: 'DELETE',
      params: { username: 'does-not-exist' },
      response: { status: 404 }
    },
    {
      subject: 'delete user',
      pagesHandler: api.v1.usersUsername,
      method: 'DELETE',
      params: { username: dummyAppData.users[0]!.username },
      response: { status: 200 }
    },
    {
      subject: 'get all users in LIFO order',
      pagesHandler: api.v1.users,
      method: 'GET',
      response: {
        status: 200,
        json: (_json, { getResultAt }) => {
          return {
            users: [
              getResultAt<PublicUser>('updated-user-hillary', 'user'),
              ...dummyAppData.users
                .slice(1)
                .reverse()
                .map((u) => toPublicUser(u))
            ]
          };
        }
      }
    },
    {
      subject: 'attempt to fetch deleted user',
      pagesHandler: api.v1.usersUsername,
      params: { username: dummyAppData.users[0]!.username },
      method: 'GET',
      response: { status: 404 }
    },
    {
      id: 'user-obama',
      subject: 'valid create user #2',
      pagesHandler: api.v2.users,
      method: 'POST',
      body: {
        username: 'baracko',
        email: 'o@barackobama.com',
        key: 'ac4ab7f9f19fb198a0e1ec3c3970d8b8a2a47e19127a988c02299807210927dfb915d66af69f4a8b53c7610b31604eed6ebe0273a9dc73831892a86250082ebf',
        salt: 'e1a3593dbf0ff964292398251f3b47ad'
      } as NewUser,
      response: {
        status: 200,
        json: {
          user: {
            user_id: expect.any(String),
            username: 'baracko',
            email: 'o@barackobama.com',
            salt: 'e1a3593dbf0ff964292398251f3b47ad'
          } as PublicUser
        }
      }
    },
    {
      subject: 'invalid create user (duplicate username)',
      pagesHandler: api.v1.users,
      method: 'POST',
      body: {
        username: 'baracko',
        email: 'xyz@abc.def',
        key: 'ac4ab7f9f19fb198a0e1ec3c3970d8b8a2a47e19127a988c02299807210927dfb915d66af69f4a8b53c7610b31604eed6ebe0273a9dc73831892a86250082ebf',
        salt: 'e1a3593dbf0ff964292398251f3b47ad'
      } as NewUser,
      response: { status: 400 }
    },
    {
      subject: 'invalid create user (duplicate email)',
      pagesHandler: api.v2.users,
      method: 'POST',
      body: {
        username: 'xyz-abc',
        email: 'o@barackobama.com',
        key: 'ac4ab7f9f19fb198a0e1ec3c3970d8b8a2a47e19127a988c02299807210927dfb915d66af69f4a8b53c7610b31604eed6ebe0273a9dc73831892a86250082ebf',
        salt: 'e1a3593dbf0ff964292398251f3b47ad'
      } as NewUser,
      response: { status: 400 }
    },
    {
      subject: 'fetch created user',
      pagesHandler: api.v2.usersUsername,
      params: { username: 'baracko' },
      method: 'GET',
      response: {
        status: 200,
        json: (_json, { getResultAt }) => {
          return { user: getResultAt('user-obama', 'user') };
        }
      }
    },
    {
      subject: 'get all users in LIFO order',
      pagesHandler: api.v2.users,
      method: 'GET',
      response: {
        status: 200,
        json: (_json, { getResultAt }) => {
          return {
            users: [
              getResultAt('user-obama', 'user'),
              getResultAt<PublicUser>('updated-user-hillary', 'user'),
              ...dummyAppData.users
                .slice(1)
                .reverse()
                .map((u) => toPublicUser(u))
            ]
          };
        }
      }
    },
    {
      subject: 'update user',
      pagesHandler: api.v2.usersUsername,
      method: 'PUT',
      params: { username: 'baracko' },
      body: {
        salt: '2a9e8128c6641c2fe7642abd14b09e14',
        key: 'ac4ab7f9f19fb198a0e1ec3c3970d8b8a2a47e19127a988c02299807210927dfb915d66af69f4a8b53c7610b31604eed6ebe0273a9dc73831892a86250082ebf'
      } as PatchUser,
      response: { status: 200 }
    },
    {
      id: 'updated-user-obama',
      subject: 'get updated user #1',
      pagesHandler: api.v2.usersUsername,
      params: { username: 'baracko' },
      method: 'GET',
      response: { status: 200 }
    },
    {
      subject: 'auth user',
      pagesHandler: api.v2.usersUsernameAuth,
      method: 'POST',
      params: { username: 'baracko' },
      body: {
        key: 'ac4ab7f9f19fb198a0e1ec3c3970d8b8a2a47e19127a988c02299807210927dfb915d66af69f4a8b53c7610b31604eed6ebe0273a9dc73831892a86250082ebf'
      },
      response: { status: 200 }
    },
    {
      subject: 'bad auth',
      pagesHandler: api.v2.usersUsernameAuth,
      method: 'POST',
      params: { username: 'baracko' },
      body: { key: 'x' },
      response: { status: 403 }
    },
    {
      subject: 'worse auth',
      pagesHandler: api.v2.usersUsernameAuth,
      method: 'POST',
      params: { username: 'baracko' },
      body: {},
      response: { status: 403 }
    },
    {
      subject: 'attempt to delete non-existent user',
      pagesHandler: api.v2.usersUsername,
      method: 'DELETE',
      params: { username: 'does-not-exist' },
      response: { status: 404 }
    },
    {
      subject: 'delete user',
      pagesHandler: api.v2.usersUsername,
      method: 'DELETE',
      params: { username: dummyAppData.users[1]!.username },
      response: { status: 200 }
    },
    {
      subject: 'get all users in LIFO order with quasi-pagination',
      pagesHandler: api.v2.users,
      method: 'GET',
      params: { after: '' },
      response: {
        status: 200,
        json: (_json, { getResultAt }) => {
          return {
            users: [
              getResultAt<PublicUser>('updated-user-obama', 'user'),
              getResultAt<PublicUser>('updated-user-hillary', 'user'),
              ...dummyAppData.users
                .slice(2)
                .reverse()
                .map((u) => toPublicUser(u))
            ]
          };
        }
      }
    },
    {
      subject: 'attempt to get all users in LIFO order using bad id',
      pagesHandler: api.v2.users,
      method: 'GET',
      params: { after: 'bad-id' },
      response: { status: 400 }
    },
    {
      subject: 'attempt to get all users in LIFO order using non-existent id',
      pagesHandler: api.v2.users,
      method: 'GET',
      params: { after: new ObjectId().toString() },
      response: { status: 404 }
    },
    {
      subject: 'attempt to fetch deleted user',
      pagesHandler: api.v2.usersUsername,
      params: { username: dummyAppData.users[1]!.username },
      method: 'GET',
      response: { status: 404 }
    },
    {
      subject: 'attempt to update deleted user',
      pagesHandler: api.v2.usersUsername,
      params: { username: dummyAppData.users[1]!.username },
      method: 'PUT',
      body: { email: 'some@new.email' },
      response: { status: 404 }
    },
    {
      subject: 'attempt to update using a bad email',
      pagesHandler: api.v2.usersUsername,
      params: { username: dummyAppData.users[2]!.username },
      method: 'PUT',
      body: { email: 'bad email address' },
      response: { status: 400 }
    },
    {
      subject: 'attempt to update using a too-long email',
      pagesHandler: api.v2.usersUsername,
      params: { username: dummyAppData.users[2]!.username },
      method: 'PUT',
      body: { email: 'x'.repeat(getEnv().MAX_USER_EMAIL_LENGTH) + '@aol.com' },
      response: { status: 400 }
    },
    {
      subject: 'attempt to update using a short non-hex salt',
      pagesHandler: api.v2.usersUsername,
      params: { username: dummyAppData.users[2]!.username },
      method: 'PUT',
      body: { salt: 'xyz' },
      response: { status: 400 }
    },
    {
      subject: 'attempt to update using a short non-hex key',
      pagesHandler: api.v2.usersUsername,
      params: { username: dummyAppData.users[2]!.username },
      method: 'PUT',
      body: { key: 'xyz' },
      response: { status: 400 }
    },
    {
      subject: 'no-op updates are okay',
      pagesHandler: api.v2.usersUsername,
      params: { username: dummyAppData.users[2]!.username },
      method: 'PUT',
      body: {},
      response: { status: 200 }
    },
    {
      subject: 'get all users in LIFO order using pagination',
      pagesHandler: api.v2.users,
      method: 'GET',
      params: ({ getResultAt }) => {
        return { after: getResultAt<string>('updated-user-hillary', 'user.user_id') };
      },
      response: {
        status: 200,
        json: {
          users: dummyAppData.users
            .slice(2)
            .reverse()
            .map((u) => toPublicUser(u))
        }
      }
    },
    {
      id: 'lifo-nodes',
      subject: `count ${dummyAppData.users[2]!.username}'s nodes`,
      pagesHandler: api.v1.filesystemUsernameSearch,
      method: 'GET',
      params: { username: dummyAppData.users[2]!.username },
      response: {
        status: 200,
        json: {
          nodes: expect.toBeArrayOfSize(
            [...dummyAppData['meta-nodes'], ...dummyAppData['file-nodes']].filter(
              (n) => n.owner === dummyAppData.users[2]!.username
            ).length
          )
        }
      }
    },
    {
      subject: `ensure LIFO nodes have had permissions of deleted users removed #1`,
      pagesHandler: api.v1.filesystemUsernameSearch,
      method: 'GET',
      params: {
        username: dummyAppData.users[2]!.username,
        regexMatch: JSON.stringify({
          [`permissions.dummyAppData.users[0].username`]: 'view|edit'
        })
      },
      response: { status: 200, json: { nodes: [] } }
    },
    {
      subject: `ensure LIFO nodes have had permissions of deleted users removed #2`,
      pagesHandler: api.v1.filesystemUsernameSearch,
      method: 'GET',
      params: {
        username: dummyAppData.users[2]!.username,
        regexMatch: JSON.stringify({
          [`permissions.dummyAppData.users[1].username`]: 'view|edit'
        })
      },
      response: { status: 200, json: { nodes: [] } }
    },

    {
      id: 'target-node',
      subject: 'search for target node by tag (case-insensitive)',
      pagesHandler: api.v1.filesystemUsernameSearch,
      method: 'GET',
      params: {
        username: dummyAppData.users[2]!.username,
        match: JSON.stringify({ tags: ['MaTeRiAlS'] })
      },
      response: {
        status: 200,
        json: (_json, { getResultAt }) => {
          return {
            nodes: [
              getResultAt<PublicNode[]>('lifo-nodes', 'nodes').find(
                (n) => n.type === 'file' && n.tags.includes('materials')
              )
            ]
          };
        }
      }
    },
    {
      subject: 'get target node',
      pagesHandler: api.v1.filesystemUsernameNodeId,
      method: 'GET',
      params: ({ getResultAt }) => {
        return {
          username: dummyAppData.users[2]!.username,
          node_ids: [getResultAt<PublicNode[]>('target-node', 'nodes')[0]!.node_id]
        };
      },
      response: {
        status: 200,
        json: (_json, { getResultAt }) => {
          return { nodes: [getResultAt<PublicNode[]>('target-node', 'nodes')[0]] };
        }
      }
    },
    {
      subject: 'update target node name and lock',
      pagesHandler: api.v1.filesystemUsernameNodeId,
      method: 'PUT',
      params: ({ getResultAt }) => {
        return {
          username: dummyAppData.users[2]!.username,
          node_ids: [getResultAt<PublicNode[]>('target-node', 'nodes')[0]!.node_id]
        };
      },
      body: {
        name: 'new-name',
        lock: {
          client: 'abc123',
          user: dummyAppData.users[2]!.username,
          createdAt: Date.now()
        } as NodeLock
      },
      response: { status: 200 }
    },
    {
      subject: 'update target node permissions (v2)',
      pagesHandler: api.v2.usersUsernameFilesystemNodeId,
      method: 'PUT',
      params: ({ getResultAt }) => {
        return {
          username: dummyAppData.users[2]!.username,
          node_ids: [getResultAt<PublicNode[]>('target-node', 'nodes')[0]!.node_id]
        };
      },
      body: { permissions: { 'the-hill': 'view' } },
      response: { status: 200 }
    },
    {
      subject: 'no-op updates are ok',
      pagesHandler: api.v1.filesystemUsernameNodeId,
      method: 'PUT',
      params: ({ getResultAt }) => {
        return {
          username: dummyAppData.users[2]!.username,
          node_ids: [getResultAt<PublicNode[]>('target-node', 'nodes')[0]!.node_id]
        };
      },
      body: {},
      response: { status: 200 }
    },
    {
      subject: 'get updated target node',
      pagesHandler: api.v1.filesystemUsernameNodeId,
      method: 'GET',
      params: ({ getResultAt }) => {
        return {
          username: dummyAppData.users[2]!.username,
          node_ids: [getResultAt<PublicNode[]>('target-node', 'nodes')[0]!.node_id]
        };
      },
      response: {
        status: 200,
        json: (json, { getResultAt }) => {
          const targetNode = getResultAt<PublicFileNode[]>('target-node', 'nodes')[0]!;

          expect((json?.nodes as PublicFileNode[])[0]!.modifiedAt).toBeGreaterThan(
            targetNode.modifiedAt
          );

          return {
            nodes: [
              {
                ...targetNode,
                modifiedAt: expect.any(Number),
                name: 'new-name',
                lock: {
                  client: 'abc123',
                  user: dummyAppData.users[2]!.username,
                  createdAt: expect.any(Number)
                },
                permissions: { 'the-hill': 'view' }
              }
            ]
          };
        }
      }
    },
    {
      subject: 'delete updated target node',
      pagesHandler: api.v1.filesystemUsernameNodeId,
      method: 'DELETE',
      params: ({ getResultAt }) => {
        return {
          username: dummyAppData.users[2]!.username,
          node_ids: [getResultAt<PublicNode[]>('target-node', 'nodes')[0]!.node_id]
        };
      },
      response: { status: 200 }
    },
    {
      subject: 'attempt to search for deleted updated target node by tag',
      pagesHandler: api.v1.filesystemUsernameSearch,
      method: 'GET',
      params: {
        username: dummyAppData.users[2]!.username,
        match: JSON.stringify({ tags: ['materials'] })
      },
      response: { status: 200, json: { nodes: [] } }
    },
    {
      subject: 'ensure LIFO meta nodes have had deleted nodes removed from contents',
      pagesHandler: api.v1.filesystemUsernameNodeId,
      method: 'GET',
      params: {
        username: dummyAppData.users[2]!.username,
        node_ids: dummyAppData['meta-nodes'].slice(1).map((n) => n._id.toString())
      },
      response: {
        status: 200,
        json: (json) => {
          expect(json?.nodes).toHaveLength(2);
          expect(
            (json?.nodes as PublicMetaNode[]).every((n) => n.contents.length === 0)
          ).toBeTrue();
          return undefined;
        }
      }
    },
    {
      subject: 'search fails when attempting to match by permissions twice #1',
      pagesHandler: api.v1.filesystemUsernameSearch,
      method: 'GET',
      params: {
        username: dummyAppData.users[2]!.username,
        regexMatch: JSON.stringify({
          [`permissions.dummyAppData.users[0].username`]: 'view|edit',
          [`permissions.dummyAppData.users[1].username`]: 'view|edit'
        })
      },
      response: { status: 400 }
    },
    {
      subject: 'search fails when attempting to match by permissions twice #2',
      pagesHandler: api.v1.filesystemUsernameSearch,
      method: 'GET',
      params: {
        username: dummyAppData.users[2]!.username,
        match: JSON.stringify({
          [`permissions.dummyAppData.users[0].username`]: 'view|edit'
        }),
        regexMatch: JSON.stringify({
          [`permissions.dummyAppData.users[1].username`]: 'view|edit'
        })
      },
      response: { status: 400 }
    },
    {
      subject: "attempt to get non-existent user's nodes",
      pagesHandler: api.v1.filesystemUsernameSearch,
      method: 'GET',
      params: { username: dummyAppData.users[1]!.username },
      response: { status: 404 }
    },
    {
      subject: "get all the-hill's nodes in LIFO order",
      pagesHandler: api.v1.filesystemUsernameSearch,
      method: 'GET',
      params: { username: 'the-hill' },
      response: { status: 200, json: { nodes: [] } }
    },
    {
      id: 'node-1',
      subject: 'create file node #1 (v1) owned by baracko (the-hill has view perms)',
      pagesHandler: api.v1.filesystemUsername,
      method: 'POST',
      params: { username: 'baracko' },
      body: {
        type: 'file',
        name: 'File Node #1',
        text: "The latest breaking news, reporting and live coverage of the day's important stories; hosted by trusted NBC News journalists, these dynamic hours offer discussions with newsmakers, journalists and politicians.",
        tags: ['live', 'tv', 'reporter', 'nbc', 'coverage'],
        lock: {
          client: 'abc123',
          user: dummyAppData.users[2]!.username,
          createdAt: Date.now()
        }
      } as NewFileNode,
      response: {
        status: 200,
        json: {
          node: {
            node_id: expect.any(String),
            type: 'file',
            owner: 'baracko',
            createdAt: expect.any(Number),
            modifiedAt: expect.any(Number),
            name: 'File Node #1',
            size: 209,
            text: "The latest breaking news, reporting and live coverage of the day's important stories; hosted by trusted NBC News journalists, these dynamic hours offer discussions with newsmakers, journalists and politicians.",
            tags: ['live', 'tv', 'reporter', 'nbc', 'coverage'],
            lock: {
              client: 'abc123',
              user: dummyAppData.users[2]!.username,
              createdAt: Date.now()
            },
            permissions: {}
          } as PublicFileNode
        }
      }
    },
    {
      id: 'node-2',
      subject: 'create file node #2 (v2) owned by baracko (the-hill has edit perms)',
      pagesHandler: api.v2.usersUsernameFilesystem,
      method: 'POST',
      params: { username: 'baracko' },
      body: {
        type: 'file',
        name: 'File Node #2',
        text: "The latest breaking news, reporting and live coverage of the day's important stories; hosted by trusted NBC News journalists, these dynamic hours offer discussions with newsmakers, journalists and politicians.",
        tags: ['live', 'tv', 'reporter', 'nbc', 'coverage'],
        lock: null,
        permissions: {
          'the-hill': 'edit',
          public: 'view'
        }
      } as NewFileNode,
      response: {
        status: 200,
        json: {
          node: {
            node_id: expect.any(String),
            type: 'file',
            owner: 'baracko',
            createdAt: expect.any(Number),
            modifiedAt: expect.any(Number),
            name: 'File Node #2',
            size: 209,
            text: "The latest breaking news, reporting and live coverage of the day's important stories; hosted by trusted NBC News journalists, these dynamic hours offer discussions with newsmakers, journalists and politicians.",
            tags: ['live', 'tv', 'reporter', 'nbc', 'coverage'],
            lock: null,
            permissions: {
              'the-hill': 'edit',
              public: 'view'
            }
          } as PublicFileNode
        }
      }
    },
    {
      subject: 'add permissions to file node #1 for the-hill as baracko',
      pagesHandler: api.v2.usersUsernameFilesystemNodeId,
      method: 'PUT',
      params: ({ getResultAt }) => {
        return {
          username: 'baracko',
          node_ids: [getResultAt<string>('node-1', 'node.node_id')]
        };
      },
      body: { permissions: { 'the-hill': 'view' } },
      response: { status: 200 }
    },
    {
      subject: 'attempt to edit file node #1 as the-hill',
      pagesHandler: api.v1.filesystemUsernameNodeId,
      method: 'PUT',
      params: ({ getResultAt }) => {
        return {
          username: 'the-hill',
          node_ids: [getResultAt<string>('node-1', 'node.node_id')]
        };
      },
      body: { permissions: { 'the-hill': 'edit' } },
      response: { status: 404 }
    },
    {
      subject: 'edit file node #2 as the-hill',
      pagesHandler: api.v2.usersUsernameFilesystemNodeId,
      method: 'PUT',
      params: ({ getResultAt }) => {
        return {
          username: 'the-hill',
          node_ids: [getResultAt<string>('node-2', 'node.node_id')]
        };
      },
      body: { permissions: { 'the-hill': 'edit' }, name: 'NODE NUMBER 2!' },
      response: { status: 200 }
    },
    {
      subject:
        'create symlink node owned by the-hill with unowned contents (bad on frontend)',
      pagesHandler: api.v1.filesystemUsername,
      method: 'POST',
      params: { username: 'the-hill' },
      body: {
        type: 'symlink',
        name: 'broken symlink',
        contents: [dummyAppData['meta-nodes'][0]!._id.toString()]
      } as NewMetaNode,
      response: {
        status: 200,
        json: {
          node: {
            owner: 'the-hill',
            createdAt: expect.any(Number),
            type: 'symlink',
            name: 'broken symlink',
            node_id: expect.any(String),
            permissions: {},
            contents: [dummyAppData['meta-nodes'][0]!._id.toString()]
          }
        }
      }
    },
    {
      subject:
        'attempt to create symlink node owned by the-hill with illegal contents (too many)',
      pagesHandler: api.v2.usersUsernameFilesystem,
      method: 'POST',
      params: { username: 'the-hill' },
      body: ({ getResultAt }) => {
        return {
          type: 'symlink',
          name: 'bad symlink',
          permissions: {},
          contents: [
            getResultAt<string>('node-1', 'node.node_id'),
            getResultAt<string>('node-2', 'node.node_id')
          ]
        } as NewMetaNode;
      },
      response: { status: 400 }
    },
    {
      id: 'hill-symlink',
      subject: 'create empty symlink node owned by the-hill',
      pagesHandler: api.v1.filesystemUsername,
      method: 'POST',
      params: { username: 'the-hill' },
      body: {
        type: 'symlink',
        name: 'empty symlink',
        contents: []
      } as NewMetaNode,
      response: {
        status: 200,
        json: {
          node: {
            owner: 'the-hill',
            createdAt: expect.any(Number),
            type: 'symlink',
            name: 'empty symlink',
            permissions: {},
            node_id: expect.any(String),
            contents: []
          } as PublicMetaNode
        }
      }
    },
    {
      subject: "attempt to update the-hill's symlink to point to file nodes #1 and #2",
      pagesHandler: api.v2.usersUsernameFilesystemNodeId,
      method: 'PUT',
      params: ({ getResultAt }) => {
        return {
          username: 'the-hill',
          node_ids: [getResultAt('hill-symlink', 'node.node_id')]
        };
      },
      body: ({ getResultAt }) => {
        return {
          contents: [
            getResultAt<string>('node-1', 'node.node_id'),
            getResultAt<string>('node-2', 'node.node_id')
          ]
        } as PatchMetaNode;
      },
      response: { status: 400 }
    },
    {
      subject: "update the-hill's symlink to point to file node #1",
      pagesHandler: api.v1.filesystemUsernameNodeId,
      method: 'PUT',
      params: ({ getResultAt }) => {
        return {
          username: 'the-hill',
          node_ids: [getResultAt('hill-symlink', 'node.node_id')]
        };
      },
      body: ({ getResultAt }) => {
        return {
          contents: [getResultAt<string>('node-1', 'node.node_id')]
        } as PatchMetaNode;
      },
      response: { status: 200 }
    },
    {
      id: 'hill-dir',
      subject: 'create empty dir node owned by the-hill',
      pagesHandler: api.v2.usersUsernameFilesystem,
      method: 'POST',
      params: { username: 'the-hill' },
      body: {
        type: 'directory',
        name: 'empty directory',
        permissions: {},
        contents: []
      } as NewMetaNode,
      response: {
        status: 200,
        json: {
          node: {
            owner: 'the-hill',
            createdAt: expect.any(Number),
            type: 'directory',
            name: 'empty directory',
            permissions: {},
            node_id: expect.any(String),
            contents: []
          } as PublicMetaNode
        }
      }
    },
    {
      subject: 'update dir node name, permissions, and make dir node self-referential',
      pagesHandler: api.v1.filesystemUsernameNodeId,
      method: 'PUT',
      params: ({ getResultAt }) => {
        return {
          username: 'the-hill',
          node_ids: [getResultAt('hill-dir', 'node.node_id')]
        };
      },
      body: ({ getResultAt }) => {
        return {
          name: 'EMPTY dir node',
          contents: [getResultAt('hill-dir', 'node.node_id')],
          permissions: {}
        } as PatchMetaNode;
      },
      response: { status: 200 }
    },
    {
      subject: 'get dir node as the-hill',
      pagesHandler: api.v2.usersUsernameFilesystemNodeId,
      method: 'GET',
      params: ({ getResultAt }) => {
        return {
          username: 'the-hill',
          node_ids: [getResultAt('hill-dir', 'node.node_id')]
        };
      },
      response: {
        status: 200,
        json: (_, { getResultAt }) => {
          return {
            nodes: [
              {
                ...getResultAt<PublicMetaNode>('hill-dir', 'node'),
                name: 'EMPTY dir node',
                contents: [getResultAt('hill-dir', 'node.node_id')]
              }
            ]
          };
        }
      }
    },
    {
      subject: 'update dir node to contain file nodes #1 and #2',
      pagesHandler: api.v2.usersUsernameFilesystemNodeId,
      method: 'PUT',
      params: ({ getResultAt }) => {
        return {
          username: 'the-hill',
          node_ids: [getResultAt('hill-dir', 'node.node_id')]
        };
      },
      body: ({ getResultAt }) => {
        return {
          contents: [
            getResultAt<string>('node-1', 'node.node_id'),
            getResultAt<string>('node-2', 'node.node_id')
          ]
        } as PatchMetaNode;
      },
      response: { status: 200 }
    },
    {
      subject: 'attempt to update dir node to contain non-existent node_ids',
      pagesHandler: api.v1.filesystemUsernameNodeId,
      method: 'PUT',
      params: ({ getResultAt }) => {
        return {
          username: 'the-hill',
          node_ids: [getResultAt('hill-dir', 'node.node_id')]
        };
      },
      body: { contents: [new ObjectId().toString()] } as PatchMetaNode,
      response: { status: 404 }
    },
    {
      subject: 'get dir node as the-hill',
      pagesHandler: api.v2.usersUsernameFilesystemNodeId,
      method: 'GET',
      params: ({ getResultAt }) => {
        return {
          username: 'the-hill',
          node_ids: [getResultAt('hill-dir', 'node.node_id')]
        };
      },
      response: {
        status: 200,
        json: (_, { getResultAt }) => {
          return {
            nodes: [
              {
                ...getResultAt<PublicMetaNode>('hill-dir', 'node'),
                name: 'EMPTY dir node',
                contents: [
                  getResultAt<string>('node-1', 'node.node_id'),
                  getResultAt<string>('node-2', 'node.node_id')
                ]
              }
            ]
          };
        }
      }
    },
    {
      subject: 'attempt to delete file nodes #1 and #2 as the-hill (fails silently)',
      pagesHandler: api.v2.usersUsernameFilesystemNodeId,
      method: 'DELETE',
      params: ({ getResultAt }) => {
        return {
          username: 'the-hill',
          node_ids: [
            getResultAt('node-1', 'node.node_id'),
            getResultAt('node-2', 'node.node_id')
          ]
        };
      },
      response: { status: 200 }
    },
    {
      subject: 'search for file nodes #1 and #2 as the-hill (using V2 api)',
      pagesHandler: api.v2.usersUsernameFilesystemSearch,
      method: 'GET',
      params: {
        username: 'the-hill',
        match: JSON.stringify({ tags: ['LIVE', 'Tv', 'Reporter'] })
      },
      response: {
        status: 200,
        json: (_json, { getResultAt }) => {
          return {
            nodes: [
              {
                ...getResultAt<PublicFileNode>('node-2', 'node'),
                modifiedAt: expect.any(Number),
                name: 'NODE NUMBER 2!',
                permissions: { 'the-hill': 'edit' }
              },
              {
                ...getResultAt<PublicFileNode>('node-1', 'node'),
                modifiedAt: expect.any(Number),
                permissions: { 'the-hill': 'view' }
              }
            ]
          };
        }
      }
    },
    {
      subject:
        'search for file nodes #1 and #2 as the-hill using pagination (using V2 api)',
      pagesHandler: api.v2.usersUsernameFilesystemSearch,
      method: 'GET',
      params: ({ getResultAt }) => {
        return {
          username: 'the-hill',
          after: getResultAt('node-2', 'node.node_id'),
          match: JSON.stringify({ tags: ['LIVE', 'Tv', 'Reporter'] })
        };
      },
      response: {
        status: 200,
        json: (_json, { getResultAt }) => {
          return {
            nodes: [
              {
                ...getResultAt<PublicFileNode>('node-1', 'node'),
                modifiedAt: expect.any(Number),
                permissions: { 'the-hill': 'view' }
              }
            ]
          };
        }
      }
    },
    {
      subject: 'V1 search does not return shared nodes',
      pagesHandler: api.v1.filesystemUsernameSearch,
      method: 'GET',
      params: {
        username: 'the-hill',
        match: JSON.stringify({ name: 'node number 2!' })
      },
      response: {
        status: 200,
        json: { nodes: [] }
      }
    },
    {
      subject: 'V2 search returns shared nodes matched case-insensitively (name)',
      pagesHandler: api.v2.usersUsernameFilesystemSearch,
      method: 'GET',
      params: {
        username: 'the-hill',
        match: JSON.stringify({ name: 'node number 2!' })
      },
      response: {
        status: 200,
        json: (_json, { getResultAt }) => {
          return {
            nodes: [
              {
                ...getResultAt<PublicFileNode>('node-2', 'node'),
                modifiedAt: expect.any(Number),
                name: 'NODE NUMBER 2!',
                permissions: { 'the-hill': 'edit' }
              }
            ]
          };
        }
      }
    },
    {
      subject: 'get file nodes #1 and #2 as baracko',
      pagesHandler: api.v2.usersUsernameFilesystemNodeId,
      method: 'GET',
      params: ({ getResultAt }) => {
        return {
          username: 'baracko',
          node_ids: [
            getResultAt('node-1', 'node.node_id'),
            getResultAt('node-2', 'node.node_id')
          ]
        };
      },
      response: {
        status: 200,
        json: (_json, { getResultAt }) => {
          return {
            nodes: [
              {
                ...getResultAt<PublicFileNode>('node-2', 'node'),
                modifiedAt: expect.any(Number),
                name: 'NODE NUMBER 2!',
                permissions: { 'the-hill': 'edit' }
              },
              {
                ...getResultAt<PublicFileNode>('node-1', 'node'),
                modifiedAt: expect.any(Number),
                permissions: { 'the-hill': 'view' }
              }
            ]
          };
        }
      }
    },
    {
      subject: 'get file nodes #1 and #2 as the-hill',
      pagesHandler: api.v2.usersUsernameFilesystemNodeId,
      method: 'GET',
      params: ({ getResultAt }) => {
        return {
          username: 'the-hill',
          node_ids: [
            getResultAt('node-1', 'node.node_id'),
            getResultAt('node-2', 'node.node_id')
          ]
        };
      },
      response: {
        status: 200,
        json: (_json, { getResultAt }) => {
          return {
            nodes: [
              {
                ...getResultAt<PublicFileNode>('node-2', 'node'),
                modifiedAt: expect.any(Number),
                name: 'NODE NUMBER 2!',
                permissions: { 'the-hill': 'edit' }
              },
              {
                ...getResultAt<PublicFileNode>('node-1', 'node'),
                modifiedAt: expect.any(Number),
                permissions: { 'the-hill': 'view' }
              }
            ]
          };
        }
      }
    },
    {
      subject: `attempt to get file nodes #1 and #2 as ${dummyAppData.users[2]!.username}`,
      pagesHandler: api.v2.usersUsernameFilesystemNodeId,
      method: 'GET',
      params: ({ getResultAt }) => {
        return {
          username: dummyAppData.users[2]!.username,
          node_ids: [
            getResultAt('node-1', 'node.node_id'),
            getResultAt('node-2', 'node.node_id')
          ]
        };
      },
      response: { status: 404 }
    },
    {
      subject: 'delete file node #1 as baracko',
      pagesHandler: api.v2.usersUsernameFilesystemNodeId,
      method: 'DELETE',
      params: ({ getResultAt }) => {
        return {
          username: 'the-hill',
          node_ids: [getResultAt('node-1', 'node.node_id')]
        };
      },
      response: { status: 200 }
    }
  ];

  // TODO: XXX: ability to specify "depends" via index or name/id

  const filteredFixtures = fixtures.filter<TestFixture>(
    (test, ndx): test is TestFixture => {
      const displayIndex = ndx + 1;
      if (runOnly && !runOnly.includes(displayIndex)) return false;
      (test as TestFixture).displayIndex = !runOnly
        ? displayIndex
        : (runOnly.shift() ?? assert.fail('ran out of RUN_ONLY indices'));
      return true;
    }
  );

  // TODO: XXX: add ability to capture/suppress output via fixture option (even better: selectively use mock plugins like withMockEnv and withMockOutput via config options)

  // TODO: XXX: with @-xun/fable, have an "every X" type construct (the below is "every reqPerContrived")
  // TODO: XXX: also allow middleware
  // TODO: XXX: also custom props for fixtures

  const reqPerContrived = getEnv().REQUESTS_PER_CONTRIVED_ERROR;

  for (let index = 0; index < filteredFixtures.length; index += reqPerContrived) {
    const invisibleCount = filteredFixtures
      .slice(Math.max(0, index - reqPerContrived), index)
      .filter((f) => f.invisible).length;

    // ? Ensure counts remain aligned by skipping tests that don't increase
    // ? internal contrived counter
    index += invisibleCount;

    filteredFixtures.splice(index, 0, {
      displayIndex: -1,
      subject: 'handle contrived',
      pagesHandler: api.v1.users,
      method: 'POST',
      body: {},
      response: {
        status: 555,
        json: { error: expect.stringContaining('contrived') }
      }
    });
  }

  return filteredFixtures;
}
