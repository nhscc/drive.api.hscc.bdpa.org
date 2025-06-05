import { asMocked } from 'testverse/util';

import {
  authAppUser,
  createNode,
  createUser,
  deleteNodes,
  deleteUser,
  getAllUsers,
  getNodes,
  getUser,
  searchNodes,
  updateNode,
  updateUser
} from 'universe/backend';

import CatchAllForNotFoundEndpoint, {
  config as CatchAllForNotFoundConfig,
  metadata as CatchAllForNotFoundMetadata
} from 'universe/pages/api/[[...catchAllForNotFound]]';

import V1EndpointUsers, {
  config as V1ConfigUsers,
  metadata as V1MetadataUsers
} from 'universe/pages/api/v1/users';

import V1EndpointUsersUsername, {
  config as V1ConfigUsersUsername,
  metadata as V1MetadataUsersUsername
} from 'universe/pages/api/v1/users/[username]';

import V1EndpointUsersUsernameAuth, {
  config as V1ConfigUsersUsernameAuth,
  metadata as V1MetadataUsersUsernameAuth
} from 'universe/pages/api/v1/users/[username]/auth';

import V1EndpointFilesystemUsername, {
  config as V1ConfigFilesystemUsername,
  metadata as V1MetadataFilesystemUsername
} from 'universe/pages/api/v1/filesystem/[username]';

import V1EndpointFilesystemUsernameNodeId, {
  config as V1ConfigFilesystemUsernameNodeId,
  metadata as V1MetadataFilesystemUsernameNodeId
} from 'universe/pages/api/v1/filesystem/[username]/[...node_ids]';

import V1EndpointFilesystemUsernameSearch, {
  config as V1ConfigFilesystemUsernameSearch,
  metadata as V1MetadataFilesystemUsernameSearch
} from 'universe/pages/api/v1/filesystem/[username]/search';

import V2EndpointUsers, {
  config as V2ConfigUsers,
  metadata as V2MetadataUsers
} from 'universe/pages/api/v2/users';

import V2EndpointUsersUsername, {
  config as V2ConfigUsersUsername,
  metadata as V2MetadataUsersUsername
} from 'universe/pages/api/v2/users/[username]';

import V2EndpointUsersUsernameAuth, {
  config as V2ConfigUsersUsernameAuth,
  metadata as V2MetadataUsersUsernameAuth
} from 'universe/pages/api/v2/users/[username]/auth';

import V2EndpointUsersUsernameFilesystem, {
  config as V2ConfigUsersUsernameFilesystem,
  metadata as V2MetadataUsersUsernameFilesystem
} from 'universe/pages/api/v2/users/[username]/filesystem';

import V2EndpointUsersUsernameFilesystemNodeId, {
  config as V2ConfigUsersUsernameFilesystemNodeId,
  metadata as V2MetadataUsersUsernameFilesystemNodeId
} from 'universe/pages/api/v2/users/[username]/filesystem/[...node_ids]';

import V2EndpointUsersUsernameFilesystemSearch, {
  config as V2ConfigUsersUsernameFilesystemSearch,
  metadata as V2MetadataUsersUsernameFilesystemSearch
} from 'universe/pages/api/v2/users/[username]/filesystem/search';

import type { NextApiHandler, PageConfig } from 'next';
import type { PublicNode, PublicUser } from 'universe/backend/db';

export type NextApiHandlerMixin = NextApiHandler & {
  config?: PageConfig;
  uri?: string;
};

/**
 * The entire live API topology gathered together into one convenient object.
 */
export const api = {
  catchAllForNotFound: CatchAllForNotFoundEndpoint as NextApiHandlerMixin,
  v1: {
    users: V1EndpointUsers as NextApiHandlerMixin,
    usersUsername: V1EndpointUsersUsername as NextApiHandlerMixin,
    usersUsernameAuth: V1EndpointUsersUsernameAuth as NextApiHandlerMixin,
    filesystemUsername: V1EndpointFilesystemUsername as NextApiHandlerMixin,
    filesystemUsernameNodeId: V1EndpointFilesystemUsernameNodeId as NextApiHandlerMixin,
    filesystemUsernameSearch: V1EndpointFilesystemUsernameSearch as NextApiHandlerMixin
  },
  v2: {
    users: V2EndpointUsers as NextApiHandlerMixin,
    usersUsername: V2EndpointUsersUsername as NextApiHandlerMixin,
    usersUsernameAuth: V2EndpointUsersUsernameAuth as NextApiHandlerMixin,
    usersUsernameFilesystem: V2EndpointUsersUsernameFilesystem as NextApiHandlerMixin,
    usersUsernameFilesystemNodeId:
      V2EndpointUsersUsernameFilesystemNodeId as NextApiHandlerMixin,
    usersUsernameFilesystemSearch:
      V2EndpointUsersUsernameFilesystemSearch as NextApiHandlerMixin
  }
};

