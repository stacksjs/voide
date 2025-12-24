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
    uiStore: () => uiStore,
    uiActions: () => uiActions,
    settingsStore: () => settingsStore,
    settingsActions: () => settingsActions,
    createStore: () => createStore,
    computed: () => computed,
    chatStore: () => chatStore,
    chatActions: () => chatActions,
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
  return exports_stores;
})();
