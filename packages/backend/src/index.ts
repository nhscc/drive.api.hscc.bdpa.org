/* eslint-disable unicorn/no-array-reduce */
import { isRecord } from '@-xun/js';
import { itemExists, itemToObjectId } from '@-xun/mongo-item';
import { getDb } from '@-xun/mongo-schema';
import { MongoServerError, ObjectId } from 'mongodb';
import { toss } from 'toss-expression';

import {
  publicFileNodeProjection,
  publicMetaNodeProjection,
  publicUserProjection
} from 'universe+backend:db.ts';

import { getEnv } from 'universe+backend:env.ts';

import {
  ClientValidationError,
  ErrorMessage,
  NotFoundError
} from 'universe+shared:error.ts';

import type {
  InternalFileNode,
  InternalMetaNode,
  InternalNode,
  InternalUser,
  NewFileNode,
  NewMetaNode,
  NewNode,
  NewUser,
  NodePermission,
  PatchFileNode,
  PatchMetaNode,
  PatchNode,
  PatchUser,
  PublicNode,
  PublicUser,
  UserId,
  Username
} from 'universe+backend:db.ts';

// TODO: replace validation logic with Arktype

const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const usernameRegex = /^[a-zA-Z0-9_-]+$/;
const hexadecimalRegex = /^[a-fA-F0-9]+$/;

/**
 * Node properties that can be matched against with `searchNodes()` matchers.
 * Proxied properties should be listed in their final form.
 *
 * Specifically does not include tags or permissions, which are handled
 * specially.
 */
const matchableStrings = [
  'type',
  'owner',
  'createdAt',
  'modifiedAt',
  'name-lowercase', // * Proxied from name
  'size',
  'text'
];

/**
 * Node properties that can be matched against with `searchNodes()`
 * regexMatchers. Must be string fields. Proxied properties should be listed in
 * their final form.
 *
 * Specifically does not include tags or permissions, which are handled
 * specially.
 */
const regexMatchableStrings = [
  'type',
  'owner',
  'name-lowercase', // * Proxied from name
  'text'
];

/**
 * Whitelisted MongoDB sub-matchers that can be used with `searchNodes()`, not
 * including the special "$or" sub-matcher.
 */
const matchableSubStrings = ['$gt', '$lt', '$gte', '$lte'];

/**
 * Whitelisted MongoDB-esque sub-specifiers that can be used with
 * `searchNodes()` via the "$or" sub-matcher.
 */
type SubSpecifierObject = {
  [subspecifier in '$gt' | '$lt' | '$gte' | '$lte']?: number;
};

/**
 * Convert an array of strings into a set of proper node tags (still strings).
 */
const normalizeTags = (tags: string[]) => {
  return Array.from(new Set(tags.map((tag) => tag.toLowerCase())));
};

/**
 * Validate a username string for correctness.
 */
function validateUsername(username: unknown): username is Username {
  return (
    typeof username === 'string' &&
    usernameRegex.test(username) &&
    username.length >= getEnv().MIN_USER_NAME_LENGTH &&
    username.length <= getEnv().MAX_USER_NAME_LENGTH
  );
}

/**
 * Validate a new or patch user data object.
 */
function validateUserData(
  data: NewUser | PatchUser | undefined,
  { required }: { required: boolean }
): asserts data is NewUser | PatchUser {
  if (!data || !isRecord(data)) {
    throw new ClientValidationError(ErrorMessage.InvalidJSON());
  }

  const {
    USER_KEY_LENGTH,
    USER_SALT_LENGTH,
    MIN_USER_EMAIL_LENGTH,
    MAX_USER_EMAIL_LENGTH
  } = getEnv();

  if (
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (required || (!required && data.email !== undefined)) &&
    (typeof data.email !== 'string' ||
      !emailRegex.test(data.email) ||
      data.email.length < MIN_USER_EMAIL_LENGTH ||
      data.email.length > MAX_USER_EMAIL_LENGTH)
  ) {
    throw new ClientValidationError(
      ErrorMessage.InvalidStringLength(
        'email',
        MIN_USER_EMAIL_LENGTH,
        MAX_USER_EMAIL_LENGTH,
        'string'
      )
    );
  }

  if (
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (required || (!required && data.salt !== undefined)) &&
    (typeof data.salt !== 'string' ||
      !hexadecimalRegex.test(data.salt) ||
      data.salt.length !== USER_SALT_LENGTH)
  ) {
    throw new ClientValidationError(
      ErrorMessage.InvalidStringLength('salt', USER_SALT_LENGTH, null, 'hexadecimal')
    );
  }

  if (
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (required || (!required && data.key !== undefined)) &&
    (typeof data.key !== 'string' ||
      !hexadecimalRegex.test(data.key) ||
      data.key.length !== USER_KEY_LENGTH)
  ) {
    throw new ClientValidationError(
      ErrorMessage.InvalidStringLength('key', USER_KEY_LENGTH, null, 'hexadecimal')
    );
  }
}

