import type { LoaderFunctionArgs } from '@remix-run/server-runtime'

const encoder = new TextEncoder()

export async function loader({ request }: LoaderFunctionArgs) {
  const stream = new ReadableStream({
    start(controller) {
      let count = 0
      setInterval(() => {
        count++
        console.log({ count })
        const data = count.toString() + '\n'
        const bytes = encoder.encode(data)
        controller.enqueue(bytes)
      }, 1000)
    }
  })
  return new Response(stream)
}
