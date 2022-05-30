/* eslint-disable no-await-in-loop */
import { ObjectId } from 'mongodb';
import { useMockDateNow } from 'multiverse/mongo-common';
import { getDb } from 'multiverse/mongo-schema';
import { setupMemoryServerOverride } from 'multiverse/mongo-test';
import { dummyAppData } from 'testverse/db';
import { withMockedEnv } from 'testverse/setup';
import { toPublicNode, toPublicUser } from 'universe/backend/db';
import { getEnv } from 'universe/backend/env';
import { ErrorMessage } from 'universe/backend/error';
import { toss } from 'toss-expression';
import { TrialError } from 'named-app-errors';

import * as Backend from 'universe/backend';

import type {
  PublicUser,
  InternalNode,
  Username,
  NewNode,
  NewUser,
  NodeLock,
  PatchNode,
  PatchUser,
  NewMetaNode,
  NewFileNode,
  PublicMetaNode,
  PublicFileNode,
  InternalMetaNode,
  InternalFileNode
} from 'universe/backend/db';

setupMemoryServerOverride();
useMockDateNow();

describe('::getAllUsers', () => {
  it('does not crash when database is empty', async () => {
    expect.hasAssertions();

    await expect(Backend.getAllUsers({ after: null })).resolves.not.toStrictEqual([]);
    await (await getDb({ name: 'hscc-api-drive' })).collection('users').deleteMany({});
    await expect(Backend.getAllUsers({ after: null })).resolves.toStrictEqual([]);
  });

  it('returns all users', async () => {
    expect.hasAssertions();

    await expect(Backend.getAllUsers({ after: null })).resolves.toIncludeSameMembers(
      dummyAppData.users.map(toPublicUser)
    );
  });

  it('supports pagination', async () => {
    expect.hasAssertions();

    await withMockedEnv(
      async () => {
        expect([
          await Backend.getAllUsers({ after: null }),
          await Backend.getAllUsers({
            after: dummyAppData.users.at(-1)?._id || toss(new TrialError())
          }),
          await Backend.getAllUsers({
            after: dummyAppData.users.at(-2)?._id || toss(new TrialError())
          })
        ]).toStrictEqual(
          dummyAppData.users
            .slice(-3)
            .reverse()
            .map((user) => [user])
        );
      },
      { RESULTS_PER_PAGE: '1' }
    );
  });
});

describe('::getUser', () => {
  it('returns user by username', async () => {
    expect.hasAssertions();

    await expect(
      Backend.getUser({ username: dummyAppData.users[0].username })
    ).resolves.toStrictEqual(toPublicUser(dummyAppData.users[0]));
  });

  it('rejects if username not found', async () => {
    expect.hasAssertions();

    await expect(Backend.getUser({ username: 'does-not-exist' })).rejects.toMatchObject({
      message: ErrorMessage.ItemNotFound('username')
    });
  });
});

describe('::createUser', () => {
  it('creates and returns a new user', async () => {
    expect.hasAssertions();

    const newUser: Required<NewUser> = {
      username: 'new-user',
      email: 'new-user@email.com',
      key: '0'.repeat(getEnv().USER_KEY_LENGTH),
      salt: '0'.repeat(getEnv().USER_SALT_LENGTH)
    };

    await expect(
      Backend.createUser({ data: newUser })
    ).resolves.toStrictEqual<PublicUser>({
      user_id: expect.any(String),
      username: newUser.username,
      email: newUser.email,
      salt: newUser.salt
    });

    await expect(
      (await getDb({ name: 'hscc-api-drive' }))
        .collection('users')
        .countDocuments({ username: 'new-user' })
    ).resolves.toBe(1);
  });

  it('rejects if request body is invalid or contains properties that violates limits', async () => {
    expect.hasAssertions();

    const {
      MIN_USER_NAME_LENGTH: minULen,
      MAX_USER_NAME_LENGTH: maxULen,
      MIN_USER_EMAIL_LENGTH: minELen,
      MAX_USER_EMAIL_LENGTH: maxELen,
      USER_SALT_LENGTH: saltLen,
      USER_KEY_LENGTH: keyLen
    } = getEnv();

    const newUsers: [NewUser, string][] = [
      [undefined as unknown as NewUser, ErrorMessage.InvalidJSON()],
      ['string data' as NewUser, ErrorMessage.InvalidJSON()],
      [{ data: 1 } as NewUser, ErrorMessage.UnknownField('data')],
      [{ name: 'username' } as NewUser, ErrorMessage.UnknownField('name')],
      [{} as NewUser, ErrorMessage.InvalidStringLength('username', minULen, maxULen)],
      [
        { username: 'must be alphanumeric' },
        ErrorMessage.InvalidStringLength('username', minULen, maxULen)
      ],
      [
        { username: '#&*@^(#@(^$&*#' },
        ErrorMessage.InvalidStringLength('username', minULen, maxULen)
      ],
      [
        { username: null } as unknown as NewUser,
        ErrorMessage.InvalidStringLength('username', minULen, maxULen)
      ],
      [
        { username: 'x'.repeat(minULen - 1) },
        ErrorMessage.InvalidStringLength('username', minULen, maxULen)
      ],
      [
        { username: 'x'.repeat(maxULen + 1) },
        ErrorMessage.InvalidStringLength('username', minULen, maxULen)
      ],
      [
        { username: 'x'.repeat(maxULen - 1) },
        ErrorMessage.InvalidStringLength('email', minELen, maxELen, 'string')
      ],
      [
        { username: 'x'.repeat(maxULen - 1), email: null } as unknown as NewUser,
        ErrorMessage.InvalidStringLength('email', minELen, maxELen, 'string')
      ],
      [
        { username: 'x'.repeat(maxULen - 1), email: 'x'.repeat(minELen - 1) },
        ErrorMessage.InvalidStringLength('email', minELen, maxELen, 'string')
      ],
      [
        { username: 'x'.repeat(maxULen - 1), email: 'x'.repeat(maxELen + 1) },
        ErrorMessage.InvalidStringLength('email', minELen, maxELen, 'string')
      ],
      [
        { username: 'x'.repeat(maxULen - 1), email: 'x'.repeat(maxELen - 1) },
        ErrorMessage.InvalidStringLength('salt', saltLen, null, 'hexadecimal')
      ],
      [
        {
          username: 'x'.repeat(maxULen - 1),
          email: 'x'.repeat(maxELen - 1),
          salt: '0'.repeat(saltLen - 1)
        },
        ErrorMessage.InvalidStringLength('salt', saltLen, null, 'hexadecimal')
      ],
      [
        {
          username: 'x'.repeat(maxULen - 1),
          email: 'x'.repeat(maxELen - 1),
          salt: null
        } as unknown as NewUser,
        ErrorMessage.InvalidStringLength('salt', saltLen, null, 'hexadecimal')
      ],
      [
        {
          username: 'x'.repeat(maxULen - 1),
          email: 'x'.repeat(maxELen - 1),
          salt: '0'.repeat(saltLen)
        },
        ErrorMessage.InvalidStringLength('key', keyLen, null, 'hexadecimal')
      ],
      [
        {
          username: 'x'.repeat(maxULen - 1),
          email: 'x'.repeat(maxELen - 1),
          salt: '0'.repeat(saltLen),
          key: '0'.repeat(keyLen - 1)
        },
        ErrorMessage.InvalidStringLength('key', keyLen, null, 'hexadecimal')
      ],
      [
        {
          username: 'x'.repeat(maxULen - 1),
          email: 'x'.repeat(maxELen - 1),
          salt: '0'.repeat(saltLen),
          key: null
        } as unknown as NewUser,
        ErrorMessage.InvalidStringLength('key', keyLen, null, 'hexadecimal')
      ],
      [
        {
          username: 'x'.repeat(maxULen - 1),
          email: 'x'.repeat(maxELen - 1),
          salt: '0'.repeat(saltLen),
          key: '0'.repeat(keyLen),
          user_id: 1
        } as NewUser,
        ErrorMessage.UnknownField('user_id')
      ]
    ];

    await Promise.all(
      newUsers.map(([data, message]) =>
        expect(Backend.createUser({ data })).rejects.toMatchObject({ message })
      )
    );
  });

  it('rejects when attempting to create a user named "public"', async () => {
    expect.hasAssertions();

    await expect(
      Backend.createUser({
        data: {
          username: 'public',
          email: 'new-user@email.com',
          key: '0'.repeat(getEnv().USER_KEY_LENGTH),
          salt: '0'.repeat(getEnv().USER_SALT_LENGTH)
        }
      })
    ).rejects.toMatchObject({ message: ErrorMessage.IllegalUsername() });
  });

  it('rejects when attempting to create a user with a duplicate username or email', async () => {
    expect.hasAssertions();

    await expect(
      Backend.createUser({
        data: {
          username: dummyAppData.users[0].username,
          email: 'new-user@email.com',
          key: '0'.repeat(getEnv().USER_KEY_LENGTH),
          salt: '0'.repeat(getEnv().USER_SALT_LENGTH)
        }
      })
    ).rejects.toMatchObject({ message: ErrorMessage.DuplicateFieldValue('username') });

    await expect(
      Backend.createUser({
        data: {
          username: 'new-user',
          email: dummyAppData.users[0].email,
          key: '0'.repeat(getEnv().USER_KEY_LENGTH),
          salt: '0'.repeat(getEnv().USER_SALT_LENGTH)
        }
      })
    ).rejects.toMatchObject({ message: ErrorMessage.DuplicateFieldValue('email') });
  });
});