/**
 * Validate a new or patch file or meta node data object. If no `type` is
 * explicitly provided, a data must be a valid NewNode instance with all
 * required fields. If `type` is provided, data must be a valid PatchNode
 * instance where all fields are optional.
 */
async function validateNodeData(
  data: NewNode | PatchNode | undefined,
  { type }: { type: NonNullable<NewNode['type']> | null }
) {
  if (!data || !isRecord(data)) {
    throw new ClientValidationError(ErrorMessage.InvalidJSON());
  }

  const isNewNode = (_obj: typeof data): _obj is NewNode => {
    return type === null;
  };

  const isNewFileNode = (obj: NewNode): obj is NewFileNode => {
    return isNewNode(obj) && obj.type === 'file';
  };

  const isNewMetaNode = (obj: NewNode): obj is NewMetaNode => {
    return isNewNode(obj) && obj.type !== 'file';
  };

  const isPatchNode = (_obj: typeof data): _obj is PatchNode => {
    return type !== null;
  };

  const isPatchFileNode = (obj: typeof data): obj is PatchFileNode => {
    return isPatchNode(obj) && type === 'file';
  };

  const isPatchMetaNode = (obj: typeof data): obj is PatchMetaNode => {
    return isPatchNode(obj) && type !== 'file';
  };

  const {
    MAX_USER_NAME_LENGTH,
    MIN_USER_NAME_LENGTH,
    MAX_LOCK_CLIENT_LENGTH,
    MAX_NODE_NAME_LENGTH,
    MAX_NODE_TAGS,
    MAX_NODE_TAG_LENGTH,
    MAX_NODE_PERMISSIONS,
    MAX_NODE_CONTENTS,
    MAX_NODE_TEXT_LENGTH_BYTES
  } = getEnv();

  const db = await getDb({ name: 'app' });
  const users = db.collection('users');

  if (
    isNewNode(data) &&
    (typeof data.type !== 'string' ||
      !['file', 'directory', 'symlink'].includes(data.type))
  ) {
    throw new ClientValidationError(ErrorMessage.InvalidFieldValue('type'));
  }

  const typeActual = (isNewNode(data) ? data.type : type)!;

  if (
    (isNewNode(data) || data.name !== undefined) &&
    (typeof data.name !== 'string' ||
      !data.name.length ||
      data.name.length > MAX_NODE_NAME_LENGTH)
  ) {
    throw new ClientValidationError(
      ErrorMessage.InvalidStringLength('name', 1, MAX_NODE_NAME_LENGTH, 'string')
    );
  }

  if (isNewNode(data) || data.permissions !== undefined) {
    if (!data.permissions || !isRecord(data.permissions)) {
      throw new ClientValidationError(ErrorMessage.InvalidFieldValue('permissions'));
    } else {
      const permsEntries = Object.entries(data.permissions);

      if (
        !permsEntries.every(([k, v]) => {
          return (
            typeof k === 'string' &&
            ['view', 'edit'].includes(v) &&
            (k !== 'public' || (typeActual === 'file' && v === 'view'))
          );
        })
      ) {
        throw new ClientValidationError(
          ErrorMessage.InvalidObjectKeyValue('permissions')
        );
      } else if (permsEntries.length > MAX_NODE_PERMISSIONS) {
        throw new ClientValidationError(
          ErrorMessage.TooManyItemsRequested('permissions')
        );
      } else {
        await Promise.all(
          permsEntries.map(async ([username]) => {
            if (
              username !== 'public' &&
              !(await itemExists(users, { key: 'username', id: username }))
            ) {
              throw new NotFoundError(
                ErrorMessage.ItemNotFound(username, 'user (permissions)')
              );
            }
          })
        );
      }
    }
  }

  if (
    (isNewFileNode(data) || (isPatchFileNode(data) && data.text !== undefined)) &&
    (typeof data.text !== 'string' || data.text.length > MAX_NODE_TEXT_LENGTH_BYTES)
  ) {
    throw new ClientValidationError(
      ErrorMessage.InvalidStringLength('text', 0, MAX_NODE_TEXT_LENGTH_BYTES, 'bytes')
    );
  }

  if (isNewFileNode(data) || (isPatchFileNode(data) && data.tags !== undefined)) {
    if (!Array.isArray(data.tags)) {
      throw new ClientValidationError(ErrorMessage.InvalidFieldValue('tags'));
    } else if (data.tags.length > MAX_NODE_TAGS) {
      throw new ClientValidationError(ErrorMessage.TooManyItemsRequested('tags'));
    } else if (
      !data.tags.every(
        (tag) =>
          tag &&
          typeof tag === 'string' &&
          tag.length >= 1 &&
          tag.length <= MAX_NODE_TAG_LENGTH
      )
    ) {
      throw new ClientValidationError(
        ErrorMessage.InvalidStringLength(
          'tags',
          1,
          MAX_NODE_TAG_LENGTH,
          'alphanumeric',
          false,
          true
        )
      );
    }
  }

  if (
    (isNewFileNode(data) || (isPatchFileNode(data) && data.lock !== undefined)) &&
    data.lock !== null
  ) {
    if (!data.lock || !isRecord(data.lock)) {
      throw new ClientValidationError(ErrorMessage.InvalidFieldValue('lock'));
    } else if (!validateUsername(data.lock.user)) {
      throw new ClientValidationError(
        ErrorMessage.InvalidStringLength(
          'lock.user',
          MIN_USER_NAME_LENGTH,
          MAX_USER_NAME_LENGTH
        )
      );
    } else if (
      typeof data.lock.client !== 'string' ||
      data.lock.client.length < 1 ||
      data.lock.client.length > MAX_LOCK_CLIENT_LENGTH
    ) {
      throw new ClientValidationError(
        ErrorMessage.InvalidStringLength(
          'lock.client',
          1,
          MAX_LOCK_CLIENT_LENGTH,
          'string'
        )
      );
    } else if (typeof data.lock.createdAt !== 'number' || data.lock.createdAt <= 0) {
      throw new ClientValidationError(ErrorMessage.InvalidFieldValue('lock.createdAt'));
    } else if (Object.keys(data.lock).length !== 3) {
      throw new ClientValidationError(ErrorMessage.InvalidObjectKeyValue('lock'));
    }
  }

  if (isNewMetaNode(data) || (isPatchMetaNode(data) && data.contents !== undefined)) {
    if (!Array.isArray(data.contents)) {
      throw new ClientValidationError(ErrorMessage.InvalidFieldValue('contents'));
    } else if (
      data.contents.length > MAX_NODE_CONTENTS ||
      (typeActual === 'symlink' && data.contents.length > 1)
    ) {
      throw new ClientValidationError(
        ErrorMessage.TooManyItemsRequested('content node_ids')
      );
    } else {
      const fileNodes = db.collection('file-nodes');
      const metaNodes = db.collection('meta-nodes');

      await Promise.all(
        data.contents.map(async (node_id) => {
          try {
            if (
              !(await itemExists(fileNodes, node_id)) &&
              !(await itemExists(metaNodes, node_id))
            ) {
              throw new NotFoundError(ErrorMessage.ItemNotFound(node_id, 'node_id'));
            }
          } catch (error) {
            const error_ = NotFoundError.isError(error)
              ? error
              : new ClientValidationError(
                  ErrorMessage.InvalidArrayValue('contents', node_id)
                );
            throw error_;
          }
        })
      );
    }
  }

  if (
    isPatchNode(data) &&
    data.owner !== undefined &&
    !(await itemExists(users, { key: 'username', id: data.owner }))
  ) {
    throw new NotFoundError(ErrorMessage.ItemNotFound(data.owner, 'user'));
  }

  return true;
}

