import { getEnv as getDefaultEnv } from '@-xun/env';
import { parse as parseAsBytes } from 'bytes';

import { ServerValidationError } from 'universe/error';

import type { Environment } from '@-xun/env';

// TODO: replace validation logic with arktype instead (including defaults)

/**
 * Returns an object representing the application's runtime environment.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function getEnv<T extends Environment = Environment>() {
  const env = getDefaultEnv({
    MAX_PARAMS_PER_REQUEST: Number(process.env.MAX_PARAMS_PER_REQUEST) || 100,
    MAX_SEARCHABLE_TAGS: Number(process.env.MAX_SEARCHABLE_TAGS) || 10,
    MIN_USER_NAME_LENGTH: Number(process.env.MIN_USER_NAME_LENGTH) || 4,
    MAX_USER_NAME_LENGTH: Number(process.env.MAX_USER_NAME_LENGTH) || 25,
    MIN_USER_EMAIL_LENGTH: Number(process.env.MIN_USER_EMAIL_LENGTH) || 4,
    MAX_USER_EMAIL_LENGTH: Number(process.env.MAX_USER_EMAIL_LENGTH) || 75,
    USER_SALT_LENGTH: Number(process.env.USER_SALT_LENGTH) || 32,
    USER_KEY_LENGTH: Number(process.env.USER_KEY_LENGTH) || 128,
    MAX_LOCK_CLIENT_LENGTH: Number(process.env.MAX_LOCK_CLIENT_LENGTH) || 25,
    MAX_NODE_NAME_LENGTH: Number(process.env.MAX_NODE_NAME_LENGTH) || 50,
    MAX_NODE_TAGS: Number(process.env.MAX_NODE_TAGS) || 5,
    MAX_NODE_TAG_LENGTH: Number(process.env.MAX_NODE_TAG_LENGTH) || 25,
    MAX_NODE_PERMISSIONS: Number(process.env.MAX_NODE_PERMISSIONS) || 10,
    MAX_NODE_CONTENTS: Number(process.env.MAX_NODE_CONTENTS) || 10,
    MAX_NODE_TEXT_LENGTH_BYTES:
      parseAsBytes(process.env.MAX_NODE_TEXT_LENGTH_BYTES ?? '-Infinity') || 10_240
  });

  /* istanbul ignore next */
  if (env.NODE_ENV !== 'test') {
    const errors: string[] = [];

    (
      [
        'MAX_PARAMS_PER_REQUEST',
        'MAX_SEARCHABLE_TAGS',
        'MAX_NODE_NAME_LENGTH',
        'MAX_USER_NAME_LENGTH',
        'MAX_USER_EMAIL_LENGTH',
        'MIN_USER_EMAIL_LENGTH',
        'USER_SALT_LENGTH',
        'USER_KEY_LENGTH',
        'MAX_LOCK_CLIENT_LENGTH',
        'MAX_NODE_TAGS',
        'MAX_NODE_TAG_LENGTH',
        'MAX_NODE_PERMISSIONS',
        'MAX_NODE_CONTENTS',
        'MAX_NODE_TEXT_LENGTH_BYTES'
      ] as (keyof typeof env)[]
    ).forEach((name) => {
      const value = env[name];
      if (!value || !Number.isSafeInteger(value) || (value as number) <= 0) {
        errors.push(
          `bad ${name}, saw "${String(env[name])}" (expected a safe non-negative number)`
        );
      }
    });

    if (env.MIN_USER_NAME_LENGTH >= env.MAX_USER_NAME_LENGTH) {
      errors.push(
        'MIN_USER_NAME_LENGTH must be strictly less than MAX_USER_NAME_LENGTH'
      );
    }

    if (env.MIN_USER_EMAIL_LENGTH >= env.MAX_USER_EMAIL_LENGTH) {
      errors.push(
        'MIN_USER_EMAIL_LENGTH must be strictly less than MAX_USER_EMAIL_LENGTH'
      );
    }

    if (errors.length) {
      throw new ServerValidationError(`bad variables:\n - ${errors.join('\n - ')}`);
    }
  }

  return env as typeof env & T;
}