describe('::updateUser', () => {
  it('updates an existing user', async () => {
    expect.hasAssertions();

    const usersDb = (await getDb({ name: 'hscc-api-drive' })).collection('users');

    await expect(
      usersDb.countDocuments({
        username: dummyAppData.users[0].username,
        email: 'fake@email.com'
      })
    ).resolves.toBe(0);

    await expect(
      Backend.updateUser({
        username: dummyAppData.users[0].username,
        data: {
          email: 'fake@email.com',
          key: '0'.repeat(getEnv().USER_KEY_LENGTH),
          salt: '0'.repeat(getEnv().USER_SALT_LENGTH)
        }
      })
    ).resolves.toBeUndefined();

    await expect(
      usersDb.countDocuments({
        username: dummyAppData.users[0].username,
        email: 'fake@email.com'
      })
    ).resolves.toBe(1);
  });

  it('rejects if the username is not found', async () => {
    expect.hasAssertions();

    await expect(
      Backend.updateUser({
        username: 'fake-user',
        data: {
          email: 'fake@email.com',
          key: '0'.repeat(getEnv().USER_KEY_LENGTH),
          salt: '0'.repeat(getEnv().USER_SALT_LENGTH)
        }
      })
    ).rejects.toMatchObject({ message: ErrorMessage.ItemNotFound('username') });
  });

  it('rejects if request body is invalid or contains properties that violates limits', async () => {
    expect.hasAssertions();

    const {
      MIN_USER_EMAIL_LENGTH: minELen,
      MAX_USER_EMAIL_LENGTH: maxELen,
      USER_SALT_LENGTH: saltLen,
      USER_KEY_LENGTH: keyLen
    } = getEnv();

    const patchUsers: [PatchUser, string][] = [
      [undefined as unknown as PatchUser, ErrorMessage.InvalidJSON()],
      ['string data' as PatchUser, ErrorMessage.InvalidJSON()],
      [{ data: 1 } as PatchUser, ErrorMessage.UnknownField('data')],
      [
        { email: '' },
        ErrorMessage.InvalidStringLength('email', minELen, maxELen, 'string')
      ],
      [
        { email: 'x'.repeat(minELen - 1) },
        ErrorMessage.InvalidStringLength('email', minELen, maxELen, 'string')
      ],
      [
        { email: 'x'.repeat(maxELen + 1) },
        ErrorMessage.InvalidStringLength('email', minELen, maxELen, 'string')
      ],
      [
        { salt: '' },
        ErrorMessage.InvalidStringLength('salt', saltLen, null, 'hexadecimal')
      ],
      [
        { salt: '0'.repeat(saltLen - 1) },
        ErrorMessage.InvalidStringLength('salt', saltLen, null, 'hexadecimal')
      ],
      [{ key: '' }, ErrorMessage.InvalidStringLength('key', keyLen, null, 'hexadecimal')],
      [
        { key: '0'.repeat(keyLen - 1) },
        ErrorMessage.InvalidStringLength('key', keyLen, null, 'hexadecimal')
      ],
      [
        {
          email: 'x'.repeat(maxELen - 1),
          salt: '0'.repeat(saltLen),
          key: '0'.repeat(keyLen),
          username: 'new-username'
        } as PatchUser,
        ErrorMessage.UnknownField('username')
      ]
    ];

    await Promise.all(
      patchUsers.map(([data, message]) =>
        expect(
          Backend.updateUser({ username: dummyAppData.users[0].username, data })
        ).rejects.toMatchObject({ message })
      )
    );
  });
});

