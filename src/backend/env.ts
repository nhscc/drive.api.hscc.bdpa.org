import { parse as parseAsBytes } from 'bytes';
import { getEnv as getDefaultEnv } from 'multiverse/next-env';
import { InvalidEnvironmentError } from 'named-app-errors';

import type { Environment } from 'multiverse/next-env';

/**
 * Returns an object representing the application's runtime environment.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function getEnv<T extends Environment = Environment>() {
  const env = getDefaultEnv({
    MAX_PARAMS_PER_REQUEST: Number(process.env.MAX_PARAMS_PER_REQUEST) || 0,
    MAX_SEARCHABLE_TAGS: Number(process.env.MAX_SEARCHABLE_TAGS) || 0,
    MAX_NODE_NAME_LENGTH: Number(process.env.MAX_NODE_NAME_LENGTH) || 0,
    MAX_USER_NAME_LENGTH: Number(process.env.MAX_USER_NAME_LENGTH) || 0,
    MAX_USER_EMAIL_LENGTH: Number(process.env.MAX_USER_EMAIL_LENGTH) || 0,
    MIN_USER_NAME_LENGTH: Number(process.env.MIN_USER_NAME_LENGTH) || 0,
    MIN_USER_EMAIL_LENGTH: Number(process.env.MIN_USER_EMAIL_LENGTH) || 0,
    USER_SALT_LENGTH: Number(process.env.USER_SALT_LENGTH) || 0,
    USER_KEY_LENGTH: Number(process.env.USER_KEY_LENGTH) || 0,
    MAX_LOCK_CLIENT_LENGTH: Number(process.env.MAX_LOCK_CLIENT_LENGTH) || 0,
    MAX_NODE_TAGS: Number(process.env.MAX_NODE_TAGS) || 0,
    MAX_NODE_TAG_LENGTH: Number(process.env.MAX_NODE_TAG_LENGTH) || 0,
    MAX_NODE_PERMISSIONS: Number(process.env.MAX_NODE_PERMISSIONS) || 0,
    MAX_NODE_CONTENTS: Number(process.env.MAX_NODE_CONTENTS) || 0,
    MAX_NODE_TEXT_LENGTH_BYTES:
      parseAsBytes(process.env.MAX_NODE_TEXT_LENGTH_BYTES ?? '-Infinity') || 0
  });

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
    if (!value || value <= 0) {
      errors.push(`bad ${name}, saw "${env[name]}" (expected a non-negative number)`);
    }
  });

  if (env.MIN_USER_NAME_LENGTH >= env.MAX_USER_NAME_LENGTH) {
    errors.push('MIN_USER_NAME_LENGTH must be strictly less than MAX_USER_NAME_LENGTH');
  }

  if (env.MIN_USER_EMAIL_LENGTH >= env.MAX_USER_EMAIL_LENGTH) {
    errors.push('MIN_USER_EMAIL_LENGTH must be strictly less than MAX_USER_EMAIL_LENGTH');
  }

  // TODO: make it easier to reuse error code from getDefaultEnv. Or is it
  // TODO: obsoleted by expect-env package? Either way, factor this logic out!
  if (errors.length) {
    throw new InvalidEnvironmentError(`bad variables:\n - ${errors.join('\n - ')}`);
  }

  return env as typeof env & T;
}