function assertNodeDataWasValidated(
  _data: NewNode | PatchNode | undefined
): asserts _data is NewNode | PatchNode {
  // ? Vacuously asserts data type, since it was already checked by
  // ? validateNodeData
}

export async function getAllUsers({
  after
}: {
  after: string | undefined;
}): Promise<PublicUser[]> {
  const afterId: UserId | undefined = (() => {
    try {
      return after ? new ObjectId(after) : undefined;
    } catch {
      throw new ClientValidationError(ErrorMessage.InvalidObjectId(after!));
    }
  })();

  const db = await getDb({ name: 'app' });
  const users = db.collection<InternalUser>('users');

  if (afterId && !(await itemExists(users, afterId))) {
    throw new NotFoundError(ErrorMessage.ItemNotFound(after, 'user_id'));
  }

  return users
    .find(afterId ? { _id: { $lt: afterId } } : {})
    .sort({ _id: -1 })
    .limit(getEnv().RESULTS_PER_PAGE)
    .project<PublicUser>(publicUserProjection)
    .toArray();
}

export async function getUser({
  username
}: {
  username: Username | undefined;
}): Promise<PublicUser> {
  if (!username) {
    throw new ClientValidationError(ErrorMessage.InvalidItem('username', 'parameter'));
  }

  const db = await getDb({ name: 'app' });
  const users = db.collection<InternalUser>('users');

  return (
    (await users.find({ username }).project<PublicUser>(publicUserProjection).next()) ||
    toss(new NotFoundError(ErrorMessage.ItemNotFound(username, 'user')))
  );
}