describe('::deleteUser', () => {
  it('deletes a user', async () => {
    expect.hasAssertions();

    const usersDb = (await getDb({ name: 'hscc-api-drive' })).collection('users');

    await expect(
      usersDb.countDocuments({ _id: dummyAppData.users[0]._id })
    ).resolves.toBe(1);

    await expect(
      Backend.deleteUser({ username: dummyAppData.users[0].username })
    ).resolves.toBeUndefined();

    await expect(
      usersDb.countDocuments({ _id: dummyAppData.users[0]._id })
    ).resolves.toBe(0);
  });

  it('rejects if the username is not found', async () => {
    expect.hasAssertions();

    await expect(
      Backend.deleteUser({ username: 'does-not-exist' })
    ).rejects.toMatchObject({ message: ErrorMessage.ItemNotFound('username') });
  });

  it('deleted users are removed from all permissions objects', async () => {
    expect.hasAssertions();

    const user = dummyAppData.users[0].username;

    const numFileNodePerms = dummyAppData['file-nodes'].filter(
      ({ permissions }) => !!permissions[user]
    ).length;

    const numMetaNodePerms = dummyAppData['file-nodes'].filter(
      ({ permissions }) => !!permissions[user]
    ).length;

    expect(numFileNodePerms).toBeGreaterThan(0);
    expect(numMetaNodePerms).toBeGreaterThan(0);

    const db = await getDb({ name: 'hscc-api-drive' });
    const fileNodeDb = db.collection('file-nodes');
    const metaNodeDb = db.collection('meta-nodes');

    await expect(
      fileNodeDb.countDocuments({ [`permissions.${user}`]: { $exists: true } })
    ).resolves.toBe(numFileNodePerms);

    await expect(
      metaNodeDb.countDocuments({ [`permissions.${user}`]: { $exists: true } })
    ).resolves.toBe(numMetaNodePerms);

    await expect(Backend.deleteUser({ username: user })).resolves.toBeUndefined();

    await expect(
      fileNodeDb.countDocuments({ [`permissions.${user}`]: { $exists: true } })
    ).resolves.toBe(0);

    await expect(
      metaNodeDb.countDocuments({ [`permissions.${user}`]: { $exists: true } })
    ).resolves.toBe(0);
  });
});

describe('::authAppUser', () => {
  it('returns true iff application-level key matches', async () => {
    expect.hasAssertions();

    await expect(
      Backend.authAppUser({ username: 'User1', key: dummyAppData.users[0].key })
    ).resolves.toBeTrue();

    await expect(
      Backend.authAppUser({ username: 'User1', key: 'bad' })
    ).resolves.toBeFalse();
  });
});

describe('::getNodes', () => {
  it('returns one or more nodes by node_id', async () => {
    expect.hasAssertions();

    const testNodes: [Username, InternalNode[]][] = [
      [dummyAppData['file-nodes'][0].owner, dummyAppData['file-nodes'].slice(0, 2)],
      [dummyAppData['file-nodes'][2].owner, []],
      [dummyAppData['file-nodes'][2].owner, [dummyAppData['file-nodes'][2]]],
      [
        dummyAppData['file-nodes'][3].owner,
        [...dummyAppData['file-nodes'].slice(3), ...dummyAppData['meta-nodes']]
      ]
    ];

    await Promise.all(
      testNodes.map(([username, nodes]) =>
        expect(
          Backend.getNodes({ username, node_ids: nodes.map((n) => n._id) })
        ).resolves.toIncludeSameMembers(nodes.map(toPublicNode))
      )
    );
  });

  it('rejects if one or more node_ids not found', async () => {
    expect.hasAssertions();

    await expect(
      Backend.getNodes({
        username: dummyAppData['file-nodes'][0].owner,
        node_ids: [new ObjectId()]
      })
    ).rejects.toMatchObject({ message: ErrorMessage.ItemOrItemsNotFound('node_ids') });

    await expect(
      Backend.getNodes({
        username: dummyAppData['file-nodes'][0].owner,
        node_ids: [dummyAppData['file-nodes'][0]._id, new ObjectId()]
      })
    ).rejects.toMatchObject({ message: ErrorMessage.ItemOrItemsNotFound('node_ids') });
  });

  it('rejects if node_id not owned by username', async () => {
    expect.hasAssertions();

    await expect(
      Backend.getNodes({
        username: dummyAppData['file-nodes'][2].owner,
        node_ids: [dummyAppData['file-nodes'][0]._id]
      })
    ).rejects.toMatchObject({ message: ErrorMessage.ItemOrItemsNotFound('node_ids') });
  });

  it('does not crash when database is empty', async () => {
    expect.hasAssertions();

    const db = await getDb({ name: 'hscc-api-drive' });

    await db.collection('file-nodes').deleteMany({});
    await db.collection('meta-nodes').deleteMany({});
    await db.collection('users').deleteMany({});

    await expect(
      Backend.getNodes({
        username: dummyAppData['file-nodes'][0].owner,
        node_ids: [dummyAppData['file-nodes'][0]._id]
      })
    ).rejects.toMatchObject({ message: ErrorMessage.ItemOrItemsNotFound('node_ids') });
  });

  it('rejects if too many node_ids requested', async () => {
    expect.hasAssertions();

    await withMockedEnv(
      async () => {
        await expect(
          Backend.getNodes({
            username: 'User1',
            node_ids: [new ObjectId(), new ObjectId()]
          })
        ).rejects.toMatchObject({
          message: ErrorMessage.TooManyItemsRequested('node_ids')
        });
      },
      { RESULTS_PER_PAGE: '1' }
    );
  });
});

