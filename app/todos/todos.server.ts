import { reducer, type TodoAction, type TodosState } from './todos.reducer.ts'

interface Listener {
  (action: TodoAction): void
}

function createTodosStore() {
  let state: TodosState = { todos: [] }
  const listeners = new Set<Listener>()
  return {
    get state() {
      return state
    },
    subscribe(listener: Listener) {
      listeners.add(listener)
      listener({ type: 'init', payload: state })
      return () => {
        listeners.delete(listener)
      }
    },
    dispatch(action: TodoAction) {
      const nextState = reducer(state, action)
      if (state === nextState) return
      state = nextState
      listeners.forEach((listener) => listener(action))
    }
  }
}

export default createTodosStore()
