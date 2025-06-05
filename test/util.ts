import { disableLoggers, enableLoggers, LoggerType } from 'rejoinder';
import { toss } from 'toss-expression';

import { defaultConfig } from 'universe/backend/api';

import type { withMockedEnv } from '@-xun/jest';
import type { NextApiHandler, NextApiRequest, NextApiResponse, PageConfig } from 'next';

export * from '@-xun/jest';

/**
 * A mock Next.js API handler that sends an empty object Reponse with a 200
 * status code.
 */
export const noopHandler = async (_req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).send({});
};

/**
 * This function wraps mock Next.js API handler functions so that they provide
 * the default (or a custom) API configuration object.
 */
export const wrapHandler = (pagesHandler: NextApiHandler, config?: PageConfig) => {
  const api = async (req: NextApiRequest, res: NextApiResponse) =>
    pagesHandler(req, res);
  api.config = config || defaultConfig;
  return api;
};

// TODO: XXX: add to @-xun/jest if it's not duplicating existing functionality.
// TODO: XXX: This will also have to be re-implemented to avoid eslint warnings

export class FactoryExhaustionError extends Error {}
export function itemFactory<T>(testItems: T[]) {
  const nextItem = Object.assign(
    () => {
      const next = nextItem.$iter.next() as IteratorResult<T, unknown>;
      if (next.done) {
        throw new FactoryExhaustionError('item factory iterator exhausted unexpectedly');
      } else return next.value;
    },
    {
      items: testItems,
      count: testItems.length,
      $iter: testItems.values(),
      *[Symbol.iterator]() {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
          try {
            yield nextItem();
          } catch (error) {
            if (error instanceof FactoryExhaustionError) return;
            else throw error;
          }
        }
      },
      async *[Symbol.asyncIterator]() {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
          try {
            // eslint-disable-next-line no-await-in-loop
            yield await nextItem();
          } catch (error) {
            if (error instanceof FactoryExhaustionError) return;
            else throw error;
          }
        }
      }
    }
  );

  Object.defineProperty(nextItem, 'length', {
    configurable: false,
    enumerable: false,
    set: () => toss(new SyntaxError('did you mean to use .count instead of .length?')),
    get: () => toss(new SyntaxError('did you mean to use .count instead of .length?'))
  });

  return nextItem;
}

/**
 * Enable all rejoinder's debug loggers.
 *
 * Use this function when you're UNWISELY relying on debug output to test
 * functionality. **That is: don't delete/unwrap this when you see it!**
 */
export async function withDebugEnabled(fn: Parameters<typeof withMockedEnv>[0]) {
  enableLoggers({ type: LoggerType.DebugOnly });

  try {
    await fn();
  } finally {
    disableLoggers({ type: LoggerType.DebugOnly });
  }
}
