/**
 * Browser composables - clipboard, media queries, network, window
 */

// ============================================================================
// Clipboard
// ============================================================================

export interface ClipboardRef {
  text: string
  isSupported: boolean
  copied: boolean
  copy: (text: string) => Promise<boolean>
  read: () => Promise<string>
}

export function useClipboard(options: { timeout?: number } = {}): ClipboardRef {
  const { timeout = 1500 } = options
  let currentText = ''
  let copied = false
  let copiedTimeout: ReturnType<typeof setTimeout> | null = null
  const isSupported = typeof navigator !== 'undefined' && 'clipboard' in navigator

  const copy = async (text: string): Promise<boolean> => {
    try {
      if (isSupported) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.cssText = 'position:fixed;opacity:0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      currentText = text
      copied = true
      if (copiedTimeout) clearTimeout(copiedTimeout)
      copiedTimeout = setTimeout(() => { copied = false }, timeout)
      return true
    } catch { return false }
  }

  const read = async (): Promise<string> => {
    if (!isSupported) return ''
    try { return await navigator.clipboard.readText() } catch { return '' }
  }

  return {
    get text() { return currentText },
    get isSupported() { return isSupported },
    get copied() { return copied },
    copy,
    read,
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  return useClipboard().copy(text)
}

// ============================================================================
// Media Queries
// ============================================================================

export interface MediaQueryRef {
  matches: boolean
  subscribe: (callback: (matches: boolean) => void) => () => void
}

export function useMediaQuery(query: string): MediaQueryRef {
  const subscribers = new Set<(matches: boolean) => void>()
  const isClient = typeof window !== 'undefined'
  let currentMatches = false

  if (isClient) {
    const mediaQuery = window.matchMedia(query)
    currentMatches = mediaQuery.matches
    const handler = (event: MediaQueryListEvent) => {
      currentMatches = event.matches
      for (const cb of subscribers) { try { cb(event.matches) } catch {} }
    }
    if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', handler)
    else mediaQuery.addListener(handler)
  }

  return {
    get matches() { return currentMatches },
    subscribe: (callback) => {
      subscribers.add(callback)
      callback(currentMatches)
      return () => subscribers.delete(callback)
    },
  }
}

export function usePreferredDark(): MediaQueryRef {
  return useMediaQuery('(prefers-color-scheme: dark)')
}

export function usePreferredReducedMotion(): MediaQueryRef {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

export function useIsMobile(): MediaQueryRef {
  return useMediaQuery('(max-width: 767px)')
}

export function useIsDesktop(): MediaQueryRef {
  return useMediaQuery('(min-width: 1024px)')
}

// ============================================================================
// Network
// ============================================================================

export interface NetworkState {
  isOnline: boolean
  isOffline: boolean
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | null
  downlink: number | null
  saveData: boolean
}

export interface NetworkRef extends NetworkState {
  subscribe: (callback: (state: NetworkState) => void) => () => void
}

export function useNetwork(): NetworkRef {
  const subscribers = new Set<(state: NetworkState) => void>()
  const isClient = typeof window !== 'undefined'

  const getConnection = () => isClient ? (navigator as any).connection : null

  const getState = (): NetworkState => {
    if (!isClient) return { isOnline: true, isOffline: false, effectiveType: null, downlink: null, saveData: false }
    const conn = getConnection()
    return {
      isOnline: navigator.onLine,
      isOffline: !navigator.onLine,
      effectiveType: conn?.effectiveType || null,
      downlink: conn?.downlink || null,
      saveData: conn?.saveData || false,
    }
  }

  let currentState = getState()

  const notify = () => {
    currentState = getState()
    for (const cb of subscribers) { try { cb(currentState) } catch {} }
  }

  if (isClient) {
    window.addEventListener('online', notify)
    window.addEventListener('offline', notify)
    getConnection()?.addEventListener('change', notify)
  }

  return {
    get isOnline() { return currentState.isOnline },
    get isOffline() { return currentState.isOffline },
    get effectiveType() { return currentState.effectiveType },
    get downlink() { return currentState.downlink },
    get saveData() { return currentState.saveData },
    subscribe: (callback) => {
      subscribers.add(callback)
      callback(currentState)
      return () => subscribers.delete(callback)
    },
  }
}

export function useOnline() {
  const network = useNetwork()
  return {
    get isOnline() { return network.isOnline },
    subscribe: (cb: (online: boolean) => void) => network.subscribe((s) => cb(s.isOnline)),
  }
}

// ============================================================================
// Window
// ============================================================================

export function useWindowSize() {
  const subscribers = new Set<(size: { width: number; height: number }) => void>()
  const isClient = typeof window !== 'undefined'
  let current = { width: isClient ? window.innerWidth : 0, height: isClient ? window.innerHeight : 0 }

  if (isClient) {
    window.addEventListener('resize', () => {
      current = { width: window.innerWidth, height: window.innerHeight }
      for (const cb of subscribers) { try { cb(current) } catch {} }
    }, { passive: true })
  }

  return {
    get width() { return current.width },
    get height() { return current.height },
    subscribe: (callback: (size: { width: number; height: number }) => void) => {
      subscribers.add(callback)
      callback(current)
      return () => subscribers.delete(callback)
    },
  }
}

export function useScroll() {
  const subscribers = new Set<(pos: { x: number; y: number }) => void>()
  const isClient = typeof window !== 'undefined'
  let current = { x: isClient ? window.scrollX : 0, y: isClient ? window.scrollY : 0 }

  if (isClient) {
    window.addEventListener('scroll', () => {
      current = { x: window.scrollX, y: window.scrollY }
      for (const cb of subscribers) { try { cb(current) } catch {} }
    }, { passive: true })
  }

  return {
    get x() { return current.x },
    get y() { return current.y },
    subscribe: (callback: (pos: { x: number; y: number }) => void) => {
      subscribers.add(callback)
      callback(current)
      return () => subscribers.delete(callback)
    },
    scrollTo: (x: number, y: number) => isClient && window.scrollTo(x, y),
    scrollToTop: () => isClient && window.scrollTo({ top: 0, behavior: 'smooth' }),
    scrollToBottom: () => isClient && window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }),
  }
}

