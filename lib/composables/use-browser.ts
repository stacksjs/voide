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

// ============================================================================
// Intersection Observer
// ============================================================================

export interface IntersectionState {
  isIntersecting: boolean
  intersectionRatio: number
  isVisible: boolean
}

export function useIntersectionObserver(
  target: Element | (() => Element | null) | null,
  callback?: (entry: IntersectionObserverEntry) => void,
  options: { root?: Element | null; rootMargin?: string; threshold?: number | number[]; once?: boolean } = {}
) {
  const { root = null, rootMargin = '0px', threshold = 0, once = false } = options
  const isClient = typeof IntersectionObserver !== 'undefined'
  const subscribers = new Set<(state: IntersectionState) => void>()
  let state: IntersectionState = { isIntersecting: false, intersectionRatio: 0, isVisible: false }
  let observer: IntersectionObserver | null = null

  const getElement = () => typeof target === 'function' ? target() : target
  const notify = () => subscribers.forEach(fn => fn(state))

  const start = () => {
    if (!isClient || observer) return
    const el = getElement()
    if (!el) return

    observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      state = { isIntersecting: entry.isIntersecting, intersectionRatio: entry.intersectionRatio, isVisible: entry.isIntersecting }
      notify()
      if (callback) callback(entry)
      if (once && entry.isIntersecting) stop()
    }, { root, rootMargin, threshold })

    observer.observe(el)
  }

  const stop = () => {
    observer?.disconnect()
    observer = null
  }

  start()

  return {
    get isVisible() { return state.isVisible },
    subscribe: (fn: (s: IntersectionState) => void) => {
      subscribers.add(fn)
      fn(state)
      return () => { subscribers.delete(fn); if (subscribers.size === 0 && !callback) stop() }
    },
    stop,
    start,
  }
}

export function useElementVisibility(target: Element | (() => Element | null) | null) {
  const obs = useIntersectionObserver(target)
  return {
    get isVisible() { return obs.isVisible },
    subscribe: (fn: (visible: boolean) => void) => {
      let last = false
      return obs.subscribe((state) => {
        if (state.isVisible !== last) { last = state.isVisible; fn(state.isVisible) }
      })
    },
  }
}

export function useLazyLoad(target: Element | (() => Element | null) | null, onVisible: () => void) {
  return useIntersectionObserver(target, (entry) => {
    if (entry.isIntersecting) onVisible()
  }, { once: true })
}

export function useInfiniteScroll(
  sentinel: Element | (() => Element | null) | null,
  loadMore: () => void | Promise<void>,
  options: { rootMargin?: string; debounce?: number } = {}
) {
  const { rootMargin = '100px', debounce = 100 } = options
  let isLoading = false
  let timeout: ReturnType<typeof setTimeout> | null = null

  const obs = useIntersectionObserver(sentinel, async (entry) => {
    if (!entry.isIntersecting || isLoading) return
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(async () => {
      isLoading = true
      try { await loadMore() } finally { isLoading = false }
    }, debounce)
  }, { rootMargin })

  return { stop: () => { if (timeout) clearTimeout(timeout); obs.stop() }, start: obs.start, isLoading: () => isLoading }
}

// ============================================================================
// Fetch & Async Data
// ============================================================================

export interface FetchState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  status: number | null
}

export interface FetchOptions<T = unknown> extends Omit<RequestInit, 'body'> {
  body?: BodyInit | Record<string, unknown> | null
  baseURL?: string
  query?: Record<string, string | number | boolean | undefined>
  immediate?: boolean
  transform?: (data: unknown) => T
  timeout?: number
  retry?: number
  retryDelay?: number
  default?: T
}

function buildURL(url: string, baseURL?: string, query?: Record<string, string | number | boolean | undefined>): string {
  let fullURL = baseURL ? `${baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}` : url
  if (query) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params.append(key, String(value))
    }
    const qs = params.toString()
    if (qs) fullURL += (fullURL.includes('?') ? '&' : '?') + qs
  }
  return fullURL
}

