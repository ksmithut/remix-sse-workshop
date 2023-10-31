import React from 'react'
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node'
import { useLoaderData, Form } from '@remix-run/react'
import todosStore from '../todos/todos.server.ts'
import { reducer } from '../todos/todos.reducer.ts'

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.formData()
  switch (body.get('action')) {
    case 'add_todo': {
      const label = body.get('label')
      if (typeof label !== 'string') break
      const id = crypto.randomUUID()
      todosStore.dispatch({ type: 'add_todo', payload: { id, label } })
      break
    }
  }
  return {}
}

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
      <AddTodoForm />
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.label}</li>
        ))}
      </ul>
    </div>
  )
}

function AddTodoForm() {
  const resetForm = React.useCallback((e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget
    setTimeout(() => form.reset())
  }, [])
  return (
    <Form method="POST" onSubmit={resetForm}>
      <input type="hidden" name="action" value="add_todo" />
      <input name="label" placeholder="Add Todo..." required />
    </Form>
  )
}