describe('::searchNodes', () => {
  const sortedNodes = [
    ...dummyAppData['file-nodes'].sort((a, b) => b.modifiedAt - a.modifiedAt),
    ...dummyAppData['meta-nodes'].sort((a, b) => b.createdAt - a.createdAt)
  ];

  const getNodesOwnedBy = (username: Username) => {
    return sortedNodes.filter((n) => n.owner == username);
  };

  it("returns all of a user's nodes if no query params given", async () => {
    expect.hasAssertions();

    await withMockedEnv(
      async () => {
        await expect(
          Backend.searchNodes({
            username: dummyAppData.users[2].username,
            after: null,
            match: {},
            regexMatch: {}
          })
        ).resolves.toStrictEqual(
          getNodesOwnedBy(dummyAppData.users[2].username).slice(0, 4).map(toPublicNode)
        );
      },
      { RESULTS_PER_PAGE: '4' }
    );
  });

  it('only returns nodes owned by the user', async () => {
    expect.hasAssertions();

    await withMockedEnv(
      async () => {
        await expect(
          Backend.searchNodes({
            username: dummyAppData.users[1].username,
            after: null,
            match: { tags: ['music'] },
            regexMatch: {}
          })
        ).resolves.toStrictEqual(
          getNodesOwnedBy(dummyAppData.users[1].username)
            .filter((n) => n.type == 'file' && n.tags.includes('music'))
            .map(toPublicNode)
        );
      },
      { RESULTS_PER_PAGE: '4' }
    );
  });

  it('supports pagination', async () => {
    expect.hasAssertions();

    await withMockedEnv(
      async () => {
        const nodes = getNodesOwnedBy(dummyAppData.users[2].username)
          .slice(0, 4)
          .map(toPublicNode);

        await expect(
          Backend.searchNodes({
            username: dummyAppData.users[2].username,
            after: null,
            match: {},
            regexMatch: {}
          })
        ).resolves.toStrictEqual([nodes[0]]);

        await expect(
          Backend.searchNodes({
            username: dummyAppData.users[2].username,
            after: new ObjectId(nodes[0].node_id),
            match: {},
            regexMatch: {}
          })
        ).resolves.toStrictEqual([nodes[1]]);

        await expect(
          Backend.searchNodes({
            username: dummyAppData.users[2].username,
            after: new ObjectId(nodes[1].node_id),
            match: {},
            regexMatch: {}
          })
        ).resolves.toStrictEqual([nodes[2]]);

        await expect(
          Backend.searchNodes({
            username: dummyAppData.users[2].username,
            after: new ObjectId(nodes[2].node_id),
            match: {},
            regexMatch: {}
          })
        ).resolves.toStrictEqual([nodes[3]]);

        await expect(
          Backend.searchNodes({
            username: dummyAppData.users[2].username,
            after: new ObjectId(nodes[3].node_id),
            match: {},
            regexMatch: {}
          })
        ).resolves.toStrictEqual([]);
      },
      { RESULTS_PER_PAGE: '1' }
    );
  });

  it('does not crash when database is empty', async () => {
    expect.hasAssertions();

    const db = await getDb({ name: 'hscc-api-drive' });
    const fileNodeDb = db.collection('file-nodes');
    const metaNodeDb = db.collection('meta-nodes');

    await fileNodeDb.deleteMany({});
    await metaNodeDb.deleteMany({});

    await withMockedEnv(
      async () => {
        await expect(
          Backend.searchNodes({
            username: dummyAppData.users[2].username,
            after: null,
            match: {},
            regexMatch: {}
          })
        ).resolves.toStrictEqual([]);
      },
      { RESULTS_PER_PAGE: '4' }
    );
  });

  it('returns expected nodes when using match and regexMatch simultaneously', async () => {
    expect.hasAssertions();

    const regex = /(view|edit)/im;

    await expect(
      Backend.searchNodes({
        username: dummyAppData.users[2].username,
        after: null,
        match: { createdAt: { $lt: Date.now() } },
        regexMatch: { 'permissions.User2': 'view|edit' }
      })
    ).resolves.toStrictEqual(
      getNodesOwnedBy(dummyAppData.users[2].username).filter(
        (n) => n.createdAt < Date.now() && regex.test(n.permissions?.User2)
      )
    );
  });

  it('returns expected nodes when matching case-insensitively by tag', async () => {
    expect.hasAssertions();

    await expect(
      Backend.searchNodes({
        username: dummyAppData.users[0].username,
        after: null,
        match: { tags: ['MuSiC'] },
        regexMatch: {}
      })
    ).resolves.toStrictEqual(
      getNodesOwnedBy(dummyAppData.users[0].username).filter(
        (n) => n.type == 'file' && n.tags.includes('music')
      )
    );

    await expect(
      Backend.searchNodes({
        username: dummyAppData.users[0].username,
        after: null,
        match: { tags: ['MuSiC', 'muse'] },
        regexMatch: {}
      })
    ).resolves.toStrictEqual(
      getNodesOwnedBy(dummyAppData.users[0].username).filter(
        (n) => n.type == 'file' && n.tags.includes('music') && n.tags.includes('muse')
      )
    );
  });

  it('returns expected nodes when matching case-insensitively by name', async () => {
    expect.hasAssertions();

    await expect(
      Backend.searchNodes({
        username: dummyAppData.users[0].username,
        after: null,
        match: { name: 'USER1-FILE1' },
        regexMatch: {}
      })
    ).resolves.toStrictEqual(
      getNodesOwnedBy(dummyAppData.users[0].username).filter(
        (n) => n['name-lowercase'] == 'user1-file1'
      )
    );
  });

  it('returns expected nodes when matching conditioned on createdAt and/or modifiedAt', async () => {
    expect.hasAssertions();

    await expect(
      Backend.searchNodes({
        username: dummyAppData.users[0].username,
        after: null,
        match: { createdAt: { $lt: Date.now() - 5000, $gt: Date.now() - 10000 } },
        regexMatch: {}
      })
    ).resolves.toStrictEqual(
      getNodesOwnedBy(dummyAppData.users[0].username).filter(
        (n) => n.createdAt < Date.now() - 5000 && n.createdAt > Date.now() - 10000
      )
    );

    await expect(
      Backend.searchNodes({
        username: dummyAppData.users[0].username,
        after: null,
        match: { modifiedAt: { $lt: Date.now() - 500, $gt: Date.now() - 1000 } },
        regexMatch: {}
      })
    ).resolves.toStrictEqual(
      getNodesOwnedBy(dummyAppData.users[0].username).filter(
        (n) =>
          n.type == 'file' &&
          n.modifiedAt < Date.now() - 500 &&
          n.modifiedAt > Date.now() - 1000
      )
    );
  });

  it('supports special "$or" sub-matcher', async () => {
    expect.hasAssertions();

    await expect(
      Backend.searchNodes({
        username: dummyAppData.users[2].username,
        after: null,
        match: {
          createdAt: { $or: [{ $lt: Date.now() - 10000 }, { $gt: Date.now() - 5000 }] }
        },
        regexMatch: {}
      })
    ).resolves.toStrictEqual(
      getNodesOwnedBy(dummyAppData.users[2].username).filter(
        (n) => n.createdAt < Date.now() - 10000 || n.createdAt > Date.now() - 5000
      )
    );
  });

  it('supports multi-line case-insensitive regular expression matching of text via regexMatch', async () => {
    expect.hasAssertions();

    const regex = /^cause look.*$/im;

    await expect(
      Backend.searchNodes({
        username: dummyAppData.users[0].username,
        after: null,
        match: {},
        regexMatch: { text: '^cause look.*$' }
      })
    ).resolves.toStrictEqual(
      getNodesOwnedBy(dummyAppData.users[0].username).filter(
        (n) => n.type == 'file' && regex.test(n.text)
      )
    );
  });

  it('rejects when attempting to search for more than MAX_SEARCHABLE_TAGS tags', async () => {
    expect.hasAssertions();

    await expect(
      Backend.searchNodes({
        username: dummyAppData.users[2].username,
        after: null,
        match: {
          tags: Array.from({ length: getEnv().MAX_SEARCHABLE_TAGS + 1 }).map(() =>
            Math.random().toString(32).slice(2, 7)
          )
        },
        regexMatch: {}
      })
    ).rejects.toMatchObject({ message: ErrorMessage.TooManyItemsRequested('tags') });
  });

  it('rejects when attempting to search using disallowed or unknown fields', async () => {
    expect.hasAssertions();

    const matchers: [
      match: Parameters<typeof Backend.searchNodes>[0]['match'],
      regexMatch: Parameters<typeof Backend.searchNodes>[0]['regexMatch'],
      errorMessage: string
    ][] = [[{}, {}, '']];

    await Promise.all(
      matchers.map(([match, regexMatch, message]) =>
        expect(
          Backend.searchNodes({
            username: dummyAppData.users[0].username,
            after: null,
            match,
            regexMatch
          })
        ).rejects.toMatchObject({ message })
      )
    );
  });

  it('rejects when match and regexMatch are given strange or bad inputs', async () => {
    expect.hasAssertions();

    const matchers: [
      match: Parameters<typeof Backend.searchNodes>[0]['match'],
      regexMatch: Parameters<typeof Backend.searchNodes>[0]['regexMatch'],
      errorMessage: string
    ][] = [[{}, {}, '']];

    await Promise.all(
      matchers.map(([match, regexMatch, message]) =>
        expect(
          Backend.searchNodes({
            username: dummyAppData.users[0].username,
            after: null,
            match,
            regexMatch
          })
        ).rejects.toMatchObject({ message })
      )
    );
  });
});

