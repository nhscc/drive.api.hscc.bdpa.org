/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { isNativeError } from 'node:util/types';

import { createDebugLogger } from 'rejoinder';

import { getTokenByDerivation } from 'multiverse/next-auth/token';

const debug = createDebugLogger({ namespace: 'next-auth:authenticate' });

/**
 * An array of supported authentication schemes.
 */
// ! Must be lowercase alphanumeric (enforced by unit tests)
export const validAuthenticationSchemes = ['bearer'] as const;

/**
 * A supported authentication scheme.
 */
export type AuthenticationScheme = (typeof validAuthenticationSchemes)[number];

/**
 * Authenticates a client via their Authorization header using the well-known
 * "auth" MongoDB collection. Does not throw on invalid/missing header string.
 *
 * Despite the unfortunate name of the "Authorization" header, this function is
 * only used for authentication, not authorization.
 */
export async function authenticateHeader({
  header,
  allowedSchemes
}: {
  /**
   * Contents of the HTTP Authorization header.
   */
  header: string | undefined;
  /**
   * Accepted authentication schemes. By default, all schemes are accepted.
   */
  allowedSchemes?: AuthenticationScheme | AuthenticationScheme[];
}): Promise<{ authenticated: boolean; error?: string }> {
  try {
    await getTokenByDerivation({ from: header, allowedSchemes });
  } catch (error) {
    debug.error(`authentication failure: ${error}`);

    if (
      isNativeError(error) &&
      !['NotAuthenticatedError', 'InvalidSecretError'].includes(error.name)
    ) {
      throw error;
    }

    return { authenticated: false };
  }

  return { authenticated: true };
}
