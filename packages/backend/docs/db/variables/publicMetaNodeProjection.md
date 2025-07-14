[**@nhscc/backend-drive**](../../README.md)

***

[@nhscc/backend-drive](../../README.md) / [db](../README.md) / publicMetaNodeProjection

# Variable: publicMetaNodeProjection

> `const` **publicMetaNodeProjection**: `object`

Defined in: [packages/backend/src/db.ts:303](https://github.com/nhscc/drive.api.hscc.bdpa.org/blob/df5b4b7c72e05ed9c30cb0da8579abce7387b8fa/packages/backend/src/db.ts#L303)

## Type declaration

### \_id

> `readonly` **\_id**: `false` = `false`

### contents

> `readonly` **contents**: `object`

#### contents.$map

> `readonly` **$map**: `object`

#### contents.$map.as

> `readonly` **as**: `"id"` = `'id'`

#### contents.$map.in

> `readonly` **in**: `object`

#### contents.$map.in.$toString

> `readonly` **$toString**: `"$$id"` = `'$$id'`

#### contents.$map.input

> `readonly` **input**: `"$contents"` = `'$contents'`

### createdAt

> `readonly` **createdAt**: `true` = `true`

### name

> `readonly` **name**: `true` = `true`

### node\_id

> `readonly` **node\_id**: `object`

#### node\_id.$toString

> `readonly` **$toString**: `"$_id"` = `'$_id'`

### owner

> `readonly` **owner**: `true` = `true`

### permissions

> `readonly` **permissions**: `true` = `true`

### type

> `readonly` **type**: `true` = `true`