describe('::createNode', () => {
  it('creates and returns a new file node', async () => {
    expect.hasAssertions();

    const newNode: Required<NewFileNode> = {
      type: 'file',
      name: 'My New File',
      text: "You'll take only seconds to draw me in.",
      tags: ['muse', 'darkshines', 'origin', 'symmetry', 'music'],
      lock: null,
      permissions: {}
    };

    const metaNodesDb = (
      await getDb({ name: 'hscc-api-drive' })
    ).collection<InternalFileNode>('file-nodes');

    await expect(metaNodesDb.countDocuments({ name: newNode.name })).resolves.toBe(0);

    await expect(
      Backend.createNode({ username: dummyAppData.users[0].username, data: newNode })
    ).resolves.toStrictEqual<PublicFileNode>({
      node_id: expect.any(String),
      ...newNode,
      owner: dummyAppData.users[0].username,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      size: newNode.text.length
    });

    await expect(metaNodesDb.countDocuments({ name: newNode.name })).resolves.toBe(1);
  });

  it('creates and returns a new symlink node', async () => {
    expect.hasAssertions();

    const newNode: Required<NewMetaNode> = {
      type: 'symlink',
      name: 'Latest Symlink',
      contents: [],
      permissions: {}
    };

    const metaNodesDb = (
      await getDb({ name: 'hscc-api-drive' })
    ).collection<InternalMetaNode>('meta-nodes');

    await expect(metaNodesDb.countDocuments({ name: newNode.name })).resolves.toBe(0);

    await expect(
      Backend.createNode({ username: dummyAppData.users[0].username, data: newNode })
    ).resolves.toStrictEqual<PublicMetaNode>({
      node_id: expect.any(String),
      ...newNode,
      owner: dummyAppData.users[0].username,
      createdAt: Date.now()
    });

    await expect(metaNodesDb.countDocuments({ name: newNode.name })).resolves.toBe(1);
  });

  it('creates and returns a new directory node', async () => {
    expect.hasAssertions();

    const newNode: Required<NewMetaNode> = {
      type: 'directory',
      name: 'New Directory',
      contents: [],
      permissions: {}
    };

    const metaNodesDb = (
      await getDb({ name: 'hscc-api-drive' })
    ).collection<InternalMetaNode>('meta-nodes');

    await expect(metaNodesDb.countDocuments({ name: newNode.name })).resolves.toBe(0);

    await expect(
      Backend.createNode({ username: dummyAppData.users[0].username, data: newNode })
    ).resolves.toStrictEqual<PublicMetaNode>({
      node_id: expect.any(String),
      ...newNode,
      owner: dummyAppData.users[0].username,
      createdAt: Date.now()
    });

    await expect(metaNodesDb.countDocuments({ name: newNode.name })).resolves.toBe(1);
  });

  it('rejects if request body is invalid or contains properties that violates limits', async () => {
    expect.hasAssertions();

    const {
      MIN_USER_NAME_LENGTH: minUsernameLen,
      MAX_USER_NAME_LENGTH: maxUsernameLen,
      MAX_LOCK_CLIENT_LENGTH: maxLockClientLen,
      MAX_NODE_NAME_LENGTH: maxNodeNameLen,
      MAX_NODE_TAGS: maxNodeTags,
      MAX_NODE_TAG_LENGTH: maxNodeTagLen,
      MAX_NODE_PERMISSIONS: maxNodePerms,
      MAX_NODE_CONTENTS: maxNodeContents,
      MAX_NODE_TEXT_LENGTH_BYTES: maxNodeTextBytes
    } = getEnv();

    const newNodes: [NewNode, string][] = [
      [undefined as unknown as NewNode, ErrorMessage.InvalidJSON()],
      ['string data' as NewNode, ErrorMessage.InvalidJSON()],
      [{ data: 1 } as NewNode, ErrorMessage.UnknownField('data')],
      [{ type: null } as unknown as NewNode, ErrorMessage.InvalidFieldValue('type')],
      [
        { type: 'bad-type' } as unknown as NewNode,
        ErrorMessage.InvalidFieldValue('type')
      ],
      [
        { type: 'directory', name: '' },
        ErrorMessage.InvalidStringLength('name', 1, maxNodeNameLen, 'string')
      ],
      [
        { type: 'symlink', name: 'x'.repeat(maxNodeNameLen + 1) },
        ErrorMessage.InvalidStringLength('name', 1, maxNodeNameLen, 'string')
      ],
      [
        { type: 'file', name: 'x', text: null } as unknown as NewNode,
        ErrorMessage.InvalidStringLength('text', 1, maxNodeTextBytes, 'bytes')
      ],
      [
        { type: 'file', name: 'x', text: 'x'.repeat(maxNodeTextBytes + 1) },
        ErrorMessage.InvalidStringLength('text', 1, maxNodeTextBytes, 'bytes')
      ],
      [
        { type: 'file', name: 'x', text: 'x', tags: null } as unknown as NewNode,
        ErrorMessage.InvalidFieldValue('tags')
      ],
      [
        { type: 'file', name: 'x', text: 'x', tags: [1] } as unknown as NewNode,
        ErrorMessage.InvalidFieldValue('tags')
      ],
      [
        { type: 'file', name: 'x', text: 'x', tags: ['grandson', 'grandson'] },
        ErrorMessage.DuplicateSetMember('tags')
      ],
      [
        { type: 'file', name: 'x', text: 'x', tags: ['grandson', 'GRANDSON'] },
        ErrorMessage.DuplicateSetMember('tags')
      ],
      [
        { type: 'file', name: 'x', text: 'x', tags: [''] },
        ErrorMessage.InvalidStringLength(
          'tags',
          1,
          maxNodeTextBytes,
          'bytes',
          false,
          true
        )
      ],
      [
        { type: 'file', name: 'x', text: 'x', tags: ['x'.repeat(maxNodeTagLen + 1)] },
        ErrorMessage.InvalidStringLength(
          'tags',
          1,
          maxNodeTextBytes,
          'bytes',
          false,
          true
        )
      ],
      [
        {
          type: 'file',
          name: 'x',
          text: 'x',
          tags: Array.from({ length: maxNodeTags + 1 }).map(() =>
            Math.random().toString(32).slice(2, 7)
          )
        },
        ErrorMessage.TooManyItemsRequested('tags')
      ],
      [
        {
          type: 'file',
          name: 'x',
          text: 'x',
          tags: [],
          lock: { bad: 1 }
        } as unknown as NewNode,
        ErrorMessage.InvalidFieldValue('lock')
      ],
      [
        {
          type: 'file',
          name: 'x',
          text: 'x',
          tags: [],
          lock: {
            user: 'x'.repeat(minUsernameLen - 1),
            client: 'y'.repeat(maxLockClientLen - 1),
            createdAt: Date.now()
          }
        },
        ErrorMessage.InvalidStringLength('lock.user', minUsernameLen, maxUsernameLen)
      ],
      [
        {
          type: 'file',
          name: 'x',
          text: 'x',
          tags: [],
          lock: {
            user: 'x'.repeat(maxUsernameLen + 1),
            client: 'y'.repeat(maxLockClientLen - 1),
            createdAt: Date.now()
          }
        },
        ErrorMessage.InvalidStringLength('lock.user', minUsernameLen, maxUsernameLen)
      ],
      [
        {
          type: 'file',
          name: 'x',
          text: 'x',
          tags: [],
          lock: {
            user: 'x'.repeat(maxUsernameLen + 1),
            client: '',
            createdAt: Date.now()
          }
        },
        ErrorMessage.InvalidStringLength('lock.client', 1, maxLockClientLen, 'string')
      ],
      [
        {
          type: 'file',
          name: 'x',
          text: 'x',
          tags: [],
          lock: {
            user: 'x'.repeat(maxUsernameLen + 1),
            client: 'y'.repeat(maxLockClientLen + 1),
            createdAt: Date.now()
          }
        },
        ErrorMessage.InvalidStringLength('lock.client', 1, maxLockClientLen, 'string')
      ],
      [
        {
          type: 'file',
          name: 'x',
          text: 'x',
          tags: [],
          lock: {
            user: 'x'.repeat(maxUsernameLen + 1),
            client: 'y'.repeat(maxLockClientLen - 1)
          } as NodeLock
        },
        ErrorMessage.InvalidFieldValue('lock')
      ],
      [
        {
          type: 'file',
          name: 'x',
          text: 'x',
          tags: [],
          lock: {
            user: null,
            client: 'y'.repeat(maxLockClientLen - 1),
            createdAt: Date.now()
          } as unknown as NodeLock
        },
        ErrorMessage.InvalidObjectKeyValue('lock')
      ],
      [
        {
          type: 'file',
          name: 'x',
          text: 'x',
          tags: [],
          lock: {
            user: 'x'.repeat(maxUsernameLen + 1),
            client: null,
            createdAt: Date.now()
          } as unknown as NodeLock
        },
        ErrorMessage.InvalidObjectKeyValue('lock')
      ],
      [
        {
          type: 'file',
          name: 'x',
          text: 'x',
          tags: [],
          lock: {
            user: 'x'.repeat(maxUsernameLen + 1),
            client: 'y'.repeat(maxLockClientLen - 1),
            createdAt: null
          } as unknown as NodeLock
        },
        ErrorMessage.InvalidObjectKeyValue('lock')
      ],
      [
        {
          type: 'file',
          name: 'x',
          text: 'x',
          tags: [],
          lock: null,
          permissions: ['yes']
        } as unknown as NewNode,
        ErrorMessage.InvalidFieldValue('permissions')
      ],
      [
        {
          type: 'file',
          name: 'x',
          text: 'x',
          tags: [],
          lock: null,
          permissions: { 'user-does-not-exist': 'edit' }
        },
        ErrorMessage.ItemNotFound('permissions username')
      ],
      [
        {
          type: 'file',
          name: 'x',
          text: 'x',
          tags: [],
          lock: null,
          permissions: { [dummyAppData.users[0].username]: 'bad-perm' }
        } as unknown as NewNode,
        ErrorMessage.InvalidObjectKeyValue('permissions')
      ],
      [
        {
          type: 'file',
          name: 'x',
          text: 'x',
          tags: [],
          lock: null,
          permissions: Array.from({ length: maxNodePerms + 1 }).reduce<
            NonNullable<NewNode['permissions']>
          >((o) => {
            o[Math.random().toString(32).slice(2, 7) as keyof typeof o] = 'view';
            return o;
          }, {})
        },
        ErrorMessage.TooManyItemsRequested('permissions')
      ],
      [
        { type: 'symlink', name: 'x', contents: null } as unknown as NewNode,
        ErrorMessage.InvalidFieldValue('contents')
      ],
      [
        { type: 'directory', name: 'x', contents: [1] } as unknown as NewNode,
        ErrorMessage.InvalidArrayValue('contents')
      ],
      [
        { type: 'symlink', name: 'x', contents: ['bad'] },
        ErrorMessage.InvalidArrayValue('contents')
      ],
      [
        {
          type: 'directory',
          name: 'x',
          contents: Array.from({ length: maxNodeContents + 1 }).map(() => new ObjectId())
        } as unknown as NewNode,
        ErrorMessage.TooManyItemsRequested('contents')
      ],
      [
        {
          type: 'symlink',
          name: 'x',
          contents: [],
          permissions: null
        } as unknown as NewNode,
        ErrorMessage.InvalidFieldValue('permissions')
      ],
      [
        {
          type: 'directory',
          name: 'x',
          contents: [],
          permissions: ['yes']
        } as unknown as NewNode,
        ErrorMessage.InvalidFieldValue('permissions')
      ],
      [
        {
          type: 'symlink',
          name: 'x',
          contents: [],
          permissions: { 'user-does-not-exist': 'edit' }
        },
        ErrorMessage.ItemNotFound('permissions username')
      ],
      [
        {
          type: 'directory',
          name: 'x',
          contents: [],
          permissions: { [dummyAppData.users[0].username]: 'bad-perm' }
        } as unknown as NewNode,
        ErrorMessage.InvalidObjectKeyValue('permissions')
      ],
      [
        {
          type: 'symlink',
          name: 'x',
          contents: [],
          permissions: Array.from({ length: maxNodePerms + 1 }).reduce<
            NonNullable<NewNode['permissions']>
          >((o) => {
            o[Math.random().toString(32).slice(2, 7) as keyof typeof o] = 'view';
            return o;
          }, {})
        },
        ErrorMessage.TooManyItemsRequested('permissions')
      ],
      [
        {
          type: 'file',
          owner: 'User1',
          name: 'user1-file1',
          text: 'Tell me how did we get here?',
          tags: ['grandson', 'music'],
          lock: null,
          permissions: {}
        } as NewNode,
        ErrorMessage.UnknownField('owner')
      ],
      [
        {
          type: 'file',
          name: 'user1-file1',
          text: 'Tell me how did we get here?',
          tags: ['grandson', 'music'],
          lock: null,
          permissions: {},
          contents: [new ObjectId().toString()]
        } as NewNode,
        ErrorMessage.UnknownField('contents')
      ],
      [
        {
          type: 'symlink',
          name: 'user1-file1',
          text: 'Tell me how did we get here?',
          permissions: {},
          contents: [new ObjectId().toString()]
        } as NewNode,
        ErrorMessage.UnknownField('text')
      ],
      [
        {
          type: 'directory',
          name: 'user1-file1',
          tags: ['grandson', 'music'],
          permissions: {},
          contents: [new ObjectId().toString()]
        } as NewNode,
        ErrorMessage.UnknownField('tags')
      ],
      [
        {
          type: 'symlink',
          name: 'user1-file1',
          lock: null,
          permissions: {},
          contents: [new ObjectId().toString()]
        } as NewNode,
        ErrorMessage.UnknownField('lock')
      ]
    ];

    await Promise.all(
      newNodes.map(([data, message]) =>
        expect(
          Backend.createNode({
            username: dummyAppData['file-nodes'][0].owner,
            data
          })
        ).rejects.toMatchObject({ message })
      )
    );
  });
});

