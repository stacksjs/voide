/**
 * Component API composables - defineProps, defineEmits, defineExpose, withDefaults
 * Vue/Nuxt-style component APIs for type-safe props, events, and exposed methods
 */

// ============================================================================
// Types
// ============================================================================

export type Constructor<T = unknown> =
  | { new (...args: unknown[]): T }
  | { (): T }

export interface PropOptions<T = unknown> {
  type?: Constructor<T> | Constructor<T>[]
  required?: boolean
  default?: T | (() => T)
  validator?: (value: T) => boolean
  description?: string
}

export type PropsDefinition<T> = {
  [K in keyof T]?: PropOptions<T[K]> | Constructor<T[K]>
}

export interface PropValidationResult {
  valid: boolean
  errors: Array<{ prop: string; message: string }>
  warnings: Array<{ prop: string; message: string }>
}

export interface DefinePropsOptions {
  componentName?: string
  throwOnError?: boolean
  logWarnings?: boolean
}

// ============================================================================
// defineProps
// ============================================================================

/**
 * Define and validate component props with TypeScript support
 * @example
 * // Simple typed props
 * const props = defineProps<{
 *   title: string
 *   count: number
 *   items: string[]
 * }>()
 *
 * // With validation and defaults
 * const props = defineProps<{
 *   title: string
 *   count?: number
 * }>({
 *   title: { required: true },
 *   count: { default: 0 }
 * })
 */
export function defineProps<T extends Record<string, unknown>>(
  definitions?: PropsDefinition<T>,
  rawProps?: Record<string, unknown>
): T {
  const props = rawProps || (typeof window !== 'undefined' ? (window as Record<string, unknown>).__STX_PROPS__ as Record<string, unknown> : {}) || {}
  const result: Record<string, unknown> = {}

  if (!definitions) {
    // No definitions, just return props as-is (TypeScript-only mode)
    return props as T
  }

  for (const [key, definition] of Object.entries(definitions)) {
    const def = normalizeDefinition(definition as PropOptions | Constructor)
    const value = props[key]

    // Check required
    if (def.required && value === undefined) {
      console.warn(`[Props] Missing required prop: "${key}"`)
    }

    // Apply default
    if (value === undefined && def.default !== undefined) {
      result[key] = typeof def.default === 'function' && !isConstructor(def.default)
        ? (def.default as () => unknown)()
        : def.default
    } else {
      result[key] = value
    }

    // Run validator
    if (def.validator && result[key] !== undefined) {
      if (!def.validator(result[key])) {
        console.warn(`[Props] Validation failed for prop: "${key}"`)
      }
    }
  }

  // Copy any extra props not in definitions
  for (const key of Object.keys(props)) {
    if (!(key in result)) {
      result[key] = props[key]
    }
  }

  return result as T
}

/**
 * Define props with validation and get validation results
 * @example
 * const { props, validation } = definePropsWithValidation({
 *   title: { type: String, required: true }
 * }, { throwOnError: false })
 */
