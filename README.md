# feedparser

RSS and Atom parser

Usage:

```js
const feed = new FeedReader(urls, {
  flatten: true, // to be flatten instead of Array of Arrays
  sort: { key: 'title', order: 'asc' }
})

feed
  .parse() // Just call parse()
  .then((result) => result.map((el) => console.log(el.title)))
  .catch((e) => console.log(e))
```

Check the [example](./test/) to get more info.
