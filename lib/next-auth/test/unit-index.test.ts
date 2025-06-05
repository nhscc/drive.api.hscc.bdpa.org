/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { randomUUID } from 'node:crypto';

import { setupMemoryServerOverride } from '@-xun/mongo-test';
import { ObjectId } from 'mongodb';

import { asMocked, useMockDateNow } from 'testverse/util';

import {
  getCommonDummyData,
  getCommonSchemaConfig
} from 'multiverse/mongo-common/index.ts';

import {
  authenticateHeader,
  authorizeHeader,
  createToken,
  deriveSchemeAndToken,
  DUMMY_BEARER_TOKEN,
  getAuthDb,
  validAuthenticationSchemes
} from 'multiverse/next-auth';

import * as NextAuthTokenSpyTarget from 'multiverse/next-auth/token';

import type {
  AuthenticationScheme,
  InternalAuthEntry,
  Token,
  TokenAttributes
} from 'multiverse/next-auth';

useMockDateNow();
setupMemoryServerOverride({
  schema: getCommonSchemaConfig(),
  data: getCommonDummyData()
});

jest.mock<typeof import('node:crypto')>('node:crypto', () => {
  const crypto = jest.requireActual('node:crypto');
  return { ...crypto, randomUUID: jest.fn() };
});

const mockRandomUUID = asMocked(randomUUID);
const _validAuthenticationSchemes = validAuthenticationSchemes.slice();
const mutableAuthenticationSchemes = validAuthenticationSchemes as unknown as string[];

beforeEach(() => {
  mockRandomUUID.mockReturnValue(DUMMY_BEARER_TOKEN);
});

afterEach(() => {
  mutableAuthenticationSchemes.splice(
    0,
    mutableAuthenticationSchemes.length,
    ..._validAuthenticationSchemes
  );
});

test('ensure multiple different auth entries of various schemes can coexist', async () => {
  expect.hasAssertions();

  mockRandomUUID.mockImplementation(jest.requireActual('node:crypto').randomUUID);

  const uuid = randomUUID();
  const authDb = await getAuthDb();

  mutableAuthenticationSchemes.push('new-scheme-1', 'new-scheme-2');

  const incomingEntryRed: InternalAuthEntry = {
    _id: new ObjectId(),
    deleted: false,
    attributes: {
      owner: 'owner-red',
      isGlobalAdmin: false,
      createdAt: Date.now()
    } as TokenAttributes,
    scheme: 'new-scheme-1' as AuthenticationScheme,
    token: { id1: uuid.slice(0, 32), id2: uuid.slice(32) }
  };

  const incomingEntryBlue: InternalAuthEntry = {
    _id: new ObjectId(),
    deleted: false,
    attributes: { owner: 'owner-blue', isGlobalAdmin: true },
    scheme: 'new-scheme-2' as AuthenticationScheme,
    token: {
      uuid,
      salt: uuid.slice(0, 3),
      granter: { key: `${uuid.slice(0, 3)}-${uuid}` }
    }
  };

  const actual_deriveSchemeAndToken = deriveSchemeAndToken;

  jest
    .spyOn(NextAuthTokenSpyTarget, 'deriveSchemeAndToken')
    .mockImplementation(async function ({
      authString,
      authData
    }: {
      authString?: string;
      authData?: Token;
    }): Promise<Token> {
      let returnValue: Token | undefined;

      if (
        authString?.startsWith('new-scheme-1') ||
        authData?.scheme?.startsWith('new-scheme-1')
      ) {
        returnValue = {
          scheme: 'new-scheme-1' as AuthenticationScheme,
          token: { id1: uuid.slice(0, 32), id2: uuid.slice(32) }
        };
      } else if (
        authString?.startsWith('new-scheme-2') ||
        authData?.scheme?.startsWith('new-scheme-2')
      ) {
        returnValue = {
          scheme: 'new-scheme-2' as AuthenticationScheme,
          token: {
            uuid,
            salt: uuid.slice(0, 3),
            granter: { key: `${uuid.slice(0, 3)}-${uuid}` }
          }
        };
      } else {
        // eslint-disable-next-line prefer-rest-params
        returnValue = await actual_deriveSchemeAndToken(arguments[0]);
      }

      return returnValue;
    } as typeof deriveSchemeAndToken);

  jest.spyOn(NextAuthTokenSpyTarget, 'isTokenAttributes').mockReturnValue(true);

  const incomingEntry1 = await createToken({
    data: { attributes: { owner: 'owner-1' } }
  });

  const incomingEntry2 = await createToken({
    data: { attributes: { owner: 'owner-2', isGlobalAdmin: true } }
  });

  // * Pseudo-createToken calls
  await authDb.insertOne(incomingEntryRed);
  await authDb.insertOne(incomingEntryBlue);

  await expect(
    authenticateHeader({
      header: `${incomingEntry1.scheme} ${incomingEntry1.token.bearer}`
    })
  ).resolves.toStrictEqual({ authenticated: true });

  await expect(
    authenticateHeader({
      header: `${incomingEntry2.scheme} ${incomingEntry2.token.bearer}`
    })
  ).resolves.toStrictEqual({ authenticated: true });

  await expect(
    authenticateHeader({
      header: `${incomingEntryRed.scheme} ${incomingEntryRed.token.id1}`
    })
  ).resolves.toStrictEqual({ authenticated: true });

  await expect(
    authenticateHeader({
      header: `${incomingEntryBlue.scheme} ${incomingEntryBlue.token.uuid}`
    })
  ).resolves.toStrictEqual({ authenticated: true });

  await expect(
    authenticateHeader({
      header: `${incomingEntry1.scheme} ${incomingEntryBlue.token.uuid}`
    })
  ).resolves.toStrictEqual({ authenticated: false });

  await expect(
    authorizeHeader({
      header: `${incomingEntry1.scheme} ${incomingEntry1.token.bearer}`,
      constraints: 'isGlobalAdmin'
    })
  ).resolves.toStrictEqual({ authorized: false });

  await expect(
    authorizeHeader({
      header: `${incomingEntry2.scheme} ${incomingEntry2.token.bearer}`,
      constraints: 'isGlobalAdmin'
    })
  ).resolves.toStrictEqual({ authorized: true });

  await expect(
    authorizeHeader({
      header: `${incomingEntryRed.scheme} ${incomingEntryRed.token.id1}`,
      constraints: 'isGlobalAdmin'
    })
  ).resolves.toStrictEqual({ authorized: false });

  await expect(
    authorizeHeader({
      header: `${incomingEntryBlue.scheme} ${incomingEntryBlue.token.uuid}`,
      constraints: 'isGlobalAdmin'
    })
  ).resolves.toStrictEqual({ authorized: true });
});