export function useFetch<T = unknown>(url: string | (() => string), options: FetchOptions<T> = {}) {
  const {
    immediate = true, transform, timeout = 30000, retry = 0, retryDelay = 1000,
    default: defaultValue = null as T, baseURL, query, body, ...fetchOptions
  } = options

  let state: FetchState<T> = { data: defaultValue, loading: false, error: null, status: null }
  const subscribers = new Set<(state: FetchState<T>) => void>()
  let abortController: AbortController | null = null

  const notify = () => subscribers.forEach(fn => fn(state))
  const getURL = () => buildURL(typeof url === 'function' ? url() : url, baseURL, query)

  const doFetch = async (attempt = 0): Promise<void> => {
    if (abortController) abortController.abort()
    abortController = new AbortController()
    state = { ...state, loading: true, error: null }
    notify()

    const timeoutId = setTimeout(() => abortController?.abort(), timeout)

    try {
      let requestBody: BodyInit | undefined
      const headers: HeadersInit = { ...fetchOptions.headers as Record<string, string> }
      if (body && typeof body === 'object' && !(body instanceof FormData)) {
        requestBody = JSON.stringify(body)
        headers['Content-Type'] = 'application/json'
      } else if (body) {
        requestBody = body as BodyInit
      }

      const response = await fetch(getURL(), { ...fetchOptions, headers, body: requestBody, signal: abortController.signal })
      clearTimeout(timeoutId)
      state.status = response.status

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      let data = await response.json()
      if (transform) data = transform(data)
      state = { ...state, data: data as T, loading: false, error: null }
      notify()
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') return
      if (attempt < retry) {
        await new Promise(r => setTimeout(r, retryDelay))
        return doFetch(attempt + 1)
      }
      state = { ...state, loading: false, error: err instanceof Error ? err : new Error(String(err)) }
      notify()
    }
  }

  if (immediate) doFetch()

  return {
    get data() { return state.data },
    get loading() { return state.loading },
    get error() { return state.error },
    subscribe: (fn: (s: FetchState<T>) => void) => {
      subscribers.add(fn)
      fn(state)
      return () => subscribers.delete(fn)
    },
    refresh: doFetch,
    execute: doFetch,
    abort: () => abortController?.abort(),
  }
}

export function useAsyncData<T>(fetcher: () => Promise<T>, options: { immediate?: boolean; transform?: (data: T) => T; default?: T } = {}) {
  const { immediate = true, transform, default: defaultValue = null as T } = options
  let state: FetchState<T> = { data: defaultValue, loading: false, error: null, status: null }
  const subscribers = new Set<(state: FetchState<T>) => void>()

  const notify = () => subscribers.forEach(fn => fn(state))

  const doFetch = async () => {
    state = { ...state, loading: true, error: null }
    notify()
    try {
      let data = await fetcher()
      if (transform) data = transform(data)
      state = { ...state, data, loading: false, error: null }
      notify()
    } catch (err) {
      state = { ...state, loading: false, error: err instanceof Error ? err : new Error(String(err)) }
      notify()
    }
  }

  if (immediate) doFetch()

  return {
    get data() { return state.data },
    get loading() { return state.loading },
    get error() { return state.error },
    subscribe: (fn: (s: FetchState<T>) => void) => {
      subscribers.add(fn)
      fn(state)
      return () => subscribers.delete(fn)
    },
    refresh: doFetch,
    execute: doFetch,
  }
}

// ============================================================================
// Fullscreen
// ============================================================================

export interface FullscreenState {
  isFullscreen: boolean
  isSupported: boolean
}

function getFullscreenElement(): Element | null {
  return document.fullscreenElement || (document as any).webkitFullscreenElement || null
}