export function useVisibility() {
  const subscribers = new Set<(visible: boolean) => void>()
  const isClient = typeof document !== 'undefined'
  let isVisible = isClient ? document.visibilityState === 'visible' : true

  if (isClient) {
    document.addEventListener('visibilitychange', () => {
      isVisible = document.visibilityState === 'visible'
      for (const cb of subscribers) { try { cb(isVisible) } catch {} }
    })
  }

  return {
    get isVisible() { return isVisible },
    subscribe: (callback: (visible: boolean) => void) => {
      subscribers.add(callback)
      callback(isVisible)
      return () => subscribers.delete(callback)
    },
  }
}

export function useTitle(initialTitle?: string) {
  const isClient = typeof document !== 'undefined'
  if (initialTitle && isClient) document.title = initialTitle
  return {
    get value() { return isClient ? document.title : '' },
    set value(title: string) { if (isClient) document.title = title },
    set: (title: string) => { if (isClient) document.title = title },
  }
}

export function useFavicon(href?: string) {
  const isClient = typeof document !== 'undefined'
  const getLink = () => {
    if (!isClient) return null
    let link = document.querySelector<HTMLLinkElement>('link[rel*="icon"]')
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
    return link
  }
  if (href) { const link = getLink(); if (link) link.href = href }
  return {
    get value() { return getLink()?.href || '' },
    set value(newHref: string) { const link = getLink(); if (link) link.href = newHref },
    set: (newHref: string) => { const link = getLink(); if (link) link.href = newHref },
  }
}

// ============================================================================
// Geolocation
// ============================================================================

export interface GeolocationState {
  coords: { latitude: number; longitude: number; accuracy: number } | null
  error: GeolocationPositionError | null
  loading: boolean
}