export async function createUser({
  data
}: {
  data: NewUser | undefined;
}): Promise<PublicUser> {
  validateUserData(data, { required: true });

  const { MAX_USER_NAME_LENGTH, MIN_USER_NAME_LENGTH } = getEnv();

  if (!validateUsername(data.username)) {
    throw new ClientValidationError(
      ErrorMessage.InvalidStringLength(
        'username',
        MIN_USER_NAME_LENGTH,
        MAX_USER_NAME_LENGTH
      )
    );
  }

  if (data.username === 'public') {
    throw new ClientValidationError(ErrorMessage.IllegalUsername());
  }

  const { email, username, key, salt, ...rest } = data as Required<NewUser>;
  const restKeys = Object.keys(rest);

  if (restKeys.length !== 0) {
    throw new ClientValidationError(ErrorMessage.UnknownField(restKeys[0]!));
  }

  const db = await getDb({ name: 'app' });
  const users = db.collection<InternalUser>('users');

  // * At this point, we can finally trust this data is not malicious, but not
  // * necessarily valid...
  try {
    await users.insertOne({
      _id: new ObjectId(),
      username,
      email,
      salt: salt.toLowerCase(),
      key: key.toLowerCase()
    });
  } catch (error) {
    /* istanbul ignore else */
    // eslint-disable-next-line no-restricted-syntax
    if (error instanceof MongoServerError && error.code === 11_000) {
      if (error.keyPattern?.username !== undefined) {
        throw new ClientValidationError(ErrorMessage.DuplicateFieldValue('username'));
      }

      /* istanbul ignore else */
      if (error.keyPattern?.email !== undefined) {
        throw new ClientValidationError(ErrorMessage.DuplicateFieldValue('email'));
      }
    }

    /* istanbul ignore next */
    throw error;
  }

  return getUser({ username });
}

export async function updateUser({
  username,
  data
}: {
  username: Username | undefined;
  data: PatchUser | undefined;
}): Promise<void> {
  if (data && !Object.keys(data).length) return;

  if (!username) {
    throw new ClientValidationError(ErrorMessage.InvalidItem('username', 'parameter'));
  }

  validateUserData(data, { required: false });

  const { email, key, salt, ...rest } = data as Required<PatchUser>;
  const restKeys = Object.keys(rest);

  if (restKeys.length !== 0) {
    throw new ClientValidationError(ErrorMessage.UnknownField(restKeys[0]!));
  }

  const db = await getDb({ name: 'app' });
  const users = db.collection<InternalUser>('users');

  // * At this point, we can finally trust this data is not malicious, but not
  // * necessarily valid...
  try {
    const result = await users.updateOne(
      { username },
      {
        $set: {
          ...(email ? { email } : {}),
          ...(salt ? { salt: salt.toLowerCase() } : {}),
          ...(key ? { key: key.toLowerCase() } : {})
        }
      }
    );

    if (!result.matchedCount) {
      throw new NotFoundError(ErrorMessage.ItemNotFound(username, 'user'));
    }
  } catch (error) {
    if (
      // eslint-disable-next-line no-restricted-syntax
      error instanceof MongoServerError &&
      error.code === 11_000 /* istanbul ignore else */ &&
      error.keyPattern?.email !== undefined
    ) {
      throw new ClientValidationError(ErrorMessage.DuplicateFieldValue('email'));
    }

    throw error;
  }
}

