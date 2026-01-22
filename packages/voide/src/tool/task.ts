// task Tool - Hierarchical task management with tree view for Voide CLI

import type { Tool, ToolContext, ToolResult } from './types'

export interface Task {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'critical'
  parentId?: string
  children: string[]
  createdAt: number
  updatedAt: number
  completedAt?: number
  notes?: string
  tags?: string[]
}

// In-memory task storage (per session)
const taskStore = new Map<string, Map<string, Task>>()

function getSessionTasks(sessionId: string): Map<string, Task> {
  if (!taskStore.has(sessionId)) {
    taskStore.set(sessionId, new Map())
  }
  return taskStore.get(sessionId)!
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export const taskTool: Tool = {
  name: 'task',
  description: `Manage hierarchical tasks with subtasks and tree view. Useful for breaking down complex work.

Actions:
- create: Create a new task (optionally under a parent)
- tree: Display all tasks as a tree
- update: Update task status, content, or priority
- subtask: Add a subtask to an existing task
- move: Move a task under a different parent
- delete: Delete a task and optionally its children
- stats: Show task statistics`,

  parameters: [
    {
      name: 'action',
      type: 'string',
      description: 'Action: create, tree, update, subtask, move, delete, stats',
      required: true,
      enum: ['create', 'tree', 'update', 'subtask', 'move', 'delete', 'stats'],
    },
    {
      name: 'content',
      type: 'string',
      description: 'Task content/description',
      required: false,
    },
    {
      name: 'id',
      type: 'string',
      description: 'Task ID for update/delete/move operations',
      required: false,
    },
    {
      name: 'parentId',
      type: 'string',
      description: 'Parent task ID for subtask/move operations',
      required: false,
    },
    {
      name: 'status',
      type: 'string',
      description: 'Task status',
      required: false,
      enum: ['pending', 'in_progress', 'completed', 'blocked'],
    },
    {
      name: 'priority',
      type: 'string',
      description: 'Task priority',
      required: false,
      enum: ['low', 'medium', 'high', 'critical'],
    },
    {
      name: 'notes',
      type: 'string',
      description: 'Additional notes',
      required: false,
    },
    {
      name: 'tags',
      type: 'string',
      description: 'Comma-separated tags',
      required: false,
    },
  ],

  async execute(
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const action = args.action as string
    const sessionId = context.sessionId || 'default'
    const tasks = getSessionTasks(sessionId)

    switch (action) {
      case 'create': {
        const content = args.content as string
        if (!content) {
          return { output: 'Error: content is required', isError: true }
        }

        const task: Task = {
          id: generateId(),
          content,
          status: 'pending',
          priority: (args.priority as Task['priority']) || 'medium',
          parentId: args.parentId as string | undefined,
          children: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          notes: args.notes as string | undefined,
          tags: args.tags ? (args.tags as string).split(',').map(t => t.trim()) : undefined,
        }

        // Add to parent's children if parent exists
        if (task.parentId) {
          const parent = tasks.get(task.parentId)
          if (parent) {
            parent.children.push(task.id)
            parent.updatedAt = Date.now()
          }
          else {
            return { output: `Error: Parent task not found: ${task.parentId}`, isError: true }
          }
        }

        tasks.set(task.id, task)

        return {
          output: `Created task [${task.id}]: ${content}`,
          title: 'Task Created',
        }
      }

      case 'tree': {
        if (tasks.size === 0) {
          return { output: 'No tasks yet.' }
        }

        // Find root tasks (no parent)
        const roots = Array.from(tasks.values()).filter(t => !t.parentId)
        const tree = renderTree(roots, tasks, 0)

        return {
          output: tree,
          title: `Tasks (${tasks.size} total)`,
        }
      }

      case 'update': {
        const id = args.id as string
        if (!id) {
          return { output: 'Error: id is required', isError: true }
        }

        const task = tasks.get(id)
        if (!task) {
          return { output: `Error: Task not found: ${id}`, isError: true }
        }

        if (args.content) task.content = args.content as string
        if (args.status) {
          task.status = args.status as Task['status']
          if (task.status === 'completed') {
            task.completedAt = Date.now()
          }
        }
        if (args.priority) task.priority = args.priority as Task['priority']
        if (args.notes) task.notes = args.notes as string
        if (args.tags) task.tags = (args.tags as string).split(',').map(t => t.trim())

        task.updatedAt = Date.now()

        return {
          output: `Updated task [${id}]: ${task.content} (${task.status})`,
          title: 'Task Updated',
        }
      }

      case 'subtask': {
        const parentId = args.parentId as string || args.id as string
        const content = args.content as string

        if (!parentId) {
          return { output: 'Error: parentId or id is required', isError: true }
        }
        if (!content) {
          return { output: 'Error: content is required', isError: true }
        }

        const parent = tasks.get(parentId)
        if (!parent) {
          return { output: `Error: Parent task not found: ${parentId}`, isError: true }
        }

        const subtask: Task = {
          id: generateId(),
          content,
          status: 'pending',
          priority: (args.priority as Task['priority']) || parent.priority,
          parentId,
          children: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        parent.children.push(subtask.id)
        parent.updatedAt = Date.now()
        tasks.set(subtask.id, subtask)

        return {
          output: `Added subtask [${subtask.id}] under [${parentId}]: ${content}`,
          title: 'Subtask Created',
        }
      }

      case 'move': {
        const id = args.id as string
        const newParentId = args.parentId as string

        if (!id) {
          return { output: 'Error: id is required', isError: true }
        }

        const task = tasks.get(id)
        if (!task) {
          return { output: `Error: Task not found: ${id}`, isError: true }
        }

        // Remove from old parent
        if (task.parentId) {
          const oldParent = tasks.get(task.parentId)
          if (oldParent) {
            oldParent.children = oldParent.children.filter(c => c !== id)
            oldParent.updatedAt = Date.now()
          }
        }

        // Add to new parent
        if (newParentId) {
          const newParent = tasks.get(newParentId)
          if (!newParent) {
            return { output: `Error: New parent not found: ${newParentId}`, isError: true }
          }

          // Check for circular reference
          if (isDescendant(id, newParentId, tasks)) {
            return { output: 'Error: Cannot move task under its own descendant', isError: true }
          }

          newParent.children.push(id)
          newParent.updatedAt = Date.now()
        }

        task.parentId = newParentId || undefined
        task.updatedAt = Date.now()

        return {
          output: `Moved task [${id}] ${newParentId ? `under [${newParentId}]` : 'to root'}`,
          title: 'Task Moved',
        }
      }

      case 'delete': {
        const id = args.id as string
        if (!id) {
          return { output: 'Error: id is required', isError: true }
        }

        const task = tasks.get(id)
        if (!task) {
          return { output: `Error: Task not found: ${id}`, isError: true }
        }

        // Remove from parent
        if (task.parentId) {
          const parent = tasks.get(task.parentId)
          if (parent) {
            parent.children = parent.children.filter(c => c !== id)
          }
        }

        // Delete children recursively
        const deleted = deleteRecursive(id, tasks)

        return {
          output: `Deleted ${deleted} task(s)`,
          title: 'Task Deleted',
        }
      }

      case 'stats': {
        const allTasks = Array.from(tasks.values())

        const stats = {
          total: allTasks.length,
          pending: allTasks.filter(t => t.status === 'pending').length,
          inProgress: allTasks.filter(t => t.status === 'in_progress').length,
          completed: allTasks.filter(t => t.status === 'completed').length,
          blocked: allTasks.filter(t => t.status === 'blocked').length,
          byPriority: {
            critical: allTasks.filter(t => t.priority === 'critical').length,
            high: allTasks.filter(t => t.priority === 'high').length,
            medium: allTasks.filter(t => t.priority === 'medium').length,
            low: allTasks.filter(t => t.priority === 'low').length,
          },
        }

        const lines = [
          '## Task Statistics',
          '',
          `Total: ${stats.total}`,
          `  - Pending: ${stats.pending}`,
          `  - In Progress: ${stats.inProgress}`,
          `  - Completed: ${stats.completed}`,
          `  - Blocked: ${stats.blocked}`,
          '',
          'By Priority:',
          `  - Critical: ${stats.byPriority.critical}`,
          `  - High: ${stats.byPriority.high}`,
          `  - Medium: ${stats.byPriority.medium}`,
          `  - Low: ${stats.byPriority.low}`,
        ]

        return {
          output: lines.join('\n'),
          title: 'Task Statistics',
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

function renderTree(
  roots: Task[],
  allTasks: Map<string, Task>,
  depth: number,
): string {
  const lines: string[] = []

  for (let i = 0; i < roots.length; i++) {
    const task = roots[i]
    const isLast = i === roots.length - 1
    const prefix = depth === 0 ? '' : (isLast ? '└── ' : '├── ')
    const childPrefix = depth === 0 ? '' : (isLast ? '    ' : '│   ')

    const statusIcon = getStatusIcon(task.status)
    const priorityBadge = task.priority !== 'medium' ? ` [${task.priority}]` : ''

    lines.push(`${prefix}${statusIcon} [${task.id}] ${task.content}${priorityBadge}`)

    // Render children
    if (task.children.length > 0) {
      const children = task.children
        .map(id => allTasks.get(id))
        .filter((t): t is Task => t !== undefined)

      const childTree = renderTree(children, allTasks, depth + 1)
      const indentedTree = childTree.split('\n').map(line => childPrefix + line).join('\n')
      lines.push(indentedTree)
    }
  }

  return lines.join('\n')
}

function getStatusIcon(status: Task['status']): string {
  switch (status) {
    case 'completed': return '✓'
    case 'in_progress': return '►'
    case 'blocked': return '⊗'
    default: return '○'
  }
}

function isDescendant(
  ancestorId: string,
  descendantId: string,
  tasks: Map<string, Task>,
): boolean {
  const ancestor = tasks.get(ancestorId)
  if (!ancestor) return false

  for (const childId of ancestor.children) {
    if (childId === descendantId) return true
    if (isDescendant(childId, descendantId, tasks)) return true
  }

  return false
}

function deleteRecursive(id: string, tasks: Map<string, Task>): number {
  const task = tasks.get(id)
  if (!task) return 0

  let count = 1
  tasks.delete(id)

  for (const childId of task.children) {
    count += deleteRecursive(childId, tasks)
  }

  return count
}

// Export for direct access
export function getTasks(sessionId: string): Task[] {
  return Array.from(getSessionTasks(sessionId).values())
}

export function getTask(sessionId: string, id: string): Task | undefined {
  return getSessionTasks(sessionId).get(id)
}
