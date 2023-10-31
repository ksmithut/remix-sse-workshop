import React from 'react'
import type { LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import todosStore from '../todos/todos.server.ts'
import { reducer } from '../todos/todos.reducer.ts'

export async function loader(params: LoaderFunctionArgs) {
  return { state: todosStore.state }
}

function useTodos() {
  const data = useLoaderData<typeof loader>()
  const [state, dispatch] = React.useReducer(reducer, data.state)
  React.useEffect(() => {
    function handleMessage(event: MessageEvent<string>) {
      dispatch(JSON.parse(event.data))
    }
    const eventStore = new EventSource('/todos')
    eventStore.addEventListener('message', handleMessage)
    return () => {
      eventStore.removeEventListener('message', handleMessage)
      eventStore.close()
    }
  }, [])
  return state
}

export default function Index() {
  const { todos } = useTodos()
  return (
    <div>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.label}</li>
        ))}
      </ul>
    </div>
  )
}