export function definePropsWithValidation<T extends Record<string, unknown>>(
  definitions: PropsDefinition<T>,
  options: DefinePropsOptions = {},
  rawProps?: Record<string, unknown>
): { props: T; validation: PropValidationResult } {
  const { componentName = 'Component', throwOnError = false, logWarnings = true } = options
  const props = rawProps || (typeof window !== 'undefined' ? (window as Record<string, unknown>).__STX_PROPS__ as Record<string, unknown> : {}) || {}
  const result: Record<string, unknown> = {}
  const errors: Array<{ prop: string; message: string }> = []
  const warnings: Array<{ prop: string; message: string }> = []

  for (const [key, definition] of Object.entries(definitions)) {
    const def = normalizeDefinition(definition as PropOptions | Constructor)
    const value = props[key]

    // Check required
    if (def.required && value === undefined) {
      const msg = `Missing required prop: "${key}"`
      errors.push({ prop: key, message: msg })
      if (logWarnings) console.warn(`[${componentName}] ${msg}`)
      if (throwOnError) throw new Error(`[${componentName}] ${msg}`)
    }

    // Type check
    if (def.type && value !== undefined) {
      const types = Array.isArray(def.type) ? def.type : [def.type]
      const valid = types.some(t => checkType(value, t))
      if (!valid) {
        const typeNames = types.map(t => t.name).join(' | ')
        const msg = `Invalid type for prop "${key}". Expected ${typeNames}, got ${typeof value}`
        warnings.push({ prop: key, message: msg })
        if (logWarnings) console.warn(`[${componentName}] ${msg}`)
      }
    }

    // Apply default
    if (value === undefined && def.default !== undefined) {
      result[key] = typeof def.default === 'function' && !isConstructor(def.default)
        ? (def.default as () => unknown)()
        : def.default
    } else {
      result[key] = value
    }

    // Run validator
    if (def.validator && result[key] !== undefined) {
      if (!def.validator(result[key])) {
        const msg = `Validation failed for prop: "${key}"`
        errors.push({ prop: key, message: msg })
        if (logWarnings) console.warn(`[${componentName}] ${msg}`)
        if (throwOnError) throw new Error(`[${componentName}] ${msg}`)
      }
    }
  }

  return {
    props: result as T,
    validation: {
      valid: errors.length === 0,
      errors,
      warnings,
    },
  }
}

// ============================================================================
// withDefaults
// ============================================================================

/**
 * Apply default values to props
 * @example
 * const props = withDefaults(defineProps<{
 *   title: string
 *   count?: number
 *   items?: string[]
 * }>(), {
 *   count: 0,
 *   items: () => []
 * })
 */
export function withDefaults<T extends Record<string, unknown>>(
  props: T,
  defaults: Partial<{ [K in keyof T]: T[K] | (() => T[K]) }>
): T {
  const result = { ...props }

  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (result[key] === undefined) {
      result[key as keyof T] = typeof defaultValue === 'function' && !isConstructor(defaultValue)
        ? (defaultValue as () => T[keyof T])()
        : defaultValue as T[keyof T]
    }
  }

  return result
}

// ============================================================================
// Prop helper functions
// ============================================================================

/**
 * Create a required prop definition
 * @example
 * const props = defineProps({ name: required(String) })
 */
export function required<T>(type: Constructor<T>): PropOptions<T> {
  return { type, required: true }
}

/**
 * Create an optional prop with default value
 * @example
 * const props = defineProps({ count: optional(0, Number) })
 */
export function optional<T>(defaultValue: T | (() => T), type?: Constructor<T>): PropOptions<T> {
  return { type, default: defaultValue, required: false }
}

/**
 * Create a prop with custom validator
 * @example
 * const props = defineProps({
 *   email: validated((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { type: String })
 * })
 */
export function validated<T>(
  validator: (value: T) => boolean,
  options: Omit<PropOptions<T>, 'validator'> = {}
): PropOptions<T> {
  return { ...options, validator }
}

/**
 * Create a prop that must be one of specific values
 * @example
 * const props = defineProps({ status: oneOf(['active', 'inactive', 'pending']) })
 */
export function oneOf<T extends readonly unknown[]>(values: T): PropOptions<T[number]> {
  return {
    validator: (v) => values.includes(v as T[number]),
  }
}

/**
 * Create a prop that must be an array of a specific type
 * @example
 * const props = defineProps({ tags: arrayOf(String) })
 */
export function arrayOf<T>(
  itemType: Constructor<T>,
  options: Omit<PropOptions<T[]>, 'type' | 'validator'> = {}
): PropOptions<T[]> {
  return {
    ...options,
    type: Array as unknown as Constructor<T[]>,
    validator: (arr) => {
      if (!Array.isArray(arr)) return false
      return arr.every(item => checkType(item, itemType))
    },
  }
}

// ============================================================================
// defineEmits
// ============================================================================

type EmitFn<T extends Record<string, unknown>> = <K extends keyof T>(
  event: K,
  payload: T[K]
) => void

/**
 * Define type-safe event emitter
 * @example
 * const emit = defineEmits<{
 *   'update:value': string
 *   'submit': { data: FormData }
 *   'close': void
 * }>()
 *
 * emit('submit', { data: formData })
 */
