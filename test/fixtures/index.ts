import { asMockedFunction } from '@xunnamius/jest-types';

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

import V1EndpointUsers, { config as V1ConfigUsers } from 'universe/pages/api/v1/users';

import V1EndpointUsersUsername, {
  config as V1ConfigUsersUsername
} from 'universe/pages/api/v1/users/[username]';

import V1EndpointUsersUsernameAuth, {
  config as V1ConfigUsersUsernameAuth
} from 'universe/pages/api/v1/users/[username]/auth';

import V1EndpointFilesystemUsername, {
  config as V1ConfigFilesystemUsername
} from 'universe/pages/api/v1/filesystem/[username]';

import V1EndpointFilesystemUsernameNodeId, {
  config as V1ConfigFilesystemUsernameNodeId
} from 'universe/pages/api/v1/filesystem/[username]/[...node_ids]';

import V1EndpointFilesystemUsernameSearch, {
  config as V1ConfigFilesystemUsernameSearch
} from 'universe/pages/api/v1/filesystem/[username]/search';

import V2EndpointUsers, { config as V2ConfigUsers } from 'universe/pages/api/v2/users';

import V2EndpointUsersUsername, {
  config as V2ConfigUsersUsername
} from 'universe/pages/api/v2/users/[username]';

import V2EndpointUsersUsernameAuth, {
  config as V2ConfigUsersUsernameAuth
} from 'universe/pages/api/v2/users/[username]/auth';

import V2EndpointUsersUsernameFilesystem, {
  config as V2ConfigUsersUsernameFilesystem
} from 'universe/pages/api/v2/users/[username]/filesystem';

import V2EndpointUsersUsernameFilesystemNodeId, {
  config as V2ConfigUsersUsernameFilesystemNodeId
} from 'universe/pages/api/v2/users/[username]/filesystem/[...node_ids]';

import V2EndpointUsersUsernameFilesystemSearch, {
  config as V2ConfigUsersUsernameFilesystemSearch
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
  v1: {
    users: V1EndpointUsers as NextApiHandlerMixin,
    usersUsername: V1EndpointUsersUsername as NextApiHandlerMixin,
    usersUsernameAuth: V1EndpointUsersUsernameAuth as NextApiHandlerMixin,
    filesystemUsername: V1EndpointFilesystemUsername as NextApiHandlerMixin,
    filesystemUsernameNodeId:
      V1EndpointFilesystemUsernameNodeId as NextApiHandlerMixin,
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

api.v1.users.uri = '/users';
api.v1.usersUsername.uri = '/users/:username';
api.v1.usersUsernameAuth.uri = '/users/:username/auth';
api.v1.filesystemUsername.uri = '/filesystem/:username';
api.v1.filesystemUsernameNodeId.uri = '/filesystem/:username/:node_id';
api.v1.filesystemUsernameSearch.uri = '/filesystem/:username/search';
api.v2.users.uri = '/users';
api.v2.usersUsername.uri = '/users/:username';
api.v2.usersUsernameAuth.uri = '/users/:username/auth';
api.v2.usersUsernameFilesystem.uri = '/users/:username/filesystem';
api.v2.usersUsernameFilesystemNodeId.uri = '/users/:username/filesystem/:node_id';
api.v2.usersUsernameFilesystemSearch.uri = '/users/:username/filesystem/search';

/**
 * A convenience function that mocks the entire backend and returns the mock
 * functions. Uses `beforeEach` under the hood.
 *
 * **WARNING: YOU MUST CALL `jest.mock('universe/backend')` before calling this
 * function!**
 */
export function setupMockBackend() {
  const mockedAuthAppUser = asMockedFunction(authAppUser);
  const mockedCreateNode = asMockedFunction(createNode);
  const mockedCreateUser = asMockedFunction(createUser);
  const mockedDeleteNodes = asMockedFunction(deleteNodes);
  const mockedDeleteUser = asMockedFunction(deleteUser);
  const mockedGetAllUsers = asMockedFunction(getAllUsers);
  const mockedGetNodes = asMockedFunction(getNodes);
  const mockedGetUser = asMockedFunction(getUser);
  const mockedSearchNodes = asMockedFunction(searchNodes);
  const mockedUpdateNode = asMockedFunction(updateNode);
  const mockedUpdateUser = asMockedFunction(updateUser);

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
