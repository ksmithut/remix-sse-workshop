export interface Todo {
  id: string
  label: string
  completed: boolean
}

export interface TodosState {
  todos: Todo[]
}

interface Init {
  type: 'init'
  payload: TodosState
}

interface AddTodo {
  type: 'add_todo'
  payload: { id: string; label: string }
}

interface CompleteTodo {
  type: 'complete_todo'
  payload: { id: string }
}

interface UncompleteTodo {
  type: 'uncomplete_todo'
  payload: { id: string }
}

interface DeleteTodo {
  type: 'delete_todo'
  payload: { id: string }
}

export type TodoAction =
  | Init
  | AddTodo
  | CompleteTodo
  | UncompleteTodo
  | DeleteTodo

export function reducer(state: TodosState, action: TodoAction): TodosState {
  switch (action.type) {
    case 'init': {
      return action.payload
    }
    case 'add_todo': {
      const { id, label } = action.payload
      return {
        ...state,
        todos: [...state.todos, { id, label, completed: false }]
      }
    }
    case 'complete_todo': {
      const { id } = action.payload
      return {
        ...state,
        todos: state.todos.map((todo) =>
          todo.id === id ? { ...todo, completed: true } : todo
        )
      }
    }
    case 'uncomplete_todo': {
      const { id } = action.payload
      return {
        ...state,
        todos: state.todos.map((todo) =>
          todo.id === id ? { ...todo, completed: false } : todo
        )
      }
    }
    case 'delete_todo': {
      const { id } = action.payload
      return { ...state, todos: state.todos.filter((todo) => todo.id !== id) }
    }
    default:
      return state
  }
}
