// todo Tool - Task management for Voide CLI

import type { Tool, ToolContext, ToolResult } from './types'

export interface TodoItem {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  priority?: 'low' | 'medium' | 'high'
  createdAt: number
  completedAt?: number
}

// In-memory todo storage (per session)
const todoStore = new Map<string, TodoItem[]>()

function getSessionTodos(sessionId: string): TodoItem[] {
  if (!todoStore.has(sessionId)) {
    todoStore.set(sessionId, [])
  }
  return todoStore.get(sessionId)!
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export const todoTool: Tool = {
  name: 'todo',
  description: `Manage a task list for the current session. Use this to track progress on multi-step tasks.

Actions:
- add: Add a new todo item
- list: Show all todos
- complete: Mark a todo as completed
- update: Update a todo's status or content
- remove: Remove a todo
- clear: Clear all completed todos`,

  parameters: [
    {
      name: 'action',
      type: 'string',
      description: 'Action to perform: add, list, complete, update, remove, clear',
      required: true,
      enum: ['add', 'list', 'complete', 'update', 'remove', 'clear'],
    },
    {
      name: 'content',
      type: 'string',
      description: 'Content for the todo (required for add)',
      required: false,
    },
    {
      name: 'id',
      type: 'string',
      description: 'Todo ID (required for complete, update, remove)',
      required: false,
    },
    {
      name: 'status',
      type: 'string',
      description: 'New status for update action',
      required: false,
      enum: ['pending', 'in_progress', 'completed'],
    },
    {
      name: 'priority',
      type: 'string',
      description: 'Priority level',
      required: false,
      enum: ['low', 'medium', 'high'],
    },
  ],

  async execute(
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const action = args.action as string
    const sessionId = context.sessionId || 'default'
    const todos = getSessionTodos(sessionId)

    switch (action) {
      case 'add': {
        const content = args.content as string
        if (!content) {
          return { output: 'Error: content is required for add action', isError: true }
        }

        const todo: TodoItem = {
          id: generateId(),
          content,
          status: 'pending',
          priority: args.priority as TodoItem['priority'],
          createdAt: Date.now(),
        }

        todos.push(todo)

        return {
          output: `Added todo [${todo.id}]: ${content}`,
          title: 'Todo Added',
        }
      }

      case 'list': {
        if (todos.length === 0) {
          return { output: 'No todos yet.' }
        }

        const formatted = formatTodoList(todos)
        return {
          output: formatted,
          title: `Todos (${todos.length})`,
        }
      }

      case 'complete': {
        const id = args.id as string
        if (!id) {
          return { output: 'Error: id is required for complete action', isError: true }
        }

        const todo = todos.find(t => t.id === id)
        if (!todo) {
          return { output: `Error: Todo not found: ${id}`, isError: true }
        }

        todo.status = 'completed'
        todo.completedAt = Date.now()

        return {
          output: `Completed todo [${id}]: ${todo.content}`,
          title: 'Todo Completed',
        }
      }

      case 'update': {
        const id = args.id as string
        if (!id) {
          return { output: 'Error: id is required for update action', isError: true }
        }

        const todo = todos.find(t => t.id === id)
        if (!todo) {
          return { output: `Error: Todo not found: ${id}`, isError: true }
        }

        if (args.content) {
          todo.content = args.content as string
        }
        if (args.status) {
          todo.status = args.status as TodoItem['status']
          if (todo.status === 'completed') {
            todo.completedAt = Date.now()
          }
        }
        if (args.priority) {
          todo.priority = args.priority as TodoItem['priority']
        }

        return {
          output: `Updated todo [${id}]: ${todo.content} (${todo.status})`,
          title: 'Todo Updated',
        }
      }

      case 'remove': {
        const id = args.id as string
        if (!id) {
          return { output: 'Error: id is required for remove action', isError: true }
        }

        const index = todos.findIndex(t => t.id === id)
        if (index === -1) {
          return { output: `Error: Todo not found: ${id}`, isError: true }
        }

        const removed = todos.splice(index, 1)[0]

        return {
          output: `Removed todo [${id}]: ${removed.content}`,
          title: 'Todo Removed',
        }
      }

      case 'clear': {
        const completed = todos.filter(t => t.status === 'completed')
        const remaining = todos.filter(t => t.status !== 'completed')

        todoStore.set(sessionId, remaining)

        return {
          output: `Cleared ${completed.length} completed todos. ${remaining.length} remaining.`,
          title: 'Todos Cleared',
        }
      }

      default:
        return {
          output: `Unknown action: ${action}`,
          isError: true,
        }
    }
  },
}

function formatTodoList(todos: TodoItem[]): string {
  const lines: string[] = []

  // Group by status
  const pending = todos.filter(t => t.status === 'pending')
  const inProgress = todos.filter(t => t.status === 'in_progress')
  const completed = todos.filter(t => t.status === 'completed')

  if (inProgress.length > 0) {
    lines.push('## In Progress')
    for (const todo of inProgress) {
      lines.push(formatTodo(todo))
    }
    lines.push('')
  }

  if (pending.length > 0) {
    lines.push('## Pending')
    for (const todo of pending) {
      lines.push(formatTodo(todo))
    }
    lines.push('')
  }

  if (completed.length > 0) {
    lines.push('## Completed')
    for (const todo of completed) {
      lines.push(formatTodo(todo))
    }
  }

  return lines.join('\n')
}

function formatTodo(todo: TodoItem): string {
  const icon = todo.status === 'completed' ? '✓' : todo.status === 'in_progress' ? '►' : '○'
  const priority = todo.priority ? ` [${todo.priority}]` : ''
  return `  ${icon} [${todo.id}] ${todo.content}${priority}`
}

// Export for direct access
export function getTodos(sessionId: string): TodoItem[] {
  return getSessionTodos(sessionId)
}

export function addTodo(sessionId: string, content: string, priority?: TodoItem['priority']): TodoItem {
  const todos = getSessionTodos(sessionId)
  const todo: TodoItem = {
    id: generateId(),
    content,
    status: 'pending',
    priority,
    createdAt: Date.now(),
  }
  todos.push(todo)
  return todo
}

export function updateTodoStatus(sessionId: string, id: string, status: TodoItem['status']): boolean {
  const todos = getSessionTodos(sessionId)
  const todo = todos.find(t => t.id === id)
  if (!todo) return false
  todo.status = status
  if (status === 'completed') {
    todo.completedAt = Date.now()
  }
  return true
}