export async function deleteUser({
  username
}: {
  username: Username | undefined;
}): Promise<void> {
  if (!username) {
    throw new ClientValidationError(ErrorMessage.InvalidItem('username', 'parameter'));
  }

  const db = await getDb({ name: 'app' });
  const users = db.collection<InternalUser>('users');
  const fileNodes = db.collection<InternalNode>('file-nodes');
  const metaNodes = db.collection<InternalNode>('meta-nodes');
  const result = await users.deleteOne({ username });

  if (!result.deletedCount) {
    throw new NotFoundError(ErrorMessage.ItemNotFound(username, 'user'));
  }

  await Promise.all(
    [fileNodes, metaNodes].map((col) =>
      col.updateMany(
        { [`permissions.${username}`]: { $exists: true } },
        { $unset: { [`permissions.${username}`]: '' } }
      )
    )
  );
}

export async function authAppUser({
  username,
  key
}: {
  username: Username | undefined;
  key: string | undefined;
}): Promise<boolean> {
  if (!key || !username) return false;

  const db = await getDb({ name: 'app' });
  const users = db.collection<InternalUser>('users');

  return !!(await users.countDocuments({ username, key }));
}

export async function getNodes({
  username,
  node_ids
}: {
  username: Username | undefined;
  node_ids: string[] | undefined;
}): Promise<PublicNode[]> {
  if (!username) {
    throw new ClientValidationError(ErrorMessage.InvalidItem('username', 'parameter'));
  }

  if (!node_ids) {
    throw new ClientValidationError(ErrorMessage.InvalidItem('node_ids', 'parameter'));
  }

  const db = await getDb({ name: 'app' });
  const users = db.collection<InternalUser>('users');

  if (node_ids.length > getEnv().MAX_PARAMS_PER_REQUEST) {
    throw new ClientValidationError(ErrorMessage.TooManyItemsRequested('node_ids'));
  }

  if (!(await itemExists(users, { key: 'username', id: username }))) {
    throw new NotFoundError(ErrorMessage.ItemNotFound(username, 'user'));
  }

  const nodeIds = itemToObjectId(node_ids);
  const $match = {
    _id: { $in: nodeIds },
    $or: [{ owner: username }, { [`permissions.${username}`]: { $exists: true } }]
  };

  const nodes = await db
    .collection('file-nodes')
    .aggregate<PublicNode>([
      { $match },
      { $project: { ...publicFileNodeProjection, _id: true } },
      {
        $unionWith: {
          coll: 'meta-nodes',
          pipeline: [
            { $match },
            { $project: { ...publicMetaNodeProjection, _id: true } }
          ]
        }
      },
      { $sort: { _id: -1 } },
      { $limit: getEnv().RESULTS_PER_PAGE },
      { $project: { _id: false } }
    ])
    .toArray();

  if (nodes.length !== node_ids.length) {
    throw new NotFoundError(ErrorMessage.ItemOrItemsNotFound('node_ids'));
  } else return nodes;
}

