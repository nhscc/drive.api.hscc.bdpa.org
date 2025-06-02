import authRequest from 'multiverse/next-adhesive/auth-request';
import checkContentType from 'multiverse/next-adhesive/check-content-type';
import checkMethod from 'multiverse/next-adhesive/check-method';
import checkVersion from 'multiverse/next-adhesive/check-version';
import contriveError from 'multiverse/next-adhesive/contrive-error';
import handleError from 'multiverse/next-adhesive/handle-error';
import limitRequest from 'multiverse/next-adhesive/limit-request';
import logRequest from 'multiverse/next-adhesive/log-request';
import useCors from 'multiverse/next-adhesive/use-cors';
import { middlewareFactory } from 'multiverse/next-api-glue';

import type { Options as AuthRequestOptions } from 'multiverse/next-adhesive/auth-request';
import type { Options as CheckContentTypeOptions } from 'multiverse/next-adhesive/check-content-type';
import type { Options as CheckMethodOptions } from 'multiverse/next-adhesive/check-method';
import type { Options as CheckVersionOptions } from 'multiverse/next-adhesive/check-version';
import type { Options as ContriveErrorOptions } from 'multiverse/next-adhesive/contrive-error';
import type { Options as HandleErrorOptions } from 'multiverse/next-adhesive/handle-error';
import type { Options as LimitRequestOptions } from 'multiverse/next-adhesive/limit-request';
import type { Options as LogRequestOptions } from 'multiverse/next-adhesive/log-request';
import type { Options as UseCorsOptions } from 'multiverse/next-adhesive/use-cors';

/**
 * Primary middleware runner for the REST API. Decorates a request handler.
 *
 * Passing `undefined` as `handler` or not calling `res.end()` (and not sending
 * headers) in your handler or use chain will trigger an `HTTP 501 Not
 * Implemented` response. This can be used to to stub out endpoints and their
 * middleware for later implementation.
 */
/* istanbul ignore next */
const withMiddleware = middlewareFactory<
  LogRequestOptions &
    CheckVersionOptions &
    UseCorsOptions &
    AuthRequestOptions &
    LimitRequestOptions &
    CheckMethodOptions &
    CheckContentTypeOptions &
    HandleErrorOptions &
    ContriveErrorOptions
>({
  use: [
    logRequest,
    checkVersion,
    useCors,
    authRequest,
    limitRequest,
    checkMethod,
    checkContentType,
    contriveError
  ],
  useOnError: [handleError],
  options: {
    allowedContentTypes: ['application/json'],
    requiresAuth: true,
    enableContrivedErrors: true
  }
});

/**
 * Middleware runner for the special /sys API endpoints. Decorates a request
 * handler.
 *
 * Passing `undefined` as `handler` or not calling `res.end()` (and not sending
 * headers) in your handler or use chain will trigger an `HTTP 501 Not
 * Implemented` response. This can be used to to stub out endpoints and their
 * middleware for later implementation.
 */
/* istanbul ignore next */
const withSysMiddleware = middlewareFactory<
  LogRequestOptions &
    AuthRequestOptions &
    LimitRequestOptions &
    CheckMethodOptions &
    CheckContentTypeOptions &
    HandleErrorOptions
>({
  use: [logRequest, authRequest, limitRequest, checkMethod, checkContentType],
  useOnError: [handleError],
  options: {
    allowedContentTypes: ['application/json'],
    requiresAuth: { constraints: 'isGlobalAdmin' }
  }
});

export { withMiddleware, withSysMiddleware };