export function defineEmits<T extends Record<string, unknown>>(): EmitFn<T> {
  const emit: EmitFn<T> = (event, payload) => {
    if (typeof window === 'undefined') return

    // Dispatch custom event
    const customEvent = new CustomEvent(String(event), {
      detail: payload,
      bubbles: true,
      cancelable: true,
    })

    // Try to dispatch from current component element
    const currentElement = (window as Record<string, unknown>).__STX_CURRENT_ELEMENT__ as HTMLElement | undefined
    if (currentElement) {
      currentElement.dispatchEvent(customEvent)
    } else {
      document.dispatchEvent(customEvent)
    }
  }

  return emit
}

// ============================================================================
// defineExpose
// ============================================================================

/**
 * Expose methods and properties to parent components
 * @example
 * const inputRef = ref<HTMLInputElement>()
 *
 * defineExpose({
 *   focus: () => inputRef.value?.focus(),
 *   reset: () => { inputRef.value.value = '' },
 *   getValue: () => inputRef.value?.value
 * })
 */
export function defineExpose<T extends Record<string, unknown>>(exposed: T): T {
  if (typeof window === 'undefined') return exposed

  // Store exposed API for parent access
  const currentId = (window as Record<string, unknown>).__STX_CURRENT_ID__ as string | undefined
  if (currentId) {
    const exposedMap = ((window as Record<string, unknown>).__STX_EXPOSED__ ||= {}) as Record<string, T>
    exposedMap[currentId] = exposed
  }

  return exposed
}

/**
 * Get exposed API from a component ref
 * @example
 * const childExposed = getExposed<{ focus: () => void }>('child-component-id')
 * childExposed?.focus()
 */
export function getExposed<T extends Record<string, unknown>>(componentId: string): T | undefined {
  if (typeof window === 'undefined') return undefined

  const exposedMap = (window as Record<string, unknown>).__STX_EXPOSED__ as Record<string, T> | undefined
  return exposedMap?.[componentId]
}

// ============================================================================
// Helper utilities
// ============================================================================

function normalizeDefinition(def: PropOptions | Constructor | undefined): PropOptions {
  if (!def) return {}
  if (typeof def === 'function') return { type: def }
  return def
}

function isConstructor(fn: unknown): boolean {
  if (typeof fn !== 'function') return false
  try {
    // Native constructors like String, Number, Array have special behavior
    return fn === String || fn === Number || fn === Boolean || fn === Array || fn === Object ||
           fn.prototype?.constructor === fn
  } catch {
    return false
  }
}

function checkType(value: unknown, type: Constructor): boolean {
  if (type === String) return typeof value === 'string'
  if (type === Number) return typeof value === 'number'
  if (type === Boolean) return typeof value === 'boolean'
  if (type === Array) return Array.isArray(value)
  if (type === Object) return typeof value === 'object' && value !== null && !Array.isArray(value)
  if (type === Function) return typeof value === 'function'
  if (type === Date) return value instanceof Date
  if (type === RegExp) return value instanceof RegExp
  if (type === Promise) return value instanceof Promise

  // Custom class check
  return value instanceof type
}

// ============================================================================
// Component context helpers
// ============================================================================

/**
 * Set current component context (for internal use)
 */
export function setComponentContext(id: string, element: HTMLElement, props: Record<string, unknown>): () => void {
  if (typeof window === 'undefined') return () => {}

  const win = window as Record<string, unknown>
  win.__STX_CURRENT_ID__ = id
  win.__STX_CURRENT_ELEMENT__ = element
  win.__STX_PROPS__ = props

  return () => {
    delete win.__STX_CURRENT_ID__
    delete win.__STX_CURRENT_ELEMENT__
    delete win.__STX_PROPS__
  }
}

/**
 * Get current component ID
 */
export function getCurrentComponentId(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as Record<string, unknown>).__STX_CURRENT_ID__ as string | undefined
}

/**
 * Get current component element
 */
export function getCurrentElement(): HTMLElement | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as Record<string, unknown>).__STX_CURRENT_ELEMENT__ as HTMLElement | undefined
}
