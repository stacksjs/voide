// task Tool Tests (Hierarchical Task Management)

import { describe, test, expect, beforeEach } from 'bun:test'
import { taskTool, getTasks, getTask } from '../../src/tool/task'
import { createMockToolContext, randomString } from '../utils/helpers'

describe('taskTool', () => {
  let context: ReturnType<typeof createMockToolContext>

  beforeEach(() => {
    context = createMockToolContext({ sessionId: `task-test-${randomString(8)}` })
  })

  describe('metadata', () => {
    test('should have correct name', () => {
      expect(taskTool.name).toBe('task')
    })

    test('should have description with actions', () => {
      expect(taskTool.description).toContain('hierarchical')
      expect(taskTool.description).toContain('tree')
    })

    test('should have action parameter with all actions', () => {
      const actionParam = taskTool.parameters.find(p => p.name === 'action')
      expect(actionParam?.enum).toContain('create')
      expect(actionParam?.enum).toContain('tree')
      expect(actionParam?.enum).toContain('update')
      expect(actionParam?.enum).toContain('subtask')
      expect(actionParam?.enum).toContain('move')
      expect(actionParam?.enum).toContain('delete')
      expect(actionParam?.enum).toContain('stats')
    })
  })

  describe('create action', () => {
    test('should create a root task', async () => {
      const result = await taskTool.execute({
        action: 'create',
        content: 'Main task',
      }, context)

      expect(result.isError).toBeFalsy()
      expect(result.output).toContain('Created task')
      expect(result.output).toContain('Main task')
    })

    test('should create task with priority', async () => {
      const result = await taskTool.execute({
        action: 'create',
        content: 'Critical task',
        priority: 'critical',
      }, context)

      expect(result.isError).toBeFalsy()

      const tasks = getTasks(context.sessionId)
      expect(tasks.some(t => t.priority === 'critical')).toBe(true)
    })

    test('should create task under parent', async () => {
      // Create parent
      await taskTool.execute({
        action: 'create',
        content: 'Parent task',
      }, context)

      const tasks = getTasks(context.sessionId)
      const parentId = tasks[0].id

      // Create child
      const result = await taskTool.execute({
        action: 'create',
        content: 'Child task',
        parentId,
      }, context)

      expect(result.isError).toBeFalsy()

      const updatedTasks = getTasks(context.sessionId)
      const parent = updatedTasks.find(t => t.id === parentId)
      expect(parent?.children.length).toBe(1)
    })

    test('should error with non-existent parent', async () => {
      const result = await taskTool.execute({
        action: 'create',
        content: 'Orphan task',
        parentId: 'nonexistent',
      }, context)

      expect(result.isError).toBe(true)
      expect(result.output).toContain('Parent task not found')
    })

    test('should error without content', async () => {
      const result = await taskTool.execute({
        action: 'create',
      }, context)

      expect(result.isError).toBe(true)
      expect(result.output).toContain('content is required')
    })

    test('should support tags', async () => {
      await taskTool.execute({
        action: 'create',
        content: 'Tagged task',
        tags: 'bug,urgent,frontend',
      }, context)

      const tasks = getTasks(context.sessionId)
      expect(tasks[0].tags).toContain('bug')
      expect(tasks[0].tags).toContain('urgent')
      expect(tasks[0].tags).toContain('frontend')
    })

    test('should support notes', async () => {
      await taskTool.execute({
        action: 'create',
        content: 'Task with notes',
        notes: 'These are additional notes',
      }, context)

      const tasks = getTasks(context.sessionId)
      expect(tasks[0].notes).toBe('These are additional notes')
    })
  })

  describe('tree action', () => {
    test('should show empty state when no tasks', async () => {
      const result = await taskTool.execute({
        action: 'tree',
      }, context)

      expect(result.output).toContain('No tasks')
    })

    test('should display task tree', async () => {
      await taskTool.execute({ action: 'create', content: 'Task 1' }, context)
      await taskTool.execute({ action: 'create', content: 'Task 2' }, context)

      const result = await taskTool.execute({ action: 'tree' }, context)

      expect(result.output).toContain('Task 1')
      expect(result.output).toContain('Task 2')
    })

    test('should show hierarchical structure', async () => {
      await taskTool.execute({ action: 'create', content: 'Parent' }, context)
      const tasks = getTasks(context.sessionId)
      const parentId = tasks[0].id

      await taskTool.execute({
        action: 'subtask',
        parentId,
        content: 'Child 1',
      }, context)

      await taskTool.execute({
        action: 'subtask',
        parentId,
        content: 'Child 2',
      }, context)

      const result = await taskTool.execute({ action: 'tree' }, context)

      expect(result.output).toContain('Parent')
      expect(result.output).toContain('Child 1')
      expect(result.output).toContain('Child 2')
      // Should have tree indicators
      expect(result.output).toMatch(/[├└]/)
    })

    test('should show status icons', async () => {
      await taskTool.execute({ action: 'create', content: 'Pending' }, context)

      const tasks = getTasks(context.sessionId)
      await taskTool.execute({
        action: 'update',
        id: tasks[0].id,
        status: 'completed',
      }, context)

      await taskTool.execute({ action: 'create', content: 'In Progress' }, context)

      const result = await taskTool.execute({ action: 'tree' }, context)

      expect(result.output).toContain('✓') // Completed
      expect(result.output).toContain('○') // Pending
    })

    test('should show priority badges for non-medium', async () => {
      await taskTool.execute({
        action: 'create',
        content: 'High priority',
        priority: 'high',
      }, context)

      const result = await taskTool.execute({ action: 'tree' }, context)

      expect(result.output).toContain('[high]')
    })
  })

  describe('update action', () => {
    test('should update task content', async () => {
      await taskTool.execute({ action: 'create', content: 'Original' }, context)
      const tasks = getTasks(context.sessionId)

      await taskTool.execute({
        action: 'update',
        id: tasks[0].id,
        content: 'Updated',
      }, context)

      const updated = getTask(context.sessionId, tasks[0].id)
      expect(updated?.content).toBe('Updated')
    })

    test('should update task status', async () => {
      await taskTool.execute({ action: 'create', content: 'Test' }, context)
      const tasks = getTasks(context.sessionId)

      await taskTool.execute({
        action: 'update',
        id: tasks[0].id,
        status: 'in_progress',
      }, context)

      const updated = getTask(context.sessionId, tasks[0].id)
      expect(updated?.status).toBe('in_progress')
    })

    test('should set completedAt when marking completed', async () => {
      await taskTool.execute({ action: 'create', content: 'Test' }, context)
      const tasks = getTasks(context.sessionId)

      await taskTool.execute({
        action: 'update',
        id: tasks[0].id,
        status: 'completed',
      }, context)

      const updated = getTask(context.sessionId, tasks[0].id)
      expect(updated?.completedAt).toBeDefined()
    })

    test('should error with invalid ID', async () => {
      const result = await taskTool.execute({
        action: 'update',
        id: 'nonexistent',
        content: 'New content',
      }, context)

      expect(result.isError).toBe(true)
    })
  })

  describe('subtask action', () => {
    test('should create subtask under parent', async () => {
      await taskTool.execute({ action: 'create', content: 'Parent' }, context)
      const tasks = getTasks(context.sessionId)

      const result = await taskTool.execute({
        action: 'subtask',
        parentId: tasks[0].id,
        content: 'Subtask',
      }, context)

      expect(result.isError).toBeFalsy()
      expect(result.output).toContain('Added subtask')
    })

    test('should inherit parent priority by default', async () => {
      await taskTool.execute({
        action: 'create',
        content: 'High Parent',
        priority: 'high',
      }, context)

      const tasks = getTasks(context.sessionId)

      await taskTool.execute({
        action: 'subtask',
        parentId: tasks[0].id,
        content: 'Child',
      }, context)

      const updatedTasks = getTasks(context.sessionId)
      const child = updatedTasks.find(t => t.content === 'Child')
      expect(child?.priority).toBe('high')
    })

    test('should update parent children array', async () => {
      await taskTool.execute({ action: 'create', content: 'Parent' }, context)
      const tasks = getTasks(context.sessionId)
      const parentId = tasks[0].id

      await taskTool.execute({
        action: 'subtask',
        parentId,
        content: 'Sub 1',
      }, context)

      await taskTool.execute({
        action: 'subtask',
        parentId,
        content: 'Sub 2',
      }, context)

      const parent = getTask(context.sessionId, parentId)
      expect(parent?.children.length).toBe(2)
    })
  })

  describe('move action', () => {
    test('should move task to new parent', async () => {
      await taskTool.execute({ action: 'create', content: 'Parent 1' }, context)
      await taskTool.execute({ action: 'create', content: 'Parent 2' }, context)
      await taskTool.execute({ action: 'create', content: 'Child' }, context)

      const tasks = getTasks(context.sessionId)
      const parent1 = tasks[0]
      const parent2 = tasks[1]
      const child = tasks[2]

      // First move under parent1
      await taskTool.execute({
        action: 'move',
        id: child.id,
        parentId: parent1.id,
      }, context)

      // Then move to parent2
      await taskTool.execute({
        action: 'move',
        id: child.id,
        parentId: parent2.id,
      }, context)

      const updatedParent1 = getTask(context.sessionId, parent1.id)
      const updatedParent2 = getTask(context.sessionId, parent2.id)

      expect(updatedParent1?.children).not.toContain(child.id)
      expect(updatedParent2?.children).toContain(child.id)
    })

    test('should move task to root', async () => {
      await taskTool.execute({ action: 'create', content: 'Parent' }, context)
      const tasks = getTasks(context.sessionId)
      const parentId = tasks[0].id

      await taskTool.execute({
        action: 'subtask',
        parentId,
        content: 'Child',
      }, context)

      const updatedTasks = getTasks(context.sessionId)
      const child = updatedTasks.find(t => t.content === 'Child')

      // Move to root (no parentId)
      await taskTool.execute({
        action: 'move',
        id: child!.id,
      }, context)

      const movedChild = getTask(context.sessionId, child!.id)
      expect(movedChild?.parentId).toBeUndefined()
    })

    test('should prevent circular reference', async () => {
      await taskTool.execute({ action: 'create', content: 'Parent' }, context)
      const tasks = getTasks(context.sessionId)

      await taskTool.execute({
        action: 'subtask',
        parentId: tasks[0].id,
        content: 'Child',
      }, context)

      const updatedTasks = getTasks(context.sessionId)
      const child = updatedTasks.find(t => t.content === 'Child')

      // Try to move parent under child (circular)
      const result = await taskTool.execute({
        action: 'move',
        id: tasks[0].id,
        parentId: child!.id,
      }, context)

      expect(result.isError).toBe(true)
      expect(result.output).toContain('circular')
    })
  })

  describe('delete action', () => {
    test('should delete a task', async () => {
      await taskTool.execute({ action: 'create', content: 'Delete me' }, context)
      const tasks = getTasks(context.sessionId)

      const result = await taskTool.execute({
        action: 'delete',
        id: tasks[0].id,
      }, context)

      expect(result.isError).toBeFalsy()
      expect(result.output).toContain('Deleted')

      const remainingTasks = getTasks(context.sessionId)
      expect(remainingTasks.length).toBe(0)
    })

    test('should delete children recursively', async () => {
      await taskTool.execute({ action: 'create', content: 'Parent' }, context)
      const tasks = getTasks(context.sessionId)

      await taskTool.execute({
        action: 'subtask',
        parentId: tasks[0].id,
        content: 'Child 1',
      }, context)

      await taskTool.execute({
        action: 'subtask',
        parentId: tasks[0].id,
        content: 'Child 2',
      }, context)

      const result = await taskTool.execute({
        action: 'delete',
        id: tasks[0].id,
      }, context)

      expect(result.output).toContain('Deleted 3 task')

      const remainingTasks = getTasks(context.sessionId)
      expect(remainingTasks.length).toBe(0)
    })

    test('should remove from parent children on delete', async () => {
      await taskTool.execute({ action: 'create', content: 'Parent' }, context)
      const tasks = getTasks(context.sessionId)
      const parentId = tasks[0].id

      await taskTool.execute({
        action: 'subtask',
        parentId,
        content: 'Child',
      }, context)

      const updatedTasks = getTasks(context.sessionId)
      const child = updatedTasks.find(t => t.content === 'Child')

      await taskTool.execute({
        action: 'delete',
        id: child!.id,
      }, context)

      const parent = getTask(context.sessionId, parentId)
      expect(parent?.children.length).toBe(0)
    })
  })

  describe('stats action', () => {
    test('should show task statistics', async () => {
      await taskTool.execute({ action: 'create', content: 'Pending', priority: 'low' }, context)
      await taskTool.execute({ action: 'create', content: 'Critical', priority: 'critical' }, context)

      const tasks = getTasks(context.sessionId)
      await taskTool.execute({
        action: 'update',
        id: tasks[0].id,
        status: 'completed',
      }, context)

      const result = await taskTool.execute({ action: 'stats' }, context)

      expect(result.output).toContain('Total: 2')
      expect(result.output).toContain('Completed: 1')
      expect(result.output).toContain('Critical: 1')
      expect(result.output).toContain('Low: 1')
    })
  })
})
