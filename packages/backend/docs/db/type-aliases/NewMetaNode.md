[**@nhscc/backend-drive**](../../README.md)

***

[@nhscc/backend-drive](../../README.md) / [db](../README.md) / NewMetaNode

# Type Alias: NewMetaNode

> **NewMetaNode** = `Partial`\<`Omit`\<`WithoutId`\<[`InternalMetaNode`](InternalMetaNode.md)\>, `"owner"` \| `"createdAt"` \| `"name-lowercase"` \| `"contents"`\> & `object`\>

Defined in: [packages/backend/src/db.ts:168](https://github.com/nhscc/drive.api.hscc.bdpa.org/blob/df5b4b7c72e05ed9c30cb0da8579abce7387b8fa/packages/backend/src/db.ts#L168)

The shape of a new filesystem meta node.
