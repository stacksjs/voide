/**
 * Voide Store System
 *
 * A lightweight reactive store implementation based on STX's state-management.
 * Designed to work in the browser with localStorage persistence.
 */

export type Subscriber<T> = (value: T, previousValue: T | undefined) => void
export type Unsubscribe = () => void

export interface StoreOptions<T> {
  name?: string
  persist?: {
    key?: string
    storage?: 'local' | 'session'
    debounce?: number
  }
  onChange?: (value: T, prev: T | undefined) => void
}

export interface Store<T> {
  get: () => T
  set: (value: T | ((prev: T) => T)) => void
  update: (partial: Partial<T> | ((prev: T) => Partial<T>)) => void
  subscribe: (subscriber: Subscriber<T>) => Unsubscribe
  reset: () => void
  name?: string
}

/**
 * Create a reactive store
 */
export function createStore<T extends object>(
  initialValue: T,
  options: StoreOptions<T> = {}
): Store<T> {
  const { name, persist, onChange } = options

  let currentValue = { ...initialValue }
  const subscribers = new Set<Subscriber<T>>()
  let persistTimeout: ReturnType<typeof setTimeout> | null = null

  // Load persisted value
  if (persist && typeof window !== 'undefined') {
    const storage = persist.storage === 'session' ? sessionStorage : localStorage
    const key = persist.key || `voide:${name || 'store'}`

    try {
      const stored = storage.getItem(key)
      if (stored) {
        currentValue = { ...initialValue, ...JSON.parse(stored) }
      }
    } catch {
      // Invalid stored value, use initial
    }
  }

  // Persist value to storage
  const persistValue = (value: T) => {
    if (!persist || typeof window === 'undefined') return

    const storage = persist.storage === 'session' ? sessionStorage : localStorage
    const key = persist.key || `voide:${name || 'store'}`

    if (persist.debounce) {
      if (persistTimeout) clearTimeout(persistTimeout)
      persistTimeout = setTimeout(() => {
        storage.setItem(key, JSON.stringify(value))
      }, persist.debounce)
    } else {
      storage.setItem(key, JSON.stringify(value))
    }
  }

  // Notify all subscribers
  const notify = (newValue: T, prevValue: T | undefined) => {
    for (const subscriber of subscribers) {
      try {
        subscriber(newValue, prevValue)
      } catch (error) {
        console.error('[voide-store] Subscriber error:', error)
      }
    }
    if (onChange) {
      onChange(newValue, prevValue)
    }
  }

  const store: Store<T> = {
    get: () => currentValue,

    set: (value) => {
      const prevValue = currentValue
      const newValue = typeof value === 'function'
        ? (value as (prev: T) => T)(currentValue)
        : value

      if (newValue !== prevValue) {
        currentValue = newValue
        persistValue(newValue)
        notify(newValue, prevValue)
      }
    },

    update: (partial) => {
      const prevValue = currentValue
      const updates = typeof partial === 'function'
        ? (partial as (prev: T) => Partial<T>)(currentValue)
        : partial

      const newValue = { ...currentValue, ...updates }
      currentValue = newValue
      persistValue(newValue)
      notify(newValue, prevValue)
    },

    subscribe: (subscriber) => {
      subscribers.add(subscriber)
      // Call immediately with current value
      subscriber(currentValue, undefined)
      return () => {
        subscribers.delete(subscriber)
      }
    },

    reset: () => {
      const prevValue = currentValue
      currentValue = { ...initialValue }
      persistValue(currentValue)
      notify(currentValue, prevValue)
    },

    name
  }

  return store
}

// =============================================================================
// defineStore API (Clean Import Pattern)
// =============================================================================

export interface DefineStoreOptions<S, G extends Record<string, (state: S) => any>, A extends Record<string, (...args: any[]) => any>> {
  state: S | (() => S)
  getters?: G
  actions?: A
  persist?: {
    storage?: 'local' | 'session'
    key?: string
  } | boolean
}

export interface DefinedStore<S> {
  $state: S
  $subscribe: (callback: Subscriber<S>) => Unsubscribe
  $reset: () => void
  $patch: (partial: Partial<S> | ((state: S) => void)) => void
  $id: string
  _store: Store<S>
}

/** Global registry of defined stores */
const storeRegistry = new Map<string, any>()

/**
 * Define a store with state, getters, and actions.
 * Provides a clean API similar to STX's defineStore.
 */
export function defineStore<
  S extends object,
  G extends Record<string, (state: S) => any> = Record<string, never>,
  A extends Record<string, (...args: any[]) => any> = Record<string, never>,
