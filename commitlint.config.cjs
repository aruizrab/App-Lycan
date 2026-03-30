module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // GitHub squash-merge commits inline PR bullet points into the body,
    // which routinely exceed 100 chars. Disable body line length enforcement.
    'body-max-line-length': [0, 'always', 100],
  }
}
