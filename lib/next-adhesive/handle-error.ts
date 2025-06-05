import { AssertionError } from 'node:assert';

import { createDebugLogger } from 'rejoinder';

import {
  AppError,
  AppValidationError,
  AuthError,
  NotFoundError,
  NotImplementedError,
  ValidationError
} from 'universe/error';

import {
  sendHttpBadRequest,
  sendHttpError,
  sendHttpNotFound,
  sendHttpUnauthorized,
  sendNotImplemented
} from 'multiverse/next-api-respond';

import type { NextApiRequest, NextApiResponse } from 'next';
import type { Promisable } from 'type-fest';
import type { MiddlewareContext } from 'multiverse/next-api-glue';
import type { JsonError } from 'multiverse/next-api-respond';

const debug = createDebugLogger({ namespace: 'next-api:f:handle-error' });
const log = createDebugLogger({ namespace: 'next-api' });

/**
 * Special middleware used to handle custom errors.
 */
export type ErrorHandler = (
  res: NextApiResponse,
  errorJson: Partial<JsonError>
) => Promisable<void>;

/**
 * A Map of Error class constructors to the special middleware that handles
 * them.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ErrorHandlerMap = Map<new (...args: any[]) => Error, ErrorHandler>;

export type Options = {
  /**
   * A mapping of Error classes and the functions that handle them.
   */
  errorHandlers?: ErrorHandlerMap;
};

/**
 * Generic error handling middleware. **This should be among the final
 * middleware to run on the error handling middleware chain.**
 */
export default async function middlewareFunction(
  req: NextApiRequest,
  res: NextApiResponse,
  context: MiddlewareContext<Options>
) {
  debug('entered middleware runtime');

  const {
    runtime: { error },
    options: { errorHandlers }
  } = context;

  if (res.writableEnded) {
    // ? We're past the point where we're able to change the response.
    debug('cannot handle error: response is no longer writable');
    debug('throwing unhandleable error');
    throw error;
  }

  const errorJson: Partial<JsonError> = (error as { message: string }).message
    ? { error: (error as { message: string }).message }
    : {};

  debug('handling error: %O', errorJson.error || '(no message)');

  if (errorHandlers) {
    for (const [errorType, errorHandler] of errorHandlers) {
      if (error instanceof errorType) {
        debug(`using custom error handler for type "${error.name}"`);
        // eslint-disable-next-line no-await-in-loop
        await errorHandler(res, errorJson);
        return;
      }
    }
  }

  debug(
    `using default error handler${
      error instanceof Error ? ` for type "${error.name}"` : ''
    }`
  );

  if (error instanceof AssertionError) {
    log.error(`error - sanity check failed on request: ${String(req.url)}\n`, error);
    sendHttpError(res, {
      error: 'sanity check failed: please report exactly what you did just now!'
    });
  } else if (error instanceof AppValidationError) {
    log.error(
      `error - server-side validation exception on request: ${String(req.url)}\n`,
      error
    );
    sendHttpError(res, errorJson);
  } else if (error instanceof ValidationError) {
    sendHttpBadRequest(res, errorJson);
  } else if (error instanceof AuthError) {
    sendHttpUnauthorized(res, errorJson);
  } else if (error instanceof NotFoundError) {
    sendHttpNotFound(res, errorJson);
  } else if (error instanceof NotImplementedError) {
    sendNotImplemented(res);
  } else if (error instanceof AppError) {
    log.error(`error - named exception on request: ${String(req.url)}\n`, error);
    sendHttpError(res, errorJson);
  } else {
    log.error(`error - unnamed exception on request: ${String(req.url)}\n`, error);
    sendHttpError(res);
  }
}
