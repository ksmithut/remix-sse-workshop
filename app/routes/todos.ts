import type { LoaderFunctionArgs } from '@remix-run/node'
import { createEventStream } from '../lib/event-stream.ts'
import todosStore from '../todos/todos.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
  return createEventStream(request.signal, (send) => {
    const unsubscribe = todosStore.subscribe((event) => {
      send({ data: JSON.stringify(event) })
    })
    const keepAlive = setInterval(() => send({ comment: 'ka' }), 15_000)
    return () => {
      clearInterval(keepAlive)
      unsubscribe()
    }
  })
}
