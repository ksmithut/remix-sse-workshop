import type { LoaderFunctionArgs } from '@remix-run/node'
import { createEventStream } from '../lib/event-stream.ts'

export async function loader({ request }: LoaderFunctionArgs) {
  return createEventStream(request.signal, (send) => {
    let count = 0
    const interval = setInterval(() => {
      count++
      send({ data: `${count}` })
    }, 1000)
    return () => {
      clearInterval(interval)
    }
  })
}
