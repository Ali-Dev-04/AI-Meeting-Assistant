// Files staged for commit are auto-formatted and lint-fixed.
// Kept FAST: type-checking & tests run in CI, not on every commit.
module.exports = {
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml,css,scss,html}': ['prettier --write'],
};