export function useFullscreen(target?: Element | (() => Element | null) | null) {
  const isClient = typeof document !== 'undefined'
  const supported = isClient && !!(document.fullscreenEnabled || (document as any).webkitFullscreenEnabled)
  const subscribers = new Set<(state: FullscreenState) => void>()
  let state: FullscreenState = { isFullscreen: false, isSupported: supported }
  let cleanup: (() => void) | null = null

  const getElement = () => {
    if (!target) return document.documentElement
    return typeof target === 'function' ? target() || document.documentElement : target
  }

  const notify = () => subscribers.forEach(fn => fn(state))

  const updateState = () => {
    state = { ...state, isFullscreen: !!getFullscreenElement() }
    notify()
  }

  const enter = async () => {
    if (!supported) return
    const el = getElement()
    if (el.requestFullscreen) await el.requestFullscreen()
    else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen()
  }

  const exit = async () => {
    if (!supported || !getFullscreenElement()) return
    if (document.exitFullscreen) await document.exitFullscreen()
    else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen()
  }

  const toggle = async () => state.isFullscreen ? exit() : enter()

  return {
    get isFullscreen() { return state.isFullscreen },
    get isSupported() { return supported },
    subscribe: (fn: (s: FullscreenState) => void) => {
      if (subscribers.size === 0 && isClient) {
        document.addEventListener('fullscreenchange', updateState)
        document.addEventListener('webkitfullscreenchange', updateState)
        cleanup = () => {
          document.removeEventListener('fullscreenchange', updateState)
          document.removeEventListener('webkitfullscreenchange', updateState)
        }
        updateState()
      }
      subscribers.add(fn)
      fn(state)
      return () => {
        subscribers.delete(fn)
        if (subscribers.size === 0 && cleanup) { cleanup(); cleanup = null }
      }
    },
    enter,
    exit,
    toggle,
  }
}

export function toggleFullscreen(): Promise<void> {
  return useFullscreen().toggle()
}

export function isInFullscreen(): boolean {
  return !!getFullscreenElement()
}

// ============================================================================
// Notifications
// ============================================================================

export type NotificationPermissionType = 'default' | 'granted' | 'denied'

export interface NotificationState {
  permission: NotificationPermissionType
  isSupported: boolean
}

export interface NotificationOptions {
  body?: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
  autoClose?: number
  data?: unknown
}

const activeNotifications = new Map<string, Notification>()

export function useNotification() {
  const isSupported = typeof window !== 'undefined' && 'Notification' in window
  let state: NotificationState = {
    permission: isSupported ? Notification.permission as NotificationPermissionType : 'denied',
    isSupported,
  }
  const subscribers = new Set<(state: NotificationState) => void>()

  const notify = () => subscribers.forEach(fn => fn(state))

  const requestPermission = async (): Promise<NotificationPermissionType> => {
    if (!isSupported) return 'denied'
    const result = await Notification.requestPermission()
    state = { ...state, permission: result as NotificationPermissionType }
    notify()
    return result as NotificationPermissionType
  }

  const show = (title: string, options: NotificationOptions = {}): Notification | null => {
    if (!isSupported || state.permission !== 'granted') return null
    const { autoClose, ...notificationOptions } = options

    try {
      const notification = new Notification(title, notificationOptions)
      if (options.tag) {
        activeNotifications.get(options.tag)?.close()
        activeNotifications.set(options.tag, notification)
        notification.addEventListener('close', () => activeNotifications.delete(options.tag!))
      }
      if (autoClose && autoClose > 0) setTimeout(() => notification.close(), autoClose)
      return notification
    } catch { return null }
  }

  const close = (tag: string) => {
    activeNotifications.get(tag)?.close()
    activeNotifications.delete(tag)
  }

  return {
    get permission() { return state.permission },
    get isSupported() { return isSupported },
    subscribe: (fn: (s: NotificationState) => void) => {
      subscribers.add(fn)
      fn(state)
      return () => subscribers.delete(fn)
    },
    requestPermission,
    show,
    close,
  }
}

export async function sendNotification(title: string, options?: NotificationOptions): Promise<Notification | null> {
  const notifier = useNotification()
  if (notifier.permission === 'default') await notifier.requestPermission()
  return notifier.show(title, options)
}

export function canNotify(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
}

// ============================================================================
// Share
// ============================================================================

export interface ShareData {
  title?: string
  text?: string
  url?: string
  files?: File[]
}

export interface ShareResult {
  success: boolean
  error?: Error
  cancelled?: boolean
}