export function useGeolocation(options: PositionOptions = {}) {
  const { enableHighAccuracy = true, timeout = 10000, maximumAge = 0 } = options
  const isClient = typeof navigator !== 'undefined' && 'geolocation' in navigator
  const subscribers = new Set<(state: GeolocationState) => void>()
  let state: GeolocationState = { coords: null, error: null, loading: false }
  let watchId: number | null = null

  const notify = () => subscribers.forEach(fn => fn(state))

  const updatePosition = (pos: GeolocationPosition) => {
    state = {
      coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy },
      error: null, loading: false
    }
    notify()
  }

  const handleError = (err: GeolocationPositionError) => {
    state = { ...state, error: err, loading: false }
    notify()
  }

  return {
    get coords() { return state.coords },
    get error() { return state.error },
    get loading() { return state.loading },
    subscribe: (fn: (s: GeolocationState) => void) => {
      if (subscribers.size === 0 && isClient) {
        state = { ...state, loading: true }
        watchId = navigator.geolocation.watchPosition(updatePosition, handleError, { enableHighAccuracy, timeout, maximumAge })
      }
      subscribers.add(fn)
      fn(state)
      return () => {
        subscribers.delete(fn)
        if (subscribers.size === 0 && watchId !== null) {
          navigator.geolocation.clearWatch(watchId)
          watchId = null
        }
      }
    },
    refresh: () => {
      if (!isClient) return
      state = { ...state, loading: true }
      notify()
      navigator.geolocation.getCurrentPosition(updatePosition, handleError, { enableHighAccuracy, timeout, maximumAge })
    },
  }
}

export function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'))
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

// ============================================================================
// Mouse & Pointer
// ============================================================================

export interface MouseState {
  x: number; y: number; pageX: number; pageY: number
  buttons: number; isPressed: boolean
}

export function useMouse() {
  const isClient = typeof window !== 'undefined'
  const subscribers = new Set<(state: MouseState) => void>()
  let state: MouseState = { x: 0, y: 0, pageX: 0, pageY: 0, buttons: 0, isPressed: false }
  let cleanup: (() => void) | null = null

  const notify = () => subscribers.forEach(fn => fn(state))

  const handleMove = (e: MouseEvent) => {
    state = { x: e.clientX, y: e.clientY, pageX: e.pageX, pageY: e.pageY, buttons: e.buttons, isPressed: e.buttons > 0 }
    notify()
  }
  const handleDown = (e: MouseEvent) => { state = { ...state, buttons: e.buttons, isPressed: true }; notify() }
  const handleUp = (e: MouseEvent) => { state = { ...state, buttons: e.buttons, isPressed: false }; notify() }

  return {
    get x() { return state.x },
    get y() { return state.y },
    get isPressed() { return state.isPressed },
    subscribe: (fn: (s: MouseState) => void) => {
      if (subscribers.size === 0 && isClient) {
        window.addEventListener('mousemove', handleMove)
        window.addEventListener('mousedown', handleDown)
        window.addEventListener('mouseup', handleUp)
        cleanup = () => {
          window.removeEventListener('mousemove', handleMove)
          window.removeEventListener('mousedown', handleDown)
          window.removeEventListener('mouseup', handleUp)
        }
      }
      subscribers.add(fn)
      fn(state)
      return () => {
        subscribers.delete(fn)
        if (subscribers.size === 0 && cleanup) { cleanup(); cleanup = null }
      }
    },
  }
}

export function usePointer() {
  const isClient = typeof window !== 'undefined'
  const subscribers = new Set<(state: MouseState) => void>()
  let state: MouseState = { x: 0, y: 0, pageX: 0, pageY: 0, buttons: 0, isPressed: false }
  let cleanup: (() => void) | null = null

  const notify = () => subscribers.forEach(fn => fn(state))
  const handleMove = (e: PointerEvent) => {
    state = { x: e.clientX, y: e.clientY, pageX: e.pageX, pageY: e.pageY, buttons: e.buttons, isPressed: e.buttons > 0 || e.pressure > 0 }
    notify()
  }

  return {
    get x() { return state.x },
    get y() { return state.y },
    subscribe: (fn: (s: MouseState) => void) => {
      if (subscribers.size === 0 && isClient) {
        window.addEventListener('pointermove', handleMove)
        cleanup = () => window.removeEventListener('pointermove', handleMove)
      }
      subscribers.add(fn)
      fn(state)
      return () => {
        subscribers.delete(fn)
        if (subscribers.size === 0 && cleanup) { cleanup(); cleanup = null }
      }
    },
  }
}

