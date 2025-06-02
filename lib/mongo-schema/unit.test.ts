import { asMockedClass } from '@xunnamius/jest-types';
import { MongoClient } from 'mongodb';

import { isolatedImportFactory, mockEnvFactory } from 'testverse/setup';

import { getInitialInternalMemoryState } from 'multiverse/mongo-schema';

import type { Db } from 'mongodb';
import type { TestCustomizations } from 'multiverse/mongo-test';

jest.mock('mongodb');
jest.mock<typeof import('configverse/get-schema-config')>(
  'configverse/get-schema-config',
  () =>
    mockedMongoCustomizations as unknown as typeof import('configverse/get-schema-config')
);

const withMockedEnv = mockEnvFactory({ NODE_ENV: 'test' });

const mockMongoClient = asMockedClass(MongoClient);
let mockedMongoCustomizations: TestCustomizations;

const importDbLibrary = isolatedImportFactory<typeof import('multiverse/mongo-schema')>({
  path: 'multiverse/mongo-schema'
});

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  mockedMongoCustomizations = mockedMongoCustomizations || {};

  mockedMongoCustomizations.getSchemaConfig = async () => {
    return {
      databases: {
        'fake-db-1': {
          collections: ['col']
        },

        'fake-db-2': {
          collections: [
            'col-1',
            { name: 'col-2', createOptions: { capped: true } },
            { name: 'col-3', indices: [{ spec: 'some-key' }] },
            {
              name: 'col-4',
              indices: [{ spec: ['some-key', -1], options: { comment: '' } }]
            }
          ]
        }
      },
      aliases: {
        'fake-alias-1': 'fake-db-1',
        'fake-alias-2': 'fake-db-2'
      }
    };
  };

  mockMongoClient.connect = jest.fn((url: string) =>
    Promise.resolve(
      new (class {
        url = url;

        db(name: string) {
          return new (class {
            parentUrl = url;
            databaseName = name;
            dropDatabase;
            createCollection;
            createIndex;
            collection;
            admin;

            constructor() {
              this.dropDatabase = jest.fn();
              this.createIndex = jest.fn();
              // ? Reuse this.createIndex method for easy access to mock
              this.collection = jest.fn(() => ({ insertMany: this.createIndex }));
              this.createCollection = jest.fn(() =>
                Promise.resolve({ createIndex: this.createIndex })
              );
              this.admin = jest.fn(() => ({
                listDatabases: jest.fn(() => ({
                  databases: [
                    { name: 'auth' },
                    { name: 'request-log' },
                    { name: 'limited-log' }
                  ]
                }))
              }));
            }
          })();
        }

        close() {
          return url;
        }
      })() as unknown as MongoClient
    )
  );
});

describe('::getSchemaConfig', () => {
  it('dynamically imports customizations', async () => {
    expect.hasAssertions();

    await expect(importDbLibrary().getSchemaConfig()).resolves.toStrictEqual(
      await mockedMongoCustomizations.getSchemaConfig()
    );
  });

  it('rejects if customizations are unavailable', async () => {
    expect.hasAssertions();

    // @ts-expect-error: don't care that we're deleting a non-optional prop
    delete mockedMongoCustomizations.getSchemaConfig;
    await expect(importDbLibrary().getSchemaConfig()).rejects.toThrow(
      'configverse/get-schema-config'
    );
  });
});

describe('::getClient', () => {
  it("creates client if it doesn't already exist", async () => {
    expect.hasAssertions();

    const library = importDbLibrary();

    await withMockedEnv(
      async () => {
        const client = await library.getClient();
        await expect(library.getClient()).resolves.toBe(client);
        expect(mockMongoClient.connect).toHaveBeenCalledTimes(1);
        expect(client.close()).toBe('abc');
      },
      { MONGODB_URI: 'abc' }
    );
  });
});