>(
  id: string,
  options: DefineStoreOptions<S, G, A>
): DefinedStore<S> & { [K in keyof S]: S[K] } & { [K in keyof G]: ReturnType<G[K]> } & A {
  const {
    state: initialState,
    getters = {} as G,
    actions = {} as A,
    persist,
  } = options

  // Resolve initial state
  const resolvedInitialState = typeof initialState === 'function'
    ? (initialState as () => S)()
    : initialState

  // Create persistence options
  const persistOptions = persist === true
    ? { storage: 'local' as const, key: `voide:${id}` }
    : persist || undefined

  // Create the underlying store
  const store = createStore<S>(resolvedInitialState, {
    name: id,
    persist: persistOptions,
  })

  // Create a proxy for reactive access
  const storeProxy = new Proxy({} as any, {
    get(_target, prop: string | symbol) {
      const propStr = String(prop)

      // Handle special $ properties
      if (propStr === '$state') return store.get()
      if (propStr === '$subscribe') return store.subscribe
      if (propStr === '$reset') return store.reset
      if (propStr === '$patch') {
        return (partial: Partial<S> | ((state: S) => void)) => {
          if (typeof partial === 'function') {
            const currentState = store.get()
            const draft = { ...currentState }
            partial(draft)
            store.set(draft)
          } else {
            store.update(partial)
          }
        }
      }
      if (propStr === '_store') return store
      if (propStr === '$id') return id

      // Handle getters
      if (propStr in getters) {
        return getters[propStr](store.get())
      }

      // Handle actions (bind 'this' to the store proxy)
      if (propStr in actions) {
        return (...args: unknown[]) => {
          return actions[propStr].apply(storeProxy, args)
        }
      }

      // Handle state properties
      const state = store.get()
      if (state && typeof state === 'object' && propStr in state) {
        return (state as Record<string, unknown>)[propStr]
      }

      return undefined
    },

    set(_target, prop: string | symbol, value: unknown) {
      const propStr = String(prop)

      // Don't allow setting special properties
      if (propStr.startsWith('$') || propStr === '_store') {
        return false
      }

      // Update state
      const state = store.get()
      if (state && typeof state === 'object') {
        store.set({ ...state, [propStr]: value })
        return true
      }

      return false
    },

    has(_target, prop: string | symbol) {
      const propStr = String(prop)
      const state = store.get()
      return (
        propStr.startsWith('$') ||
        propStr === '_store' ||
        propStr in getters ||
        propStr in actions ||
        (state && typeof state === 'object' && propStr in state)
      )
    },

    ownKeys() {
      const state = store.get()
      const stateKeys = state && typeof state === 'object' ? Object.keys(state) : []
      return [
        ...stateKeys,
        ...Object.keys(getters),
        ...Object.keys(actions),
        '$state', '$subscribe', '$reset', '$patch', '$id',
      ]
    },
  })

  // Register in global store registry
  storeRegistry.set(id, storeProxy)

  return storeProxy
}

/**
 * Get a defined store by name.
 */
export function getDefinedStore<S extends object = any>(name: string): any | undefined {
  return storeRegistry.get(name)
}

/**
 * Get all defined store names.
 */
export function getDefinedStoreNames(): string[] {
  return Array.from(storeRegistry.keys())
}

/**
 * Register stores for client-side @stores imports.
 */
export function registerStoresClient(stores: Record<string, any>): void {
  if (typeof window === 'undefined') return

  const w = window as any
  w.__STX_STORES__ = w.__STX_STORES__ || {}

  for (const [name, store] of Object.entries(stores)) {
    w.__STX_STORES__[name] = store
    storeRegistry.set(name, store)
  }

  // Dispatch event to notify that stores are ready
  window.dispatchEvent(new CustomEvent('stx:stores-ready', { detail: Object.keys(stores) }))
}

/**
 * Create a computed store that derives from other stores
 */
export function computed<T, S extends Store<any>[]>(
  stores: S,
  compute: (...values: { [K in keyof S]: S[K] extends Store<infer V> ? V : never }) => T
): { get: () => T; subscribe: (subscriber: Subscriber<T>) => Unsubscribe } {
  const getValues = () => stores.map(s => s.get()) as any
  let currentValue = compute(...getValues())
  const subscribers = new Set<Subscriber<T>>()

  // Subscribe to all source stores
  for (const sourceStore of stores) {
    sourceStore.subscribe(() => {
      const newValue = compute(...getValues())
      if (newValue !== currentValue) {
        const prevValue = currentValue
        currentValue = newValue
        for (const subscriber of subscribers) {
          subscriber(newValue, prevValue)
        }
      }
    })
  }

  return {
    get: () => currentValue,
    subscribe: (subscriber) => {
      subscribers.add(subscriber)
      return () => subscribers.delete(subscriber)
    }
  }
}
