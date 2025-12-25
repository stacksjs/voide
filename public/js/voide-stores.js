/**
 * Voide Stores - Browser Bundle
 * Auto-generated, do not edit
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
    useWindowSize: () => useWindowSize,
    useVisibility: () => useVisibility,
    useTitle: () => useTitle,
    useStorage: () => useStorage,
    useShare: () => useShare,
    useSessionStorage: () => useSessionStorage,
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
    useGeolocation: () => useGeolocation,
    useFullscreen: () => useFullscreen,
    useFetch: () => useFetch,
    useFavicon: () => useFavicon,
    useElementVisibility: () => useElementVisibility,
    useElementSize: () => useElementSize,
    useCookie: () => useCookie,
    useClipboard: () => useClipboard,
    useBattery: () => useBattery,
    useAsyncData: () => useAsyncData,
    uiStore: () => uiStore,
    uiActions: () => uiActions,
    toggleFullscreen: () => toggleFullscreen,
    shareURL: () => shareURL,
    shareCurrentPage: () => shareCurrentPage,
    share: () => share,
    settingsStore: () => settingsStore,
    settingsActions: () => settingsActions,
    setCookie: () => setCookie,
    sendNotification: () => sendNotification,
    removeCookie: () => removeCookie,
    parseCookies: () => parseCookies,
    isPermissionGranted: () => isPermissionGranted,
    isInFullscreen: () => isInFullscreen,
    isCharging: () => isCharging,
    hasResizeObserver: () => hasResizeObserver,
    hasBattery: () => hasBattery,
    getStorageKeys: () => getStorageKeys,
    getCurrentPosition: () => getCurrentPosition,
    getCookie: () => getCookie,
    getBatteryLevel: () => getBatteryLevel,
    createStore: () => createStore,
    copyToClipboard: () => copyToClipboard,
    computed: () => computed,
    clearStorage: () => clearStorage,
    clearCookies: () => clearCookies,
    chatStore: () => chatStore,
    chatActions: () => chatActions,
    canNotify: () => canNotify,
    appStore: () => appStore,
    appActions: () => appActions
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
  var appStore = createStore({
    isRecording: false,
    isProcessing: false,
    transcript: "",
    repoPath: "",
    hasChanges: false,
    speechSupported: false,
    currentDriver: "claude-cli-local",
    isNativeApp: false,
    terminalTitle: "Voide - Ready"
  }, {
    name: "app",
    persist: {
      key: "voide:app",
      storage: "local"
    }
  });
  var appActions = {
    setRecording: (isRecording) => {
      appStore.update({ isRecording });
    },
    setProcessing: (isProcessing) => {
      appStore.update({ isProcessing });
    },
    setTranscript: (transcript) => {
      appStore.update({ transcript });
    },
    setRepoPath: (repoPath) => {
      appStore.update({ repoPath });
    },
    setHasChanges: (hasChanges) => {
      appStore.update({ hasChanges });
    },
    setTerminalTitle: (terminalTitle) => {
      appStore.update({ terminalTitle });
    },
    setDriver: (currentDriver) => {
      appStore.update({ currentDriver });
    },
    setNativeApp: (isNativeApp) => {
      appStore.update({ isNativeApp });
    },
    setSpeechSupported: (speechSupported) => {
      appStore.update({ speechSupported });
    }
  };
  // lib/stores/chat.ts
  var STORAGE_KEY_CHATS = "voide:chats";
  var STORAGE_KEY_CHAT_COUNTER = "voide:chat_counter";
  var chatStore = createStore({
    currentChatId: null,
    messages: [],
    inputText: "",
    charCount: 0
  }, {
    name: "chat"
  });
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
  var chatActions = {
    generateChatId: () => {
      const counter = parseInt(localStorage.getItem(STORAGE_KEY_CHAT_COUNTER) || "0", 10) + 1;
      localStorage.setItem(STORAGE_KEY_CHAT_COUNTER, counter.toString());
      return counter.toString();
    },
    getChatIdFromUrl: () => {
      const match = window.location.pathname.match(/^\/chat\/(\d+)$/);
      return match ? match[1] : null;
    },
    getAllChats,
    startNewChat: (repoPath = "", driver = "claude-cli-local") => {
      const chatId = chatActions.generateChatId();
      chatStore.update({
        currentChatId: chatId,
        messages: []
      });
      const chats = getAllChats();
      chats[chatId] = {
        id: chatId,
        messages: [],
        repoPath,
        driver,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      saveAllChats(chats);
      history.pushState({ chatId }, "", `/chat/${chatId}`);
      return chatId;
    },
    loadChat: (chatId) => {
      const chats = getAllChats();
      const chat = chats[chatId];
      if (chat) {
        chatStore.update({
          currentChatId: chatId,
          messages: chat.messages || []
        });
        return true;
      }
      return false;
    },
    saveCurrentChat: (repoPath, driver) => {
      const state = chatStore.get();
      if (!state.currentChatId)
        return;
      const chats = getAllChats();
      chats[state.currentChatId] = {
        id: state.currentChatId,
        messages: state.messages,
        repoPath,
        driver,
        createdAt: chats[state.currentChatId]?.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      saveAllChats(chats);
    },
    deleteChat: (chatId) => {
      const chats = getAllChats();
      delete chats[chatId];
      saveAllChats(chats);
    },
    addMessage: (type, content, header) => {
      const state = chatStore.get();
      const driverName = header || (type === "user" ? "You" : type === "assistant" ? "AI" : type === "system" ? "System" : "Error");
      const newMessage = {
        type,
        content,
        header: driverName,
        timestamp: Date.now()
      };
      chatStore.update({
        messages: [...state.messages, newMessage]
      });
      return newMessage;
    },
    updateLastMessage: (type, content) => {
      const state = chatStore.get();
      const messages = [...state.messages];
      if (messages.length > 0 && messages[messages.length - 1].type === type) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
          updated: Date.now()
        };
        chatStore.update({ messages });
      }
    },
    removeLastMessage: () => {
      const state = chatStore.get();
      if (state.messages.length > 0) {
        chatStore.update({
          messages: state.messages.slice(0, -1)
        });
      }
    },
    clearMessages: () => {
      chatStore.update({ messages: [] });
    },
    setInputText: (inputText) => {
      chatStore.update({
        inputText,
        charCount: inputText.length
      });
    },
    clearInput: () => {
      chatStore.update({
        inputText: "",
        charCount: 0
      });
    },
    newChat: () => {
      chatStore.update({
        currentChatId: null,
        messages: []
      });
      history.pushState({}, "", "/");
    }
  };
  // lib/stores/settings.ts
  var settingsStore = createStore({
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
  }, {
    name: "settings",
    persist: {
      key: "voide:settings",
      storage: "local"
    }
  });
  var settingsActions = {
    setApiKey: (provider, key) => {
      const state = settingsStore.get();
      settingsStore.update({
        apiKeys: {
          ...state.apiKeys,
          [provider]: key
        }
      });
    },
    setAllApiKeys: (keys) => {
      settingsStore.update({ apiKeys: keys });
    },
    setGithub: (github) => {
      const state = settingsStore.get();
      settingsStore.update({
        github: { ...state.github, ...github }
      });
    },
    connectGithub: (data) => {
      settingsStore.update({
        github: {
          connected: true,
          token: data.token,
          username: data.username,
          name: data.name || null,
          email: data.email || null,
          avatarUrl: data.avatarUrl || null
        }
      });
    },
    disconnectGithub: () => {
      settingsStore.update({
        github: {
          connected: false,
          token: null,
          username: null,
          name: null,
          email: null,
          avatarUrl: null
        }
      });
    },
    setLastRepoPath: (path) => {
      settingsStore.update({ lastRepoPath: path });
    }
  };
  // lib/stores/ui.ts
  var uiStore = createStore({
    modals: {
      github: false,
      settings: false
    },
    notifications: []
  }, {
    name: "ui"
  });
  var uiActions = {
    openModal: (modal) => {
      const state = uiStore.get();
      uiStore.update({
        modals: { ...state.modals, [modal]: true }
      });
    },
    closeModal: (modal) => {
      const state = uiStore.get();
      uiStore.update({
        modals: { ...state.modals, [modal]: false }
      });
    },
    closeAllModals: () => {
      uiStore.update({
        modals: {
          github: false,
          settings: false
        }
      });
    },
    toggleModal: (modal) => {
      const state = uiStore.get();
      uiStore.update({
        modals: { ...state.modals, [modal]: !state.modals[modal] }
      });
    },
    notify: (type, message, duration = 3000) => {
      const state = uiStore.get();
      const id = `notification-${Date.now()}`;
      uiStore.update({
        notifications: [...state.notifications, { id, type, message, duration }]
      });
      if (duration > 0) {
        setTimeout(() => {
          uiActions.dismissNotification(id);
        }, duration);
      }
      return id;
    },
    dismissNotification: (id) => {
      const state = uiStore.get();
      uiStore.update({
        notifications: state.notifications.filter((n) => n.id !== id)
      });
    },
    clearNotifications: () => {
      uiStore.update({ notifications: [] });
    }
  };
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
  return exports_stores;
})();