// ============================================================================
// Keyboard
// ============================================================================

export interface KeyboardState {
  pressed: Set<string>
  lastKey: string | null
  ctrl: boolean; alt: boolean; shift: boolean; meta: boolean
}

export function useKeyboard() {
  const isClient = typeof window !== 'undefined'
  const subscribers = new Set<(state: KeyboardState) => void>()
  let state: KeyboardState = { pressed: new Set(), lastKey: null, ctrl: false, alt: false, shift: false, meta: false }
  let cleanup: (() => void) | null = null

  const notify = () => subscribers.forEach(fn => fn(state))

  const handleDown = (e: KeyboardEvent) => {
    const pressed = new Set(state.pressed)
    pressed.add(e.key.toLowerCase())
    state = { pressed, lastKey: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey }
    notify()
  }
  const handleUp = (e: KeyboardEvent) => {
    const pressed = new Set(state.pressed)
    pressed.delete(e.key.toLowerCase())
    state = { pressed, lastKey: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey }
    notify()
  }
  const handleBlur = () => {
    state = { pressed: new Set(), lastKey: null, ctrl: false, alt: false, shift: false, meta: false }
    notify()
  }

  return {
    get pressed() { return state.pressed },
    get ctrl() { return state.ctrl },
    get alt() { return state.alt },
    get shift() { return state.shift },
    get meta() { return state.meta },
    isPressed: (key: string) => state.pressed.has(key.toLowerCase()),
    subscribe: (fn: (s: KeyboardState) => void) => {
      if (subscribers.size === 0 && isClient) {
        window.addEventListener('keydown', handleDown)
        window.addEventListener('keyup', handleUp)
        window.addEventListener('blur', handleBlur)
        cleanup = () => {
          window.removeEventListener('keydown', handleDown)
          window.removeEventListener('keyup', handleUp)
          window.removeEventListener('blur', handleBlur)
        }
      }
      subscribers.add(fn)
      fn(state)
      return () => {
        subscribers.delete(fn)
        if (subscribers.size === 0 && cleanup) { cleanup(); cleanup = null }
      }
    },
  }
}

export function useHotkey(
  hotkey: string,
  callback: (e: KeyboardEvent) => void,
  options: { preventDefault?: boolean; ignoreInputs?: boolean } = {}
): () => void {
  const { preventDefault = true, ignoreInputs = true } = options
  const isClient = typeof window !== 'undefined'
  if (!isClient) return () => {}

  const parts = hotkey.toLowerCase().split('+').map(p => p.trim())
  const key = parts[parts.length - 1]
  const needsCtrl = parts.includes('ctrl') || parts.includes('control')
  const needsAlt = parts.includes('alt')
  const needsShift = parts.includes('shift')
  const needsMeta = parts.includes('meta') || parts.includes('cmd')

  const handler = (e: KeyboardEvent) => {
    if (ignoreInputs) {
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
    }

    const keyMatches = e.key.toLowerCase() === key || e.code.toLowerCase() === key ||
      e.code.toLowerCase() === `key${key}` || e.code.toLowerCase() === `digit${key}` ||
      (key === 'space' && e.code === 'Space') || (key === 'escape' && e.key === 'Escape') ||
      (key === 'esc' && e.key === 'Escape') || (key === 'enter' && e.key === 'Enter')

    if (keyMatches && e.ctrlKey === needsCtrl && e.altKey === needsAlt && e.shiftKey === needsShift && e.metaKey === needsMeta) {
      if (preventDefault) e.preventDefault()
      callback(e)
    }
  }

  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}

export function useKeyPressed(key: string) {
  const keyboard = useKeyboard()
  const k = key.toLowerCase()
  return {
    get isPressed() { return keyboard.isPressed(k) },
    subscribe: (fn: (pressed: boolean) => void) => {
      let last = false
      return keyboard.subscribe((state) => {
        const current = state.pressed.has(k)
        if (current !== last) { last = current; fn(current) }
      })
    },
  }
}
