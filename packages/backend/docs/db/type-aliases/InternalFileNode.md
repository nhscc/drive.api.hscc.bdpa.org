[**@nhscc/backend-drive**](../../README.md)

***

[@nhscc/backend-drive](../../README.md) / [db](../README.md) / InternalFileNode

# Type Alias: InternalFileNode

> **InternalFileNode** = `WithId`\<\{ `createdAt`: `UnixEpochMs`; `lock`: [`NodeLock`](NodeLock.md) \| `null`; `modifiedAt`: `UnixEpochMs`; `name`: `string`; `name-lowercase`: `string`; `owner`: [`Username`](Username.md); `permissions`: `Record`\<[`Username`](Username.md), [`NodePermission`](NodePermission.md)\>; `size`: `number`; `tags`: `string`[]; `text`: `string`; `type`: `"file"`; \}\>

Defined in: [packages/backend/src/db.ts:100](https://github.com/nhscc/drive.api.hscc.bdpa.org/blob/718231ebbb0b386db32934d648e2479e8a0b4a18/packages/backend/src/db.ts#L100)

The shape of an internal filesystem file node.
