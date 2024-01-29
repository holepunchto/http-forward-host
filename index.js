const DEFAULT_MAX_BUFFER = 128 * 1024

const HOST = /^host: /i
const FORWARDED_HOST = /^x-forwarded-for: /i

module.exports = function proxy (stream, proxyTo) {
  const maxBuffer = DEFAULT_MAX_BUFFER

  let buffer = null
  let proxying = false
  let destroyed = false

  stream.on('data', ondata)
  stream.on('error', noop)
  stream.on('close', onclose)

  function onclose () {
    destroyed = true
  }

  async function ondata (data) {
    if (buffer === null) buffer = data
    else buffer = Buffer.concat([buffer, data])

    if (proxying) return

    for (let i = buffer.byteLength - 1; i >= 3; i--) {
      if (!isEndOfHeader(buffer, i)) continue

      const ascii = buffer.toString('ascii', 0, i - 3)

      let host = null
      let forwardedHost = null

      for (const line of ascii.split('\r\n')) {
        if (HOST.test(line)) host = line.slice(6)
        else if (FORWARDED_HOST.test(line)) forwardedHost = line.slice(17)
      }

      stream.pause()
      proxying = true

      try {
        const dest = await proxyTo(forwardedHost || host)

        if (destroyed) {
          stream.destroy()
          return
        }

        stream.off('data', ondata)
        stream.off('error', onclose)
        stream.off('close', onclose)
        dest.write(buffer)
        pipeStream(stream, dest)
      } catch (err) {
        stream.destroy(err)
      }

      stream.resume()
      return
    }

    if (buffer.byteLength >= maxBuffer) {
      stream.destroy()
    }
  }
}

function pipeStream (a, b) {
  a.on('error', teardown)
  a.on('close', teardown)
  b.on('error', teardown)
  b.on('close', teardown)

  a.pipe(b).pipe(a)

  function teardown () {
    a.destroy()
    b.destroy()
  }
}

function isEndOfHeader (data, i) {
  return data[i] === 10 && data[i - 1] === 13 && data[i - 2] === 10 && data[i - 3] === 13
}

function noop () {}
