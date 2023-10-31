import React from 'react'
import cx from 'clsx'
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node'
import { useLoaderData, Form } from '@remix-run/react'
import todosStore from '../todos/todos.server.ts'
import { reducer, type Todo } from '../todos/todos.reducer.ts'

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
    case 'complete_todo': {
      const id = body.get('todo_id')
      if (typeof id !== 'string') break
      todosStore.dispatch({ type: 'complete_todo', payload: { id } })
      break
    }
    case 'uncomplete_todo': {
      const id = body.get('todo_id')
      if (typeof id !== 'string') break
      todosStore.dispatch({ type: 'uncomplete_todo', payload: { id } })
      break
    }
    case 'delete_todo': {
      const id = body.get('todo_id')
      if (typeof id !== 'string') break
      todosStore.dispatch({ type: 'delete_todo', payload: { id } })
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
          <li key={todo.id}>
            <TodoItem todo={todo} />
          </li>
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

function TodoItem({ todo }: { todo: Todo }) {
  const updateAction = todo.completed ? 'uncomplete_todo' : 'complete_todo'
  return (
    <div className="flex">
      <Form method="POST">
        <input type="hidden" name="action" value={updateAction} />
        <input type="hidden" name="todo_id" value={todo.id} />
        <button className={cx({ 'line-through': todo.completed })}>
          {todo.label}
        </button>
      </Form>
      <Form method="POST">
        <input type="hidden" name="action" value="delete_todo" />
        <input type="hidden" name="todo_id" value={todo.id} />
        <button className="text-red-500">✘</button>
      </Form>
    </div>
  )
}
