# Contributing

Hi there! First off, we're thrilled 🤩 you want contribute to this project!

First time contributor to a GitHub project? If you could use some help getting
started, [take a look at this quick and easy guide][1]. 💜

## Briefly: Submitting a Pull Request (PR)

> See also: [CODE_OF_CONDUCT.md][2]

This repository uses a [fully automated][3] [continuous linting][4] (CL),
[integration testing][5] (CI), and [deployment][5] (CD)
[semantic-release][6]-based pipeline for integrating PRs and publishing
releases. The nice thing about a fully automated CL/CI/CD pipeline is that
anyone anywhere can make a contribution quickly and with minimal tedium all
around!

This repository makes extensive use of [debug][7] (through [rejoinder][8]).
Should you wish to view all possible debugging output, [export `DEBUG='*'`][9].
To get debugging output for just this project's components, [export
`DEBUG='drive.api.hscc.bdpa.org:*'`][9].

The ideal contributor flow is as follows:

1. [Fork][10] this repository and [clone it locally][11].
2. Configure and install dependencies with `npm ci`.
   - You use `npm ci` here instead of `npm install` to [prevent unnecessary
     updates to `package.json` and `package-lock.json`][12], but if it makes
     more sense to use `npm install` feel free to use that instead.
   - If `.env.example` exists, consider copying it to `.env` and configuring
     sensible defaults.
   - If you're using `npm@<=6`, you'll need to install any [peer
     dependencies][13] manually. If you're using `npm@>=7`, you may have to
     [forcefully][14] allow peer deps to be satisfied by custom forks of certain
     packages.
3. Before making any changes, ensure all unit tests are passing with
   `npm run test`.
4. _(optional but recommended)_ Create a new branch, usually off `main`.
   - Example: `git checkout -b contrib-feature-1`
5. Make your changes and commit. Thanks to CL, your work will be checked as you
   commit it; any problems will abort the commit attempt
   - Ensure any new tests still pass even when the `DEBUG` environment variable
     is defined.
   - Various [import aliases][24] are available in some projects. Check the
     [tsconfig.json][25] `"paths"` key to see which if any aliases this project
     supports.
6. Push your commits to your fork and, when you're ready, [_fearlessly_ submit
   your PR][15]! Your changes will be tested in our CI pipeline.
7. Pat yourself on the back! Your hard work is well on its way to being reviewed
   and, if everything looks good, merged and released 🚀

Additionally, there are a few things you can do to increase the likelihood your
PR passes review:

