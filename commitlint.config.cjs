module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Disable rules that trip on pre-commitlint commits in the develop history.
    // These commits predate the adoption of conventional commits and cannot
    // be rewritten without rebasing the entire branch.
    'body-max-line-length': [0, 'always', 100],
    'subject-case': [0, 'always'],
    'subject-empty': [0, 'always'],
    'type-empty': [0, 'always'],
  }
}
