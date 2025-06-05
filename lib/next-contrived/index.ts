import { getDb } from '@-xun/mongo-schema';
import { getEnv } from '@-xun/next-env';
import { createDebugLogger } from 'rejoinder';

const debug = createDebugLogger({ namespace: 'next-api-common:contrived' });

/**
 * Returns `true` if a request should be rejected with a pseudo-error.
 *
 * Note that this is a per-serverless-function request counter and not global
 * across all Vercel virtual machines.
 */
export async function isDueForContrivedError() {
  const { REQUESTS_PER_CONTRIVED_ERROR: reqPerError } = getEnv();

  if (reqPerError) {
    const x = (await getDb({ name: 'root' })).collection('request-log');
    const count = await x.estimatedDocumentCount();

    debug(`${count}%${reqPerError} = ${count % reqPerError}`);

    if (count % reqPerError === 0) {
      debug('determined request is due for contrived error');
      return true;
    }
  } else {
    debug(
      `skipped contrived error check (cause: REQUESTS_PER_CONTRIVED_ERROR=${reqPerError})`
    );
  }

  return false;
}
