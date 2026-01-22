// todo Tool Tests

import { describe, test, expect, beforeEach } from 'bun:test'
import { todoTool, getTodos, addTodo, updateTodoStatus } from '../../src/tool/todo'
import { createMockToolContext, randomString } from '../utils/helpers'

describe('todoTool', () => {
  let context: ReturnType<typeof createMockToolContext>

  beforeEach(() => {
    // Use unique session ID for each test to isolate state
    context = createMockToolContext({ sessionId: `test-${randomString(8)}` })
  })

  describe('metadata', () => {
    test('should have correct name', () => {
      expect(todoTool.name).toBe('todo')
    })

    test('should have description', () => {
      expect(todoTool.description).toBeTruthy()
      expect(todoTool.description).toContain('task')
    })

    test('should have action parameter', () => {
      const actionParam = todoTool.parameters.find(p => p.name === 'action')
      expect(actionParam).toBeDefined()
      expect(actionParam?.required).toBe(true)
      expect(actionParam?.enum).toContain('add')
      expect(actionParam?.enum).toContain('list')
      expect(actionParam?.enum).toContain('complete')
    })
  })

  describe('add action', () => {
    test('should add a todo item', async () => {
      const result = await todoTool.execute({
        action: 'add',
        content: 'Test todo item',
      }, context)

      expect(result.isError).toBeFalsy()
      expect(result.output).toContain('Added todo')
      expect(result.output).toContain('Test todo item')
    })

    test('should generate unique ID', async () => {
      const result1 = await todoTool.execute({
        action: 'add',
        content: 'Todo 1',
      }, context)

      const result2 = await todoTool.execute({
        action: 'add',
        content: 'Todo 2',
      }, context)

      const idMatch1 = result1.output.match(/\[([^\]]+)\]/)
      const idMatch2 = result2.output.match(/\[([^\]]+)\]/)

      expect(idMatch1?.[1]).not.toBe(idMatch2?.[1])
    })

    test('should support priority', async () => {
      const result = await todoTool.execute({
        action: 'add',
        content: 'High priority item',
        priority: 'high',
      }, context)

      expect(result.isError).toBeFalsy()

      const todos = getTodos(context.sessionId)
      expect(todos.some(t => t.priority === 'high')).toBe(true)
    })

    test('should error without content', async () => {
      const result = await todoTool.execute({
        action: 'add',
      }, context)

      expect(result.isError).toBe(true)
      expect(result.output).toContain('content is required')
    })
  })

  describe('list action', () => {
    test('should list all todos', async () => {
      await todoTool.execute({ action: 'add', content: 'Todo 1' }, context)
      await todoTool.execute({ action: 'add', content: 'Todo 2' }, context)

      const result = await todoTool.execute({ action: 'list' }, context)

      expect(result.output).toContain('Todo 1')
      expect(result.output).toContain('Todo 2')
    })

    test('should show empty message when no todos', async () => {
      const result = await todoTool.execute({ action: 'list' }, context)

      expect(result.output).toContain('No todos')
    })

    test('should group by status', async () => {
      await todoTool.execute({ action: 'add', content: 'Pending item' }, context)

      const todos = getTodos(context.sessionId)
      await todoTool.execute({
        action: 'update',
        id: todos[0].id,
        status: 'in_progress',
      }, context)

      await todoTool.execute({ action: 'add', content: 'Another pending' }, context)

      const result = await todoTool.execute({ action: 'list' }, context)

      expect(result.output).toContain('In Progress')
      expect(result.output).toContain('Pending')
    })
  })

  describe('complete action', () => {
    test('should mark todo as completed', async () => {
      await todoTool.execute({ action: 'add', content: 'Complete me' }, context)
      const todos = getTodos(context.sessionId)
      const todoId = todos[0].id

      const result = await todoTool.execute({
        action: 'complete',
        id: todoId,
      }, context)

      expect(result.isError).toBeFalsy()
      expect(result.output).toContain('Completed')

      const updatedTodos = getTodos(context.sessionId)
      expect(updatedTodos[0].status).toBe('completed')
      expect(updatedTodos[0].completedAt).toBeDefined()
    })

    test('should error with invalid ID', async () => {
      const result = await todoTool.execute({
        action: 'complete',
        id: 'nonexistent',
      }, context)

      expect(result.isError).toBe(true)
      expect(result.output).toContain('not found')
    })

    test('should error without ID', async () => {
      const result = await todoTool.execute({
        action: 'complete',
      }, context)

      expect(result.isError).toBe(true)
      expect(result.output).toContain('id is required')
    })
  })

  describe('update action', () => {
    test('should update todo content', async () => {
      await todoTool.execute({ action: 'add', content: 'Original' }, context)
      const todos = getTodos(context.sessionId)

      const result = await todoTool.execute({
        action: 'update',
        id: todos[0].id,
        content: 'Updated content',
      }, context)

      expect(result.isError).toBeFalsy()

      const updatedTodos = getTodos(context.sessionId)
      expect(updatedTodos[0].content).toBe('Updated content')
    })

    test('should update todo status', async () => {
      await todoTool.execute({ action: 'add', content: 'Test' }, context)
      const todos = getTodos(context.sessionId)

      await todoTool.execute({
        action: 'update',
        id: todos[0].id,
        status: 'in_progress',
      }, context)

      const updatedTodos = getTodos(context.sessionId)
      expect(updatedTodos[0].status).toBe('in_progress')
    })

    test('should update todo priority', async () => {
      await todoTool.execute({ action: 'add', content: 'Test' }, context)
      const todos = getTodos(context.sessionId)

      await todoTool.execute({
        action: 'update',
        id: todos[0].id,
        priority: 'high',
      }, context)

      const updatedTodos = getTodos(context.sessionId)
      expect(updatedTodos[0].priority).toBe('high')
    })
  })

  describe('remove action', () => {
    test('should remove a todo', async () => {
      await todoTool.execute({ action: 'add', content: 'Remove me' }, context)
      const todos = getTodos(context.sessionId)

      const result = await todoTool.execute({
        action: 'remove',
        id: todos[0].id,
      }, context)

      expect(result.isError).toBeFalsy()
      expect(result.output).toContain('Removed')

      const updatedTodos = getTodos(context.sessionId)
      expect(updatedTodos.length).toBe(0)
    })

    test('should error with invalid ID', async () => {
      const result = await todoTool.execute({
        action: 'remove',
        id: 'nonexistent',
      }, context)

      expect(result.isError).toBe(true)
    })
  })

  describe('clear action', () => {
    test('should clear completed todos', async () => {
      await todoTool.execute({ action: 'add', content: 'Completed' }, context)
      await todoTool.execute({ action: 'add', content: 'Pending' }, context)

      const todos = getTodos(context.sessionId)
      await todoTool.execute({
        action: 'complete',
        id: todos[0].id,
      }, context)

      const result = await todoTool.execute({ action: 'clear' }, context)

      expect(result.output).toContain('Cleared 1')
      expect(result.output).toContain('1 remaining')

      const updatedTodos = getTodos(context.sessionId)
      expect(updatedTodos.length).toBe(1)
      expect(updatedTodos[0].content).toBe('Pending')
    })
  })
})

describe('todo helper functions', () => {
  const sessionId = `helper-test-${randomString(8)}`

  test('addTodo should add and return todo', () => {
    const todo = addTodo(sessionId, 'Helper test', 'high')

    expect(todo.content).toBe('Helper test')
    expect(todo.priority).toBe('high')
    expect(todo.status).toBe('pending')
    expect(todo.id).toBeTruthy()
  })

  test('updateTodoStatus should update status', () => {
    const todo = addTodo(sessionId, 'Update test')
    const success = updateTodoStatus(sessionId, todo.id, 'completed')

    expect(success).toBe(true)

    const todos = getTodos(sessionId)
    const updated = todos.find(t => t.id === todo.id)
    expect(updated?.status).toBe('completed')
  })

  test('getTodos should return all todos for session', () => {
    const sid = `get-test-${randomString(8)}`
    addTodo(sid, 'Todo 1')
    addTodo(sid, 'Todo 2')
    addTodo(sid, 'Todo 3')

    const todos = getTodos(sid)
    expect(todos.length).toBe(3)
  })
})
