import { createDebugLogger } from 'rejoinder';
import { toss } from 'toss-expression';

import { ValidationError } from 'universe/error';

import { sendHttpBadContentType, sendHttpBadRequest } from 'multiverse/next-api-respond';

import type { ValidHttpMethod } from '@-xun/types';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { MiddlewareContext } from 'multiverse/next-api-glue';

const debug = createDebugLogger({ namespace: 'next-api:f:check-content-type' });

/**
 * The shape of a simple configuration object.
 */
export type AllowedContentTypesConfig = string[] | 'any' | 'none';

/**
 * The shape of a complex configuration object.
 */
export type AllowedContentTypesPerMethodConfig = {
  [method in ValidHttpMethod]?: AllowedContentTypesConfig;
};

export type Options = {
  /**
   * A string, a mapping, or an array of media types this endpoint is
   * allowed to receive.
   *
   * If the string `"any"` is provided, any Content-Type header will be allowed,
   * including requests without a Content-Type header.
   *
   * If the string `"none"` is provided, only requests without a Content-Type
   * header will be allowed. Similarly, `"none"` can also be included in the
   * array form to indicate that requests without a Content-Type header are
   * allowed in addition to those with a listed media type.
   *
   * If a plain object is provided, it is assumed to be a mapping of HTTP method
   * keys and media type values where each value is one of the string `"any"` or
   * `"none"` or an array of media types / `"none"`s. In this form, these
   * constraints are applied per request method.
   *
   * By default, _all_ requests using `POST`, `PUT`, and `PATCH` methods, or any
   * request _with_ a Content-Type header, _will always be rejected_ unless
   * configured otherwise. Requests _without_ a Content-Type header that are
   * using methods other than `POST`, `PUT`, and `PATCH` _will always be
   * allowed_ unless explicitly configured via mapping.
   *
   * @see https://www.iana.org/assignments/media-types/media-types.xhtml
   */
  allowedContentTypes?: AllowedContentTypesConfig | AllowedContentTypesPerMethodConfig;
};

/**
 * Rejects requests that are not using an allowed content type. This middleware
 * should usually come _after_ check-method.
 */
export default async function middlewareFunction(
  req: NextApiRequest,
  res: NextApiResponse,
  context: MiddlewareContext<Options>
) {
  debug('entered middleware runtime');
  const { allowedContentTypes: rawAllowedContentTypes } = context.options;
  const contentType = req.headers['content-type']?.toLowerCase();
  const method = req.method?.toUpperCase();

  // ? Ensure everything is lowercased before we begin
  const allowedContentTypes = refineRawAllowedTypes();

  if (!method) {
    debug('content-type check failed: method is undefined');
    sendHttpBadRequest(res, { error: 'undefined method' });
  } else {
    const isPayloadMethod = ['PUT', 'POST', 'PATCH'].includes(method);

    if (!allowedContentTypes) {
      if (isPayloadMethod || contentType) {
        debug(
          'content-type check failed: this request cannot be handled with the current configuration (missing allowedContentTypes)'
        );

        sendHttpBadContentType(res, {
          error: 'the server is not configured to handle this type of request'
        });
      }
    } else {
      if (allowedContentTypes === 'none') {
        if (contentType) {
          sendError();
        }
      } else if (allowedContentTypes !== 'any') {
        if (Array.isArray(allowedContentTypes)) {
          if (isPayloadMethod || contentType) {
            const allowsNone = allowedContentTypes.includes('none');
            if (!contentType) {
              if (!allowsNone) {
                sendError();
              }
            } else if (
              contentType === 'none' ||
              !allowedContentTypes.includes(contentType)
            ) {
              sendError();
            }
          }
        } else {
          if (Object.keys(allowedContentTypes).includes(method)) {
            const allowedSubset = allowedContentTypes[method as ValidHttpMethod];

            if (allowedSubset === 'none') {
              if (contentType) {
                sendError();
              }
            } else if (allowedSubset && allowedSubset !== 'any') {
              const allowsNone = allowedSubset.includes('none');
              if (!contentType) {
                if (!allowsNone) {
                  sendError();
                }
              } else if (
                contentType === 'none' ||
                !allowedSubset.includes(contentType)
              ) {
                sendError();
              }
            }
          } else if (isPayloadMethod || contentType) {
            sendError();
          }
        }
      }

      debug(`content-type check succeeded: type "${String(contentType)}" is allowed`);
    }
  }

  function configToLowercase(
    contentTypes: AllowedContentTypesConfig | undefined
  ): AllowedContentTypesConfig {
    return typeof contentTypes === 'string'
      ? (contentTypes.toLowerCase() as typeof contentTypes)
      : Array.isArray(contentTypes)
        ? contentTypes.map((s) => s.toLowerCase())
        : toss(
            new ValidationError('allowedContentTypes must adhere to type constraints')
          );
  }

  function refineRawAllowedTypes() {
    if (
      Array.isArray(rawAllowedContentTypes) ||
      typeof rawAllowedContentTypes === 'string'
    ) {
      return configToLowercase(rawAllowedContentTypes);
    } else if (rawAllowedContentTypes) {
      const refined: AllowedContentTypesPerMethodConfig = {};

      for (const [subMethod, config] of Object.entries(rawAllowedContentTypes)) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (config) {
          refined[subMethod as ValidHttpMethod] = configToLowercase(config);
        }
      }

      return refined;
    }
  }

  function sendError() {
    const error = `unrecognized or disallowed Content-Type header for method ${String(method)}: ${
      contentType ? `"${contentType}"` : '(none)'
    }`;

    debug(`content-type check failed: ${error}`);
    sendHttpBadContentType(res, { error });
  }
}
