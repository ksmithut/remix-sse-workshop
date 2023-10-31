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
    <div className="flex h-screen w-screen flex-col items-center overflow-scroll bg-slate-50 text-2xl dark:bg-zinc-800 dark:text-white">
      <div className="w-full max-w-xs gap-3 px-2 py-4">
        <AddTodoForm />
        <ul className="flex flex-col gap-1 px-5 pt-3">
          {todos.map((todo) => (
            <li key={todo.id}>
              <TodoItem todo={todo} />
            </li>
          ))}
        </ul>
      </div>
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
      <input
        name="label"
        placeholder="Add Todo..."
        required
        className="w-full rounded-full bg-white px-5 py-2 drop-shadow-md dark:bg-zinc-700"
      />
    </Form>
  )
}

function TodoItem({ todo }: { todo: Todo }) {
  const updateAction = todo.completed ? 'uncomplete_todo' : 'complete_todo'
  return (
    <div className="group flex w-full justify-between gap-3">
      <Form method="POST" className="flex-grow">
        <input type="hidden" name="action" value={updateAction} />
        <input type="hidden" name="todo_id" value={todo.id} />
        <button
          className={cx('w-full break-all text-left', {
            'text-gray-400 line-through': todo.completed
          })}
        >
          {todo.label}
        </button>
      </Form>
      <Form method="POST">
        <input type="hidden" name="action" value="delete_todo" />
        <input type="hidden" name="todo_id" value={todo.id} />
        <button className="h-full px-1 text-red-500 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100">
          ✘
        </button>
      </Form>
    </div>
  )
}
