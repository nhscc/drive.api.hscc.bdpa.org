/* eslint-disable @typescript-eslint/no-base-to-string */
import assert from 'node:assert';

import { ObjectId } from 'mongodb';
import { createDebugLogger } from 'rejoinder';

import type { Collection, Document, WithId } from 'mongodb';

const debug = createDebugLogger({ namespace: 'mongo-item' });

/**
 * Represents the value of the `_id` property of a MongoDB collection entry.
 * Optionally, a key other than `_id` can be specified using the `{ key: ...,
 * id: ... }` syntax.
 */
export type ItemExistsIdParam =
  | string
  | ObjectId
  | { key: string; id: string | ObjectId };

/**
 * Available options for the `itemExists` function.
 */
export type ItemExistsOptions = {
  /**
   * Items matching excludeId will be completely ignored by this function.
   *
   * Note that `optimisticCoercion` does _not_ have any effect on `excludeId`.
   *
   * @default undefined
   */
  excludeId?: ItemExistsIdParam;
  /**
   * If `true`, ids will be matched in a case-insensitive manner (via locale).
   *
   * @default false
   */
  caseInsensitive?: boolean;
  /**
   * By default: when looking for an item matching `{ _id: id }`, where the
   * descriptor key is the string `"_id"`, `id` will be optimistically wrapped
   * in a `new ObjectId(id)` call.
   *
   * Set this to `false` to prevent this, or to `'force'` to always do this for
   * every item.
   *
   * @default true
   */
  optimisticCoercion?: boolean | 'force';
};

/**
 * Checks if an item matching `{ _id: id }` exists within `collection`.
 */
export async function itemExists<T extends Document>(
  collection: Collection<T>,
  id: string | ObjectId,
  options?: ItemExistsOptions
): Promise<boolean>;
/**
 * Checks if an item matching `{ [descriptor.key]: descriptor.id }` exists
 * within `collection`.
 */
export async function itemExists<T extends Document>(
  collection: Collection<T>,
  descriptor: { key: string; id: string | ObjectId },
  options?: ItemExistsOptions
): Promise<boolean>;
export async function itemExists<T extends Document>(
  collection: Collection<T>,
  id_: ItemExistsIdParam,
  options?: ItemExistsOptions
): Promise<boolean> {
  let excludeIdProperty: string | null = null;
  let excludeId: string | ObjectId | null = null;
  const idProperty =
    typeof id_ === 'string' || id_ instanceof ObjectId ? '_id' : id_.key;
  let targetId = typeof id_ === 'string' || id_ instanceof ObjectId ? id_ : id_.id;

  if (options?.excludeId) {
    excludeIdProperty =
      typeof options.excludeId === 'string' || options.excludeId instanceof ObjectId
        ? '_id'
        : options.excludeId.key;

    excludeId =
      typeof options.excludeId === 'string' || options.excludeId instanceof ObjectId
        ? options.excludeId
        : options.excludeId.id;
  }

  assert(
    idProperty !== excludeIdProperty,
    `cannot lookup an item by property "${idProperty}" while also filtering results by that same property`
  );

  if (
    options?.optimisticCoercion === 'force' ||
    (options?.optimisticCoercion === undefined &&
      typeof targetId === 'string' &&
      idProperty === '_id')
  ) {
    targetId = itemToObjectId(targetId);
  }

  return (
    0 !==
    (await collection.countDocuments(
      {
        [idProperty]: targetId,
        ...(excludeIdProperty ? { [excludeIdProperty]: { $ne: excludeId } } : {})
      } as unknown as Parameters<typeof collection.countDocuments>[0],
      {
        ...(options?.caseInsensitive ? { collation: { locale: 'en', strength: 2 } } : {})
      }
    ))
  );
}

/**
 * The shape of an object that can be translated into an {@link ObjectId} (or
 * `T`) instance or is `null`/`undefined`.
 */
export type IdItem<T extends ObjectId> = WithId<unknown> | string | T | null | undefined;

/**
 * The shape of an object that can be translated into an array of
 * {@link ObjectId} (or `T`) instances or is `null`/`undefined`.
 */
export type IdItemArray<T extends ObjectId> =
  | WithId<unknown>[]
  | string[]
  | T[]
  | null[]
  | undefined[];

