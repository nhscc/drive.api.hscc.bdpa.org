// TODO: simplify simplify simplify!

import { getDb, setSchemaConfig } from '@-xun/mongo-schema';
import { hydrateDbWithDummyData, setDummyData } from '@-xun/mongo-test';
import { createDebugLogger } from 'rejoinder';

import { getSchemaConfig } from 'universe/backend/db';
import { getEnv } from 'universe/backend/env';

import { getDummyData } from 'testverse/db';

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

import type { Simplify } from 'type-fest';
import type { Options as AuthRequestOptions } from 'multiverse/next-adhesive/auth-request';
import type { Options as CheckContentTypeOptions } from 'multiverse/next-adhesive/check-content-type';
import type { Options as CheckMethodOptions } from 'multiverse/next-adhesive/check-method';
import type { Options as CheckVersionOptions } from 'multiverse/next-adhesive/check-version';
import type { Options as ContriveErrorOptions } from 'multiverse/next-adhesive/contrive-error';
import type { Options as HandleErrorOptions } from 'multiverse/next-adhesive/handle-error';
import type { Options as LimitRequestOptions } from 'multiverse/next-adhesive/limit-request';
import type { Options as LogRequestOptions } from 'multiverse/next-adhesive/log-request';
import type { Options as UseCorsOptions } from 'multiverse/next-adhesive/use-cors';

type ExposedOptions = LogRequestOptions &
  CheckVersionOptions &
  CheckMethodOptions &
  CheckContentTypeOptions;

const setSchemaAndHydrateDbDebug = createDebugLogger({
  namespace: 'next-api:f:hydrate-prod'
});

/**
 * Sets the database schema if NODE_ENV starts with "production" or
 * "development". Additionally hydrates the database with dummy data if NODE_ENV
 * starts with "development".
 */
export default async function setSchemaAndMaybeHydrateDb() {
  setSchemaAndHydrateDbDebug('entered middleware runtime');

  const isProduction = getEnv().NODE_ENV.startsWith('production');
  const isDevelopment = getEnv().NODE_ENV.startsWith('development');

  if (isProduction || isDevelopment) {
    setSchemaConfig(() => getSchemaConfig());

    if (isDevelopment && getEnv().API_HYDRATE_DB) {
      setSchemaAndHydrateDbDebug('executing api db hydration directive');
      setDummyData(getDummyData());

      await getDb({ name: 'root' });
      await getDb({ name: 'app' });

      setSchemaAndHydrateDbDebug('dbs initialized successfully: root, app');

      await hydrateDbWithDummyData({ name: 'root' });
      await hydrateDbWithDummyData({ name: 'app' });

      setSchemaAndHydrateDbDebug('db hydrated successfully: root, app');

      throw new Error(
        'database was hydrated successfully. You may invoke the app normally now (without API_HYDRATE_DB)'
      );
    }
  }
}

/**
 * The shape of an API endpoint metadata object.
 *
 * This export is heavily relied upon by most of the testing infrastructure and
 * should be exported alongside `defaultEndpointConfig`/`config` in every
 * Next.js API handler file.
 */
export type EndpointMetadata = Simplify<ExposedOptions & { descriptor: string }>;

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
  ExposedOptions &
    UseCorsOptions &
    AuthRequestOptions &
    LimitRequestOptions &
    HandleErrorOptions &
    ContriveErrorOptions
>({
  use: [
    setSchemaAndMaybeHydrateDb,
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
    CheckMethodOptions &
    CheckContentTypeOptions &
    HandleErrorOptions
>({
  use: [
    setSchemaAndMaybeHydrateDb,
    logRequest,
    authRequest,
    limitRequest,
    checkMethod,
    checkContentType
  ],
  useOnError: [handleError],
  options: {
    allowedContentTypes: ['application/json'],
    requiresAuth: { constraints: 'isGlobalAdmin' }
  }
});

export { withMiddleware, withSysMiddleware };
