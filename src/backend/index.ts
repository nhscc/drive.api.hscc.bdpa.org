import {
  PublicNode,
  NewNode,
  PatchNode,
  PublicUser,
  NewUser,
  PatchUser,
  Username,
  NodePermission
} from 'universe/backend/db';

export async function getAllUsers({
  after
}: {
  after: string | null;
}): Promise<PublicUser[]> {
  void after;
  return [];
}

export async function getUser({ username }: { username: Username }): Promise<PublicUser> {
  void username;
  return {} as PublicUser;
}

export async function createUser({ data }: { data: NewUser }): Promise<PublicUser> {
  void data;
  return {} as PublicUser;
}

export async function updateUser({
  username,
  data
}: {
  username: Username;
  data: PatchUser;
}): Promise<void> {
  void username, data;
  return;
}

export async function deleteUser({ username }: { username: Username }): Promise<void> {
  void username;
  return;
}

export async function authAppUser({
  username,
  key
}: {
  username: Username;
  key: string;
}): Promise<boolean> {
  void username, key;
  return false;
}

export async function getNodes({
  username,
  node_ids
}: {
  username: Username;
  node_ids: string[];
}): Promise<PublicNode[]> {
  void username, node_ids;
  return [];
}

type SubSpecifierObject = { [subspecifier in '$gt' | '$lt' | '$gte' | '$lte']?: number };

export async function searchNodes({
  username,
  after,
  match,
  regexMatch
}: {
  username: Username;
  after: string | null;
  match:
    | {
        [specifier: string]:
          | string
          | number
          | boolean
          | SubSpecifierObject
          | { $or: SubSpecifierObject[] };
      }
    | { tags: string[] }
    | { permissions: Record<string, NodePermission> };
  regexMatch: {
    [specifier: string]: string;
  };
}): Promise<PublicNode[]> {
  void username, after, match, regexMatch;
  return [];
}

export async function createNode({
  username,
  data
}: {
  username: Username;
  data: NewNode;
}): Promise<PublicNode> {
  void username, data;
  return {} as PublicNode;
}

export async function updateNode({
  username,
  node_id,
  data
}: {
  username: Username;
  node_id: string;
  data: PatchNode;
}): Promise<void> {
  void username, node_id, data;
  return;
}

export async function deleteNodes({
  username,
  node_ids
}: {
  username: Username;
  node_ids: string[];
}): Promise<void> {
  void username, node_ids;
  return;
}
