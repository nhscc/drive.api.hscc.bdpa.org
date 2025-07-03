import { getCommonDummyData } from '@-xun/api-strategy/mongo/dummy';
import { ObjectId } from 'mongodb';

import { mockDateNowMs } from 'testverse/util';

import type { DummyData } from '@-xun/mongo-test';

import type {
  InternalFileNode,
  InternalMetaNode,
  InternalUser
} from 'universe/backend/db';

/**
 * Returns data used to hydrate databases and their collections.
 */
export function getDummyData(): DummyData {
  return getCommonDummyData({ 'hscc-api-drive': dummyAppData });
}

/**
 * The shape of the application database's test data.
 */
export type DummyAppData = {
  _generatedAt: number;
  users: InternalUser[];
  'file-nodes': InternalFileNode[];
  'meta-nodes': InternalMetaNode[];
};

const knownFolderId = new ObjectId();
const knownFileId1 = new ObjectId();
const knownFileId2 = new ObjectId();
const knownSymlinkId = new ObjectId();

/**
 * Test data for the application database.
 */
export const dummyAppData: DummyAppData = {
  _generatedAt: mockDateNowMs,
  // ! Order matters in unit and integration tests, so APPEND ONLY
  users: [
    // ? Dummy users' passwords are the same as their usernames
    {
      _id: new ObjectId(),
      username: 'User1',
      salt: '91db41c494502f9ebb6217e4590cccc2',
      key: '17660270f4c4c1741ab9d43e6fb800bc784f0a3bc2f4cd31f0e26bf821ef2ae788f83af134d8c3824f5e0552f8cd432d6b23963d2ffbceb6a7c91b0f59533206',
      email: 'user1@fake-email.com'
    },
    {
      _id: new ObjectId(),
      username: 'User2',
      salt: 'bfe69b665a1ae64bb7d76c32347adecb',
      key: 'e71e8bbd23df52bec8af8280ad7901ddd0ecd5cc43371915f7a95cd17ce0a8515127bfcd433435425c4d245f4a18efcb08e4484682aeb53fcfce5b536d79e4e4',
      email: 'user2@fake-email.com'
    },
    {
      _id: new ObjectId(),
      username: 'User3',
      salt: '12ef85b518da764294abf0a2095bb5ec',
      key: 'e745893e064e26d4349b1639b1596c14bc9b5d050b56bf31ff3ef0dfce6f959aef8a3722a35bc35b2d142169e75ca3e1967cd6ee4818af0813d8396a724fdd22',
      email: 'user3@fake-email.com'
    }
  ],
  'file-nodes': [
    {
      _id: new ObjectId(),
      type: 'file',
      owner: 'User1',
      createdAt: mockDateNowMs - 10_000,
      modifiedAt: mockDateNowMs - 1000,
      name: 'user1-file1',
      'name-lowercase': 'user1-file1',
      size: 28,
      text: 'Tell me how did we get here?',
      tags: ['grandson', 'music'],
      lock: null,
      permissions: {}
    },
    {
      _id: new ObjectId(),
      type: 'file',
      owner: 'User1',
      createdAt: mockDateNowMs - 8000,
      modifiedAt: mockDateNowMs - 800,
      name: 'User1-File1',
      'name-lowercase': 'user1-file1',
      size: 109,
      text: 'BLAH BLAH BLAH! '.repeat(100),
      tags: ['grandson', 'music'],
      lock: null,
      permissions: {}
    },
    {
      _id: new ObjectId(),
      type: 'file',
      owner: 'User2',
      createdAt: mockDateNowMs - 150_000,
      modifiedAt: mockDateNowMs - 50_000,
      name: 'user2-file2',
      'name-lowercase': 'user2-file2',
      size: 39,
      text: "You'll take only seconds to draw me in.",
      tags: ['muse', 'darkshines', 'origin', 'symmetry', 'music'],
      lock: {
        user: 'User2',
        client: 'F951YAClN2',
        createdAt: mockDateNowMs - 50_000
      },
      permissions: {}
    },
    {
      _id: knownFileId1,
      type: 'file',
      owner: 'User3',
      createdAt: mockDateNowMs - 10_000,
      modifiedAt: mockDateNowMs - 1000,
      name: 'USER3-FILE3',
      'name-lowercase': 'user3-file3',
      size: 28,
      text: 'Tell me how did we get here??????',
      tags: ['grandson', 'music'],
      lock: null,
      permissions: {
        User1: 'view',
        User2: 'edit'
      }
    },
    {
      _id: knownFileId2,
      type: 'file',
      owner: 'User3',
      createdAt: mockDateNowMs - 20_000,
      modifiedAt: mockDateNowMs - 5432,
      name: 'user-3-file-4',
      'name-lowercase': 'user-3-file-4',
      size: 39,
      text: 'Did you see His Dark Materials on BBC?!',
      tags: ['his', 'dark', 'materials', 'lorne', 'balfe'],
      lock: null,
      permissions: {
        public: 'view'
      }
    }
  ],
  'meta-nodes': [
    {
      _id: new ObjectId(),
      type: 'directory',
      owner: 'User3',
      createdAt: mockDateNowMs - 200_000,
      name: 'My Music',
      'name-lowercase': 'my music',
      contents: [knownFolderId, knownFileId1, knownSymlinkId],
      permissions: {
        User1: 'view'
      }
    },
    {
      _id: knownFolderId,
      type: 'directory',
      owner: 'User3',
      createdAt: mockDateNowMs - 15_000,
      name: 'tv show music',
      'name-lowercase': 'tv show music',
      contents: [knownFileId2],
      permissions: {
        User2: 'view'
      }
    },
    {
      _id: knownSymlinkId,
      type: 'symlink',
      owner: 'User3',
      createdAt: mockDateNowMs - 4859,
      name: 'HisDarkMaterials-Symlink',
      'name-lowercase': 'hisdarkmaterials-symlink',
      contents: [knownFileId2],
      permissions: {}
    }
  ]
};
