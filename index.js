/**
 * Export feedparser
 */

exports = module.exports = require('./lib/feedparser')

/*
  Export the version
*/

exports.version = require('./package.json').version
