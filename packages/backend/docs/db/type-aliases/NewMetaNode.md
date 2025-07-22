[**@nhscc/backend-drive**](../../README.md)

***

[@nhscc/backend-drive](../../README.md) / [db](../README.md) / NewMetaNode

# Type Alias: NewMetaNode

> **NewMetaNode** = `Partial`\<`Omit`\<`WithoutId`\<[`InternalMetaNode`](InternalMetaNode.md)\>, `"owner"` \| `"createdAt"` \| `"name-lowercase"` \| `"contents"`\> & `object`\>

Defined in: [packages/backend/src/db.ts:168](https://github.com/nhscc/drive.api.hscc.bdpa.org/blob/cc6ab5a21520f62a19ce4eb5924de51caa830ea7/packages/backend/src/db.ts#L168)

The shape of a new filesystem meta node.