describe('::updateNode', () => {
  it('updates an existing node', async () => {
    expect.hasAssertions();

    const db = await getDb({ name: 'hscc-api-drive' });
    const fileNodeDb = db.collection('file-nodes');
    const metaNodeDb = db.collection('meta-nodes');

    await expect(
      fileNodeDb.countDocuments({
        owner: 'new-user'
      })
    ).resolves.toBe(0);

    await expect(
      metaNodeDb.countDocuments({
        owner: 'new-user'
      })
    ).resolves.toBe(0);

    await expect(
      Backend.updateNode({
        username: dummyAppData['file-nodes'][0].owner,
        node_id: dummyAppData['file-nodes'][0]._id,
        data: { owner: 'new-user' }
      })
    ).resolves.toBeUndefined();

    await expect(
      Backend.updateNode({
        username: dummyAppData['meta-nodes'][0].owner,
        node_id: dummyAppData['meta-nodes'][0]._id,
        data: { owner: 'new-user' }
      })
    ).resolves.toBeUndefined();

    await expect(
      fileNodeDb.countDocuments({
        owner: 'new-user'
      })
    ).resolves.toBe(1);

    await expect(
      metaNodeDb.countDocuments({
        owner: 'new-user'
      })
    ).resolves.toBe(1);
  });

  it('rejects if the node_id is not found', async () => {
    expect.hasAssertions();

    await expect(
      Backend.updateNode({
        username: dummyAppData['file-nodes'][0].owner,
        node_id: new ObjectId(),
        data: { owner: 'new-user' }
      })
    ).rejects.toMatchObject({ message: ErrorMessage.ItemNotFound('node_id') });
  });

  it('rejects if node_id not owned by username', async () => {
    expect.hasAssertions();

    await expect(
      Backend.updateNode({
        username: 'fake-user',
        node_id: dummyAppData['file-nodes'][0]._id,
        data: { owner: 'new-user' }
      })
    ).rejects.toMatchObject({ message: ErrorMessage.ForbiddenAction() });
  });

  it('rejects if request body is invalid or contains properties that violates limits', async () => {
    expect.hasAssertions();

    const {
      MIN_USER_NAME_LENGTH: minUsernameLen,
      MAX_USER_NAME_LENGTH: maxUsernameLen,
      MAX_LOCK_CLIENT_LENGTH: maxLockClientLen,
      MAX_NODE_NAME_LENGTH: maxNodeNameLen,
      MAX_NODE_TAGS: maxNodeTags,
      MAX_NODE_TAG_LENGTH: maxNodeTagLen,
      MAX_NODE_PERMISSIONS: maxNodePerms,
      MAX_NODE_CONTENTS: maxNodeContents,
      MAX_NODE_TEXT_LENGTH_BYTES: maxNodeTextBytes
    } = getEnv();

    const patchNodes: [PatchNode, string][] = [
      [undefined as unknown as PatchNode, ErrorMessage.InvalidJSON()],
      ['string data' as PatchNode, ErrorMessage.InvalidJSON()],
      [{ data: 1 } as PatchNode, ErrorMessage.UnknownField('data')],
      [{ owner: 'does-not-exist' }, ErrorMessage.ItemNotFound('owner')],
      [
        { name: '' },
        ErrorMessage.InvalidStringLength('name', 1, maxNodeNameLen, 'string')
      ],
      [
        { name: 'x'.repeat(maxNodeNameLen + 1) },
        ErrorMessage.InvalidStringLength('name', 1, maxNodeNameLen, 'string')
      ],
      [
        { text: null } as unknown as PatchNode,
        ErrorMessage.InvalidStringLength('text', 1, maxNodeTextBytes, 'bytes')
      ],
      [
        { text: 'x'.repeat(maxNodeTextBytes + 1) },
        ErrorMessage.InvalidStringLength('text', 1, maxNodeTextBytes, 'bytes')
      ],
      [{ tags: null } as PatchNode, ErrorMessage.InvalidFieldValue('tags')],
      [{ tags: [1] } as PatchNode, ErrorMessage.InvalidFieldValue('tags')],
      [{ tags: ['grandson', 'grandson'] }, ErrorMessage.DuplicateSetMember('tags')],
      [{ tags: ['grandson', 'GRANDSON'] }, ErrorMessage.DuplicateSetMember('tags')],
      [
        { tags: [''] },
        ErrorMessage.InvalidStringLength(
          'tags',
          1,
          maxNodeTextBytes,
          'bytes',
          false,
          true
        )
      ],
      [
        { tags: ['x'.repeat(maxNodeTagLen + 1)] },
        ErrorMessage.InvalidStringLength(
          'tags',
          1,
          maxNodeTextBytes,
          'bytes',
          false,
          true
        )
      ],
      [
        {
          tags: Array.from({ length: maxNodeTags + 1 }).map(() =>
            Math.random().toString(32).slice(2, 7)
          )
        },
        ErrorMessage.TooManyItemsRequested('tags')
      ],
      [{ lock: { bad: 1 } } as PatchNode, ErrorMessage.InvalidFieldValue('lock')],
      [
        {
          lock: {
            user: 'x'.repeat(minUsernameLen - 1),
            client: 'y'.repeat(maxLockClientLen - 1),
            createdAt: Date.now()
          }
        },
        ErrorMessage.InvalidStringLength('lock.user', minUsernameLen, maxUsernameLen)
      ],
      [
        {
          lock: {
            user: 'x'.repeat(maxUsernameLen + 1),
            client: 'y'.repeat(maxLockClientLen - 1),
            createdAt: Date.now()
          }
        },
        ErrorMessage.InvalidStringLength('lock.user', minUsernameLen, maxUsernameLen)
      ],
      [
        {
          lock: {
            user: 'x'.repeat(maxUsernameLen + 1),
            client: '',
            createdAt: Date.now()
          }
        },
        ErrorMessage.InvalidStringLength('lock.client', 1, maxLockClientLen, 'string')
      ],
      [
        {
          lock: {
            user: 'x'.repeat(maxUsernameLen + 1),
            client: 'y'.repeat(maxLockClientLen + 1),
            createdAt: Date.now()
          }
        },
        ErrorMessage.InvalidStringLength('lock.client', 1, maxLockClientLen, 'string')
      ],
      [
        {
          lock: {
            user: 'x'.repeat(maxUsernameLen + 1),
            client: 'y'.repeat(maxLockClientLen - 1)
          } as NodeLock
        },
        ErrorMessage.InvalidFieldValue('lock')
      ],
      [
        {
          lock: {
            user: null,
            client: 'y'.repeat(maxLockClientLen - 1),
            createdAt: Date.now()
          } as unknown as NodeLock
        },
        ErrorMessage.InvalidObjectKeyValue('lock')
      ],
      [
        {
          lock: {
            user: 'x'.repeat(maxUsernameLen + 1),
            client: null,
            createdAt: Date.now()
          } as unknown as NodeLock
        },
        ErrorMessage.InvalidObjectKeyValue('lock')
      ],
      [
        {
          lock: {
            user: 'x'.repeat(maxUsernameLen + 1),
            client: 'y'.repeat(maxLockClientLen - 1),
            createdAt: null
          } as unknown as NodeLock
        },
        ErrorMessage.InvalidObjectKeyValue('lock')
      ],
      [
        { permissions: ['yes'] } as unknown as PatchNode,
        ErrorMessage.InvalidFieldValue('permissions')
      ],
      [
        { permissions: { 'user-does-not-exist': 'edit' } },
        ErrorMessage.ItemNotFound('permissions username')
      ],
      [
        {
          permissions: { [dummyAppData.users[0].username]: 'bad-perm' }
        } as unknown as PatchNode,
        ErrorMessage.InvalidObjectKeyValue('permissions')
      ],
      [
        {
          permissions: Array.from({ length: maxNodePerms + 1 }).reduce<
            NonNullable<PatchNode['permissions']>
          >((o) => {
            o[Math.random().toString(32).slice(2, 7) as keyof typeof o] = 'view';
            return o;
          }, {})
        },
        ErrorMessage.TooManyItemsRequested('permissions')
      ],
      [
        { contents: null } as unknown as PatchNode,
        ErrorMessage.InvalidFieldValue('contents')
      ],
      [
        { contents: [1] } as unknown as PatchNode,
        ErrorMessage.InvalidArrayValue('contents')
      ],
      [
        { contents: ['bad'] } as unknown as PatchNode,
        ErrorMessage.InvalidArrayValue('contents')
      ],
      [
        {
          contents: Array.from({ length: maxNodeContents + 1 }).map(() => new ObjectId())
        } as unknown as PatchNode,
        ErrorMessage.TooManyItemsRequested('contents')
      ],
      [
        {
          owner: 'User1',
          name: 'user1-file1',
          text: 'Tell me how did we get here?',
          tags: ['grandson', 'music'],
          lock: null,
          permissions: {},
          type: 'symlink'
        } as PatchNode,
        ErrorMessage.UnknownField('type')
      ],
      [
        {
          owner: 'User1',
          name: 'user1-file1',
          text: 'Tell me how did we get here?',
          tags: ['grandson', 'music'],
          lock: null,
          permissions: {},
          contents: [new ObjectId().toString()]
        } as PatchNode,
        ErrorMessage.UnknownField('contents')
      ]
    ];

    await Promise.all(
      patchNodes.map(([data, message]) =>
        expect(
          Backend.updateNode({
            username: dummyAppData['file-nodes'][0].owner,
            node_id: dummyAppData['file-nodes'][0]._id,
            data
          })
        ).rejects.toMatchObject({ message })
      )
    );

    await expect(
      Backend.updateNode({
        username: dummyAppData['meta-nodes'][0].owner,
        node_id: dummyAppData['meta-nodes'][0]._id,
        data: {
          owner: 'User1',
          name: 'user1-file1',
          text: 'Tell me how did we get here?',
          tags: ['grandson', 'music'],
          lock: null,
          permissions: {},
          contents: [new ObjectId().toString()]
        }
      })
    ).rejects.toMatchObject({ message: ErrorMessage.UnknownField('text') });
  });
});

