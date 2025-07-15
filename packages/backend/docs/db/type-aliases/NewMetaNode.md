[**@nhscc/backend-drive**](../../README.md)

***

[@nhscc/backend-drive](../../README.md) / [db](../README.md) / NewMetaNode

# Type Alias: NewMetaNode

> **NewMetaNode** = `Partial`\<`Omit`\<`WithoutId`\<[`InternalMetaNode`](InternalMetaNode.md)\>, `"owner"` \| `"createdAt"` \| `"name-lowercase"` \| `"contents"`\> & `object`\>

Defined in: [packages/backend/src/db.ts:168](https://github.com/nhscc/drive.api.hscc.bdpa.org/blob/718231ebbb0b386db32934d648e2479e8a0b4a18/packages/backend/src/db.ts#L168)

The shape of a new filesystem meta node.