describe('::getDb', () => {
  it("creates db and connection if it doesn't already exist", async () => {
    expect.hasAssertions();

    const library = importDbLibrary();

    await withMockedEnv(
      async () => {
        expect(mockMongoClient.connect).toHaveBeenCalledTimes(0);
        const db = await library.getDb({ name: 'fake-db-1' });
        await expect(library.getDb({ name: 'fake-db-1' })).resolves.toBe(db);
        expect(mockMongoClient.connect).toHaveBeenCalledTimes(1);
        await expect(library.getDb({ name: 'fake-db-2' })).resolves.not.toBe(db);
        expect(mockMongoClient.connect).toHaveBeenCalledTimes(1);
        expect(db.databaseName).toBe('fake-db-1');
      },
      { MONGODB_URI: 'abc' }
    );
  });

  it('automatically initializes newly created databases unless initialize is false', async () => {
    expect.hasAssertions();

    const library = importDbLibrary();

    await withMockedEnv(
      async () => {
        const db = await library.getDb({ name: 'fake-db-1', initialize: false });
        expect(db.createCollection).not.toHaveBeenCalled();
        await library.getDb({ name: 'fake-db-1' });
        expect(db.createCollection).not.toHaveBeenCalled();
        const db2 = await library.getDb({ name: 'fake-db-2' });
        expect(db2.createCollection).toHaveBeenCalled();
        await library.getDb({ name: 'fake-db-2' });
        expect(db2.createCollection).toHaveBeenCalled();
      },
      { MONGODB_URI: 'abc' }
    );
  });

  it('returns db using alias', async () => {
    expect.hasAssertions();

    const library = importDbLibrary();

    await withMockedEnv(
      async () => {
        const db1 = await library.getDb({ name: 'fake-db-1' });
        await expect(library.getDb({ name: 'fake-alias-1' })).resolves.toBe(db1);

        const db2 = await library.getDb({ name: 'fake-alias-2' });
        await expect(library.getDb({ name: 'fake-db-2' })).resolves.toBe(db2);
      },
      { MONGODB_URI: 'abc' }
    );
  });
});

describe('::overwriteMemory', () => {
  it('replaces memory when called', async () => {
    expect.hasAssertions();

    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    const client = new (class {})() as MongoClient;
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    const databases = { 'fake-db-1': new (class {})() as Db };
    const library = importDbLibrary();

    library.overwriteMemory({ ...getInitialInternalMemoryState(), client, databases });

    await expect(library.getClient()).resolves.toBe(client);
    await expect(library.getDb({ name: 'fake-db-1' })).resolves.toBe(
      databases['fake-db-1']
    );
  });
});

describe('::closeClient', () => {
  it('closes client and deletes memory', async () => {
    expect.hasAssertions();

    const library = importDbLibrary();

    await withMockedEnv(
      async () => {
        const client = await library.getClient();
        await expect(library.getClient()).resolves.toBe(client);
        await library.closeClient();
        await expect(library.getClient()).resolves.not.toBe(client);
      },
      { MONGODB_URI: 'abc' }
    );
  });
});

describe('::destroyDb', () => {
  it('drops database', async () => {
    expect.hasAssertions();

    const library = importDbLibrary();

    await withMockedEnv(
      async () => {
        const db = await library.getDb({ name: 'fake-db-1' });
        expect(db.dropDatabase).toHaveBeenCalledTimes(0);
        await library.destroyDb({ name: 'fake-db-2' });
        expect(db.dropDatabase).toHaveBeenCalledTimes(0);
        await library.destroyDb({ name: 'fake-db-1' });
        expect(db.dropDatabase).toHaveBeenCalledTimes(1);
      },
      { MONGODB_URI: 'abc' }
    );
  });
});

describe('::getNameFromAlias', () => {
  it('returns an actual database name', async () => {
    expect.hasAssertions();
    await expect(importDbLibrary().getNameFromAlias('fake-alias-2')).resolves.toBe(
      'fake-db-2'
    );
  });

  it('throws if database is not in schema', async () => {
    expect.hasAssertions();
    await expect(importDbLibrary().getNameFromAlias('fake-alias-3')).rejects.toThrow(
      'database "fake-alias-3" is not defined'
    );
  });
});

describe('::initializeDb', () => {
  it("initializes a database's collections according to schema", async () => {
    expect.hasAssertions();

    const library = importDbLibrary();

    await withMockedEnv(
      async () => {
        const schema = await library.getSchemaConfig();
        const db1 = await library.getDb({ name: 'fake-db-1' });
        const db2 = await library.getDb({ name: 'fake-db-2' });

        await library.initializeDb({ name: 'fake-db-1' });
        await library.initializeDb({ name: 'fake-db-2' });

        schema.databases['fake-db-1'].collections.forEach((col) => {
          expect(db1.createCollection).toHaveBeenCalledWith(
            ...(typeof col === 'string'
              ? [col, undefined]
              : [col.name, col.createOptions])
          );
        });

        schema.databases['fake-db-2'].collections.forEach((col) => {
          if (typeof col === 'string') {
            expect(db2.createCollection).toHaveBeenCalledWith(col, undefined);
          } else {
            expect(db2.createCollection).toHaveBeenCalledWith(
              col.name,
              col.createOptions
            );

            if (col.indices) {
              col.indices.forEach((spec) =>
                expect(db2.createIndex).toHaveBeenCalledWith(
                  spec.spec,
                  spec.options || {}
                )
              );
            }
          }
        });
      },
      { MONGODB_URI: 'abc' }
    );
  });
});
