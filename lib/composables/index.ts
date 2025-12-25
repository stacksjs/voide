/**
 * Voide Composables
 *
 * Nuxt-style reactive utilities for browser APIs.
 */

// Storage
export {
  useStorage,
  useLocalStorage,
  useSessionStorage,
  clearStorage,
  getStorageKeys,
  type StorageType,
  type UseStorageOptions,
  type StorageRef,
} from './use-storage'

// Cookies
export {
  useCookie,
  getCookie,
  setCookie,
  removeCookie,
  parseCookies,
  clearCookies,
  type CookieOptions,
  type CookieRef,
} from './use-cookie'

// Browser APIs
export {
  // Clipboard
  useClipboard,
  copyToClipboard,
  type ClipboardRef,
  // Media Queries
  useMediaQuery,
  usePreferredDark,
  usePreferredReducedMotion,
  useIsMobile,
  useIsDesktop,
  type MediaQueryRef,
  // Network
  useNetwork,
  useOnline,
  type NetworkState,
  type NetworkRef,
  // Window
  useWindowSize,
  useScroll,
  useVisibility,
  useTitle,
  useFavicon,
  // Geolocation
  useGeolocation,
  getCurrentPosition,
  type GeolocationState,
  // Mouse & Pointer
  useMouse,
  usePointer,
  type MouseState,
  // Keyboard
  useKeyboard,
  useHotkey,
  useKeyPressed,
  type KeyboardState,
  // Intersection Observer
  useIntersectionObserver,
  useElementVisibility,
  useLazyLoad,
  useInfiniteScroll,
  type IntersectionState,
  // Fetch & Async Data
  useFetch,
  useAsyncData,
  type FetchState,
  type FetchOptions,
  // Fullscreen
  useFullscreen,
  toggleFullscreen,
  isInFullscreen,
  type FullscreenState,
  // Notifications
  useNotification,
  sendNotification,
  canNotify,
  type NotificationState,
  type NotificationOptions,
  type NotificationPermissionType,
  // Share
  useShare,
  share,
  shareURL,
  shareText,
  shareCurrentPage,
  type ShareData,
  type ShareResult,
  // Permissions
  usePermission,
  usePermissions,
  isPermissionGranted,
  type PermissionName,
  type PermissionState,
  type PermissionStatus,
  // Resize Observer
  useResizeObserver,
  useElementSize,
  hasResizeObserver,
  type ResizeObserverState,
  // Battery
  useBattery,
  getBatteryLevel,
  isCharging,
  hasBattery,
  type BatteryState,
} from './use-browser'
