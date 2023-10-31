import type { LoaderFunctionArgs } from '@remix-run/server-runtime'

const encoder = new TextEncoder()

export async function loader({ request }: LoaderFunctionArgs) {
  const stream = new ReadableStream({
    start(controller) {
      let count = 0
      const interval = setInterval(() => {
        count++
        console.log({ count })
        const data = `data: ${count}\n\n`
        const bytes = encoder.encode(data)
        controller.enqueue(bytes)
      }, 1000)
      let closed = false
      function close() {
        if (closed) return
        closed = true
        clearInterval(interval)
        request.signal.removeEventListener('abort', close)
        controller.close()
      }
      request.signal.addEventListener('abort', close)
      if (request.signal.aborted) return close()
    }
  })
  const headers = new Headers()
  headers.set('Content-Type', 'text/event-stream')
  headers.set('Cache-Control', 'no-cache, no-store')
  return new Response(stream, { headers })
}