/**
 * @see {@link itemToObjectId}
 */
export type ItemToObjectIdOptions = {
  /**
   * If `true`, `undefined` will be returned upon encountering an irreducible
   * argument. If `false`, an error will be thrown instead.
   *
   * @default false
   */
  returnUndefinedOnError?: boolean;
};

/**
 * Accepts an `item` that is, represents, or might contain an {@link ObjectId},
 * and returns one (or more) corresponding {@link ObjectId} instance(s).
 */
export function itemToObjectId<T extends ObjectId>(
  item: IdItem<T>,
  options: ItemToObjectIdOptions & { returnUndefinedOnError: true }
): T | undefined;
export function itemToObjectId<T extends ObjectId>(
  item: { id: IdItem<T> },
  options: ItemToObjectIdOptions & { returnUndefinedOnError: true }
): T | undefined;
export function itemToObjectId<T extends ObjectId>(
  item: IdItem<T> | { id: IdItem<T> },
  options: ItemToObjectIdOptions & { returnUndefinedOnError: true }
): T | undefined;
export function itemToObjectId<T extends ObjectId>(
  item: IdItem<T>,
  options?: ItemToObjectIdOptions
): T;
export function itemToObjectId<T extends ObjectId>(
  item: { id: IdItem<T> },
  options?: ItemToObjectIdOptions
): T;
export function itemToObjectId<T extends ObjectId>(
  item: IdItem<T> | { id: IdItem<T> },
  options?: ItemToObjectIdOptions
): T;
/**
 * Accepts an array of `items` and returns an array of corresponding
 * {@link ObjectId} instances.
 */
export function itemToObjectId<T extends ObjectId>(
  items: IdItemArray<T>,
  options: ItemToObjectIdOptions & { returnUndefinedOnError: true }
): T[] | undefined;
export function itemToObjectId<T extends ObjectId>(
  items: IdItemArray<T>,
  options?: ItemToObjectIdOptions
): T[];
/**
 * Accepts an `item` or `items` argument and returns one or more corresponding
 * {@link ObjectId} instances.
 */
export function itemToObjectId<T extends ObjectId>(
  item: IdItem<T> | IdItemArray<T> | { id: IdItem<T> },
  options: ItemToObjectIdOptions & { returnUndefinedOnError: true }
): T | T[] | undefined;
export function itemToObjectId<T extends ObjectId>(
  item: IdItem<T> | IdItemArray<T> | { id: IdItem<T> },
  options?: ItemToObjectIdOptions
): T | T[];
export function itemToObjectId<T extends ObjectId>(
  item: IdItem<T> | IdItemArray<T> | { id: IdItem<T> },
  { returnUndefinedOnError = false }: ItemToObjectIdOptions = {}
): T | T[] | undefined {
  try {
    if (item instanceof ObjectId) {
      return item;
    } else if (Array.isArray(item)) {
      debug.message('recursively reducing sub-items of item %O:', item);
      return item.map((subItem) => itemToObjectId(subItem));
    } else if (typeof item === 'string') {
      return new ObjectId(item) as T;
    } else if (item) {
      if ('_id' in item && item._id instanceof ObjectId) {
        return item._id as T;
      } else if ('id' in item) {
        return itemToObjectId(item.id);
      }
    }
  } catch (error) {
    debug.warn('error occurred while attempting to reduce item %O: %O', item, error);
  }

  debug.error('encountered irreducible item: %O', item);

  if (returnUndefinedOnError) {
    return undefined;
  }

  assert.fail(`encountered irreducible item: ${String(item)}`);
}

/**
 * Reduces an `item` down to the string representation of its {@link ObjectId}
 * instance.
 */
export function itemToStringId<T extends ObjectId>(
  item: IdItem<T> | { id: IdItem<T> }
): string;
/**
 * Reduces an array of `item`s down to the string representations of their
 * respective {@link ObjectId} instances.
 */
export function itemToStringId<T extends ObjectId>(item: IdItemArray<T>): string[];
export function itemToStringId<T extends ObjectId>(
  item: IdItem<T> | IdItemArray<T> | { id: IdItem<T> }
): string | string[] {
  return Array.isArray(item)
    ? itemToObjectId<T>(item).map((oid) => oid.toString())
    : itemToObjectId<T>(item).toString();
}
