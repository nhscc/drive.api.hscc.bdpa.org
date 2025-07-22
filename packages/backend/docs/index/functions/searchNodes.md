[**@nhscc/backend-drive**](../../README.md)

***

[@nhscc/backend-drive](../../README.md) / [index](../README.md) / searchNodes

# Function: searchNodes()

> **searchNodes**(`__namedParameters`): `Promise`\<[`PublicNode`](../../db/type-aliases/PublicNode.md)[]\>

Defined in: [packages/backend/src/index.ts:678](https://github.com/nhscc/drive.api.hscc.bdpa.org/blob/cc6ab5a21520f62a19ce4eb5924de51caa830ea7/packages/backend/src/index.ts#L678)

## Parameters

### \_\_namedParameters

#### after

`undefined` \| `string`

#### match

\{[`specifier`: `string`]: `string` \| `number` \| `boolean` \| `string`[] \| `Record`\<`string`, [`NodePermission`](../../db/type-aliases/NodePermission.md)\> \| `SubSpecifierObject` \| \{ `$or`: `SubSpecifierObject`[]; \}; \}

#### regexMatch

\{[`specifier`: `string`]: `string`; \}

#### username

`undefined` \| `string`

## Returns

`Promise`\<[`PublicNode`](../../db/type-aliases/PublicNode.md)[]\>
