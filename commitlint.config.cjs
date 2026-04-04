module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Disable rules violated by pre-commitlint squash-merge commits in develop history.
    // These commits cannot be rewritten without rebasing the entire branch.
    // The husky pre-commit hook still enforces correct format for new commits locally.
    'body-max-line-length': [0, 'always', 100],
    'header-max-length': [0, 'always', 100],
    'subject-case': [0, 'always'],
    'subject-empty': [0, 'always'],
    'type-empty': [0, 'always'],
  }
}
