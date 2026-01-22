// question Tool Tests

import { describe, test, expect, beforeEach } from 'bun:test'
import {
  questionTool,
  createQuestion,
  answerQuestion,
  cancelQuestion,
  getPendingQuestion,
  hasPendingQuestions,
  askConfirm,
  askText,
  formatChoices,
} from '../../src/tool/question'
import { createMockToolContext, randomString } from '../utils/helpers'

describe('questionTool', () => {
  let context: ReturnType<typeof createMockToolContext>

  beforeEach(() => {
    context = createMockToolContext({ sessionId: `question-test-${randomString(8)}` })
  })

  describe('metadata', () => {
    test('should have correct name', () => {
      expect(questionTool.name).toBe('question')
    })

    test('should have description with question types', () => {
      expect(questionTool.description).toContain('text')
      expect(questionTool.description).toContain('confirm')
      expect(questionTool.description).toContain('select')
    })

    test('should have type parameter with all types', () => {
      const typeParam = questionTool.parameters.find(p => p.name === 'type')
      expect(typeParam?.enum).toContain('text')
      expect(typeParam?.enum).toContain('confirm')
      expect(typeParam?.enum).toContain('select')
      expect(typeParam?.enum).toContain('multiselect')
      expect(typeParam?.enum).toContain('password')
    })
  })

  describe('execute', () => {
    describe('text type', () => {
      test('should format text question', async () => {
        const result = await questionTool.execute({
          type: 'text',
          message: 'What is your name?',
        }, context)

        expect(result.isError).toBeFalsy()
        expect(result.output).toContain('What is your name?')
        expect(result.metadata?.type).toBe('question')
        expect(result.metadata?.questionType).toBe('text')
      })

      test('should include default value', async () => {
        const result = await questionTool.execute({
          type: 'text',
          message: 'Enter value:',
          default: 'default-value',
        }, context)

        expect(result.output).toContain('Default: default-value')
      })

      test('should show skip hint when not required', async () => {
        const result = await questionTool.execute({
          type: 'text',
          message: 'Optional question:',
          required: false,
        }, context)

        expect(result.output).toContain('Press Enter to skip')
      })
    })

    describe('confirm type', () => {
      test('should format confirm question', async () => {
        const result = await questionTool.execute({
          type: 'confirm',
          message: 'Are you sure?',
        }, context)

        expect(result.output).toContain('Are you sure?')
        expect(result.metadata?.questionType).toBe('confirm')
      })

      test('should use callback for confirm when available', async () => {
        let callbackCalled = false
        const contextWithCallback = createMockToolContext({
          askCallback: async (msg) => {
            callbackCalled = true
            return true
          },
        })

        const result = await questionTool.execute({
          type: 'confirm',
          message: 'Proceed?',
        }, contextWithCallback)

        expect(callbackCalled).toBe(true)
        expect(result.output).toContain('answered')
      })
    })

    describe('select type', () => {
      test('should format select question with choices', async () => {
        const choices = JSON.stringify([
          { label: 'Option A', value: 'a' },
          { label: 'Option B', value: 'b' },
          { label: 'Option C', value: 'c' },
        ])

        const result = await questionTool.execute({
          type: 'select',
          message: 'Choose one:',
          choices,
        }, context)

        expect(result.output).toContain('Choose one')
        expect(result.output).toContain('Option A')
        expect(result.output).toContain('Option B')
        expect(result.output).toContain('Option C')
        expect(result.output).toContain('1.')
        expect(result.output).toContain('2.')
        expect(result.output).toContain('3.')
      })

      test('should error without choices', async () => {
        const result = await questionTool.execute({
          type: 'select',
          message: 'Choose:',
        }, context)

        expect(result.isError).toBe(true)
        expect(result.output).toContain('choices required')
      })

      test('should error with empty choices', async () => {
        const result = await questionTool.execute({
          type: 'select',
          message: 'Choose:',
          choices: '[]',
        }, context)

        expect(result.isError).toBe(true)
      })

      test('should include choice descriptions', async () => {
        const choices = JSON.stringify([
          { label: 'Opt 1', value: '1', description: 'First option description' },
          { label: 'Opt 2', value: '2', description: 'Second option description' },
        ])

        const result = await questionTool.execute({
          type: 'select',
          message: 'Pick:',
          choices,
        }, context)

        expect(result.output).toContain('First option description')
        expect(result.output).toContain('Second option description')
      })
    })

    describe('multiselect type', () => {
      test('should format multiselect question', async () => {
        const choices = JSON.stringify([
          { label: 'Feature A', value: 'a' },
          { label: 'Feature B', value: 'b' },
        ])

        const result = await questionTool.execute({
          type: 'multiselect',
          message: 'Select features:',
          choices,
        }, context)

        expect(result.output).toContain('Select features')
        expect(result.metadata?.questionType).toBe('multiselect')
      })
    })

    describe('password type', () => {
      test('should format password question', async () => {
        const result = await questionTool.execute({
          type: 'password',
          message: 'Enter password:',
        }, context)

        expect(result.output).toContain('Enter password')
        expect(result.metadata?.questionType).toBe('password')
      })
    })

    describe('validation', () => {
      test('should error without message', async () => {
        const result = await questionTool.execute({
          type: 'text',
        }, context)

        expect(result.isError).toBe(true)
        expect(result.output).toContain('message is required')
      })

      test('should error with invalid choices JSON', async () => {
        const result = await questionTool.execute({
          type: 'select',
          message: 'Choose:',
          choices: 'invalid json',
        }, context)

        expect(result.isError).toBe(true)
        expect(result.output).toContain('Invalid choices JSON')
      })
    })
  })
})