export async function searchNodes({
  username,
  after,
  match,
  regexMatch
}: {
  username: Username | undefined;
  after: string | undefined;
  match: {
    [specifier: string]:
      | string
      | string[]
      | number
      | boolean
      | SubSpecifierObject
      | { $or: SubSpecifierObject[] }
      | Record<string, NodePermission>;
  };
  regexMatch: {
    [specifier: string]: string;
  };
}): Promise<PublicNode[]> {
  if (!username) {
    throw new ClientValidationError(ErrorMessage.InvalidItem('username', 'parameter'));
  }

  const { MAX_SEARCHABLE_TAGS, RESULTS_PER_PAGE } = getEnv();

  // ? Derive the actual after_id
  const afterId: UserId | undefined = (() => {
    try {
      return after ? new ObjectId(after) : undefined;
    } catch {
      throw new ClientValidationError(ErrorMessage.InvalidObjectId(after!));
    }
  })();

  // ? Initial matcher validation
  if (!isRecord(match)) {
    throw new ClientValidationError(ErrorMessage.InvalidMatcher('match'));
  } else if (!isRecord(regexMatch)) {
    throw new ClientValidationError(ErrorMessage.InvalidMatcher('regexMatch'));
  }

  // ? Handle aliasing/proxying
  [regexMatch, match].forEach((matchSpec) => {
    if (typeof matchSpec.name === 'string') {
      matchSpec['name-lowercase'] = matchSpec.name.toLowerCase();
      delete matchSpec.name;
    }

    if (Array.isArray(matchSpec.tags)) {
      matchSpec.tags = normalizeTags(matchSpec.tags);
    }
  });

  // ? Validate username and after_id

  const db = await getDb({ name: 'app' });
  const users = db.collection<InternalUser>('users');
  const fileNodes = db.collection('file-nodes');
  const metaNodes = db.collection('meta-nodes');

  if (
    afterId &&
    !(await itemExists(fileNodes, afterId)) &&
    !(await itemExists(metaNodes, afterId))
  ) {
    throw new NotFoundError(ErrorMessage.ItemNotFound(after, 'node_id'));
  }

  if (!(await itemExists(users, { key: 'username', id: username }))) {
    throw new NotFoundError(ErrorMessage.ItemNotFound(username, 'user'));
  }

  // ? Validate the match object
  let sawPermissionsSpecifier = false;
  for (const [key, val] of Object.entries(match)) {
    if (key === 'tags') {
      if (!Array.isArray(val)) {
        throw new ClientValidationError(
          ErrorMessage.InvalidSpecifierValueType(key, 'an array')
        );
      }

      if (val.length > MAX_SEARCHABLE_TAGS) {
        throw new ClientValidationError(
          ErrorMessage.TooManyItemsRequested('searchable tags')
        );
      }
    } else if (key === 'permissions') {
      throw new ClientValidationError(ErrorMessage.UnknownPermissionsSpecifier());
    } else if (key.startsWith('permissions.')) {
      if (sawPermissionsSpecifier) {
        throw new ClientValidationError(
          ErrorMessage.TooManyItemsRequested('permissions specifiers')
        );
      }
      sawPermissionsSpecifier = true;
    } else {
      if (!matchableStrings.includes(key)) {
        throw new ClientValidationError(ErrorMessage.UnknownSpecifier(key));
      }

      if (isRecord(val)) {
        let valNotEmpty = false;

        for (const [subkey, subval] of Object.entries(val)) {
          if (subkey === '$or') {
            if (!Array.isArray(subval) || subval.length !== 2) {
              throw new ClientValidationError(ErrorMessage.InvalidOrSpecifier());
            }

            if (
              subval.every((sv, ndx) => {
                if (!isRecord(sv)) {
                  throw new ClientValidationError(
                    ErrorMessage.InvalidOrSpecifierNonObject(ndx)
                  );
                }

                const entries = Object.entries(sv);

                if (!entries.length) return false;
                if (entries.length !== 1) {
                  throw new ClientValidationError(
                    ErrorMessage.InvalidOrSpecifierBadLength(ndx)
                  );
                }

                entries.forEach(([k, v]) => {
                  if (!matchableSubStrings.includes(k)) {
                    throw new ClientValidationError(
                      ErrorMessage.InvalidOrSpecifierInvalidKey(ndx, k)
                    );
                  }

                  if (typeof v !== 'number') {
                    throw new ClientValidationError(
                      ErrorMessage.InvalidOrSpecifierInvalidValueType(ndx, k)
                    );
                  }
                });

                return true;
              })
            ) {
              valNotEmpty = true;
            }
          } else {
            valNotEmpty = true;
            if (!matchableSubStrings.includes(subkey)) {
              throw new ClientValidationError(
                ErrorMessage.UnknownSpecifier(subkey, true)
              );
            }

            if (typeof subval !== 'number') {
              throw new ClientValidationError(
                ErrorMessage.InvalidSpecifierValueType(subkey, 'a number', true)
              );
            }
          }
        }

        if (!valNotEmpty)
          throw new ClientValidationError(
            ErrorMessage.InvalidSpecifierValueType(key, 'a non-empty object')
          );
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      } else if (val !== null && !['number', 'string', 'boolean'].includes(typeof val)) {
        throw new ClientValidationError(
          ErrorMessage.InvalidSpecifierValueType(
            key,
            'a number, string, boolean, or sub-specifier object'
          )
        );
      }
    }
  }

  // ? Validate the regexMatch object
  for (const [key, val] of Object.entries(regexMatch)) {
    if (key === 'permissions') {
      throw new ClientValidationError(ErrorMessage.UnknownPermissionsSpecifier());
    } else if (key.startsWith('permissions.')) {
      if (sawPermissionsSpecifier) {
        throw new ClientValidationError(
          ErrorMessage.TooManyItemsRequested('permissions specifiers')
        );
      }
      sawPermissionsSpecifier = true;
    } else {
      if (!regexMatchableStrings.includes(key)) {
        throw new ClientValidationError(ErrorMessage.UnknownSpecifier(key));
      }

      if (!val || typeof val !== 'string') {
        throw new ClientValidationError(ErrorMessage.InvalidRegexString(key));
      }
    }
  }

  // ? Construct aggregation primitives

  const finalRegexMatch = Object.entries(regexMatch).reduce<Record<string, unknown>>(
    (obj, [spec, val]) => {
      obj[spec] = { $regex: val, $options: 'mi' };
      return obj;
    },
    {}
  );

  const orMatcher: { [key: string]: SubSpecifierObject }[] = [];
  const tagsMatcher: { tags?: { $in: string[] } } = {};

  // ? Special handling for tags matching
  if (match.tags) {
    tagsMatcher.tags = { $in: match.tags as string[] };
    delete match.tags;
  }

  // ? Separate out the $or sub-specifiers for special treatment
  Object.entries(match).forEach(([spec, val]) => {
    if (isRecord(val)) {
      const obj = val as { $or?: unknown };

      if (obj.$or) {
        (obj.$or as SubSpecifierObject[]).forEach((operand) =>
          orMatcher.push({
            [spec]: operand
          })
        );
        delete obj.$or;
      }

      // ? Delete useless matchers if they've been emptied out
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-dynamic-delete
      if (obj && !Object.keys(obj).length) delete match[spec];
    }
  });

  const $match = {
    ...(afterId ? { _id: { $lt: afterId } } : {}),
    ...match,
    $and: [
      {
        $or: [{ owner: username }, { [`permissions.${username}`]: { $exists: true } }]
      },
      ...(orMatcher.length ? [{ $or: orMatcher }] : [])
    ],
    ...tagsMatcher,
    ...finalRegexMatch
  };

  const pipeline = [
    { $match },
    { $project: { ...publicFileNodeProjection, _id: true } },
    {
      $unionWith: {
        coll: 'meta-nodes',
        pipeline: [{ $match }, { $project: { ...publicMetaNodeProjection, _id: true } }]
      }
    },
    { $sort: { _id: -1 } },
    { $limit: RESULTS_PER_PAGE },
    { $project: { _id: false } }
  ];

  // ? Run the aggregation and return the result
  return db.collection('file-nodes').aggregate<PublicNode>(pipeline).toArray();
}

