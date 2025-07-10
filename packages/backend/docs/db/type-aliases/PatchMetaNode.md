[**@nhscc/backend-drive**](../../README.md)

***

[@nhscc/backend-drive](../../README.md) / [db](../README.md) / PatchMetaNode

# Type Alias: PatchMetaNode

> **PatchMetaNode** = `Partial`\<`Omit`\<`WithoutId`\<[`InternalMetaNode`](InternalMetaNode.md)\>, `"type"` \| `"createdAt"` \| `"name-lowercase"` \| `"contents"`\> & `object`\>

Defined in: [packages/backend/src/db.ts:180](https://github.com/nhscc/drive.api.hscc.bdpa.org/blob/778d79f3487f712a80fb10da82bed3843d3db5fd/packages/backend/src/db.ts#L180)

The shape of a patch filesystem meta node.
