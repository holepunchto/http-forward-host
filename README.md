# http-forward-host

Simple stream proxy that sniffs the HTTP host or x-forwarded-for header and allows you to to forward the stream based on that.

```
npm install http-forward-host
```

## Usage

``` js
const fwd = require('http-forward-host')
const net = require('net') // or tls if you want https

net.createServer(function (sock) {
  fwd(sock, async function (host) {
    // http stream is for the host
    return theStreamYouWantToForwardTo
  })
}).listen(80)
```

## License

Apache-2.0