export async function createNode({
  username,
  data
}: {
  username: Username | undefined;
  data: NewNode | undefined;
}): Promise<PublicNode> {
  if (!username) {
    throw new ClientValidationError(ErrorMessage.InvalidItem('username', 'parameter'));
  }

  await validateNodeData(data, { type: null });
  assertNodeDataWasValidated(data);

  const db = await getDb({ name: 'app' });
  const users = db.collection<InternalUser>('users');
  const node_id = new ObjectId();

  if (!(await itemExists(users, { key: 'username', id: username }))) {
    throw new NotFoundError(ErrorMessage.ItemNotFound(username, 'user'));
  }

  if (data.type === 'file') {
    const fileNodes = db.collection<InternalFileNode>('file-nodes');
    const { type, name, text, tags, lock, permissions, ...rest } =
      data as Required<NewFileNode>;
    const restKeys = Object.keys(rest);

    if (restKeys.length !== 0) {
      throw new ClientValidationError(ErrorMessage.UnknownField(restKeys[0]!));
    }

    // * At this point, we can finally trust this data is not malicious.
    await fileNodes.insertOne({
      _id: node_id,
      owner: username,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      type,
      name,
      'name-lowercase': name.toLowerCase(),
      text,
      size: text.length,
      tags: normalizeTags(tags),
      lock,
      permissions
    });
  } else {
    const metaNodes = db.collection<InternalMetaNode>('meta-nodes');
    const { type, name, contents, permissions, ...rest } = data as Required<NewMetaNode>;
    const restKeys = Object.keys(rest);

    if (restKeys.length !== 0) {
      throw new ClientValidationError(ErrorMessage.UnknownField(restKeys[0]!));
    }

    // * At this point, we can finally trust this data is not malicious.
    await metaNodes.insertOne({
      _id: node_id,
      owner: username,
      createdAt: Date.now(),
      type,
      name,
      'name-lowercase': name.toLowerCase(),
      contents: itemToObjectId(contents),
      permissions
    });
  }

  return (await getNodes({ username, node_ids: [node_id.toString()] }))[0]!;
}

