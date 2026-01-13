/**
 * Voide Stores - Browser Bundle
 * Auto-generated, do not edit
 *
 * Usage in components:
 *   import { appStore, chatStore } from '@stores'
 *
 *   // Access state directly
 *   console.log(appStore.isProcessing)
 *
 *   // Call actions
 *   chatStore.addMessage('user', 'Hello')
 *
 *   // Subscribe to changes
 *   appStore.$subscribe((state) => console.log(state))
 */
window.VoideStores = (function() {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __moduleCache = /* @__PURE__ */ new WeakMap;
  var __toCommonJS = (from) => {
    var entry = __moduleCache.get(from), desc;
    if (entry)
      return entry;
    entry = __defProp({}, "__esModule", { value: true });
    if (from && typeof from === "object" || typeof from === "function")
      __getOwnPropNames(from).map((key) => !__hasOwnProp.call(entry, key) && __defProp(entry, key, {
        get: () => from[key],
        enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      }));
    __moduleCache.set(from, entry);
    return entry;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {
        get: all[name],
        enumerable: true,
        configurable: true,
        set: (newValue) => all[name] = () => newValue
      });
  };

  // lib/stores/index.ts
  var exports_stores = {};
  __export(exports_stores, {
    withDefaults: () => withDefaults,
    validated: () => validated,
    useWindowSize: () => useWindowSize,
    useVoiceCommands: () => useVoiceCommands,
    useVisibility: () => useVisibility,
    useTitle: () => useTitle,
    useStorage: () => useStorage,
    useSpeechSynthesis: () => useSpeechSynthesis,
    useSpeechRecognition: () => useSpeechRecognition,
    useShare: () => useShare,
    useSessionStorage: () => useSessionStorage,
    useSeoMeta: () => useSeoMeta,
    useScroll: () => useScroll,
    useResizeObserver: () => useResizeObserver,
    usePreferredReducedMotion: () => usePreferredReducedMotion,
    usePreferredDark: () => usePreferredDark,
    usePointer: () => usePointer,
    usePermissions: () => usePermissions,
    usePermission: () => usePermission,
    useOnline: () => useOnline,
    useNotification: () => useNotification,
    useNetwork: () => useNetwork,
    useMouse: () => useMouse,
    useMediaQuery: () => useMediaQuery,
    useLocalStorage: () => useLocalStorage,
    useLazyLoad: () => useLazyLoad,
    useKeyboard: () => useKeyboard,
    useKeyPressed: () => useKeyPressed,
    useIsMobile: () => useIsMobile,
    useIsDesktop: () => useIsDesktop,
    useIntersectionObserver: () => useIntersectionObserver,
    useInfiniteScroll: () => useInfiniteScroll,
    useHotkey: () => useHotkey,
    useHead: () => useHead,
    useGeolocation: () => useGeolocation,
    useFullscreen: () => useFullscreen,
    useFetch: () => useFetch,
    useFavicon: () => useFavicon,
    useElementVisibility: () => useElementVisibility,
    useElementSize: () => useElementSize,
    useCookie: () => useCookie,
    useClipboard: () => useClipboard,
    useBattery: () => useBattery,
    useAudioStorage: () => useAudioStorage,
    useAudioRecorder: () => useAudioRecorder,
    useAudioCues: () => useAudioCues,
    useAsyncData: () => useAsyncData,
    uiStore: () => uiStore,
    toggleFullscreen: () => toggleFullscreen,
    subscribePageMeta: () => subscribePageMeta,
    subscribeLayout: () => subscribeLayout,
    subscribeHead: () => subscribeHead,
    stopSpeaking: () => stopSpeaking,
    speak: () => speak,
    shareURL: () => shareURL,
    shareCurrentPage: () => shareCurrentPage,
    share: () => share,
    settingsStore: () => settingsStore,
    setTitle: () => setTitle,
    setMeta: () => setMeta,
    setDefaultLayout: () => setDefaultLayout,
    setCookie: () => setCookie,
    setComponentContext: () => setComponentContext,
    sendNotification: () => sendNotification,
    resetPageMeta: () => resetPageMeta,
    resetHead: () => resetHead,
    requiresAuth: () => requiresAuth,
    required: () => required,
    removeCookie: () => removeCookie,
    registerStoresClient: () => registerStoresClient,
    registerMiddleware: () => registerMiddleware,
    playTone: () => playTone,
    playAudioCue: () => playAudioCue,
    parseCookies: () => parseCookies,
    optional: () => optional,
    oneOf: () => oneOf,
    isSpeechSynthesisSupported: () => isSpeechSynthesisSupported,
    isSpeechRecognitionSupported: () => isSpeechRecognitionSupported,
    isPermissionGranted: () => isPermissionGranted,
    isKeepAliveEnabled: () => isKeepAliveEnabled,
    isInFullscreen: () => isInFullscreen,
    isCharging: () => isCharging,
    hasResizeObserver: () => hasResizeObserver,
    hasBattery: () => hasBattery,
    getVolumeLevelLabel: () => getVolumeLevelLabel,
    getVoices: () => getVoices,
    getStorageKeys: () => getStorageKeys,
    getPageTransition: () => getPageTransition,
    getPageMeta: () => getPageMeta,
    getMiddleware: () => getMiddleware,
    getHeadConfig: () => getHeadConfig,
    getExposed: () => getExposed,
    getDefinedStoreNames: () => getDefinedStoreNames,
    getDefinedStore: () => getDefinedStore,
    getCurrentPosition: () => getCurrentPosition,
    getCurrentLayout: () => getCurrentLayout,
    getCurrentElement: () => getCurrentElement,
    getCurrentComponentId: () => getCurrentComponentId,
    getCookie: () => getCookie,
    getBatteryLevel: () => getBatteryLevel,
    getAudioStorage: () => getAudioStorage,
    formatDuration: () => formatDuration,
    executeMiddleware: () => executeMiddleware,
    detectVoiceCommand: () => detectVoiceCommand,
    defineStore: () => defineStore,
    definePropsWithValidation: () => definePropsWithValidation,
    defineProps: () => defineProps,
    definePageMeta: () => definePageMeta,
    defineExpose: () => defineExpose,
    defineEmits: () => defineEmits,
    createStore: () => createStore,
    copyToClipboard: () => copyToClipboard,
    convertSpokenPunctuation: () => convertSpokenPunctuation,
    computed: () => computed,
    clearStorage: () => clearStorage,
    clearCookies: () => clearCookies,
    chatStore: () => chatStore,
    canNotify: () => canNotify,
    arrayOf: () => arrayOf,
    applyHead: () => applyHead,
    appStore: () => appStore
  });

  // lib/store.ts
  function createStore(initialValue, options = {}) {
    const { name, persist, onChange } = options;
    let currentValue = { ...initialValue };
    const subscribers = new Set;
    let persistTimeout = null;
    if (persist && typeof window !== "undefined") {
      const storage = persist.storage === "session" ? sessionStorage : localStorage;
      const key = persist.key || `voide:${name || "store"}`;
      try {
        const stored = storage.getItem(key);
        if (stored) {
          currentValue = { ...initialValue, ...JSON.parse(stored) };
        }
      } catch {}
    }
    const persistValue = (value) => {
      if (!persist || typeof window === "undefined")
        return;
      const storage = persist.storage === "session" ? sessionStorage : localStorage;
      const key = persist.key || `voide:${name || "store"}`;
      if (persist.debounce) {
        if (persistTimeout)
          clearTimeout(persistTimeout);
        persistTimeout = setTimeout(() => {
          storage.setItem(key, JSON.stringify(value));
        }, persist.debounce);
      } else {
        storage.setItem(key, JSON.stringify(value));
      }
    };
    const notify = (newValue, prevValue) => {
      for (const subscriber of subscribers) {
        try {
          subscriber(newValue, prevValue);
        } catch (error) {
          console.error("[voide-store] Subscriber error:", error);
        }
      }
      if (onChange) {
        onChange(newValue, prevValue);
      }
    };
    const store = {
      get: () => currentValue,
      set: (value) => {
        const prevValue = currentValue;
        const newValue = typeof value === "function" ? value(currentValue) : value;
        if (newValue !== prevValue) {
          currentValue = newValue;
          persistValue(newValue);
          notify(newValue, prevValue);
        }
      },
      update: (partial) => {
        const prevValue = currentValue;
        const updates = typeof partial === "function" ? partial(currentValue) : partial;
        const newValue = { ...currentValue, ...updates };
        currentValue = newValue;
        persistValue(newValue);
        notify(newValue, prevValue);
      },
      subscribe: (subscriber) => {
        subscribers.add(subscriber);
        subscriber(currentValue, undefined);
        return () => {
          subscribers.delete(subscriber);
        };
      },
      reset: () => {
        const prevValue = currentValue;
        currentValue = { ...initialValue };
        persistValue(currentValue);
        notify(currentValue, prevValue);
      },
      name
    };
    return store;
  }
  var storeRegistry = new Map;
  function defineStore(id, options) {
    const {
      state: initialState,
      getters = {},
      actions = {},
      persist
    } = options;
    const resolvedInitialState = typeof initialState === "function" ? initialState() : initialState;
    const persistOptions = persist === true ? { storage: "local", key: `voide:${id}` } : persist || undefined;
    const store = createStore(resolvedInitialState, {
      name: id,
      persist: persistOptions
    });
    const storeProxy = new Proxy({}, {
      get(_target, prop) {
        const propStr = String(prop);
        if (propStr === "$state")
          return store.get();
        if (propStr === "$subscribe")
          return store.subscribe;
        if (propStr === "$reset")
          return store.reset;
        if (propStr === "$patch") {
          return (partial) => {
            if (typeof partial === "function") {
              const currentState = store.get();
              const draft = { ...currentState };
              partial(draft);
              store.set(draft);
            } else {
              store.update(partial);
            }
          };
        }
        if (propStr === "_store")
          return store;
        if (propStr === "$id")
          return id;
        if (propStr in getters) {
          return getters[propStr](store.get());
        }
        if (propStr in actions) {
          return (...args) => {
            return actions[propStr].apply(storeProxy, args);
          };
        }
        const state = store.get();
        if (state && typeof state === "object" && propStr in state) {
          return state[propStr];
        }
        return;
      },
      set(_target, prop, value) {
        const propStr = String(prop);
        if (propStr.startsWith("$") || propStr === "_store") {
          return false;
        }
        const state = store.get();
        if (state && typeof state === "object") {
          store.set({ ...state, [propStr]: value });
          return true;
        }
        return false;
      },
      has(_target, prop) {
        const propStr = String(prop);
        const state = store.get();
        return propStr.startsWith("$") || propStr === "_store" || propStr in getters || propStr in actions || state && typeof state === "object" && propStr in state;
      },
      ownKeys() {
        const state = store.get();
        const stateKeys = state && typeof state === "object" ? Object.keys(state) : [];
        return [
          ...stateKeys,
          ...Object.keys(getters),
          ...Object.keys(actions),
          "$state",
          "$subscribe",
          "$reset",
          "$patch",
          "$id"
        ];
      }
    });
    storeRegistry.set(id, storeProxy);
    return storeProxy;
  }
  function getDefinedStore(name) {
    return storeRegistry.get(name);
  }
  function getDefinedStoreNames() {
    return Array.from(storeRegistry.keys());
  }
  function registerStoresClient(stores) {
    if (typeof window === "undefined")
      return;
    const w = window;
    w.__STX_STORES__ = w.__STX_STORES__ || {};
    for (const [name, store] of Object.entries(stores)) {
      w.__STX_STORES__[name] = store;
      storeRegistry.set(name, store);
    }
    window.dispatchEvent(new CustomEvent("stx:stores-ready", { detail: Object.keys(stores) }));
  }
  function computed(stores, compute) {
    const getValues = () => stores.map((s) => s.get());
    let currentValue = compute(...getValues());
    const subscribers = new Set;
    for (const sourceStore of stores) {
      sourceStore.subscribe(() => {
        const newValue = compute(...getValues());
        if (newValue !== currentValue) {
          const prevValue = currentValue;
          currentValue = newValue;
          for (const subscriber of subscribers) {
            subscriber(newValue, prevValue);
          }
        }
      });
    }
    return {
      get: () => currentValue,
      subscribe: (subscriber) => {
        subscribers.add(subscriber);
        return () => subscribers.delete(subscriber);
      }
    };
  }

  // lib/stores/app.ts
  var appStore = defineStore("app", {
    state: {
      isRecording: false,
      isProcessing: false,
      transcript: "",
      repoPath: "",
      hasChanges: false,
      speechSupported: false,
      currentDriver: "claude-sdk",
      isNativeApp: false,
      terminalTitle: "Voide - Ready"
    },
    actions: {
      setRecording(isRecording) {
        this.isRecording = isRecording;
      },
      setProcessing(isProcessing) {
        this.isProcessing = isProcessing;
      },
      setTranscript(transcript) {
        this.transcript = transcript;
      },
      setRepoPath(repoPath) {
        this.repoPath = repoPath;
      },
      setHasChanges(hasChanges) {
        this.hasChanges = hasChanges;
      },
      setTerminalTitle(terminalTitle) {
        this.terminalTitle = terminalTitle;
      },
      setDriver(currentDriver) {
        this.currentDriver = currentDriver;
      },
      setNativeApp(isNativeApp) {
        this.isNativeApp = isNativeApp;
      },
      setSpeechSupported(speechSupported) {
        this.speechSupported = speechSupported;
      }
    },
    persist: {
      storage: "local",
      key: "voide:app"
    }
  });
  // lib/stores/chat.ts
  var STORAGE_KEY_CHATS = "voide:chats";
  var STORAGE_KEY_CHAT_COUNTER = "voide:chat_counter";
  function getAllChats() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_CHATS) || "{}");
    } catch {
      return {};
    }
  }
  function saveAllChats(chats) {
    localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(chats));
  }
  var chatStore = defineStore("chat", {
    state: {
      currentChatId: null,
      messages: [],
      inputText: "",
      charCount: 0,
      pendingPrompt: null,
      sessionId: null
    },
    actions: {
      generateChatId() {
        const counter = parseInt(localStorage.getItem(STORAGE_KEY_CHAT_COUNTER) || "0", 10) + 1;
        localStorage.setItem(STORAGE_KEY_CHAT_COUNTER, counter.toString());
        return counter.toString();
      },
      getChatIdFromUrl() {
        const match = window.location.pathname.match(/^\/chat\/(\d+)$/);
        return match ? match[1] : null;
      },
      getAllChats,
      startNewChat(repoPath = "", driver = "claude-cli-local", initialMessage) {
        const chatId = this.generateChatId();
        const messages = initialMessage ? [initialMessage] : [];
        this.currentChatId = chatId;
        this.messages = messages;
        const chats = getAllChats();
        chats[chatId] = {
          id: chatId,
          messages,
          repoPath,
          driver,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        saveAllChats(chats);
        history.pushState({ chatId }, "", `/chat/${chatId}`);
        return chatId;
      },
      loadChat(chatId) {
        const chats = getAllChats();
        const chat = chats[chatId];
        if (chat) {
          this.currentChatId = chatId;
          this.messages = chat.messages || [];
          this.sessionId = chat.sessionId || null;
          return true;
        }
        return false;
      },
      saveCurrentChat(repoPath, driver) {
        if (!this.currentChatId)
          return;
        const chats = getAllChats();
        const existingChat = chats[this.currentChatId];
        chats[this.currentChatId] = {
          id: this.currentChatId,
          title: existingChat?.title,
          messages: this.messages,
          repoPath,
          driver,
          sessionId: this.sessionId || undefined,
          createdAt: existingChat?.createdAt || Date.now(),
          updatedAt: Date.now()
        };
        saveAllChats(chats);
      },
      setChatTitle(chatId, title) {
        const chats = getAllChats();
        if (chats[chatId]) {
          chats[chatId].title = title;
          chats[chatId].updatedAt = Date.now();
          saveAllChats(chats);
        }
      },
      deleteChat(chatId) {
        const chats = getAllChats();
        delete chats[chatId];
        saveAllChats(chats);
      },
      addMessage(type, content, header) {
        const driverName = header || (type === "user" ? "You" : type === "assistant" ? "AI" : type === "system" ? "System" : "Error");
        const newMessage = {
          type,
          content,
          header: driverName,
          timestamp: Date.now()
        };
        this.messages = [...this.messages, newMessage];
        return newMessage;
      },
      updateLastMessage(type, content) {
        const messages = [...this.messages];
        if (messages.length > 0 && messages[messages.length - 1].type === type) {
          messages[messages.length - 1] = {
            ...messages[messages.length - 1],
            content,
            updated: Date.now()
          };
          this.messages = messages;
        }
      },
      removeLastMessage() {
        if (this.messages.length > 0) {
          this.messages = this.messages.slice(0, -1);
        }
      },
      clearMessages() {
        this.messages = [];
      },
      setInputText(inputText) {
        this.inputText = inputText;
        this.charCount = inputText.length;
      },
      clearInput() {
        this.inputText = "";
        this.charCount = 0;
      },
      newChat() {
        this.currentChatId = null;
        this.messages = [];
        this.pendingPrompt = null;
        this.sessionId = null;
        history.pushState({}, "", "/");
      },
      setPendingPrompt(prompt) {
        this.pendingPrompt = prompt;
      },
      clearPendingPrompt() {
        this.pendingPrompt = null;
      },
      setSessionId(sessionId) {
        this.sessionId = sessionId;
      }
    }
  });
  // lib/stores/settings.ts
  var settingsStore = defineStore("settings", {
    state: {
      apiKeys: {
        anthropic: null,
        openai: null,
        claudeCliHost: null
      },
      github: {
        connected: false,
        token: null,
        username: null,
        name: null,
        email: null,
        avatarUrl: null
      },
      lastRepoPath: null
    },
    actions: {
      setApiKey(provider, key) {
        this.apiKeys = {
          ...this.apiKeys,
          [provider]: key
        };
      },
      setAllApiKeys(keys) {
        this.apiKeys = keys;
      },
      setGithub(github) {
        this.github = { ...this.github, ...github };
      },
      connectGithub(data) {
        this.github = {
          connected: true,
          token: data.token,
          username: data.username,
          name: data.name || null,
          email: data.email || null,
          avatarUrl: data.avatarUrl || null
        };
      },
      disconnectGithub() {
        this.github = {
          connected: false,
          token: null,
          username: null,
          name: null,
          email: null,
          avatarUrl: null
        };
      },
      setLastRepoPath(path) {
        this.lastRepoPath = path;
      }
    },
    persist: {
      storage: "local",
      key: "voide:settings"
    }
  });
  // lib/stores/ui.ts
  var uiStore = defineStore("ui", {
    state: {
      modals: {
        github: false,
        settings: false
      },
      notifications: []
    },
    actions: {
      openModal(modal) {
        this.modals = { ...this.modals, [modal]: true };
      },
      closeModal(modal) {
        this.modals = { ...this.modals, [modal]: false };
      },
      closeAllModals() {
        this.modals = {
          github: false,
          settings: false
        };
      },
      toggleModal(modal) {
        this.modals = { ...this.modals, [modal]: !this.modals[modal] };
      },
      notify(type, message, duration = 3000) {
        const id = `notification-${Date.now()}`;
        this.notifications = [...this.notifications, { id, type, message, duration }];
        if (duration > 0) {
          setTimeout(() => {
            this.dismissNotification(id);
          }, duration);
        }
        return id;
      },
      dismissNotification(id) {
        this.notifications = this.notifications.filter((n) => n.id !== id);
      },
      clearNotifications() {
        this.notifications = [];
      }
    }
  });
  // lib/composables/use-storage.ts
  function useStorage(key, defaultValue, options = {}) {
    const {
      storage = "local",
      mergeDefaults = false,
      listenToStorageChanges = true
    } = options;
    const subscribers = new Set;
    const isClient = typeof window !== "undefined";
    const getStorage = () => {
      if (!isClient)
        return null;
      return storage === "session" ? sessionStorage : localStorage;
    };
    const read = () => {
      const store = getStorage();
      if (!store)
        return defaultValue;
      try {
        const raw = store.getItem(key);
        if (raw === null)
          return defaultValue;
        const parsed = JSON.parse(raw);
        if (mergeDefaults && typeof defaultValue === "object" && defaultValue !== null) {
          return { ...defaultValue, ...parsed };
        }
        return parsed;
      } catch {
        return defaultValue;
      }
    };
    const write = (value) => {
      const store = getStorage();
      if (!store)
        return;
      try {
        if (value === null || value === undefined) {
          store.removeItem(key);
        } else {
          store.setItem(key, JSON.stringify(value));
        }
      } catch (e) {
        console.warn(`[useStorage] Failed to write key "${key}":`, e);
      }
    };
    let currentValue = read();
    const notify = (newValue, prevValue) => {
      for (const callback of subscribers) {
        try {
          callback(newValue, prevValue);
        } catch (e) {
          console.error("[useStorage]", e);
        }
      }
    };
    if (isClient && listenToStorageChanges) {
      window.addEventListener("storage", (event) => {
        if (event.key === key && event.storageArea === getStorage()) {
          const prevValue = currentValue;
          currentValue = event.newValue ? JSON.parse(event.newValue) : defaultValue;
          notify(currentValue, prevValue);
        }
      });
    }
    const ref = {
      get value() {
        return currentValue;
      },
      set value(newValue) {
        const prevValue = currentValue;
        currentValue = newValue;
        write(newValue);
        notify(newValue, prevValue);
      },
      get: () => currentValue,
      set: (value) => {
        ref.value = value;
      },
      remove: () => {
        const store = getStorage();
        if (store) {
          store.removeItem(key);
          const prevValue = currentValue;
          currentValue = defaultValue;
          notify(defaultValue, prevValue);
        }
      },
      subscribe: (callback) => {
        subscribers.add(callback);
        callback(currentValue, undefined);
        return () => subscribers.delete(callback);
      }
    };
    return ref;
  }
  function useLocalStorage(key, defaultValue, options) {
    return useStorage(key, defaultValue, { ...options, storage: "local" });
  }
  function useSessionStorage(key, defaultValue, options) {
    return useStorage(key, defaultValue, { ...options, storage: "session" });
  }
  function clearStorage(type = "local") {
    if (typeof window === "undefined")
      return;
    const storage = type === "session" ? sessionStorage : localStorage;
    storage.clear();
  }
  function getStorageKeys(type = "local") {
    if (typeof window === "undefined")
      return [];
    const storage = type === "session" ? sessionStorage : localStorage;
    return Object.keys(storage);
  }
  // lib/composables/use-cookie.ts
  function parseCookies() {
    if (typeof document === "undefined")
      return {};
    const cookies = {};
    const pairs = document.cookie.split(";");
    for (const pair of pairs) {
      const [key, ...valueParts] = pair.trim().split("=");
      if (key) {
        try {
          cookies[key] = decodeURIComponent(valueParts.join("="));
        } catch {
          cookies[key] = valueParts.join("=");
        }
      }
    }
    return cookies;
  }
  function getCookie(name) {
    return parseCookies()[name] ?? null;
  }
  function setCookie(name, value, options = {}) {
    if (typeof document === "undefined")
      return;
    const { maxAge, expires, path = "/", domain, secure, sameSite = "lax" } = options;
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    if (maxAge !== undefined)
      cookieString += `; max-age=${maxAge}`;
    if (expires !== undefined) {
      const expiresDate = expires instanceof Date ? expires : typeof expires === "number" ? new Date(Date.now() + expires * 1000) : new Date(expires);
      cookieString += `; expires=${expiresDate.toUTCString()}`;
    }
    if (path)
      cookieString += `; path=${path}`;
    if (domain)
      cookieString += `; domain=${domain}`;
    if (secure)
      cookieString += "; secure";
    if (sameSite)
      cookieString += `; samesite=${sameSite}`;
    document.cookie = cookieString;
  }
  function removeCookie(name, options = {}) {
    setCookie(name, "", { ...options, maxAge: 0, expires: new Date(0) });
  }
  function useCookie(name, options = {}) {
    const { default: defaultValue = null } = options;
    const subscribers = new Set;
    let pollInterval = null;
    const read = () => {
      if (typeof document === "undefined")
        return defaultValue;
      const raw = getCookie(name);
      if (raw === null)
        return defaultValue;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    };
    let currentValue = read();
    const notify = (newValue, prevValue) => {
      for (const callback of subscribers) {
        try {
          callback(newValue, prevValue);
        } catch (e) {
          console.error("[useCookie]", e);
        }
      }
    };
    const startPolling = () => {
      if (pollInterval || typeof document === "undefined")
        return;
      pollInterval = setInterval(() => {
        const newValue = read();
        if (JSON.stringify(newValue) !== JSON.stringify(currentValue)) {
          const prevValue = currentValue;
          currentValue = newValue;
          notify(newValue, prevValue);
        }
      }, 1000);
    };
    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };
    const ref = {
      get value() {
        return currentValue;
      },
      set value(newValue) {
        const prevValue = currentValue;
        currentValue = newValue;
        if (newValue === null)
          removeCookie(name, options);
        else
          setCookie(name, typeof newValue === "string" ? newValue : JSON.stringify(newValue), options);
        notify(newValue, prevValue);
      },
      get: () => currentValue,
      set: (value, customOptions) => {
        const prevValue = currentValue;
        currentValue = value;
        setCookie(name, typeof value === "string" ? value : JSON.stringify(value), { ...options, ...customOptions });
        notify(value, prevValue);
      },
      remove: () => {
        const prevValue = currentValue;
        currentValue = null;
        removeCookie(name, options);
        notify(null, prevValue);
      },
      subscribe: (callback) => {
        subscribers.add(callback);
        callback(currentValue, null);
        if (subscribers.size === 1)
          startPolling();
        return () => {
          subscribers.delete(callback);
          if (subscribers.size === 0)
            stopPolling();
        };
      }
    };
    return ref;
  }
  function clearCookies(options = {}) {
    for (const name of Object.keys(parseCookies()))
      removeCookie(name, options);
  }
  // lib/composables/use-browser.ts
  function useClipboard(options = {}) {
    const { timeout = 1500 } = options;
    let currentText = "";
    let copied = false;
    let copiedTimeout = null;
    const isSupported = typeof navigator !== "undefined" && "clipboard" in navigator;
    const copy = async (text) => {
      try {
        if (isSupported) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.cssText = "position:fixed;opacity:0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        }
        currentText = text;
        copied = true;
        if (copiedTimeout)
          clearTimeout(copiedTimeout);
        copiedTimeout = setTimeout(() => {
          copied = false;
        }, timeout);
        return true;
      } catch {
        return false;
      }
    };
    const read = async () => {
      if (!isSupported)
        return "";
      try {
        return await navigator.clipboard.readText();
      } catch {
        return "";
      }
    };
    return {
      get text() {
        return currentText;
      },
      get isSupported() {
        return isSupported;
      },
      get copied() {
        return copied;
      },
      copy,
      read
    };
  }
  async function copyToClipboard(text) {
    return useClipboard().copy(text);
  }
  function useMediaQuery(query) {
    const subscribers = new Set;
    const isClient = typeof window !== "undefined";
    let currentMatches = false;
    if (isClient) {
      const mediaQuery = window.matchMedia(query);
      currentMatches = mediaQuery.matches;
      const handler = (event) => {
        currentMatches = event.matches;
        for (const cb of subscribers) {
          try {
            cb(event.matches);
          } catch {}
        }
      };
      if (mediaQuery.addEventListener)
        mediaQuery.addEventListener("change", handler);
      else
        mediaQuery.addListener(handler);
    }
    return {
      get matches() {
        return currentMatches;
      },
      subscribe: (callback) => {
        subscribers.add(callback);
        callback(currentMatches);
        return () => subscribers.delete(callback);
      }
    };
  }
  function usePreferredDark() {
    return useMediaQuery("(prefers-color-scheme: dark)");
  }
  function usePreferredReducedMotion() {
    return useMediaQuery("(prefers-reduced-motion: reduce)");
  }
  function useIsMobile() {
    return useMediaQuery("(max-width: 767px)");
  }
  function useIsDesktop() {
    return useMediaQuery("(min-width: 1024px)");
  }
  function useNetwork() {
    const subscribers = new Set;
    const isClient = typeof window !== "undefined";
    const getConnection = () => isClient ? navigator.connection : null;
    const getState = () => {
      if (!isClient)
        return { isOnline: true, isOffline: false, effectiveType: null, downlink: null, saveData: false };
      const conn = getConnection();
      return {
        isOnline: navigator.onLine,
        isOffline: !navigator.onLine,
        effectiveType: conn?.effectiveType || null,
        downlink: conn?.downlink || null,
        saveData: conn?.saveData || false
      };
    };
    let currentState = getState();
    const notify = () => {
      currentState = getState();
      for (const cb of subscribers) {
        try {
          cb(currentState);
        } catch {}
      }
    };
    if (isClient) {
      window.addEventListener("online", notify);
      window.addEventListener("offline", notify);
      getConnection()?.addEventListener("change", notify);
    }
    return {
      get isOnline() {
        return currentState.isOnline;
      },
      get isOffline() {
        return currentState.isOffline;
      },
      get effectiveType() {
        return currentState.effectiveType;
      },
      get downlink() {
        return currentState.downlink;
      },
      get saveData() {
        return currentState.saveData;
      },
      subscribe: (callback) => {
        subscribers.add(callback);
        callback(currentState);
        return () => subscribers.delete(callback);
      }
    };
  }
  function useOnline() {
    const network = useNetwork();
    return {
      get isOnline() {
        return network.isOnline;
      },
      subscribe: (cb) => network.subscribe((s) => cb(s.isOnline))
    };
  }
  function useWindowSize() {
    const subscribers = new Set;
    const isClient = typeof window !== "undefined";
    let current = { width: isClient ? window.innerWidth : 0, height: isClient ? window.innerHeight : 0 };
    if (isClient) {
      window.addEventListener("resize", () => {
        current = { width: window.innerWidth, height: window.innerHeight };
        for (const cb of subscribers) {
          try {
            cb(current);
          } catch {}
        }
      }, { passive: true });
    }
    return {
      get width() {
        return current.width;
      },
      get height() {
        return current.height;
      },
      subscribe: (callback) => {
        subscribers.add(callback);
        callback(current);
        return () => subscribers.delete(callback);
      }
    };
  }
  function useScroll() {
    const subscribers = new Set;
    const isClient = typeof window !== "undefined";
    let current = { x: isClient ? window.scrollX : 0, y: isClient ? window.scrollY : 0 };
    if (isClient) {
      window.addEventListener("scroll", () => {
        current = { x: window.scrollX, y: window.scrollY };
        for (const cb of subscribers) {
          try {
            cb(current);
          } catch {}
        }
      }, { passive: true });
    }
    return {
      get x() {
        return current.x;
      },
      get y() {
        return current.y;
      },
      subscribe: (callback) => {
        subscribers.add(callback);
        callback(current);
        return () => subscribers.delete(callback);
      },
      scrollTo: (x, y) => isClient && window.scrollTo(x, y),
      scrollToTop: () => isClient && window.scrollTo({ top: 0, behavior: "smooth" }),
      scrollToBottom: () => isClient && window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
    };
  }
  function useVisibility() {
    const subscribers = new Set;
    const isClient = typeof document !== "undefined";
    let isVisible = isClient ? document.visibilityState === "visible" : true;
    if (isClient) {
      document.addEventListener("visibilitychange", () => {
        isVisible = document.visibilityState === "visible";
        for (const cb of subscribers) {
          try {
            cb(isVisible);
          } catch {}
        }
      });
    }
    return {
      get isVisible() {
        return isVisible;
      },
      subscribe: (callback) => {
        subscribers.add(callback);
        callback(isVisible);
        return () => subscribers.delete(callback);
      }
    };
  }
  function useTitle(initialTitle) {
    const isClient = typeof document !== "undefined";
    if (initialTitle && isClient)
      document.title = initialTitle;
    return {
      get value() {
        return isClient ? document.title : "";
      },
      set value(title) {
        if (isClient)
          document.title = title;
      },
      set: (title) => {
        if (isClient)
          document.title = title;
      }
    };
  }
  function useFavicon(href) {
    const isClient = typeof document !== "undefined";
    const getLink = () => {
      if (!isClient)
        return null;
      let link = document.querySelector('link[rel*="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      return link;
    };
    if (href) {
      const link = getLink();
      if (link)
        link.href = href;
    }
    return {
      get value() {
        return getLink()?.href || "";
      },
      set value(newHref) {
        const link = getLink();
        if (link)
          link.href = newHref;
      },
      set: (newHref) => {
        const link = getLink();
        if (link)
          link.href = newHref;
      }
    };
  }
  function useGeolocation(options = {}) {
    const { enableHighAccuracy = true, timeout = 1e4, maximumAge = 0 } = options;
    const isClient = typeof navigator !== "undefined" && "geolocation" in navigator;
    const subscribers = new Set;
    let state = { coords: null, error: null, loading: false };
    let watchId = null;
    const notify = () => subscribers.forEach((fn) => fn(state));
    const updatePosition = (pos) => {
      state = {
        coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy },
        error: null,
        loading: false
      };
      notify();
    };
    const handleError = (err) => {
      state = { ...state, error: err, loading: false };
      notify();
    };
    return {
      get coords() {
        return state.coords;
      },
      get error() {
        return state.error;
      },
      get loading() {
        return state.loading;
      },
      subscribe: (fn) => {
        if (subscribers.size === 0 && isClient) {
          state = { ...state, loading: true };
          watchId = navigator.geolocation.watchPosition(updatePosition, handleError, { enableHighAccuracy, timeout, maximumAge });
        }
        subscribers.add(fn);
        fn(state);
        return () => {
          subscribers.delete(fn);
          if (subscribers.size === 0 && watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
          }
        };
      },
      refresh: () => {
        if (!isClient)
          return;
        state = { ...state, loading: true };
        notify();
        navigator.geolocation.getCurrentPosition(updatePosition, handleError, { enableHighAccuracy, timeout, maximumAge });
      }
    };
  }
  function getCurrentPosition(options) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation)
        return reject(new Error("Geolocation not supported"));
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }
  function useMouse() {
    const isClient = typeof window !== "undefined";
    const subscribers = new Set;
    let state = { x: 0, y: 0, pageX: 0, pageY: 0, buttons: 0, isPressed: false };
    let cleanup = null;
    const notify = () => subscribers.forEach((fn) => fn(state));
    const handleMove = (e) => {
      state = { x: e.clientX, y: e.clientY, pageX: e.pageX, pageY: e.pageY, buttons: e.buttons, isPressed: e.buttons > 0 };
      notify();
    };
    const handleDown = (e) => {
      state = { ...state, buttons: e.buttons, isPressed: true };
      notify();
    };
    const handleUp = (e) => {
      state = { ...state, buttons: e.buttons, isPressed: false };
      notify();
    };
    return {
      get x() {
        return state.x;
      },
      get y() {
        return state.y;
      },
      get isPressed() {
        return state.isPressed;
      },
      subscribe: (fn) => {
        if (subscribers.size === 0 && isClient) {
          window.addEventListener("mousemove", handleMove);
          window.addEventListener("mousedown", handleDown);
          window.addEventListener("mouseup", handleUp);
          cleanup = () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mousedown", handleDown);
            window.removeEventListener("mouseup", handleUp);
          };
        }
        subscribers.add(fn);
        fn(state);
        return () => {
          subscribers.delete(fn);
          if (subscribers.size === 0 && cleanup) {
            cleanup();
            cleanup = null;
          }
        };
      }
    };
  }
  function usePointer() {
    const isClient = typeof window !== "undefined";
    const subscribers = new Set;
    let state = { x: 0, y: 0, pageX: 0, pageY: 0, buttons: 0, isPressed: false };
    let cleanup = null;
    const notify = () => subscribers.forEach((fn) => fn(state));
    const handleMove = (e) => {
      state = { x: e.clientX, y: e.clientY, pageX: e.pageX, pageY: e.pageY, buttons: e.buttons, isPressed: e.buttons > 0 || e.pressure > 0 };
      notify();
    };
    return {
      get x() {
        return state.x;
      },
      get y() {
        return state.y;
      },
      subscribe: (fn) => {
        if (subscribers.size === 0 && isClient) {
          window.addEventListener("pointermove", handleMove);
          cleanup = () => window.removeEventListener("pointermove", handleMove);
        }
        subscribers.add(fn);
        fn(state);
        return () => {
          subscribers.delete(fn);
          if (subscribers.size === 0 && cleanup) {
            cleanup();
            cleanup = null;
          }
        };
      }
    };
  }
  function useKeyboard() {
    const isClient = typeof window !== "undefined";
    const subscribers = new Set;
    let state = { pressed: new Set, lastKey: null, ctrl: false, alt: false, shift: false, meta: false };
    let cleanup = null;
    const notify = () => subscribers.forEach((fn) => fn(state));
    const handleDown = (e) => {
      const pressed = new Set(state.pressed);
      pressed.add(e.key.toLowerCase());
      state = { pressed, lastKey: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey };
      notify();
    };
    const handleUp = (e) => {
      const pressed = new Set(state.pressed);
      pressed.delete(e.key.toLowerCase());
      state = { pressed, lastKey: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey };
      notify();
    };
    const handleBlur = () => {
      state = { pressed: new Set, lastKey: null, ctrl: false, alt: false, shift: false, meta: false };
      notify();
    };
    return {
      get pressed() {
        return state.pressed;
      },
      get ctrl() {
        return state.ctrl;
      },
      get alt() {
        return state.alt;
      },
      get shift() {
        return state.shift;
      },
      get meta() {
        return state.meta;
      },
      isPressed: (key) => state.pressed.has(key.toLowerCase()),
      subscribe: (fn) => {
        if (subscribers.size === 0 && isClient) {
          window.addEventListener("keydown", handleDown);
          window.addEventListener("keyup", handleUp);
          window.addEventListener("blur", handleBlur);
          cleanup = () => {
            window.removeEventListener("keydown", handleDown);
            window.removeEventListener("keyup", handleUp);
            window.removeEventListener("blur", handleBlur);
          };
        }
        subscribers.add(fn);
        fn(state);
        return () => {
          subscribers.delete(fn);
          if (subscribers.size === 0 && cleanup) {
            cleanup();
            cleanup = null;
          }
        };
      }
    };
  }
  function useHotkey(hotkey, callback, options = {}) {
    const { preventDefault = true, ignoreInputs = true } = options;
    const isClient = typeof window !== "undefined";
    if (!isClient)
      return () => {};
    const parts = hotkey.toLowerCase().split("+").map((p) => p.trim());
    const key = parts[parts.length - 1];
    const needsCtrl = parts.includes("ctrl") || parts.includes("control");
    const needsAlt = parts.includes("alt");
    const needsShift = parts.includes("shift");
    const needsMeta = parts.includes("meta") || parts.includes("cmd");
    const handler = (e) => {
      if (ignoreInputs) {
        const tag = (document.activeElement?.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select")
          return;
      }
      const keyMatches = e.key.toLowerCase() === key || e.code.toLowerCase() === key || e.code.toLowerCase() === `key${key}` || e.code.toLowerCase() === `digit${key}` || key === "space" && e.code === "Space" || key === "escape" && e.key === "Escape" || key === "esc" && e.key === "Escape" || key === "enter" && e.key === "Enter";
      if (keyMatches && e.ctrlKey === needsCtrl && e.altKey === needsAlt && e.shiftKey === needsShift && e.metaKey === needsMeta) {
        if (preventDefault)
          e.preventDefault();
        callback(e);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }
  function useKeyPressed(key) {
    const keyboard = useKeyboard();
    const k = key.toLowerCase();
    return {
      get isPressed() {
        return keyboard.isPressed(k);
      },
      subscribe: (fn) => {
        let last = false;
        return keyboard.subscribe((state) => {
          const current = state.pressed.has(k);
          if (current !== last) {
            last = current;
            fn(current);
          }
        });
      }
    };
  }
  function useIntersectionObserver(target, callback, options = {}) {
    const { root = null, rootMargin = "0px", threshold = 0, once = false } = options;
    const isClient = typeof IntersectionObserver !== "undefined";
    const subscribers = new Set;
    let state = { isIntersecting: false, intersectionRatio: 0, isVisible: false };
    let observer = null;
    const getElement = () => typeof target === "function" ? target() : target;
    const notify = () => subscribers.forEach((fn) => fn(state));
    const start = () => {
      if (!isClient || observer)
        return;
      const el = getElement();
      if (!el)
        return;
      observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (!entry)
          return;
        state = { isIntersecting: entry.isIntersecting, intersectionRatio: entry.intersectionRatio, isVisible: entry.isIntersecting };
        notify();
        if (callback)
          callback(entry);
        if (once && entry.isIntersecting)
          stop();
      }, { root, rootMargin, threshold });
      observer.observe(el);
    };
    const stop = () => {
      observer?.disconnect();
      observer = null;
    };
    start();
    return {
      get isVisible() {
        return state.isVisible;
      },
      subscribe: (fn) => {
        subscribers.add(fn);
        fn(state);
        return () => {
          subscribers.delete(fn);
          if (subscribers.size === 0 && !callback)
            stop();
        };
      },
      stop,
      start
    };
  }
  function useElementVisibility(target) {
    const obs = useIntersectionObserver(target);
    return {
      get isVisible() {
        return obs.isVisible;
      },
      subscribe: (fn) => {
        let last = false;
        return obs.subscribe((state) => {
          if (state.isVisible !== last) {
            last = state.isVisible;
            fn(state.isVisible);
          }
        });
      }
    };
  }
  function useLazyLoad(target, onVisible) {
    return useIntersectionObserver(target, (entry) => {
      if (entry.isIntersecting)
        onVisible();
    }, { once: true });
  }
  function useInfiniteScroll(sentinel, loadMore, options = {}) {
    const { rootMargin = "100px", debounce = 100 } = options;
    let isLoading = false;
    let timeout = null;
    const obs = useIntersectionObserver(sentinel, async (entry) => {
      if (!entry.isIntersecting || isLoading)
        return;
      if (timeout)
        clearTimeout(timeout);
      timeout = setTimeout(async () => {
        isLoading = true;
        try {
          await loadMore();
        } finally {
          isLoading = false;
        }
      }, debounce);
    }, { rootMargin });
    return { stop: () => {
      if (timeout)
        clearTimeout(timeout);
      obs.stop();
    }, start: obs.start, isLoading: () => isLoading };
  }
  function buildURL(url, baseURL, query) {
    let fullURL = baseURL ? `${baseURL.replace(/\/$/, "")}/${url.replace(/^\//, "")}` : url;
    if (query) {
      const params = new URLSearchParams;
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined)
          params.append(key, String(value));
      }
      const qs = params.toString();
      if (qs)
        fullURL += (fullURL.includes("?") ? "&" : "?") + qs;
    }
    return fullURL;
  }
  function useFetch(url, options = {}) {
    const {
      immediate = true,
      transform,
      timeout = 30000,
      retry = 0,
      retryDelay = 1000,
      default: defaultValue = null,
      baseURL,
      query,
      body,
      ...fetchOptions
    } = options;
    let state = { data: defaultValue, loading: false, error: null, status: null };
    const subscribers = new Set;
    let abortController = null;
    const notify = () => subscribers.forEach((fn) => fn(state));
    const getURL = () => buildURL(typeof url === "function" ? url() : url, baseURL, query);
    const doFetch = async (attempt = 0) => {
      if (abortController)
        abortController.abort();
      abortController = new AbortController;
      state = { ...state, loading: true, error: null };
      notify();
      const timeoutId = setTimeout(() => abortController?.abort(), timeout);
      try {
        let requestBody;
        const headers = { ...fetchOptions.headers };
        if (body && typeof body === "object" && !(body instanceof FormData)) {
          requestBody = JSON.stringify(body);
          headers["Content-Type"] = "application/json";
        } else if (body) {
          requestBody = body;
        }
        const response = await fetch(getURL(), { ...fetchOptions, headers, body: requestBody, signal: abortController.signal });
        clearTimeout(timeoutId);
        state.status = response.status;
        if (!response.ok)
          throw new Error(`HTTP ${response.status}`);
        let data = await response.json();
        if (transform)
          data = transform(data);
        state = { ...state, data, loading: false, error: null };
        notify();
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === "AbortError")
          return;
        if (attempt < retry) {
          await new Promise((r) => setTimeout(r, retryDelay));
          return doFetch(attempt + 1);
        }
        state = { ...state, loading: false, error: err instanceof Error ? err : new Error(String(err)) };
        notify();
      }
    };
    if (immediate)
      doFetch();
    return {
      get data() {
        return state.data;
      },
      get loading() {
        return state.loading;
      },
      get error() {
        return state.error;
      },
      subscribe: (fn) => {
        subscribers.add(fn);
        fn(state);
        return () => subscribers.delete(fn);
      },
      refresh: doFetch,
      execute: doFetch,
      abort: () => abortController?.abort()
    };
  }
  function useAsyncData(fetcher, options = {}) {
    const { immediate = true, transform, default: defaultValue = null } = options;
    let state = { data: defaultValue, loading: false, error: null, status: null };
    const subscribers = new Set;
    const notify = () => subscribers.forEach((fn) => fn(state));
    const doFetch = async () => {
      state = { ...state, loading: true, error: null };
      notify();
      try {
        let data = await fetcher();
        if (transform)
          data = transform(data);
        state = { ...state, data, loading: false, error: null };
        notify();
      } catch (err) {
        state = { ...state, loading: false, error: err instanceof Error ? err : new Error(String(err)) };
        notify();
      }
    };
    if (immediate)
      doFetch();
    return {
      get data() {
        return state.data;
      },
      get loading() {
        return state.loading;
      },
      get error() {
        return state.error;
      },
      subscribe: (fn) => {
        subscribers.add(fn);
        fn(state);
        return () => subscribers.delete(fn);
      },
      refresh: doFetch,
      execute: doFetch
    };
  }
  function getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }
  function useFullscreen(target) {
    const isClient = typeof document !== "undefined";
    const supported = isClient && !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
    const subscribers = new Set;
    let state = { isFullscreen: false, isSupported: supported };
    let cleanup = null;
    const getElement = () => {
      if (!target)
        return document.documentElement;
      return typeof target === "function" ? target() || document.documentElement : target;
    };
    const notify = () => subscribers.forEach((fn) => fn(state));
    const updateState = () => {
      state = { ...state, isFullscreen: !!getFullscreenElement() };
      notify();
    };
    const enter = async () => {
      if (!supported)
        return;
      const el = getElement();
      if (el.requestFullscreen)
        await el.requestFullscreen();
      else if (el.webkitRequestFullscreen)
        await el.webkitRequestFullscreen();
    };
    const exit = async () => {
      if (!supported || !getFullscreenElement())
        return;
      if (document.exitFullscreen)
        await document.exitFullscreen();
      else if (document.webkitExitFullscreen)
        await document.webkitExitFullscreen();
    };
    const toggle = async () => state.isFullscreen ? exit() : enter();
    return {
      get isFullscreen() {
        return state.isFullscreen;
      },
      get isSupported() {
        return supported;
      },
      subscribe: (fn) => {
        if (subscribers.size === 0 && isClient) {
          document.addEventListener("fullscreenchange", updateState);
          document.addEventListener("webkitfullscreenchange", updateState);
          cleanup = () => {
            document.removeEventListener("fullscreenchange", updateState);
            document.removeEventListener("webkitfullscreenchange", updateState);
          };
          updateState();
        }
        subscribers.add(fn);
        fn(state);
        return () => {
          subscribers.delete(fn);
          if (subscribers.size === 0 && cleanup) {
            cleanup();
            cleanup = null;
          }
        };
      },
      enter,
      exit,
      toggle
    };
  }
  function toggleFullscreen() {
    return useFullscreen().toggle();
  }
  function isInFullscreen() {
    return !!getFullscreenElement();
  }
  var activeNotifications = new Map;
  function useNotification() {
    const isSupported = typeof window !== "undefined" && "Notification" in window;
    let state = {
      permission: isSupported ? Notification.permission : "denied",
      isSupported
    };
    const subscribers = new Set;
    const notify = () => subscribers.forEach((fn) => fn(state));
    const requestPermission = async () => {
      if (!isSupported)
        return "denied";
      const result = await Notification.requestPermission();
      state = { ...state, permission: result };
      notify();
      return result;
    };
    const show = (title, options = {}) => {
      if (!isSupported || state.permission !== "granted")
        return null;
      const { autoClose, ...notificationOptions } = options;
      try {
        const notification = new Notification(title, notificationOptions);
        if (options.tag) {
          activeNotifications.get(options.tag)?.close();
          activeNotifications.set(options.tag, notification);
          notification.addEventListener("close", () => activeNotifications.delete(options.tag));
        }
        if (autoClose && autoClose > 0)
          setTimeout(() => notification.close(), autoClose);
        return notification;
      } catch {
        return null;
      }
    };
    const close = (tag) => {
      activeNotifications.get(tag)?.close();
      activeNotifications.delete(tag);
    };
    return {
      get permission() {
        return state.permission;
      },
      get isSupported() {
        return isSupported;
      },
      subscribe: (fn) => {
        subscribers.add(fn);
        fn(state);
        return () => subscribers.delete(fn);
      },
      requestPermission,
      show,
      close
    };
  }
  async function sendNotification(title, options) {
    const notifier = useNotification();
    if (notifier.permission === "default")
      await notifier.requestPermission();
    return notifier.show(title, options);
  }
  function canNotify() {
    return typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";
  }
  function useShare() {
    const supported = typeof navigator !== "undefined" && "share" in navigator;
    const fileSupported = typeof navigator !== "undefined" && "canShare" in navigator;
    const canShare = (data) => {
      if (!supported)
        return false;
      if (!data)
        return true;
      if (data.files?.length) {
        if (!fileSupported)
          return false;
        try {
          return navigator.canShare(data);
        } catch {
          return false;
        }
      }
      return !!(data.title || data.text || data.url);
    };
    const share = async (data) => {
      if (!supported)
        return { success: false, error: new Error("Web Share API not supported") };
      if (!canShare(data))
        return { success: false, error: new Error("Content cannot be shared") };
      try {
        await navigator.share(data);
        return { success: true };
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError")
          return { success: false, cancelled: true };
        return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
      }
    };
    return { isSupported: () => supported, canShare, share };
  }
  async function share(data) {
    return useShare().share(data);
  }
  async function shareURL(url, title, text) {
    return share({ url, title, text });
  }
  async function shareCurrentPage(text) {
    if (typeof document === "undefined")
      return { success: false, error: new Error("Not in browser") };
    return share({ title: document.title, url: location.href, text });
  }
  function createPermissionStatus(state) {
    return { state, isGranted: state === "granted", isDenied: state === "denied", isPrompt: state === "prompt" };
  }
  function usePermission(name) {
    const supported = typeof navigator !== "undefined" && "permissions" in navigator;
    let status = createPermissionStatus("prompt");
    const subscribers = new Set;
    let permStatus = null;
    const notify = () => subscribers.forEach((fn) => fn(status));
    const query = async () => {
      if (!supported)
        return createPermissionStatus("prompt");
      try {
        permStatus = await navigator.permissions.query({ name });
        status = createPermissionStatus(permStatus.state);
        permStatus.addEventListener("change", () => {
          status = createPermissionStatus(permStatus.state);
          notify();
        });
        return status;
      } catch {
        return createPermissionStatus("prompt");
      }
    };
    return {
      get state() {
        return status.state;
      },
      get isGranted() {
        return status.isGranted;
      },
      subscribe: (fn) => {
        if (subscribers.size === 0 && supported)
          query();
        subscribers.add(fn);
        fn(status);
        return () => subscribers.delete(fn);
      },
      query,
      isSupported: () => supported
    };
  }
  function usePermissions(names) {
    const refs = Object.fromEntries(names.map((n) => [n, usePermission(n)]));
    const subscribers = new Set;
    let states = Object.fromEntries(names.map((n) => [n, createPermissionStatus("prompt")]));
    const notify = () => subscribers.forEach((fn) => fn(states));
    return {
      get: () => states,
      subscribe: (fn) => {
        const unsubs = names.map((n) => refs[n].subscribe((s) => {
          states[n] = s;
          notify();
        }));
        subscribers.add(fn);
        fn(states);
        return () => {
          subscribers.delete(fn);
          if (subscribers.size === 0)
            unsubs.forEach((u) => u());
        };
      },
      queryAll: async () => {
        await Promise.all(names.map((n) => refs[n].query()));
        return states;
      }
    };
  }
  async function isPermissionGranted(name) {
    const perm = usePermission(name);
    const status = await perm.query();
    return status.isGranted;
  }
  function useResizeObserver(target, callback) {
    const supported = typeof ResizeObserver !== "undefined";
    const subscribers = new Set;
    let state = { width: 0, height: 0, contentRect: null };
    let observer = null;
    const getElement = () => typeof target === "function" ? target() : target;
    const notify = () => subscribers.forEach((fn) => fn(state));
    const start = () => {
      if (!supported || observer)
        return;
      const el = getElement();
      if (!el)
        return;
      observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry)
          return;
        state = { width: entry.contentRect.width, height: entry.contentRect.height, contentRect: entry.contentRect };
        notify();
        if (callback)
          callback(entry);
      });
      observer.observe(el);
    };
    const stop = () => {
      observer?.disconnect();
      observer = null;
    };
    return {
      get width() {
        return state.width;
      },
      get height() {
        return state.height;
      },
      get isSupported() {
        return supported;
      },
      subscribe: (fn) => {
        if (subscribers.size === 0)
          start();
        subscribers.add(fn);
        fn(state);
        return () => {
          subscribers.delete(fn);
          if (subscribers.size === 0 && !callback)
            stop();
        };
      },
      observe: start,
      disconnect: stop
    };
  }
  function useElementSize(target) {
    let size = { width: 0, height: 0 };
    const subscribers = new Set;
    const observer = useResizeObserver(target, (entry) => {
      size = { width: entry.contentRect.width, height: entry.contentRect.height };
      subscribers.forEach((fn) => fn(size));
    });
    return {
      get width() {
        return size.width;
      },
      get height() {
        return size.height;
      },
      subscribe: (fn) => {
        subscribers.add(fn);
        fn(size);
        if (subscribers.size === 1)
          observer.observe();
        return () => {
          subscribers.delete(fn);
          if (subscribers.size === 0)
            observer.disconnect();
        };
      }
    };
  }
  function hasResizeObserver() {
    return typeof ResizeObserver !== "undefined";
  }
  function useBattery() {
    const supported = typeof navigator !== "undefined" && "getBattery" in navigator;
    let state = { charging: false, chargingTime: 0, dischargingTime: 0, level: 1 };
    const subscribers = new Set;
    let battery = null;
    let initialized = false;
    const notify = () => subscribers.forEach((fn) => fn(state));
    const updateState = () => {
      if (battery) {
        state = { charging: battery.charging, chargingTime: battery.chargingTime, dischargingTime: battery.dischargingTime, level: battery.level };
        notify();
      }
    };
    const init = async () => {
      if (initialized || !supported)
        return;
      try {
        battery = await navigator.getBattery();
        state = { charging: battery.charging, chargingTime: battery.chargingTime, dischargingTime: battery.dischargingTime, level: battery.level };
        battery.addEventListener("chargingchange", updateState);
        battery.addEventListener("chargingtimechange", updateState);
        battery.addEventListener("dischargingtimechange", updateState);
        battery.addEventListener("levelchange", updateState);
        initialized = true;
        notify();
      } catch {}
    };
    return {
      get charging() {
        return state.charging;
      },
      get level() {
        return state.level;
      },
      get isSupported() {
        return supported;
      },
      getPercentage: () => Math.round(state.level * 100),
      isLow: (threshold = 0.2) => state.level <= threshold && !state.charging,
      isCritical: () => state.level <= 0.1 && !state.charging,
      subscribe: (fn) => {
        if (subscribers.size === 0)
          init();
        subscribers.add(fn);
        fn(state);
        return () => subscribers.delete(fn);
      }
    };
  }
  async function getBatteryLevel() {
    if (typeof navigator === "undefined" || !("getBattery" in navigator))
      return null;
    try {
      const battery = await navigator.getBattery();
      return Math.round(battery.level * 100);
    } catch {
      return null;
    }
  }
  async function isCharging() {
    if (typeof navigator === "undefined" || !("getBattery" in navigator))
      return null;
    try {
      const battery = await navigator.getBattery();
      return battery.charging;
    } catch {
      return null;
    }
  }
  function hasBattery() {
    return typeof navigator !== "undefined" && "getBattery" in navigator;
  }
  function getSpeechRecognition() {
    if (typeof window === "undefined")
      return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }
  function isSpeechRecognitionSupported() {
    return getSpeechRecognition() !== null;
  }
  function useSpeechRecognition(options = {}) {
    const SpeechRecognitionClass = getSpeechRecognition();
    const supported = SpeechRecognitionClass !== null;
    let state = {
      isListening: false,
      transcript: "",
      finalTranscript: "",
      interimTranscript: "",
      confidence: 0,
      isSupported: supported,
      error: null
    };
    const subscribers = new Set;
    const eventListeners = {
      result: new Set,
      error: new Set,
      start: new Set,
      end: new Set,
      speechstart: new Set,
      speechend: new Set,
      soundend: new Set,
      nospeech: new Set
    };
    let recognition = null;
    const notify = () => subscribers.forEach((fn) => fn(state));
    const emitEvent = (event, data) => eventListeners[event]?.forEach((fn) => fn(data));
    if (supported && SpeechRecognitionClass) {
      recognition = new SpeechRecognitionClass;
      recognition.continuous = options.continuous ?? false;
      recognition.interimResults = options.interimResults ?? true;
      recognition.lang = options.lang ?? "en-US";
      recognition.maxAlternatives = options.maxAlternatives ?? 1;
      recognition.onstart = () => {
        state = { ...state, isListening: true, error: null };
        notify();
        emitEvent("start");
      };
      recognition.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";
        let confidence = 0;
        for (let i = 0;i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          confidence = Math.max(confidence, result[0].confidence || 0);
          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        state = {
          ...state,
          finalTranscript: state.finalTranscript + finalTranscript,
          interimTranscript,
          transcript: state.finalTranscript + finalTranscript + interimTranscript,
          confidence
        };
        notify();
        emitEvent("result", { transcript: state.transcript, isFinal: finalTranscript.length > 0 });
      };
      recognition.onerror = (event) => {
        const errorMessages = {
          "no-speech": "No speech detected",
          "audio-capture": "No microphone found",
          "not-allowed": "Microphone permission denied",
          network: "Network error - requires internet",
          aborted: "Recognition aborted"
        };
        state = { ...state, error: errorMessages[event.error] || event.error, isListening: false };
        notify();
        emitEvent("error", { code: event.error, message: state.error });
        if (event.error === "no-speech") {
          emitEvent("nospeech");
        }
      };
      recognition.onend = () => {
        state = { ...state, isListening: false };
        notify();
        emitEvent("end", { transcript: state.transcript });
      };
      recognition.onspeechstart = () => {
        emitEvent("speechstart");
      };
      recognition.onspeechend = () => {
        emitEvent("speechend", { transcript: state.transcript });
      };
      recognition.onsoundend = () => {
        emitEvent("soundend");
      };
    }
    const start = () => {
      if (!supported || !recognition || state.isListening)
        return;
      state = { ...state, transcript: "", finalTranscript: "", interimTranscript: "", confidence: 0, error: null };
      try {
        recognition.start();
      } catch {
        state = { ...state, error: "Failed to start" };
        notify();
      }
    };
    const stop = () => {
      if (!recognition || !state.isListening)
        return;
      try {
        recognition.stop();
      } catch {}
    };
    const abort = () => {
      if (!recognition)
        return;
      try {
        recognition.abort();
      } catch {}
      state = { ...state, isListening: false };
      notify();
    };
    return {
      get isListening() {
        return state.isListening;
      },
      get transcript() {
        return state.transcript;
      },
      get isSupported() {
        return supported;
      },
      get error() {
        return state.error;
      },
      start,
      stop,
      abort,
      toggle: () => state.isListening ? stop() : start(),
      subscribe: (fn) => {
        subscribers.add(fn);
        fn(state);
        return () => subscribers.delete(fn);
      },
      on: (event, callback) => {
        eventListeners[event]?.add(callback);
        return () => eventListeners[event]?.delete(callback);
      }
    };
  }
  function isSpeechSynthesisSupported() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }
  function useSpeechSynthesis(defaultOptions = {}) {
    const supported = isSpeechSynthesisSupported();
    let state = {
      isSpeaking: false,
      isPaused: false,
      isSupported: supported,
      voices: []
    };
    const subscribers = new Set;
    const notify = () => subscribers.forEach((fn) => fn(state));
    const loadVoices = () => {
      if (!supported)
        return;
      state = { ...state, voices: window.speechSynthesis.getVoices() };
      notify();
    };
    if (supported) {
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
    const findVoice = (v) => {
      if (v === undefined)
        return null;
      if (typeof v === "number")
        return state.voices[v] || null;
      return state.voices.find((voice) => voice.name.toLowerCase().includes(v.toLowerCase())) || null;
    };
    const speak = (text, options = {}) => {
      if (!supported || !text.trim())
        return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const opts = { ...defaultOptions, ...options };
      utterance.rate = opts.rate ?? 1;
      utterance.pitch = opts.pitch ?? 1;
      utterance.volume = opts.volume ?? 1;
      if (opts.lang)
        utterance.lang = opts.lang;
      const voice = findVoice(opts.voice);
      if (voice)
        utterance.voice = voice;
      utterance.onstart = () => {
        state = { ...state, isSpeaking: true, isPaused: false };
        notify();
      };
      utterance.onend = () => {
        state = { ...state, isSpeaking: false, isPaused: false };
        notify();
      };
      utterance.onpause = () => {
        state = { ...state, isPaused: true };
        notify();
      };
      utterance.onresume = () => {
        state = { ...state, isPaused: false };
        notify();
      };
      window.speechSynthesis.speak(utterance);
    };
    const stop = () => {
      if (supported) {
        window.speechSynthesis.cancel();
        state = { ...state, isSpeaking: false, isPaused: false };
        notify();
      }
    };
    const pause = () => {
      if (supported && state.isSpeaking)
        window.speechSynthesis.pause();
    };
    const resume = () => {
      if (supported && state.isPaused)
        window.speechSynthesis.resume();
    };
    return {
      get isSpeaking() {
        return state.isSpeaking;
      },
      get isPaused() {
        return state.isPaused;
      },
      get isSupported() {
        return supported;
      },
      get voices() {
        return state.voices;
      },
      speak,
      stop,
      pause,
      resume,
      toggle: () => state.isPaused ? resume() : state.isSpeaking ? pause() : null,
      subscribe: (fn) => {
        subscribers.add(fn);
        fn(state);
        return () => subscribers.delete(fn);
      }
    };
  }
  function speak(text, options) {
    useSpeechSynthesis(options).speak(text);
  }
  function stopSpeaking() {
    if (isSpeechSynthesisSupported())
      window.speechSynthesis.cancel();
  }
  function getVoices() {
    if (!isSpeechSynthesisSupported())
      return [];
    return window.speechSynthesis.getVoices();
  }
  // lib/composables/use-audio-cues.ts
  var audioContext = null;
  function getAudioContext() {
    if (typeof window === "undefined")
      return null;
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass;
      }
    }
    return audioContext;
  }
  function playTone(frequency, duration, type = "sine", volume = 0.3) {
    try {
      const ctx = getAudioContext();
      if (!ctx)
        return;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.log("[useAudioCues] Could not play tone:", e);
    }
  }
  var defaultSounds = {
    listening: () => playTone(880, 0.12, "sine", 0.25),
    processing: () => playTone(440, 0.2, "sine", 0.15),
    done: () => {
      playTone(660, 0.15, "sine", 0.2);
      setTimeout(() => playTone(880, 0.25, "sine", 0.25), 150);
    },
    error: () => {
      playTone(440, 0.15, "sine", 0.2);
      setTimeout(() => playTone(280, 0.25, "sine", 0.2), 120);
    },
    wake: () => {
      playTone(520, 0.1, "sine", 0.2);
      setTimeout(() => playTone(660, 0.1, "sine", 0.2), 80);
      setTimeout(() => playTone(880, 0.15, "sine", 0.25), 160);
    }
  };
  function useAudioCues(options = {}) {
    const isSupported = typeof window !== "undefined" && (!!window.AudioContext || !!window.webkitAudioContext);
    return {
      isSupported,
      play: (name) => defaultSounds[name]?.(),
      playTone,
      listening: defaultSounds.listening,
      processing: defaultSounds.processing,
      done: defaultSounds.done,
      error: defaultSounds.error,
      wake: defaultSounds.wake
    };
  }
  function playAudioCue(name) {
    defaultSounds[name]?.();
  }
  // lib/composables/use-voice-commands.ts
  var punctuationMap = [
    { pattern: /\bperiod\b/gi, replacement: "." },
    { pattern: /\bfull stop\b/gi, replacement: "." },
    { pattern: /\bcomma\b/gi, replacement: "," },
    { pattern: /\bquestion mark\b/gi, replacement: "?" },
    { pattern: /\bexclamation mark\b/gi, replacement: "!" },
    { pattern: /\bexclamation point\b/gi, replacement: "!" },
    { pattern: /\bcolon\b/gi, replacement: ":" },
    { pattern: /\bsemicolon\b/gi, replacement: ";" },
    { pattern: /\bsemi colon\b/gi, replacement: ";" },
    { pattern: /\bquote\b/gi, replacement: '"' },
    { pattern: /\bend quote\b/gi, replacement: '"' },
    { pattern: /\bopen quote\b/gi, replacement: '"' },
    { pattern: /\bclose quote\b/gi, replacement: '"' },
    { pattern: /\bsingle quote\b/gi, replacement: "'" },
    { pattern: /\bapostrophe\b/gi, replacement: "'" },
    { pattern: /\bopen paren\b/gi, replacement: "(" },
    { pattern: /\bclose paren\b/gi, replacement: ")" },
    { pattern: /\bopen parenthesis\b/gi, replacement: "(" },
    { pattern: /\bclose parenthesis\b/gi, replacement: ")" },
    { pattern: /\bleft paren\b/gi, replacement: "(" },
    { pattern: /\bright paren\b/gi, replacement: ")" },
    { pattern: /\bopen bracket\b/gi, replacement: "[" },
    { pattern: /\bclose bracket\b/gi, replacement: "]" },
    { pattern: /\bleft bracket\b/gi, replacement: "[" },
    { pattern: /\bright bracket\b/gi, replacement: "]" },
    { pattern: /\bopen brace\b/gi, replacement: "{" },
    { pattern: /\bclose brace\b/gi, replacement: "}" },
    { pattern: /\bleft brace\b/gi, replacement: "{" },
    { pattern: /\bright brace\b/gi, replacement: "}" },
    { pattern: /\bopen curly\b/gi, replacement: "{" },
    { pattern: /\bclose curly\b/gi, replacement: "}" },
    { pattern: /\bhyphen\b/gi, replacement: "-" },
    { pattern: /\bdash\b/gi, replacement: "-" },
    { pattern: /\bunderscore\b/gi, replacement: "_" },
    { pattern: /\bslash\b/gi, replacement: "/" },
    { pattern: /\bforward slash\b/gi, replacement: "/" },
    { pattern: /\bbackslash\b/gi, replacement: "\\" },
    { pattern: /\bback slash\b/gi, replacement: "\\" },
    { pattern: /\bpipe\b/gi, replacement: "|" },
    { pattern: /\bampersand\b/gi, replacement: "&" },
    { pattern: /\bat sign\b/gi, replacement: "@" },
    { pattern: /\bhash\b/gi, replacement: "#" },
    { pattern: /\bhashtag\b/gi, replacement: "#" },
    { pattern: /\bpound sign\b/gi, replacement: "#" },
    { pattern: /\basterisk\b/gi, replacement: "*" },
    { pattern: /\bstar\b/gi, replacement: "*" },
    { pattern: /\bpercent\b/gi, replacement: "%" },
    { pattern: /\bpercent sign\b/gi, replacement: "%" },
    { pattern: /\bcaret\b/gi, replacement: "^" },
    { pattern: /\btilde\b/gi, replacement: "~" },
    { pattern: /\bbacktick\b/gi, replacement: "`" },
    { pattern: /\bgrave\b/gi, replacement: "`" },
    { pattern: /\bellipsis\b/gi, replacement: "..." },
    { pattern: /\bdot dot dot\b/gi, replacement: "..." },
    { pattern: /\bequals\b/gi, replacement: "=" },
    { pattern: /\bequal sign\b/gi, replacement: "=" },
    { pattern: /\bless than\b/gi, replacement: "<" },
    { pattern: /\bgreater than\b/gi, replacement: ">" },
    { pattern: /\bnew line\b/gi, replacement: `
` },
    { pattern: /\bnewline\b/gi, replacement: `
` }
  ];
  function convertSpokenPunctuation(text) {
    let result = text;
    for (const { pattern, replacement } of punctuationMap) {
      result = result.replace(pattern, replacement);
    }
    result = result.replace(/\s+([.,!?;:])/g, "$1");
    result = result.replace(/([(\[{])\s+/g, "$1");
    result = result.replace(/\s+([)\]}])/g, "$1");
    return result;
  }
  function detectVoiceCommand(transcript) {
    const trimmed = transcript.trim().toLowerCase();
    if (trimmed.endsWith(" reset") || trimmed === "reset") {
      return { type: "reset", transcript: "" };
    }
    if (trimmed.endsWith(" oops") || trimmed === "oops") {
      let text = transcript.replace(/\s*oops\s*$/i, "");
      text = text.replace(/[ \t]*[^ \t\n]+[ \t]*$/, "");
      return { type: "oops", transcript: convertSpokenPunctuation(text) };
    }
    if (/(^|\s)(go|send|submit)$/i.test(trimmed)) {
      const text = transcript.replace(/\s*(go|send|submit)\s*$/i, "").trim();
      return { type: "send", transcript: convertSpokenPunctuation(text) };
    }
    if (trimmed === "stop" || trimmed === "pause" || trimmed.endsWith(" stop") || trimmed.endsWith(" pause")) {
      return { type: "stop", transcript: "" };
    }
    if (trimmed === "cancel" || trimmed.endsWith(" cancel")) {
      return { type: "cancel", transcript: "" };
    }
    if (trimmed === "repeat" || trimmed === "say again" || trimmed === "repeat that" || trimmed.endsWith(" repeat") || trimmed.endsWith(" say again")) {
      return { type: "repeat", transcript: "" };
    }
    if (trimmed === "quiet" || trimmed === "shut up" || trimmed === "be quiet" || trimmed === "silence" || trimmed === "stop talking" || trimmed.endsWith(" quiet") || trimmed.endsWith(" shut up")) {
      return { type: "quiet", transcript: "" };
    }
    if (trimmed === "clear chat" || trimmed === "new chat" || trimmed.endsWith(" clear chat") || trimmed.endsWith(" new chat")) {
      return { type: "clear_chat", transcript: "" };
    }
    return { type: "none", transcript: convertSpokenPunctuation(transcript) };
  }
  function useVoiceCommands() {
    return {
      detect: detectVoiceCommand,
      convertPunctuation: convertSpokenPunctuation
    };
  }
  // lib/composables/use-audio-recorder.ts
  function checkSupport() {
    if (typeof window === "undefined") {
      return { mediaRecorder: false, audioContext: false, speechRecognition: false };
    }
    return {
      mediaRecorder: !!window.MediaRecorder,
      audioContext: !!(window.AudioContext || window.webkitAudioContext),
      speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    };
  }
  function useAudioRecorder(options = {}) {
    const {
      mimeType = "audio/webm;codecs=opus",
      sampleRate = 44100,
      onVolumeChange,
      onDurationChange,
      onRecordingStop,
      onTranscript,
      lang = "en-US"
    } = options;
    const support = checkSupport();
    const isSupported = support.mediaRecorder && support.audioContext;
    const subscribers = new Set;
    let state = {
      isRecording: false,
      isPaused: false,
      duration: 0,
      volumeLevel: 0,
      audioBlob: null,
      audioUrl: null,
      transcript: null,
      isTranscribing: false,
      error: null
    };
    let mediaRecorder = null;
    let audioContext2 = null;
    let analyser = null;
    let mediaStream = null;
    let audioChunks = [];
    let timerInterval = null;
    let startTime = 0;
    let volumeInterval = null;
    let dataArray = null;
    const notify = () => {
      for (const fn of subscribers) {
        try {
          fn({ ...state });
        } catch (e) {
          console.error("[useAudioRecorder]", e);
        }
      }
    };
    const setState = (updates) => {
      state = { ...state, ...updates };
      notify();
    };
    const startTimer = () => {
      startTime = Date.now();
      timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setState({ duration: elapsed });
        onDurationChange?.(elapsed);
      }, 100);
    };
    const stopTimer = () => {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    };
    const startVolumeMonitoring = () => {
      if (!analyser || !dataArray)
        return;
      volumeInterval = setInterval(() => {
        if (!analyser || !dataArray || state.isPaused)
          return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0;i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const level = Math.min(10, Math.round(rms / 128 * 10));
        if (level !== state.volumeLevel) {
          setState({ volumeLevel: level });
          onVolumeChange?.(level);
        }
      }, 50);
    };
    const stopVolumeMonitoring = () => {
      if (volumeInterval) {
        clearInterval(volumeInterval);
        volumeInterval = null;
      }
      setState({ volumeLevel: 0 });
    };
    const start = async () => {
      if (!isSupported) {
        setState({ error: "Audio recording not supported in this browser" });
        return false;
      }
      if (state.isRecording)
        return true;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContext2 = new AudioContextClass;
        analyser = audioContext2.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        const source = audioContext2.createMediaStreamSource(mediaStream);
        source.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        const supportedMimeType = MediaRecorder.isTypeSupported(mimeType) ? mimeType : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
        mediaRecorder = new MediaRecorder(mediaStream, { mimeType: supportedMimeType });
        audioChunks = [];
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };
        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunks, { type: supportedMimeType });
          const url = URL.createObjectURL(blob);
          setState({
            audioBlob: blob,
            audioUrl: url,
            isRecording: false
          });
          onRecordingStop?.(blob, state.duration);
        };
        mediaRecorder.onerror = (event) => {
          setState({ error: event.error?.message || "Recording error" });
        };
        mediaRecorder.start(100);
        setState({
          isRecording: true,
          isPaused: false,
          duration: 0,
          audioBlob: null,
          audioUrl: null,
          transcript: null,
          error: null
        });
        startTimer();
        startVolumeMonitoring();
        return true;
      } catch (err) {
        const message = err.name === "NotAllowedError" ? "Microphone access denied" : err.message || "Failed to start recording";
        setState({ error: message });
        return false;
      }
    };
    const stop = async () => {
      if (!state.isRecording || !mediaRecorder)
        return null;
      stopTimer();
      stopVolumeMonitoring();
      return new Promise((resolve) => {
        if (!mediaRecorder) {
          resolve(null);
          return;
        }
        mediaRecorder.onstop = () => {
          const mimeTypeUsed = mediaRecorder?.mimeType || mimeType;
          const blob = new Blob(audioChunks, { type: mimeTypeUsed });
          const url = URL.createObjectURL(blob);
          setState({
            audioBlob: blob,
            audioUrl: url,
            isRecording: false
          });
          onRecordingStop?.(blob, state.duration);
          if (mediaStream) {
            mediaStream.getTracks().forEach((track) => track.stop());
            mediaStream = null;
          }
          if (audioContext2) {
            audioContext2.close();
            audioContext2 = null;
          }
          resolve(blob);
        };
        mediaRecorder.stop();
      });
    };
    const pause = () => {
      if (!state.isRecording || state.isPaused || !mediaRecorder)
        return;
      mediaRecorder.pause();
      stopTimer();
      setState({ isPaused: true });
    };
    const resume = () => {
      if (!state.isRecording || !state.isPaused || !mediaRecorder)
        return;
      mediaRecorder.resume();
      startTimer();
      setState({ isPaused: false });
    };
    const reset = () => {
      if (state.isRecording) {
        stop();
      }
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }
      setState({
        isRecording: false,
        isPaused: false,
        duration: 0,
        volumeLevel: 0,
        audioBlob: null,
        audioUrl: null,
        transcript: null,
        isTranscribing: false,
        error: null
      });
    };
    const transcribe = async () => {
      if (!state.audioBlob || !support.speechRecognition) {
        return null;
      }
      setState({ isTranscribing: true });
      return new Promise((resolve) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition;
        recognition.lang = lang;
        recognition.continuous = true;
        recognition.interimResults = false;
        let transcript = "";
        recognition.onresult = (event) => {
          for (let i = event.resultIndex;i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              transcript += event.results[i][0].transcript + " ";
            }
          }
        };
        recognition.onend = () => {
          const finalTranscript = transcript.trim();
          setState({ transcript: finalTranscript, isTranscribing: false });
          onTranscript?.(finalTranscript);
          resolve(finalTranscript);
        };
        recognition.onerror = (event) => {
          setState({ isTranscribing: false, error: event.error });
          resolve(null);
        };
        setState({ isTranscribing: false });
        resolve(null);
      });
    };
    return {
      get: () => ({ ...state }),
      isSupported,
      start,
      stop,
      pause,
      resume,
      reset,
      transcribe,
      getVolumeLevel: () => state.volumeLevel,
      getDuration: () => state.duration,
      subscribe: (fn) => {
        subscribers.add(fn);
        fn({ ...state });
        return () => subscribers.delete(fn);
      }
    };
  }
  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  function getVolumeLevelLabel(level) {
    if (level === 0)
      return "Silent";
    if (level <= 2)
      return "Quiet";
    if (level <= 4)
      return "Low";
    if (level <= 6)
      return "Normal";
    if (level <= 8)
      return "Loud";
    return "Very Loud";
  }
  // lib/composables/use-audio-storage.ts
  var DEFAULT_DB_NAME = "voide-audio";
  var DEFAULT_STORE_NAME = "recordings";
  var DEFAULT_MAX_RECORDINGS = 100;
  function generateId() {
    return `audio_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  function useAudioStorage(options = {}) {
    const {
      dbName = DEFAULT_DB_NAME,
      storeName = DEFAULT_STORE_NAME,
      maxRecordings = DEFAULT_MAX_RECORDINGS
    } = options;
    const isSupported = typeof window !== "undefined" && !!window.indexedDB;
    let db = null;
    let dbPromise = null;
    const openDB = () => {
      if (db)
        return Promise.resolve(db);
      if (dbPromise)
        return dbPromise;
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onerror = () => {
          reject(new Error("Failed to open IndexedDB"));
        };
        request.onsuccess = () => {
          db = request.result;
          resolve(db);
        };
        request.onupgradeneeded = (event) => {
          const database = event.target.result;
          if (!database.objectStoreNames.contains(storeName)) {
            const store = database.createObjectStore(storeName, { keyPath: "id" });
            store.createIndex("createdAt", "createdAt", { unique: false });
            store.createIndex("chatId", "chatId", { unique: false });
          }
        };
      });
      return dbPromise;
    };
    const cleanupOldRecordings = async (database) => {
      return new Promise((resolve) => {
        const transaction = database.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const index = store.index("createdAt");
        const countRequest = store.count();
        countRequest.onsuccess = () => {
          const count = countRequest.result;
          if (count <= maxRecordings) {
            resolve();
            return;
          }
          const deleteCount = count - maxRecordings;
          let deleted = 0;
          const cursorRequest = index.openCursor();
          cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor && deleted < deleteCount) {
              cursor.delete();
              deleted++;
              cursor.continue();
            } else {
              resolve();
            }
          };
        };
      });
    };
    const save = async (blob, duration, transcript = null, chatId = null, messageId = null) => {
      if (!isSupported)
        throw new Error("IndexedDB not supported");
      const database = await openDB();
      await cleanupOldRecordings(database);
      const id = generateId();
      const record = {
        id,
        blob,
        duration,
        transcript,
        createdAt: Date.now(),
        chatId,
        messageId
      };
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.add(record);
        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(new Error("Failed to save audio"));
      });
    };
    const get = async (id) => {
      if (!isSupported)
        return null;
      const database = await openDB();
      return new Promise((resolve) => {
        const transaction = database.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    };
    const getAll = async () => {
      if (!isSupported)
        return [];
      const database = await openDB();
      return new Promise((resolve) => {
        const transaction = database.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const index = store.index("createdAt");
        const request = index.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });
    };
    const getByChatId = async (chatId) => {
      if (!isSupported)
        return [];
      const database = await openDB();
      return new Promise((resolve) => {
        const transaction = database.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const index = store.index("chatId");
        const request = index.getAll(chatId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });
    };
    const deleteRecord = async (id) => {
      if (!isSupported)
        return false;
      const database = await openDB();
      return new Promise((resolve) => {
        const transaction = database.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    };
    const deleteAll = async () => {
      if (!isSupported)
        return false;
      const database = await openDB();
      return new Promise((resolve) => {
        const transaction = database.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    };
    const getUrl = async (id) => {
      const record = await get(id);
      if (!record)
        return null;
      return URL.createObjectURL(record.blob);
    };
    const updateTranscript = async (id, transcript) => {
      if (!isSupported)
        return false;
      const database = await openDB();
      const record = await get(id);
      if (!record)
        return false;
      record.transcript = transcript;
      return new Promise((resolve) => {
        const transaction = database.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.put(record);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    };
    return {
      isSupported,
      save,
      get,
      getAll,
      getByChatId,
      delete: deleteRecord,
      deleteAll,
      getUrl,
      updateTranscript
    };
  }
  var audioStorageInstance = null;
  function getAudioStorage(options) {
    if (!audioStorageInstance) {
      audioStorageInstance = useAudioStorage(options);
    }
    return audioStorageInstance;
  }
  // lib/composables/use-head.ts
  var headConfig = {};
  var headSubscribers = new Set;
  function useHead(config) {
    headConfig = {
      ...headConfig,
      ...config,
      meta: [...headConfig.meta || [], ...config.meta || []],
      link: [...headConfig.link || [], ...config.link || []],
      script: [...headConfig.script || [], ...config.script || []],
      style: [...headConfig.style || [], ...config.style || []],
      htmlAttrs: { ...headConfig.htmlAttrs || {}, ...config.htmlAttrs || {} },
      bodyAttrs: { ...headConfig.bodyAttrs || {}, ...config.bodyAttrs || {} }
    };
    for (const cb of headSubscribers) {
      try {
        cb(headConfig);
      } catch {}
    }
    if (typeof window !== "undefined") {
      applyHead();
    }
  }
  function getHeadConfig() {
    return { ...headConfig };
  }
  function subscribeHead(callback) {
    headSubscribers.add(callback);
    return () => headSubscribers.delete(callback);
  }
  function resetHead() {
    headConfig = {};
    for (const cb of headSubscribers) {
      try {
        cb(headConfig);
      } catch {}
    }
  }
  function useSeoMeta(config) {
    const meta = [];
    if (config.description) {
      meta.push({ name: "description", content: config.description });
    }
    if (config.author) {
      meta.push({ name: "author", content: config.author });
    }
    if (config.keywords) {
      const keywords = Array.isArray(config.keywords) ? config.keywords.join(", ") : config.keywords;
      meta.push({ name: "keywords", content: keywords });
    }
    if (config.robots) {
      meta.push({ name: "robots", content: config.robots });
    }
    const ogTitle = config.ogTitle || config.title;
    const ogDescription = config.ogDescription || config.description;
    const ogImage = config.ogImage;
    const ogUrl = config.ogUrl || config.canonical;
    if (ogTitle) {
      meta.push({ property: "og:title", content: ogTitle });
    }
    if (ogDescription) {
      meta.push({ property: "og:description", content: ogDescription });
    }
    if (ogImage) {
      meta.push({ property: "og:image", content: ogImage });
    }
    if (ogUrl) {
      meta.push({ property: "og:url", content: ogUrl });
    }
    if (config.ogType) {
      meta.push({ property: "og:type", content: config.ogType });
    }
    if (config.ogSiteName) {
      meta.push({ property: "og:site_name", content: config.ogSiteName });
    }
    if (config.ogLocale) {
      meta.push({ property: "og:locale", content: config.ogLocale });
    }
    const twitterTitle = config.twitterTitle || ogTitle;
    const twitterDescription = config.twitterDescription || ogDescription;
    const twitterImage = config.twitterImage || ogImage;
    if (config.twitterCard) {
      meta.push({ name: "twitter:card", content: config.twitterCard });
    }
    if (config.twitterSite) {
      meta.push({ name: "twitter:site", content: config.twitterSite });
    }
    if (config.twitterCreator) {
      meta.push({ name: "twitter:creator", content: config.twitterCreator });
    }
    if (twitterTitle) {
      meta.push({ name: "twitter:title", content: twitterTitle });
    }
    if (twitterDescription) {
      meta.push({ name: "twitter:description", content: twitterDescription });
    }
    if (twitterImage) {
      meta.push({ name: "twitter:image", content: twitterImage });
    }
    if (config.articleAuthor) {
      meta.push({ property: "article:author", content: config.articleAuthor });
    }
    if (config.articlePublishedTime) {
      meta.push({ property: "article:published_time", content: config.articlePublishedTime });
    }
    if (config.articleModifiedTime) {
      meta.push({ property: "article:modified_time", content: config.articleModifiedTime });
    }
    if (config.articleSection) {
      meta.push({ property: "article:section", content: config.articleSection });
    }
    if (config.articleTags) {
      for (const tag of config.articleTags) {
        meta.push({ property: "article:tag", content: tag });
      }
    }
    const link = [];
    if (config.canonical) {
      link.push({ rel: "canonical", href: config.canonical });
    }
    useHead({
      title: config.title,
      meta,
      link
    });
  }
  function applyHead() {
    if (typeof document === "undefined")
      return;
    const config = headConfig;
    if (config.title) {
      let title = config.title;
      if (config.titleTemplate) {
        title = typeof config.titleTemplate === "function" ? config.titleTemplate(config.title) : config.titleTemplate.replace("%s", config.title);
      }
      document.title = title;
    }
    if (config.meta) {
      for (const meta of config.meta) {
        const selector = meta.name ? `meta[name="${meta.name}"]` : meta.property ? `meta[property="${meta.property}"]` : null;
        if (!selector)
          continue;
        let element = document.head.querySelector(selector);
        if (!element) {
          element = document.createElement("meta");
          if (meta.name)
            element.setAttribute("name", meta.name);
          if (meta.property)
            element.setAttribute("property", meta.property);
          document.head.appendChild(element);
        }
        element.setAttribute("content", meta.content);
      }
    }
    if (config.link) {
      for (const link of config.link) {
        const selector = `link[rel="${link.rel}"][href="${link.href}"]`;
        let element = document.head.querySelector(selector);
        if (!element) {
          element = document.createElement("link");
          element.setAttribute("rel", link.rel);
          element.setAttribute("href", link.href);
          if (link.type)
            element.setAttribute("type", link.type);
          if (link.as)
            element.setAttribute("as", link.as);
          if (link.crossorigin)
            element.setAttribute("crossorigin", link.crossorigin);
          document.head.appendChild(element);
        }
      }
    }
    if (config.script) {
      for (const script of config.script) {
        if (script.src) {
          const selector = `script[src="${script.src}"]`;
          if (document.querySelector(selector))
            continue;
          const element = document.createElement("script");
          element.src = script.src;
          if (script.async)
            element.async = true;
          if (script.defer)
            element.defer = true;
          if (script.type)
            element.type = script.type;
          document.head.appendChild(element);
        } else if (script.content) {
          const element = document.createElement("script");
          element.textContent = script.content;
          if (script.type)
            element.type = script.type;
          document.head.appendChild(element);
        }
      }
    }
    if (config.style) {
      for (const style of config.style) {
        const element = document.createElement("style");
        element.textContent = style.content;
        if (style.type)
          element.type = style.type;
        document.head.appendChild(element);
      }
    }
    if (config.htmlAttrs) {
      for (const [key, value] of Object.entries(config.htmlAttrs)) {
        document.documentElement.setAttribute(key, value);
      }
    }
    if (config.bodyAttrs) {
      for (const [key, value] of Object.entries(config.bodyAttrs)) {
        document.body.setAttribute(key, value);
      }
    }
  }
  function setTitle(title, template) {
    useHead({ title, titleTemplate: template });
  }
  function setMeta(nameOrProperty, content) {
    const isProperty = nameOrProperty.startsWith("og:") || nameOrProperty.startsWith("article:") || nameOrProperty.startsWith("fb:");
    const meta = isProperty ? { property: nameOrProperty, content } : { name: nameOrProperty, content };
    useHead({ meta: [meta] });
  }
  // lib/composables/use-page-meta.ts
  var currentPageMeta = {};
  var pageMetaSubscribers = new Set;
  function definePageMeta(meta) {
    currentPageMeta = { ...meta };
    if (meta.title || meta.description) {
      useSeoMeta({
        title: meta.title,
        description: meta.description
      });
    }
    for (const cb of pageMetaSubscribers) {
      try {
        cb(currentPageMeta);
      } catch {}
    }
  }
  function getPageMeta() {
    return { ...currentPageMeta };
  }
  function subscribePageMeta(callback) {
    pageMetaSubscribers.add(callback);
    return () => pageMetaSubscribers.delete(callback);
  }
  function resetPageMeta() {
    currentPageMeta = {};
    for (const cb of pageMetaSubscribers) {
      try {
        cb(currentPageMeta);
      } catch {}
    }
  }
  var middlewareRegistry = new Map;
  function registerMiddleware(name, fn) {
    middlewareRegistry.set(name, fn);
  }
  function getMiddleware(name) {
    return middlewareRegistry.get(name);
  }
  async function executeMiddleware(context) {
    const meta = currentPageMeta;
    if (!meta.middleware)
      return {};
    const middlewareNames = Array.isArray(meta.middleware) ? meta.middleware : [meta.middleware];
    for (const name of middlewareNames) {
      const fn = middlewareRegistry.get(name);
      if (!fn) {
        console.warn(`Middleware "${name}" not found`);
        continue;
      }
      try {
        const result = await fn(context);
        if (result === false) {
          return { blocked: true };
        }
        if (typeof result === "string") {
          return { redirect: result };
        }
        if (result && typeof result === "object" && "redirect" in result) {
          return { redirect: result.redirect };
        }
      } catch (err) {
        console.error(`Middleware "${name}" error:`, err);
        return { blocked: true };
      }
    }
    return {};
  }
  var currentLayout = "default";
  var layoutSubscribers = new Set;
  function getCurrentLayout() {
    return currentPageMeta.layout ?? currentLayout;
  }
  function setDefaultLayout(layout) {
    currentLayout = layout;
  }
  function subscribeLayout(callback) {
    layoutSubscribers.add(callback);
    return () => layoutSubscribers.delete(callback);
  }
  function requiresAuth() {
    const meta = currentPageMeta;
    if (meta.auth === undefined)
      return false;
    if (meta.auth === true)
      return true;
    if (meta.auth === "guest")
      return "guest";
    return meta.auth;
  }
  function isKeepAliveEnabled() {
    const meta = currentPageMeta;
    if (!meta.keepAlive)
      return false;
    if (meta.keepAlive === true)
      return true;
    return meta.keepAlive;
  }
  function getPageTransition() {
    const meta = currentPageMeta;
    if (!meta.pageTransition)
      return null;
    if (meta.pageTransition === true) {
      return { name: "page", mode: "default", duration: 300 };
    }
    if (typeof meta.pageTransition === "string") {
      return { name: meta.pageTransition, mode: "default", duration: 300 };
    }
    return {
      name: meta.pageTransition.name || "page",
      mode: meta.pageTransition.mode || "default",
      duration: meta.pageTransition.duration || 300
    };
  }
  // lib/composables/use-component-api.ts
  function defineProps(definitions, rawProps) {
    const props = rawProps || (typeof window !== "undefined" ? window.__STX_PROPS__ : {}) || {};
    const result = {};
    if (!definitions) {
      return props;
    }
    for (const [key, definition] of Object.entries(definitions)) {
      const def = normalizeDefinition(definition);
      const value = props[key];
      if (def.required && value === undefined) {
        console.warn(`[Props] Missing required prop: "${key}"`);
      }
      if (value === undefined && def.default !== undefined) {
        result[key] = typeof def.default === "function" && !isConstructor(def.default) ? def.default() : def.default;
      } else {
        result[key] = value;
      }
      if (def.validator && result[key] !== undefined) {
        if (!def.validator(result[key])) {
          console.warn(`[Props] Validation failed for prop: "${key}"`);
        }
      }
    }
    for (const key of Object.keys(props)) {
      if (!(key in result)) {
        result[key] = props[key];
      }
    }
    return result;
  }
  function definePropsWithValidation(definitions, options = {}, rawProps) {
    const { componentName = "Component", throwOnError = false, logWarnings = true } = options;
    const props = rawProps || (typeof window !== "undefined" ? window.__STX_PROPS__ : {}) || {};
    const result = {};
    const errors = [];
    const warnings = [];
    for (const [key, definition] of Object.entries(definitions)) {
      const def = normalizeDefinition(definition);
      const value = props[key];
      if (def.required && value === undefined) {
        const msg = `Missing required prop: "${key}"`;
        errors.push({ prop: key, message: msg });
        if (logWarnings)
          console.warn(`[${componentName}] ${msg}`);
        if (throwOnError)
          throw new Error(`[${componentName}] ${msg}`);
      }
      if (def.type && value !== undefined) {
        const types = Array.isArray(def.type) ? def.type : [def.type];
        const valid = types.some((t) => checkType(value, t));
        if (!valid) {
          const typeNames = types.map((t) => t.name).join(" | ");
          const msg = `Invalid type for prop "${key}". Expected ${typeNames}, got ${typeof value}`;
          warnings.push({ prop: key, message: msg });
          if (logWarnings)
            console.warn(`[${componentName}] ${msg}`);
        }
      }
      if (value === undefined && def.default !== undefined) {
        result[key] = typeof def.default === "function" && !isConstructor(def.default) ? def.default() : def.default;
      } else {
        result[key] = value;
      }
      if (def.validator && result[key] !== undefined) {
        if (!def.validator(result[key])) {
          const msg = `Validation failed for prop: "${key}"`;
          errors.push({ prop: key, message: msg });
          if (logWarnings)
            console.warn(`[${componentName}] ${msg}`);
          if (throwOnError)
            throw new Error(`[${componentName}] ${msg}`);
        }
      }
    }
    return {
      props: result,
      validation: {
        valid: errors.length === 0,
        errors,
        warnings
      }
    };
  }
  function withDefaults(props, defaults) {
    const result = { ...props };
    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (result[key] === undefined) {
        result[key] = typeof defaultValue === "function" && !isConstructor(defaultValue) ? defaultValue() : defaultValue;
      }
    }
    return result;
  }
  function required(type) {
    return { type, required: true };
  }
  function optional(defaultValue, type) {
    return { type, default: defaultValue, required: false };
  }
  function validated(validator, options = {}) {
    return { ...options, validator };
  }
  function oneOf(values) {
    return {
      validator: (v) => values.includes(v)
    };
  }
  function arrayOf(itemType, options = {}) {
    return {
      ...options,
      type: Array,
      validator: (arr) => {
        if (!Array.isArray(arr))
          return false;
        return arr.every((item) => checkType(item, itemType));
      }
    };
  }
  function defineEmits() {
    const emit = (event, payload) => {
      if (typeof window === "undefined")
        return;
      const customEvent = new CustomEvent(String(event), {
        detail: payload,
        bubbles: true,
        cancelable: true
      });
      const currentElement = window.__STX_CURRENT_ELEMENT__;
      if (currentElement) {
        currentElement.dispatchEvent(customEvent);
      } else {
        document.dispatchEvent(customEvent);
      }
    };
    return emit;
  }
  function defineExpose(exposed) {
    if (typeof window === "undefined")
      return exposed;
    const currentId = window.__STX_CURRENT_ID__;
    if (currentId) {
      const exposedMap = window.__STX_EXPOSED__ ||= {};
      exposedMap[currentId] = exposed;
    }
    return exposed;
  }
  function getExposed(componentId) {
    if (typeof window === "undefined")
      return;
    const exposedMap = window.__STX_EXPOSED__;
    return exposedMap?.[componentId];
  }
  function normalizeDefinition(def) {
    if (!def)
      return {};
    if (typeof def === "function")
      return { type: def };
    return def;
  }
  function isConstructor(fn) {
    if (typeof fn !== "function")
      return false;
    try {
      return fn === String || fn === Number || fn === Boolean || fn === Array || fn === Object || fn.prototype?.constructor === fn;
    } catch {
      return false;
    }
  }
  function checkType(value, type) {
    if (type === String)
      return typeof value === "string";
    if (type === Number)
      return typeof value === "number";
    if (type === Boolean)
      return typeof value === "boolean";
    if (type === Array)
      return Array.isArray(value);
    if (type === Object)
      return typeof value === "object" && value !== null && !Array.isArray(value);
    if (type === Function)
      return typeof value === "function";
    if (type === Date)
      return value instanceof Date;
    if (type === RegExp)
      return value instanceof RegExp;
    if (type === Promise)
      return value instanceof Promise;
    return value instanceof type;
  }
  function setComponentContext(id, element, props) {
    if (typeof window === "undefined")
      return () => {};
    const win = window;
    win.__STX_CURRENT_ID__ = id;
    win.__STX_CURRENT_ELEMENT__ = element;
    win.__STX_PROPS__ = props;
    return () => {
      delete win.__STX_CURRENT_ID__;
      delete win.__STX_CURRENT_ELEMENT__;
      delete win.__STX_PROPS__;
    };
  }
  function getCurrentComponentId() {
    if (typeof window === "undefined")
      return;
    return window.__STX_CURRENT_ID__;
  }
  function getCurrentElement() {
    if (typeof window === "undefined")
      return;
    return window.__STX_CURRENT_ELEMENT__;
  }
  // lib/stores/index.ts
  if (typeof window !== "undefined") {
    registerStoresClient({
      appStore,
      chatStore,
      settingsStore,
      uiStore
    });
  }

  // Setup stx runtime for @stores imports
  var stx = window.stx || {};

  // Store registry is populated by registerStoresClient
  stx.stores = window.__STX_STORES__ || {};

  // useStore - get a store by name
  stx.useStore = function(name) {
    return stx.stores[name] || window.__STX_STORES__?.[name];
  };

  // waitForStore - wait for a store to be available
  stx.waitForStore = function(name, timeout) {
    timeout = timeout || 5000;
    var start = Date.now();
    return new Promise(function(resolve, reject) {
      function check() {
        var store = stx.useStore(name);
        if (store) {
          resolve(store);
        } else if (Date.now() - start > timeout) {
          reject(new Error('Timeout waiting for store: ' + name));
        } else {
          requestAnimationFrame(check);
        }
      }
      check();
    });
  };

  window.stx = stx;

  // Return exports for backwards compatibility
  return exports_stores;
})();