export function useShare() {
  const supported = typeof navigator !== 'undefined' && 'share' in navigator
  const fileSupported = typeof navigator !== 'undefined' && 'canShare' in navigator

  const canShare = (data?: ShareData): boolean => {
    if (!supported) return false
    if (!data) return true
    if (data.files?.length) {
      if (!fileSupported) return false
      try { return navigator.canShare(data as globalThis.ShareData) } catch { return false }
    }
    return !!(data.title || data.text || data.url)
  }

  const share = async (data: ShareData): Promise<ShareResult> => {
    if (!supported) return { success: false, error: new Error('Web Share API not supported') }
    if (!canShare(data)) return { success: false, error: new Error('Content cannot be shared') }

    try {
      await navigator.share(data as globalThis.ShareData)
      return { success: true }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return { success: false, cancelled: true }
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) }
    }
  }

  return { isSupported: () => supported, canShare, share }
}

export async function share(data: ShareData): Promise<ShareResult> {
  return useShare().share(data)
}

export async function shareURL(url: string, title?: string, text?: string): Promise<ShareResult> {
  return share({ url, title, text })
}

export async function shareCurrentPage(text?: string): Promise<ShareResult> {
  if (typeof document === 'undefined') return { success: false, error: new Error('Not in browser') }
  return share({ title: document.title, url: location.href, text })
}

// ============================================================================
// Permissions
// ============================================================================

export type PermissionName = 'camera' | 'microphone' | 'geolocation' | 'notifications' | 'clipboard-read' | 'clipboard-write' | 'push'
export type PermissionStateType = 'granted' | 'denied' | 'prompt'

export interface PermissionStatus {
  state: PermissionStateType
  isGranted: boolean
  isDenied: boolean
  isPrompt: boolean
}

function createPermissionStatus(state: PermissionStateType): PermissionStatus {
  return { state, isGranted: state === 'granted', isDenied: state === 'denied', isPrompt: state === 'prompt' }
}

export function usePermission(name: PermissionName) {
  const supported = typeof navigator !== 'undefined' && 'permissions' in navigator
  let status: PermissionStatus = createPermissionStatus('prompt')
  const subscribers = new Set<(status: PermissionStatus) => void>()
  let permStatus: globalThis.PermissionStatus | null = null

  const notify = () => subscribers.forEach(fn => fn(status))

  const query = async (): Promise<PermissionStatus> => {
    if (!supported) return createPermissionStatus('prompt')
    try {
      permStatus = await navigator.permissions.query({ name: name as globalThis.PermissionName })
      status = createPermissionStatus(permStatus.state as PermissionStateType)
      permStatus.addEventListener('change', () => {
        status = createPermissionStatus(permStatus!.state as PermissionStateType)
        notify()
      })
      return status
    } catch { return createPermissionStatus('prompt') }
  }

  return {
    get state() { return status.state },
    get isGranted() { return status.isGranted },
    subscribe: (fn: (s: PermissionStatus) => void) => {
      if (subscribers.size === 0 && supported) query()
      subscribers.add(fn)
      fn(status)
      return () => subscribers.delete(fn)
    },
    query,
    isSupported: () => supported,
  }
}

export function usePermissions(names: PermissionName[]) {
  const refs = Object.fromEntries(names.map(n => [n, usePermission(n)]))
  const subscribers = new Set<(states: Record<string, PermissionStatus>) => void>()
  let states: Record<string, PermissionStatus> = Object.fromEntries(names.map(n => [n, createPermissionStatus('prompt')]))

  const notify = () => subscribers.forEach(fn => fn(states))

  return {
    get: () => states,
    subscribe: (fn: (s: Record<string, PermissionStatus>) => void) => {
      const unsubs = names.map(n => refs[n].subscribe(s => { states[n] = s; notify() }))
      subscribers.add(fn)
      fn(states)
      return () => { subscribers.delete(fn); if (subscribers.size === 0) unsubs.forEach(u => u()) }
    },
    queryAll: async () => {
      await Promise.all(names.map(n => refs[n].query()))
      return states
    },
  }
}

export async function isPermissionGranted(name: PermissionName): Promise<boolean> {
  const perm = usePermission(name)
  const status = await perm.query()
  return status.isGranted
}

