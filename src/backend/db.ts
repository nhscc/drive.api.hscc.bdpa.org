import { getCommonSchemaConfig } from 'multiverse/mongo-common';

import type { ObjectId } from 'mongodb';
import type { UnixEpochMs } from '@xunnamius/types';
import type { DbSchema } from 'multiverse/mongo-schema';

/**
 * A JSON representation of the backend Mongo database structure. This is used
 * for consistent app-wide db access across projects and to generate transient
 * versions of the db during testing.
 */
export function getSchemaConfig(): DbSchema {
  return getCommonSchemaConfig({
    databases: {
      'xunn-at': {
        collections: [
          {
            name: 'link-map',
            indices: [
              {
                spec: 'shortId',
                options: { unique: true }
              }
            ]
          }
        ]
      },
      'pkg-compat': {
        collections: [{ name: 'flags', indices: [{ spec: 'name' }] }]
      }
    },
    aliases: {}
  });
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UserId extends ObjectId {}
