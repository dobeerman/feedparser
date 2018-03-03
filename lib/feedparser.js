const axios = require('axios')
const xml2js = require('xml2js')
const cheerio = require('cheerio')
const iconv = require('iconv-lite')

const FEEDTYPE_RSS = 'rss'
const FEEDTYPE_ATOM = 'Atom'

const parser = new xml2js.Parser({ explicitArray: false })

class FeedParser {
  constructor(urls, options = {}) {
    this.urls = Array.isArray(urls) ? urls : [urls]

    this.options = Object.assign(
      {
        flatten: false
      },
      options
    )
  }

  async parse() {
    const promises = await this.urls.map((url) => FeedParser.read(url))

    return Promise.all(promises).then(async (articles) => {
      if (this.options.flatten) articles = await flatten(articles)

      if (this.options.sort && this.options.sort.key) {
        const { sort: { key }, sort: { order } } = this.options

        if (!this.options.flatten) {
          articles = await articles.map((collection) =>
            collection.sort(compareValues(key, order))
          )
        } else {
          articles = await articles.sort(compareValues(key, order))
        }
      }

      return articles
    })
  }

  static read(url) {
    const instance = axios.create()
    instance.interceptors.response.use(FeedParser.iconvInterceptor)

    return instance(url, {
      method: 'GET',
      responseType: 'arraybuffer'
    })
      .then((response) => {
        const feedType = FeedParser.getFeedType(response.data, url)

        return FeedParser[feedType](response.data, url)
      })
      .catch((error) => Object.assign({}, { error: error.message }))
  }

  static getFeedType(xml) {
    if (/<(rss|rdf)\b/i.test(xml)) return FEEDTYPE_RSS

    if (/<feed\b/i.test(xml)) return FEEDTYPE_ATOM

    return false
  }

  static rss(xml, source) {
    return new Promise((resolve, reject) =>
      parser.parseString(xml, (error, result) => {
        if (error) reject(Object.assign({}, { error }))

        const { item: items } = result.rss.channel

        const articles = items.map((item) => {
          const description = item.description
            ? strip_tags(item.description)
            : null

          const content = item['content:encoded']
            ? strip_tags(item['content:encoded'])
            : null

          const article = {
            title: item.title.trim(),
            author: item['dc:creator'] || item.author,
            category: item.category,
            description,
            content,
            link: item.link,
            source
          }

          if (item.pubDate) {
            Object.assign(article, { published: new Date(item.pubDate) })
          }

          return article
        })

        resolve(articles)
      })
    )
  }

  static Atom(xml, source) {
    return new Promise((resolve, reject) =>
      parser.parseString(xml, (error, result) => {
        if (error) reject(Object.assign({}, { error }))

        const { title, entry: entries } = result.feed

        const articles = entries.map((entry) => {
          if (entry['media:group']) {
            // YouTube
            return FeedParser.AtomYouTube(entry, source)
          }

          const article = {
            title: entry.title.trim(),
            author: entry.author && entry.author.name,
            category: entry.category,
            description: strip_tags(entry.description),
            content: strip_tags(entry['content:encoded']) || null,
            link: entry.link,
            source
          }

          if (entry.published) {
            Object.assign(article, { published: new Date(entry.published) })
          }

          return article
        })

        resolve(articles)
      })
    )
  }

  static AtomYouTube(entry, source) {
    const link = pickBy(entry, (el) => el.$ && el.$.rel === 'alternate')

    const item = {
      title: entry.title,
      author: entry.author && entry.author.name,
      description: strip_tags(entry['media:group']['media:description']),
      link: link.link.$.href,
      source
    }

    if (entry.published) {
      Object.assign(item, { published: new Date(entry.published) })
    }

    return item
  }

  static iconvInterceptor(response) {
    const contentType = response.headers['content-type'].split(';')

    if (contentType[1].includes('-1251')) {
      response.data = iconv.decode(response.data, 'windows-1251')
    }

    return response
  }
}

function strip_tags(source) {
  return cheerio.load(source).text()
}

function flatten(arr, depth = 1) {
  return depth !== 1
    ? arr.reduce(
        (a, v) => a.concat(Array.isArray(v) ? flatten(v, depth - 1) : v),
        []
      )
    : arr.reduce((a, v) => a.concat(v), [])
}

function pickBy(obj, fn) {
  return Object.keys(obj)
    .filter((k) => fn(obj[k], k))
    .reduce((acc, key) => ((acc[key] = obj[key]), acc), {})
}

// Dynamic sorting
function compareValues(key, order = 'asc') {
  return function(a, b) {
    // If property doesn't exist on either object
    if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) return 0

    const varA = typeof a[key] === 'string' ? a[key].toUpperCase() : a[key]
    const varB = typeof b[key] === 'string' ? b[key].toUpperCase() : b[key]

    let comparison = 0

    if (varA > varB) comparison = 1
    else if (varA < varB) comparison = -1

    return order == 'desc' ? comparison * -1 : comparison
  }
}

module.exports = FeedParser
