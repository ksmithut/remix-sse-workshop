interface ServerSentEvent {
  event?: string
  id?: string
  retry?: number
  data?: string
  comment?: string
}

interface SendFunction {
  (event: ServerSentEvent): void
}

interface InitCallback {
  (send: SendFunction, close: () => void): () => void
}

const textEncoder = new TextEncoder()

const closers = new Set<() => void>()
function handleTerminate() {
  closers.forEach((close) => close())
  closers.clear()
}
process.once('SIGINT', handleTerminate)
process.once('SIGTERM', handleTerminate)

export function createEventStream(signal: AbortSignal, init: InitCallback) {
  const stream = new ReadableStream({
    start(controller) {
      const cleanup = init(
        (event) => {
          controller.enqueue(textEncoder.encode(renderEvent(event)))
        },
        () => setTimeout(close)
      )
      let closed = false
      function close() {
        if (closed) return
        closed = true
        cleanup()
        signal.removeEventListener('abort', close)
        closers.delete(close)
        controller.close()
      }
      signal.addEventListener('abort', close)
      closers.add(close)
      if (signal.aborted) return close()
    }
  })
  const headers = new Headers()
  headers.set('Content-Type', 'text/event-stream')
  headers.set('Cache-Control', 'no-cache, no-store')
  return new Response(stream, { headers })
}

function firstLine(value: string) {
  return value.split('\n', 1)[0]
}

function prefixLines(prefix: string, value: string) {
  return value.replace(/^/gm, prefix)
}

function renderEvent(event: ServerSentEvent) {
  let output = ''
  if (event.event) output += `event: ${firstLine(event.event)}\n`
  if (event.id) output += `id: ${firstLine(event.id)}\n`
  if (
    event.retry &&
    Number.isInteger(event.retry) &&
    Number.isFinite(event.retry) &&
    event.retry >= 0
  )
    output += `retry: ${event.retry}\n`
  if (event.data) output += prefixLines('data: ', event.data) + '\n'
  if (event.comment) output += prefixLines(': ', event.comment) + '\n'
  return output + '\n'
}