export async function updateNode({
  username,
  node_id,
  data
}: {
  username: Username | undefined;
  node_id: string | undefined;
  data: PatchNode | undefined;
}): Promise<void> {
  if (data && !Object.keys(data).length) return;

  if (!username) {
    throw new ClientValidationError(ErrorMessage.InvalidItem('username', 'parameter'));
  } else if (!node_id) {
    throw new ClientValidationError(ErrorMessage.InvalidItem('node_id', 'parameter'));
  }

  const db = await getDb({ name: 'app' });
  const users = db.collection<InternalUser>('users');
  const fileNodes = db.collection<InternalFileNode>('file-nodes');
  const metaNodes = db.collection<InternalMetaNode>('meta-nodes');

  const nodeId = (() => {
    try {
      return new ObjectId(node_id);
    } catch {
      throw new ClientValidationError(ErrorMessage.InvalidObjectId(node_id));
    }
  })();

  if (!(await itemExists(users, { key: 'username', id: username }))) {
    throw new NotFoundError(ErrorMessage.ItemNotFound(username, 'user'));
  }

  const $match = {
    _id: nodeId,
    $or: [{ owner: username }, { [`permissions.${username}`]: 'edit' }]
  };

  const node = await db
    .collection('file-nodes')
    .aggregate<PublicNode>([
      { $match },
      { $project: { type: true } },
      {
        $unionWith: {
          coll: 'meta-nodes',
          pipeline: [{ $match }, { $project: { type: true } }]
        }
      }
    ])
    .next();

  if (!node) {
    throw new NotFoundError(ErrorMessage.ItemNotFound(node_id, 'node_id'));
  }

  await validateNodeData(data, { type: node.type });
  assertNodeDataWasValidated(data);

  if (node.type === 'file') {
    const { name, text, tags, lock, permissions, owner, ...rest } =
      data as PatchFileNode;
    const restKeys = Object.keys(rest);

    if (restKeys.length !== 0) {
      throw new ClientValidationError(ErrorMessage.UnknownField(restKeys[0]!));
    }

    // * At this point, we can finally trust this data is not malicious.
    await fileNodes.updateOne(
      { _id: nodeId },
      {
        $set: {
          modifiedAt: Date.now(),
          ...(owner ? { owner } : {}),
          ...(name ? { name, 'name-lowercase': name.toLowerCase() } : {}),
          ...(text ? { text, size: text.length } : {}),
          ...(tags ? { tags: normalizeTags(tags) } : {}),
          ...(lock ? { lock } : {}),
          ...(permissions ? { permissions } : {})
        }
      }
    );
  } else {
    const { name, contents, permissions, owner, ...rest } = data as PatchMetaNode;
    const restKeys = Object.keys(rest);

    if (restKeys.length !== 0) {
      throw new ClientValidationError(ErrorMessage.UnknownField(restKeys[0]!));
    }

    // * At this point, we can finally trust this data is not malicious.
    await metaNodes.updateOne(
      { _id: nodeId },
      {
        $set: {
          ...(owner ? { owner } : {}),
          ...(name ? { name, 'name-lowercase': name.toLowerCase() } : {}),
          ...(contents ? { contents: itemToObjectId(contents) } : {}),
          ...(permissions ? { permissions } : {})
        }
      }
    );
  }
}

export async function deleteNodes({
  username,
  node_ids
}: {
  username: Username | undefined;
  node_ids: string[] | undefined;
}): Promise<void> {
  if (!username) {
    throw new ClientValidationError(ErrorMessage.InvalidItem('username', 'parameter'));
  } else if (!node_ids) {
    throw new ClientValidationError(ErrorMessage.InvalidItem('node_ids', 'parameter'));
  }

  if (node_ids.length > getEnv().MAX_PARAMS_PER_REQUEST) {
    throw new ClientValidationError(ErrorMessage.TooManyItemsRequested('node_ids'));
  }

  const db = await getDb({ name: 'app' });
  const users = db.collection<InternalUser>('users');
  const fileNodes = db.collection<InternalNode>('file-nodes');
  const metaNodes = db.collection<InternalNode>('meta-nodes');
  const nodeIds = itemToObjectId(node_ids);

  if (!(await itemExists(users, { key: 'username', id: username }))) {
    throw new NotFoundError(ErrorMessage.ItemNotFound(username, 'user'));
  }

  await Promise.all([
    fileNodes.deleteMany({ _id: { $in: nodeIds }, owner: username }),
    metaNodes.deleteMany({ _id: { $in: nodeIds }, owner: username })
  ]);

  await metaNodes.updateMany(
    // * Is this more optimal than a full scan?
    { contents: { $in: nodeIds } },
    { $pull: { contents: { $in: nodeIds } } }
  );
}
