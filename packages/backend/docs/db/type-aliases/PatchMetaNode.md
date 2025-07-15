[**@nhscc/backend-drive**](../../README.md)

***

[@nhscc/backend-drive](../../README.md) / [db](../README.md) / PatchMetaNode

# Type Alias: PatchMetaNode

> **PatchMetaNode** = `Partial`\<`Omit`\<`WithoutId`\<[`InternalMetaNode`](InternalMetaNode.md)\>, `"type"` \| `"createdAt"` \| `"name-lowercase"` \| `"contents"`\> & `object`\>

Defined in: [packages/backend/src/db.ts:180](https://github.com/nhscc/drive.api.hscc.bdpa.org/blob/14391c7d4b0a42834d6c5f1ebd8fcde34a9bede8/packages/backend/src/db.ts#L180)

The shape of a patch filesystem meta node.