describe('question helper functions', () => {
  describe('createQuestion', () => {
    test('should create pending question', async () => {
      const id = 'test-q-1'
      const options = {
        type: 'text' as const,
        message: 'Test question?',
      }

      const promise = createQuestion(id, options)

      expect(hasPendingQuestions()).toBe(true)
      expect(getPendingQuestion(id)).toEqual(options)

      // Clean up by answering
      answerQuestion(id, 'answer')
      await promise
    })
  })

  describe('answerQuestion', () => {
    test('should resolve question with value', async () => {
      const id = 'test-q-2'
      const options = { type: 'text' as const, message: 'Question?' }

      const resultPromise = createQuestion(id, options)
      const answered = answerQuestion(id, 'test-answer')

      expect(answered).toBe(true)

      const result = await resultPromise
      expect(result.answered).toBe(true)
      expect(result.value).toBe('test-answer')
      expect(result.cancelled).toBe(false)
    })

    test('should return false for unknown question', () => {
      const answered = answerQuestion('nonexistent', 'value')
      expect(answered).toBe(false)
    })
  })

  describe('cancelQuestion', () => {
    test('should cancel pending question', async () => {
      const id = 'test-q-3'
      const options = { type: 'confirm' as const, message: 'Continue?' }

      const resultPromise = createQuestion(id, options)
      const cancelled = cancelQuestion(id)

      expect(cancelled).toBe(true)

      const result = await resultPromise
      expect(result.answered).toBe(false)
      expect(result.cancelled).toBe(true)
    })

    test('should return false for unknown question', () => {
      const cancelled = cancelQuestion('nonexistent')
      expect(cancelled).toBe(false)
    })
  })

  describe('getPendingQuestion', () => {
    test('should return undefined for non-existent question', () => {
      expect(getPendingQuestion('nonexistent')).toBeUndefined()
    })
  })

  describe('askConfirm', () => {
    test('should use callback if available', async () => {
      const context = createMockToolContext({
        askCallback: async () => true,
      })

      const result = await askConfirm(context, 'Confirm?')
      expect(result).toBe(true)
    })

    test('should return default when no callback', async () => {
      const context = createMockToolContext({
        askCallback: undefined,
      })

      const result = await askConfirm(context, 'Confirm?', true)
      expect(result).toBe(true)

      const result2 = await askConfirm(context, 'Confirm?', false)
      expect(result2).toBe(false)
    })
  })

  describe('askText', () => {
    test('should return default value', async () => {
      const context = createMockToolContext()

      const result = await askText(context, 'Enter name:', 'default-name')
      expect(result).toBe('default-name')
    })

    test('should return undefined without default', async () => {
      const context = createMockToolContext()

      const result = await askText(context, 'Enter name:')
      expect(result).toBeUndefined()
    })
  })

  describe('formatChoices', () => {
    test('should convert string array to choice objects', () => {
      const choices = formatChoices(['Option A', 'Option B', 'Option C'])

      expect(choices).toEqual([
        { label: 'Option A', value: 'Option A' },
        { label: 'Option B', value: 'Option B' },
        { label: 'Option C', value: 'Option C' },
      ])
    })

    test('should pass through choice objects', () => {
      const input = [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ]

      const choices = formatChoices(input)
      expect(choices).toEqual(input)
    })

    test('should handle mixed array', () => {
      const input = [
        'String Option',
        { label: 'Object Option', value: 'obj' },
      ]

      const choices = formatChoices(input)
      expect(choices).toEqual([
        { label: 'String Option', value: 'String Option' },
        { label: 'Object Option', value: 'obj' },
      ])
    })
  })
})
