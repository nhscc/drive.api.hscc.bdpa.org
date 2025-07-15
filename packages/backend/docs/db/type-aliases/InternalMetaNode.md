[**@nhscc/backend-drive**](../../README.md)

***

[@nhscc/backend-drive](../../README.md) / [db](../README.md) / InternalMetaNode

# Type Alias: InternalMetaNode

> **InternalMetaNode** = `WithId`\<\{ `contents`: [`NodeId`](../interfaces/NodeId.md)[]; `createdAt`: `UnixEpochMs`; `name`: `string`; `name-lowercase`: `string`; `owner`: [`Username`](Username.md); `permissions`: `Record`\<[`Username`](Username.md), [`NodePermission`](NodePermission.md)\>; `type`: `"directory"` \| `"symlink"`; \}\>

Defined in: [packages/backend/src/db.ts:144](https://github.com/nhscc/drive.api.hscc.bdpa.org/blob/718231ebbb0b386db32934d648e2479e8a0b4a18/packages/backend/src/db.ts#L144)

The shape of an internal filesystem meta node.
