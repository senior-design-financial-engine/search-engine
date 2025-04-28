module.exports = {
  transformIgnorePatterns: [
    '/node_modules/(?!(axios)/)'
  ],
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest'
  }
}; 