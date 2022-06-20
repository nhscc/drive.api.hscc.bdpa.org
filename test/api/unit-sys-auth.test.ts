/* eslint-disable no-global-assign */
import { testApiHandler } from 'next-test-api-route-handler';
import Endpoint, { config as Config } from 'universe/pages/api/sys/ping';

const handler = Endpoint as typeof Endpoint & { config?: typeof Config };
handler.config = Config;

jest.mock('universe/backend/middleware', () => {
  const { middlewareFactory } = require('multiverse/next-api-glue');
  const { default: handleError } = require('multiverse/next-adhesive/handle-error');

  return {
    withMiddleware: jest
      .fn()
      .mockImplementation(middlewareFactory({ use: [], useOnError: [handleError] }))
  };
});

describe('api/sys/key', () => {
  describe('create', () => {
    it('', async () => {
      expect.hasAssertions();
    });
  });

  describe('delete', () => {
    it('', async () => {
      expect.hasAssertions();
    });
  });

  describe('list', () => {
    it('', async () => {
      expect.hasAssertions();
    });
  });

  describe('unban', () => {
    it('', async () => {
      expect.hasAssertions();
    });
  });
});