describe('::deleteNodes', () => {
  it('deletes one or more existing nodes', async () => {
    expect.hasAssertions();

    const db = await getDb({ name: 'hscc-api-drive' });
    const fileNodeDb = db.collection('file-nodes');
    const metaNodeDb = db.collection('meta-nodes');

    await expect(
      fileNodeDb.countDocuments({
        _id: {
          $in: [dummyAppData['file-nodes'][0]._id, dummyAppData['file-nodes'][1]._id]
        }
      })
    ).resolves.toBe(2);

    await expect(
      metaNodeDb.countDocuments({ _id: dummyAppData['meta-nodes'][0]._id })
    ).resolves.toBe(1);

    await expect(
      Backend.deleteNodes({
        username: dummyAppData['file-nodes'][0].owner,
        node_ids: [dummyAppData['file-nodes'][0]._id, dummyAppData['file-nodes'][1]._id]
      })
    ).resolves.toBeUndefined();

    await expect(
      Backend.deleteNodes({
        username: dummyAppData['meta-nodes'][0].owner,
        node_ids: [dummyAppData['meta-nodes'][0]._id]
      })
    ).resolves.toBeUndefined();

    await expect(
      fileNodeDb.countDocuments({
        _id: {
          $in: [dummyAppData['file-nodes'][0]._id, dummyAppData['file-nodes'][1]._id]
        }
      })
    ).resolves.toBe(0);

    await expect(
      metaNodeDb.countDocuments({ _id: dummyAppData['meta-nodes'][0]._id })
    ).resolves.toBe(0);
  });

  it('does not reject if one or more of the node_ids is not found', async () => {
    expect.hasAssertions();

    const fileNodeDb = (await getDb({ name: 'hscc-api-drive' })).collection('file-nodes');

    await expect(
      fileNodeDb.countDocuments({ _id: dummyAppData['file-nodes'][0]._id })
    ).resolves.toBe(1);

    await expect(
      Backend.deleteNodes({
        username: dummyAppData['file-nodes'][0].owner,
        node_ids: [dummyAppData['file-nodes'][0]._id, new ObjectId()]
      })
    ).resolves.toBeUndefined();

    await expect(
      fileNodeDb.countDocuments({ _id: dummyAppData['file-nodes'][0]._id })
    ).resolves.toBe(0);
  });

  it('rejects if one or more of the node_ids is not owned by username', async () => {
    expect.hasAssertions();

    const db = await getDb({ name: 'hscc-api-drive' });
    const fileNodeDb = db.collection('file-nodes');
    const metaNodeDb = db.collection('meta-nodes');

    await expect(
      fileNodeDb.countDocuments({ _id: dummyAppData['file-nodes'][2]._id })
    ).resolves.toBe(1);

    await expect(
      metaNodeDb.countDocuments({ _id: dummyAppData['meta-nodes'][0]._id })
    ).resolves.toBe(1);

    await expect(
      Backend.deleteNodes({
        username: dummyAppData['file-nodes'][2].owner,
        node_ids: [dummyAppData['file-nodes'][2]._id, dummyAppData['meta-nodes'][0]._id]
      })
    ).rejects.toMatchObject({ message: ErrorMessage.ForbiddenAction() });
  });

  it('deleted node_ids are removed from all MetaNode contents arrays', async () => {
    expect.hasAssertions();

    const node_id = dummyAppData['file-nodes'][4]._id;

    const numInContentArrays = dummyAppData['meta-nodes'].filter(({ contents }) =>
      contents.includes(node_id)
    ).length;

    expect(numInContentArrays).toBeGreaterThan(0);

    const metaNodeDb = (await getDb({ name: 'hscc-api-drive' })).collection('meta-nodes');

    await expect(metaNodeDb.countDocuments({ contents: node_id })).resolves.toBe(
      numInContentArrays
    );

    await expect(
      Backend.deleteNodes({
        username: dummyAppData['file-nodes'][4].owner,
        node_ids: [node_id]
      })
    ).resolves.toBeUndefined();

    await expect(metaNodeDb.countDocuments({ contents: node_id })).resolves.toBe(0);
  });
});
