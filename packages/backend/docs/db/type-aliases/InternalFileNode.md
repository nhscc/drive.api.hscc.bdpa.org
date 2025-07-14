[**@nhscc/backend-drive**](../../README.md)

***

[@nhscc/backend-drive](../../README.md) / [db](../README.md) / InternalFileNode

# Type Alias: InternalFileNode

> **InternalFileNode** = `WithId`\<\{ `createdAt`: `UnixEpochMs`; `lock`: [`NodeLock`](NodeLock.md) \| `null`; `modifiedAt`: `UnixEpochMs`; `name`: `string`; `name-lowercase`: `string`; `owner`: [`Username`](Username.md); `permissions`: `Record`\<[`Username`](Username.md), [`NodePermission`](NodePermission.md)\>; `size`: `number`; `tags`: `string`[]; `text`: `string`; `type`: `"file"`; \}\>

Defined in: [packages/backend/src/db.ts:100](https://github.com/nhscc/drive.api.hscc.bdpa.org/blob/df5b4b7c72e05ed9c30cb0da8579abce7387b8fa/packages/backend/src/db.ts#L100)

The shape of an internal filesystem file node.