// **                           **
// ** Add configuration objects **
// **                           **

api.catchAllForNotFound.config = CatchAllForNotFoundConfig;

api.v1.users.config = V1ConfigUsers;
api.v1.usersUsername.config = V1ConfigUsersUsername;
api.v1.usersUsernameAuth.config = V1ConfigUsersUsernameAuth;
api.v1.filesystemUsername.config = V1ConfigFilesystemUsername;
api.v1.filesystemUsernameNodeId.config = V1ConfigFilesystemUsernameNodeId;
api.v1.filesystemUsernameSearch.config = V1ConfigFilesystemUsernameSearch;
api.v2.users.config = V2ConfigUsers;
api.v2.usersUsername.config = V2ConfigUsersUsername;
api.v2.usersUsernameAuth.config = V2ConfigUsersUsernameAuth;
api.v2.usersUsernameFilesystem.config = V2ConfigUsersUsernameFilesystem;
api.v2.usersUsernameFilesystemNodeId.config = V2ConfigUsersUsernameFilesystemNodeId;
api.v2.usersUsernameFilesystemSearch.config = V2ConfigUsersUsernameFilesystemSearch;

// **                           **
// ** Add metadata descriptors  **
// **                           **

api.catchAllForNotFound.uri = CatchAllForNotFoundMetadata.descriptor;

api.v1.users.uri = V1MetadataUsers.descriptor;
api.v1.usersUsername.uri = V1MetadataUsersUsername.descriptor;
api.v1.usersUsernameAuth.uri = V1MetadataUsersUsernameAuth.descriptor;
api.v1.filesystemUsername.uri = V1MetadataFilesystemUsername.descriptor;
api.v1.filesystemUsernameNodeId.uri = V1MetadataFilesystemUsernameNodeId.descriptor;
api.v1.filesystemUsernameSearch.uri = V1MetadataFilesystemUsernameSearch.descriptor;
api.v2.users.uri = V2MetadataUsers.descriptor;
api.v2.usersUsername.uri = V2MetadataUsersUsername.descriptor;
api.v2.usersUsernameAuth.uri = V2MetadataUsersUsernameAuth.descriptor;
api.v2.usersUsernameFilesystem.uri = V2MetadataUsersUsernameFilesystem.descriptor;
api.v2.usersUsernameFilesystemNodeId.uri =
  V2MetadataUsersUsernameFilesystemNodeId.descriptor;
api.v2.usersUsernameFilesystemSearch.uri =
  V2MetadataUsersUsernameFilesystemSearch.descriptor;

/**
 * A convenience function that mocks the entire backend and returns the mock
 * functions. Uses `beforeEach` under the hood.
 *
 * **WARNING: YOU MUST CALL `jest.mock('universe/backend')` before calling this
 * function!**
 */
export function setupMockBackend() {
  const mockedAuthAppUser = asMocked(authAppUser);
  const mockedCreateNode = asMocked(createNode);
  const mockedCreateUser = asMocked(createUser);
  const mockedDeleteNodes = asMocked(deleteNodes);
  const mockedDeleteUser = asMocked(deleteUser);
  const mockedGetAllUsers = asMocked(getAllUsers);
  const mockedGetNodes = asMocked(getNodes);
  const mockedGetUser = asMocked(getUser);
  const mockedSearchNodes = asMocked(searchNodes);
  const mockedUpdateNode = asMocked(updateNode);
  const mockedUpdateUser = asMocked(updateUser);

  beforeEach(() => {
    mockedAuthAppUser.mockReturnValue(Promise.resolve(false));
    mockedCreateNode.mockReturnValue(Promise.resolve({} as PublicNode));
    mockedCreateUser.mockReturnValue(Promise.resolve({} as PublicUser));
    mockedDeleteNodes.mockReturnValue(Promise.resolve());
    mockedDeleteUser.mockReturnValue(Promise.resolve());
    mockedGetAllUsers.mockReturnValue(Promise.resolve([]));
    mockedGetNodes.mockReturnValue(Promise.resolve([]));
    mockedGetUser.mockReturnValue(Promise.resolve({} as PublicUser));
    mockedSearchNodes.mockReturnValue(Promise.resolve([]));
    mockedUpdateNode.mockReturnValue(Promise.resolve());
    mockedUpdateUser.mockReturnValue(Promise.resolve());
  });

  return {
    mockedAuthAppUser,
    mockedCreateNode,
    mockedCreateUser,
    mockedDeleteNodes,
    mockedDeleteUser,
    mockedGetAllUsers,
    mockedGetNodes,
    mockedGetUser,
    mockedSearchNodes,
    mockedUpdateNode,
    mockedUpdateUser
  };
}
