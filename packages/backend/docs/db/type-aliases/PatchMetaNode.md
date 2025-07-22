[**@nhscc/backend-drive**](../../README.md)

***

[@nhscc/backend-drive](../../README.md) / [db](../README.md) / PatchMetaNode

# Type Alias: PatchMetaNode

> **PatchMetaNode** = `Partial`\<`Omit`\<`WithoutId`\<[`InternalMetaNode`](InternalMetaNode.md)\>, `"type"` \| `"createdAt"` \| `"name-lowercase"` \| `"contents"`\> & `object`\>

Defined in: [packages/backend/src/db.ts:180](https://github.com/nhscc/drive.api.hscc.bdpa.org/blob/cc6ab5a21520f62a19ce4eb5924de51caa830ea7/packages/backend/src/db.ts#L180)

The shape of a patch filesystem meta node.
