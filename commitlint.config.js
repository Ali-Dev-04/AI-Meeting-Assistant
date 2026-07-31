// Enforces Conventional Commits (see docs/CONTRIBUTING.md).
// Example: feat(meeting): add audio upload endpoint
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // new feature
        'fix', // bug fix
        'docs', // documentation only
        'style', // formatting, no code change
        'refactor', // neither feat nor fix
        'perf', // performance improvement
        'test', // adding/fixing tests
        'build', // build system or deps
        'ci', // CI config
        'chore', // misc tooling
        'revert', // revert a commit
      ],
    ],
    'subject-case': [0], // allow natural sentence case
    'header-max-length': [2, 'always', 100],
  },
};
