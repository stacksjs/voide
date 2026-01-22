// question Tool - Interactive prompts for Voide CLI

import type { Tool, ToolContext, ToolResult } from './types'

export interface QuestionOptions {
  type: 'text' | 'confirm' | 'select' | 'multiselect' | 'password'
  message: string
  default?: unknown
  choices?: Array<{ label: string; value: string; description?: string }>
  validate?: (value: unknown) => string | null
}

export interface QuestionResult {
  answered: boolean
  value: unknown
  cancelled: boolean
}

// Question queue for async handling
const pendingQuestions = new Map<string, {
  options: QuestionOptions
  resolve: (result: QuestionResult) => void
  reject: (error: Error) => void
}>()

export const questionTool: Tool = {
  name: 'question',
  description: `Ask the user a question and wait for their response. Use this when you need user input to proceed.

Types:
- text: Free-form text input
- confirm: Yes/no question
- select: Choose one from options
- multiselect: Choose multiple from options
- password: Hidden text input`,

  parameters: [
    {
      name: 'type',
      type: 'string',
      description: 'Question type',
      required: true,
      enum: ['text', 'confirm', 'select', 'multiselect', 'password'],
    },
    {
      name: 'message',
      type: 'string',
      description: 'The question to ask',
      required: true,
    },
    {
      name: 'default',
      type: 'string',
      description: 'Default value (for text/confirm)',
      required: false,
    },
    {
      name: 'choices',
      type: 'string',
      description: 'JSON array of choices for select/multiselect: [{"label": "...", "value": "..."}]',
      required: false,
    },
    {
      name: 'required',
      type: 'boolean',
      description: 'Whether the question requires an answer',
      required: false,
      default: true,
    },
  ],

  async execute(
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const type = args.type as QuestionOptions['type']
    const message = args.message as string
    const defaultValue = args.default
    const choicesJson = args.choices as string | undefined
    const required = args.required !== false

    if (!message) {
      return { output: 'Error: message is required', isError: true }
    }

    // Parse choices if provided
    let choices: QuestionOptions['choices']
    if (choicesJson) {
      try {
        choices = JSON.parse(choicesJson)
      }
      catch {
        return { output: 'Error: Invalid choices JSON', isError: true }
      }
    }

    // Validate choices for select types
    if ((type === 'select' || type === 'multiselect') && (!choices || choices.length === 0)) {
      return { output: 'Error: choices required for select/multiselect', isError: true }
    }

    const options: QuestionOptions = {
      type,
      message,
      default: defaultValue,
      choices,
    }

    // Check if we have an ask callback
    if (context.askCallback) {
      // For confirm type, use the callback directly
      if (type === 'confirm') {
        const result = await context.askCallback(message)
        return {
          output: JSON.stringify({ answered: true, value: result, cancelled: false }),
          title: 'User Response',
        }
      }
    }

    // Format the question for display
    const formatted = formatQuestion(options, required)

    // Return a special response indicating a question needs to be answered
    // The TUI/CLI will handle prompting the user
    return {
      output: formatted,
      title: 'Question for User',
      metadata: {
        type: 'question',
        questionType: type,
        message,
        choices,
        default: defaultValue,
        required,
      },
    }
  },
}

function formatQuestion(options: QuestionOptions, required: boolean): string {
  const lines: string[] = []

  lines.push(`**${options.message}**`)

  if (options.choices && options.choices.length > 0) {
    lines.push('')
    lines.push('Options:')
    for (let i = 0; i < options.choices.length; i++) {
      const choice = options.choices[i]
      const num = i + 1
      const desc = choice.description ? ` - ${choice.description}` : ''
      lines.push(`  ${num}. ${choice.label}${desc}`)
    }
  }

  if (options.default !== undefined) {
    lines.push('')
    lines.push(`Default: ${options.default}`)
  }

  if (!required) {
    lines.push('')
    lines.push('(Press Enter to skip)')
  }

  return lines.join('\n')
}

// Helper functions for handling questions programmatically

export function createQuestion(id: string, options: QuestionOptions): Promise<QuestionResult> {
  return new Promise((resolve, reject) => {
    pendingQuestions.set(id, { options, resolve, reject })
  })
}

export function answerQuestion(id: string, value: unknown): boolean {
  const pending = pendingQuestions.get(id)
  if (!pending) return false

  pending.resolve({
    answered: true,
    value,
    cancelled: false,
  })

  pendingQuestions.delete(id)
  return true
}

export function cancelQuestion(id: string): boolean {
  const pending = pendingQuestions.get(id)
  if (!pending) return false

  pending.resolve({
    answered: false,
    value: undefined,
    cancelled: true,
  })

  pendingQuestions.delete(id)
  return true
}

export function getPendingQuestion(id: string): QuestionOptions | undefined {
  return pendingQuestions.get(id)?.options
}

export function hasPendingQuestions(): boolean {
  return pendingQuestions.size > 0
}

// Prompt helpers for common question patterns

export async function askConfirm(
  context: ToolContext,
  message: string,
  defaultValue = false,
): Promise<boolean> {
  if (context.askCallback) {
    return context.askCallback(message)
  }

  // If no callback, assume yes for non-destructive defaults
  return defaultValue
}

export async function askText(
  context: ToolContext,
  message: string,
  defaultValue?: string,
): Promise<string | undefined> {
  // This would need TUI integration for actual prompting
  // For now, return default
  return defaultValue
}

export function formatChoices(choices: Array<string | { label: string; value: string }>): QuestionOptions['choices'] {
  return choices.map(c => {
    if (typeof c === 'string') {
      return { label: c, value: c }
    }
    return c
  })
}
