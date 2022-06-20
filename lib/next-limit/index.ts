import { getDb } from 'multiverse/mongo-schema';
import { getEnv } from 'multiverse/next-env';
import { getClientIp } from 'request-ip';

import type { NextApiRequest } from 'next';
import type { UnixEpochMs } from '@xunnamius/types';
import type { WithId, WithoutId } from 'mongodb';

/**
 * The shape of an entry in the well-known "limited log" collection.
 */
export type InternalLimitedLogEntry = WithId<
  | {
      until: UnixEpochMs;
      ip: string | null;
      header?: never;
    }
  | {
      until: UnixEpochMs;
      ip?: never;
      header: string | null;
    }
>;

/**
 * The shape of a new entry in the well-known "limited log" collection.
 */
export type NewLimitedLogEntry = WithoutId<InternalLimitedLogEntry>;

/**
 * Returns an object with two keys: `isLimited` and `retryAfter`. If `isLimited`
 * is true, then the request should be rejected. The client should be instructed
 * to retry their request after `retryAfter` milliseconds have passed.
 */
export async function clientIsRateLimited(req: NextApiRequest) {
  const ip = getClientIp(req);
  const header = req.headers.authorization
    ?.slice(0, getEnv().AUTH_HEADER_MAX_LENGTH)
    .toLowerCase();

  const limited = await (
    await getDb({ name: 'root' })
  )
    .collection<InternalLimitedLogEntry>('limited-log')
    .find({
      $or: [...(ip ? [{ ip }] : []), ...(header ? [{ header }] : [])],
      until: { $gt: Date.now() } // ? Skip the recently unbanned
    })
    .sort({ until: -1 })
    .limit(1)
    .next();

  return {
    isLimited: !!limited,
    retryAfter: Math.max(
      0,
      ((limited?.until as number) || Date.now()) - Date.now()
    ) as UnixEpochMs
  };
}

/**
 * Removes a rate limit on a client matched against either `ip`, `header`, or
 * both. Matching against both removes rate limits that match either criterion.
 */
export async function removeRateLimit({
  data
}: {
  data: { ip?: string; header?: string } | undefined;
}) {
  // TODO
}