export async function hasCameraPermission(): Promise<boolean> { return isPermissionGranted('camera') }
export async function hasMicrophonePermission(): Promise<boolean> { return isPermissionGranted('microphone') }
export async function hasGeolocationPermission(): Promise<boolean> { return isPermissionGranted('geolocation') }

// ============================================================================
// Resize Observer
// ============================================================================

export interface ResizeObserverState {
  width: number
  height: number
  contentRect: DOMRectReadOnly | null
}

export function useResizeObserver(
  target: Element | (() => Element | null) | null,
  callback?: (entry: ResizeObserverEntry) => void
) {
  const supported = typeof ResizeObserver !== 'undefined'
  const subscribers = new Set<(state: ResizeObserverState) => void>()
  let state: ResizeObserverState = { width: 0, height: 0, contentRect: null }
  let observer: ResizeObserver | null = null

  const getElement = () => typeof target === 'function' ? target() : target
  const notify = () => subscribers.forEach(fn => fn(state))

  const start = () => {
    if (!supported || observer) return
    const el = getElement()
    if (!el) return

    observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      state = { width: entry.contentRect.width, height: entry.contentRect.height, contentRect: entry.contentRect }
      notify()
      if (callback) callback(entry)
    })

    observer.observe(el)
  }

  const stop = () => {
    observer?.disconnect()
    observer = null
  }

  return {
    get width() { return state.width },
    get height() { return state.height },
    get isSupported() { return supported },
    subscribe: (fn: (s: ResizeObserverState) => void) => {
      if (subscribers.size === 0) start()
      subscribers.add(fn)
      fn(state)
      return () => { subscribers.delete(fn); if (subscribers.size === 0 && !callback) stop() }
    },
    observe: start,
    disconnect: stop,
  }
}

export function useElementSize(target: Element | (() => Element | null) | null) {
  let size = { width: 0, height: 0 }
  const subscribers = new Set<(size: { width: number; height: number }) => void>()

  const observer = useResizeObserver(target, (entry) => {
    size = { width: entry.contentRect.width, height: entry.contentRect.height }
    subscribers.forEach(fn => fn(size))
  })

  return {
    get width() { return size.width },
    get height() { return size.height },
    subscribe: (fn: (s: { width: number; height: number }) => void) => {
      subscribers.add(fn)
      fn(size)
      if (subscribers.size === 1) observer.observe()
      return () => { subscribers.delete(fn); if (subscribers.size === 0) observer.disconnect() }
    },
  }
}

export function hasResizeObserver(): boolean {
  return typeof ResizeObserver !== 'undefined'
}

// ============================================================================
// Battery
// ============================================================================

export interface BatteryState {
  charging: boolean
  chargingTime: number
  dischargingTime: number
  level: number
}

interface BatteryManager extends EventTarget {
  charging: boolean
  chargingTime: number
  dischargingTime: number
  level: number
}

export function useBattery() {
  const supported = typeof navigator !== 'undefined' && 'getBattery' in navigator
  let state: BatteryState = { charging: false, chargingTime: 0, dischargingTime: 0, level: 1 }
  const subscribers = new Set<(state: BatteryState) => void>()
  let battery: BatteryManager | null = null
  let initialized = false

  const notify = () => subscribers.forEach(fn => fn(state))

  const updateState = () => {
    if (battery) {
      state = { charging: battery.charging, chargingTime: battery.chargingTime, dischargingTime: battery.dischargingTime, level: battery.level }
      notify()
    }
  }

  const init = async () => {
    if (initialized || !supported) return
    try {
      battery = await (navigator as any).getBattery()
      state = { charging: battery!.charging, chargingTime: battery!.chargingTime, dischargingTime: battery!.dischargingTime, level: battery!.level }
      battery!.addEventListener('chargingchange', updateState)
      battery!.addEventListener('chargingtimechange', updateState)
      battery!.addEventListener('dischargingtimechange', updateState)
      battery!.addEventListener('levelchange', updateState)
      initialized = true
      notify()
    } catch {}
  }

  return {
    get charging() { return state.charging },
    get level() { return state.level },
    get isSupported() { return supported },
    getPercentage: () => Math.round(state.level * 100),
    isLow: (threshold = 0.2) => state.level <= threshold && !state.charging,
    isCritical: () => state.level <= 0.1 && !state.charging,
    subscribe: (fn: (s: BatteryState) => void) => {
      if (subscribers.size === 0) init()
      subscribers.add(fn)
      fn(state)
      return () => subscribers.delete(fn)
    },
  }
}

