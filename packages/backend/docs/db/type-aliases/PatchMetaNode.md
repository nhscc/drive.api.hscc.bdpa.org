[**@nhscc/backend-drive**](../../README.md)

***

[@nhscc/backend-drive](../../README.md) / [db](../README.md) / PatchMetaNode

# Type Alias: PatchMetaNode

> **PatchMetaNode** = `Partial`\<`Omit`\<`WithoutId`\<[`InternalMetaNode`](InternalMetaNode.md)\>, `"type"` \| `"createdAt"` \| `"name-lowercase"` \| `"contents"`\> & `object`\>

Defined in: [packages/backend/src/db.ts:180](https://github.com/nhscc/drive.api.hscc.bdpa.org/blob/df5b4b7c72e05ed9c30cb0da8579abce7387b8fa/packages/backend/src/db.ts#L180)

The shape of a patch filesystem meta node.
