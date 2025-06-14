/**
 * @type {() => import('next').NextConfig}
 */
module.exports = function nextConfig() {
  return {
    // * https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
    allowedDevOrigins: ['*.romulus'],

    // ? Renames the build dir "build" instead of ".next"
    distDir: 'build',

    // ? Select some environment variables defined in .env to push to the
    // ? client.
    // !! DO NOT PUT ANY SECRET ENVIRONMENT VARIABLES HERE !!
    env: {
      RESULTS_PER_PAGE: process.env.RESULTS_PER_PAGE,
      IGNORE_RATE_LIMITS: process.env.IGNORE_RATE_LIMITS,
      LOCKOUT_ALL_CLIENTS: process.env.LOCKOUT_ALL_CLIENTS,
      DISALLOWED_METHODS: process.env.DISALLOWED_METHODS,
      MAX_CONTENT_LENGTH_BYTES: process.env.MAX_CONTENT_LENGTH_BYTES
    },

    eslint: {
      // ! This prevents production builds from failing in the presence of
      // ! ESLint errors; linting is handled during CL/CI rather than at deploy
      // ! time.
      ignoreDuringBuilds: true
    },

    typescript: {
      // ! This prevents production builds from failing in the presence of
      // ! TypeScript errors, e.g. when modules from dev deps cannot be found;
      // ! linting is handled during CL/CI rather than at deploy time.
      ignoreBuildErrors: true
    },

    async rewrites() {
      return [
        {
          source: '/:path*',
          destination: '/api/:path*'
        }
      ];
    }
  };
};