export async function getBatteryLevel(): Promise<number | null> {
  if (typeof navigator === 'undefined' || !('getBattery' in navigator)) return null
  try {
    const battery = await (navigator as any).getBattery()
    return Math.round(battery.level * 100)
  } catch { return null }
}

export async function isCharging(): Promise<boolean | null> {
  if (typeof navigator === 'undefined' || !('getBattery' in navigator)) return null
  try {
    const battery = await (navigator as any).getBattery()
    return battery.charging
  } catch { return null }
}

export function hasBattery(): boolean {
  return typeof navigator !== 'undefined' && 'getBattery' in navigator
}

// ============================================================================
// Speech Recognition
// ============================================================================

export interface SpeechRecognitionState {
  isListening: boolean
  transcript: string
  finalTranscript: string
  interimTranscript: string
  confidence: number
  isSupported: boolean
  error: string | null
}

export interface SpeechRecognitionOptions {
  continuous?: boolean
  interimResults?: boolean
  lang?: string
  maxAlternatives?: number
}

function getSpeechRecognition(): any {
  if (typeof window === 'undefined') return null
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognition() !== null
}

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}) {
  const SpeechRecognitionClass = getSpeechRecognition()
  const supported = SpeechRecognitionClass !== null

  let state: SpeechRecognitionState = {
    isListening: false,
    transcript: '',
    finalTranscript: '',
    interimTranscript: '',
    confidence: 0,
    isSupported: supported,
    error: null,
  }

  const subscribers = new Set<(state: SpeechRecognitionState) => void>()
  const eventListeners: Record<string, Set<(data?: any) => void>> = {
    result: new Set(),
    error: new Set(),
    start: new Set(),
    end: new Set(),
  }
  let recognition: any = null

  const notify = () => subscribers.forEach(fn => fn(state))
  const emitEvent = (event: string, data?: any) => eventListeners[event]?.forEach(fn => fn(data))

  if (supported && SpeechRecognitionClass) {
    recognition = new SpeechRecognitionClass()
    recognition.continuous = options.continuous ?? false
    recognition.interimResults = options.interimResults ?? true
    recognition.lang = options.lang ?? 'en-US'
    recognition.maxAlternatives = options.maxAlternatives ?? 1

    recognition.onstart = () => {
      state = { ...state, isListening: true, error: null }
      notify()
      emitEvent('start')
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''
      let confidence = 0

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript
        confidence = Math.max(confidence, result[0].confidence || 0)

        if (result.isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      state = {
        ...state,
        finalTranscript: state.finalTranscript + finalTranscript,
        interimTranscript,
        transcript: state.finalTranscript + finalTranscript + interimTranscript,
        confidence,
      }

      notify()
      emitEvent('result', { transcript: state.transcript, isFinal: finalTranscript.length > 0 })
    }

    recognition.onerror = (event: any) => {
      const errorMessages: Record<string, string> = {
        'no-speech': 'No speech detected',
        'audio-capture': 'No microphone found',
        'not-allowed': 'Microphone permission denied',
        'network': 'Network error - requires internet',
        'aborted': 'Recognition aborted',
      }
      state = { ...state, error: errorMessages[event.error] || event.error, isListening: false }
      notify()
      emitEvent('error', { code: event.error, message: state.error })
    }

    recognition.onend = () => {
      state = { ...state, isListening: false }
      notify()
      emitEvent('end', { transcript: state.transcript })
    }
  }

  const start = () => {
    if (!supported || !recognition || state.isListening) return
    state = { ...state, transcript: '', finalTranscript: '', interimTranscript: '', confidence: 0, error: null }
    try { recognition.start() } catch { state = { ...state, error: 'Failed to start' }; notify() }
  }

  const stop = () => {
    if (!recognition || !state.isListening) return
    try { recognition.stop() } catch {}
  }

  const abort = () => {
    if (!recognition) return
    try { recognition.abort() } catch {}
    state = { ...state, isListening: false }
    notify()
  }

  return {
    get isListening() { return state.isListening },
    get transcript() { return state.transcript },
    get isSupported() { return supported },
    get error() { return state.error },
    start,
    stop,
    abort,
    toggle: () => state.isListening ? stop() : start(),
    subscribe: (fn: (s: SpeechRecognitionState) => void) => {
      subscribers.add(fn)
      fn(state)
      return () => subscribers.delete(fn)
    },
    on: (event: string, callback: (data?: any) => void) => {
      eventListeners[event]?.add(callback)
      return () => eventListeners[event]?.delete(callback)
    },
  }
}

// ============================================================================
// Speech Synthesis
// ============================================================================

export interface SpeechSynthesisState {
  isSpeaking: boolean
  isPaused: boolean
  isSupported: boolean
  voices: SpeechSynthesisVoice[]
}

export interface SpeechSynthesisOptions {
  voice?: string | number
  rate?: number
  pitch?: number
  volume?: number
  lang?: string
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function useSpeechSynthesis(defaultOptions: SpeechSynthesisOptions = {}) {
  const supported = isSpeechSynthesisSupported()

  let state: SpeechSynthesisState = {
    isSpeaking: false,
    isPaused: false,
    isSupported: supported,
    voices: [],
  }

  const subscribers = new Set<(state: SpeechSynthesisState) => void>()
  const notify = () => subscribers.forEach(fn => fn(state))

  const loadVoices = () => {
    if (!supported) return
    state = { ...state, voices: window.speechSynthesis.getVoices() }
    notify()
  }

  if (supported) {
    loadVoices()
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }

  const findVoice = (v: string | number | undefined): SpeechSynthesisVoice | null => {
    if (v === undefined) return null
    if (typeof v === 'number') return state.voices[v] || null
    // @ts-expect-error - voice.name is the standard property, TS deprecation is overly aggressive
    return state.voices.find(voice => voice.name.toLowerCase().includes((v as string).toLowerCase())) || null
  }

  const speak = (text: string, options: SpeechSynthesisOptions = {}) => {
    if (!supported || !text.trim()) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const opts = { ...defaultOptions, ...options }

    utterance.rate = opts.rate ?? 1
    utterance.pitch = opts.pitch ?? 1
    utterance.volume = opts.volume ?? 1
    if (opts.lang) utterance.lang = opts.lang

    const voice = findVoice(opts.voice)
    if (voice) utterance.voice = voice

    utterance.onstart = () => { state = { ...state, isSpeaking: true, isPaused: false }; notify() }
    utterance.onend = () => { state = { ...state, isSpeaking: false, isPaused: false }; notify() }
    utterance.onpause = () => { state = { ...state, isPaused: true }; notify() }
    utterance.onresume = () => { state = { ...state, isPaused: false }; notify() }

    window.speechSynthesis.speak(utterance)
  }

  const stop = () => { if (supported) { window.speechSynthesis.cancel(); state = { ...state, isSpeaking: false, isPaused: false }; notify() } }
  const pause = () => { if (supported && state.isSpeaking) window.speechSynthesis.pause() }
  const resume = () => { if (supported && state.isPaused) window.speechSynthesis.resume() }

  return {
    get isSpeaking() { return state.isSpeaking },
    get isPaused() { return state.isPaused },
    get isSupported() { return supported },
    get voices() { return state.voices },
    speak,
    stop,
    pause,
    resume,
    toggle: () => state.isPaused ? resume() : (state.isSpeaking ? pause() : null),
    subscribe: (fn: (s: SpeechSynthesisState) => void) => {
      subscribers.add(fn)
      fn(state)
      return () => subscribers.delete(fn)
    },
  }
}

export function speak(text: string, options?: SpeechSynthesisOptions): void {
  useSpeechSynthesis(options).speak(text)
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel()
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return []
  return window.speechSynthesis.getVoices()
}
