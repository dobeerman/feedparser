/**
 * Export feedparser
 */

exports = module.exports = require('./lib/FeedReader')

/*
  Export the version
*/

exports.version = require('./package.json').version
