const FeedReader = require('../')

const urls = [
  'https://www.youtube.com/feeds/videos.xml?channel_id=UCsvMopMspsGw89AWim0FMfw',
  'http://www.dailymail.co.uk/articles.rss'
]

const feed = new FeedReader(urls, {
  flatten: true,
  sort: { key: 'title', order: 'asc' }
})

feed
  .parse()
  .then((res) => res.map((el) => console.log(el.title)))
  .catch((e) => console.log(e))
