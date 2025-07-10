[**@nhscc/backend-drive**](../../README.md)

***

[@nhscc/backend-drive](../../README.md) / [db](../README.md) / InternalMetaNode

# Type Alias: InternalMetaNode

> **InternalMetaNode** = `WithId`\<\{ `contents`: [`NodeId`](../interfaces/NodeId.md)[]; `createdAt`: `UnixEpochMs`; `name`: `string`; `name-lowercase`: `string`; `owner`: [`Username`](Username.md); `permissions`: `Record`\<[`Username`](Username.md), [`NodePermission`](NodePermission.md)\>; `type`: `"directory"` \| `"symlink"`; \}\>

Defined in: [packages/backend/src/db.ts:144](https://github.com/nhscc/drive.api.hscc.bdpa.org/blob/778d79f3487f712a80fb10da82bed3843d3db5fd/packages/backend/src/db.ts#L144)

The shape of an internal filesystem meta node.