- **Do** [open an issue][16] and discuss your proposed changes (to prevent
  wasting your valuable time, e.g. _maybe we're already working on a fix!_), and
  [search][17] to see if there are any existing issues related to your concerns
- **Do** practice [atomic committing][18]
- **Do not** reduce code coverage ([codecov][19] checks are performed during CI)
- **Do** [follow convention][20] when coming up with your commit messages
- **Do not** circumvent CL, i.e. automated pre-commit linting, formatting, and
  unit testing
- **Do** ensure `README.md` and other documentation that isn't autogenerated is
  kept consistent with your changes
- **Do not** create a PR to introduce [_purely_ cosmetic commits][21]
  - Code de-duplication and other potential optimizations we **do not** consider
    _purely_ cosmetic 🙂
- **Do** ensure your tests still pass in the presence of the `DEBUG` environment
  variable
- **Do** keep your PR as narrow and focused as possible
  - If you ran `npm install` instead of `npm ci` and it updated `package.json`
    or `package-lock.json` and those updates have nothing to do with your PR
    (e.g. random nested deps were updated), **do not** stage changes to those
    files
  - If there are multiple related changes to be made but (1) they do not
    immediately depend on one another or (2) one implements extended/alternative
    functionality based on the other, consider submitting them as separate PRs
    instead 👍🏿

> Be aware: all contributions to this project, regardless of committer, origin,
> or context and immediately upon push to this repository, are [released][22] in
> accordance with [this project's license][23].

At this point, you're ready to create your PR and ✨ contribute ✨!

## npm Scripts

This repo ships with several [npm scripts][49]. Use `npm run list-tasks` to see
which of the following scripts are available for this project.

> Using these scripts requires a linux-like development environment. None of the
> scripts are likely to work on non-POSIX environments. If you're on Windows,
> use [WSL][50].

### Developing

- `npm run dev` to start a development server or instance
- `npm run lint` to run a project-wide type check (handled by CL/CI)
- `npm run test` (or `npm test`, `npm run test-unit`) to run the unit tests
  (handled by CL/CI)
  - Also [gathers test coverage data][51] as HTML files (under `coverage/`)
  - Can also run `npm run test-integration` to run all the integration tests
- `npm run test-integration-node` to run integration tests on the last three LTS
  Node versions (handled by CI)
- `npm run test-integration-client` to run client (browser/cli/etc) integration
  tests with [puppeteer][52] (handled by CI)
- `npm run test-integration-webpack` to run tests verifying the distributable
  can be bundled with Webpack 5 (as both ESM and CJS) (handled by CI)
- `npm run test-integration-externals` to run tests on compiled external
  executables (under `external-scripts/bin/`) (handled by CI)

#### Other Development Scripts

- `npm run test-repeat` to run the entire test suite 100 times
  - Good for spotting bad async code and heisenbugs
- `npm run generate` to transpile config files (under `config/`) from scratch
- `npm run regenerate` to quickly re-transpile config files (under `config/`)
- `npm run postinstall` to (re-)install [Husky Git hooks][53] if not in a CI
  environment (handled by npm)

### Building and Deploying

- `npm run build` (alias: `npm run build-dist`) to compile `src/` into `dist/`
  (or `build/`), which is what ships to production (handled by CI/CD)
- `npm run format` to run source formatting over the codebase (handled by
  CL/CI/CD)
- `npm run start` to deploy a _local production mode_ instance
- `npm run deploy` to deploy to production (bring your own auth tokens) (handled
  by CD)

#### Other Build Scripts

- `npm run clean` to delete all build process artifacts (except `node_modules/`)
- `npm run build-changelog` to re-build the changelog (handled by CI/CD)
  - You can run this as `CHANGELOG_SKIP_TITLE=true npm run build-changelog` to
    skip prepending the header
- `npm run build-docs` to re-build the documentation (handled by CI/CD)
- `npm run build-externals` to compile `external-scripts/` into
  `external-scripts/bin/`
- `npm run build-stats` to gather statistics about Webpack (look for
  `bundle-stats.ignore.json`)

### NPX Scripts

> These commands might be installed as a project dependency but are expected to
> be run using [`npx X`][54] instead of `npm run X` regardless.

- `npx npm-force-resolutions` to forcefully patch security audit problems
  (rarely necessary)
- `npx semantic-release -d` to run the CD pipeline locally (in [dry-run
  mode][55])

[1]: https://www.dataschool.io/how-to-contribute-on-github
[2]: /.github/CODE_OF_CONDUCT.md
[3]: https://github.com/features/actions
[4]: https://github.com/Xunnamius/drive.api.hscc.bdpa.org/tree/main/.husky
[5]: .github/workflows/build-test.yml
[6]: https://github.com/semantic-release/semantic-release#readme
[7]: https://www.npmjs.com/package/debug
[8]: https://www.npmjs.com/package/rejoinder
[9]: https://www.npmjs.com/package/debug#wildcards
[10]: https://github.com/Xunnamius/drive.api.hscc.bdpa.org/fork
[11]:
  https://docs.github.com/en/free-pro-team@latest/github/creating-cloning-and-archiving-repositories/cloning-a-repository
[12]: https://docs.npmjs.com/cli/v6/commands/npm-ci
[13]:
  https://docs.npmjs.com/cli/v6/configuring-npm/package-json#peerdependencies
[14]:
  https://docs.npmjs.com/cli/v7/commands/npm-install#configuration-options-affecting-dependency-resolution-and-tree-design
[15]: https://github.com/Xunnamius/drive.api.hscc.bdpa.org/compare
[16]: https://github.com/Xunnamius/drive.api.hscc.bdpa.org/issues/new/choose
[17]: https://github.com/Xunnamius/drive.api.hscc.bdpa.org/issues?q=
[18]: https://www.codewithjason.com/atomic-commits-testing/
[19]: https://about.codecov.io/
[20]: https://www.conventionalcommits.org/en/v1.0.0/#summary
[21]: https://github.com/rails/rails/pull/13771#issuecomment-32746700
[22]:
  https://help.github.com/articles/github-terms-of-service/#6-contributions-under-repository-license
[23]: LICENSE
[49]: https://docs.npmjs.com/cli/v6/commands/npm-run-script
[50]: https://docs.microsoft.com/en-us/windows/wsl/install-win10
[51]: https://jestjs.io/docs/en/cli.html#--coverageboolean
[52]: https://github.com/puppeteer/puppeteer
[53]: https://github.com/typicode/husky
[54]: https://www.npmjs.com/package/npx
[55]:
  https://semantic-release.gitbook.io/semantic-release/usage/configuration#dryrun
[24]:
  https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping
[25]: tsconfig.json
