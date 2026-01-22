/**
 * Voide Core - Minimal shared functionality
 *
 * This is a minimal core that handles:
 * - Store exports to window.voide
 * - URL routing and chat loading
 * - Native tray features (when running in native app)
 * - Global keyboard shortcuts
 * - Browser history navigation
 *
 * Most functionality has been moved to individual SFC components:
 * - voide-input-bar.stx: Input, recording, commands, streaming, git actions
 * - voide-terminal.stx: Message rendering, prompt handling
 * - voide-header.stx: Repo handling, driver selection
 * - voide-modals.stx: GitHub & Settings modals
 */
(() => {
  const API_BASE_URL = 'http://localhost:3008/voide';

  function init() {
    // Wait for stores to be registered
    if (!window.__STX_STORES__) {
      setTimeout(init, 10);
      return;
    }

    const { appStore, chatStore, settingsStore, uiStore } = window.__STX_STORES__;

    console.log('[VoideCore] Initializing...');

    // =========================================================================
    // Native Tray Features
    // =========================================================================

    function initNativeFeatures() {
      if (!window.craft) return;

      appStore.setNativeApp(true);
      try {
        window.craft.tray.setTitle('Voide');
        window.craft.tray.setTooltip('Voide - Voice AI Code Assistant');
        window.craft.tray.setMenu([
          { id: 'show', label: 'Show Voide', action: 'show' },
          { id: 'hide', label: 'Hide Window', action: 'hide' },
          { type: 'separator' },
          { id: 'recording', label: 'Start Recording', action: 'startRecording' },
          { type: 'separator' },
          { id: 'quit', label: 'Quit Voide', action: 'quit', shortcut: 'Cmd+Q' }
        ]);
        window.craft.tray.onClickToggleWindow();
        chatStore.addMessage('system', 'Running as native app - system tray enabled', 'System');
      } catch (e) {
        console.log('[VoideCore] Native features not fully available:', e);
      }
    }

    function updateTrayStatus(status) {
      if (!appStore.isNativeApp || !window.craft) return;
      const icons = { ready: '🤖', recording: '🔴', processing: '⏳', success: '✅', error: '❌' };
      try {
        window.craft.tray.setTitle((icons[status] || '🤖') + ' Voide');
      } catch (e) {}
    }

    function sendNotification(title, body) {
      if (!appStore.isNativeApp || !window.craft) return;
      try {
        window.craft.app.notify({ title: title, body: body });
      } catch (e) {}
    }

    // =========================================================================
    // URL Routing & Chat Loading
    // =========================================================================

    function loadChat(chatId) {
      const loaded = chatStore.loadChat(chatId);
      if (loaded) {
        // Access loaded chat state
        const repoPath = chatStore.$state.repoPath;
        const driver = chatStore.$state.driver;
        if (repoPath) {
          appStore.setRepoPath(repoPath);
        }
        if (driver) {
          appStore.setDriver(driver);
        }
        return true;
      }
      return false;
    }

    function validateRepoPath(path) {
      if (!path) return Promise.resolve(false);

      // Try to validate via backend API
      return fetch(API_BASE_URL + '/repo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: path })
      })
      .then(res => res.json())
      .then(data => data.valid === true)
      .catch(() => {
        // Backend not available - can't validate
        // Return null to indicate unknown status
        return null;
      });
    }

    function clearInvalidRepoPath(path, showMessage) {
      console.log('[VoideCore] Clearing invalid repo path:', path);

      // Clear from all stores
      appStore.setRepoPath('');
      settingsStore.setLastRepoPath('');

      // Clear the input field
      const repoInput = document.getElementById('repoInput');
      if (repoInput) repoInput.value = '';

      // Also clear directly from localStorage to ensure it's gone
      try {
        const appState = localStorage.getItem('voide:app');
        if (appState) {
          const parsed = JSON.parse(appState);
          if (parsed.repoPath === path) {
            parsed.repoPath = '';
            localStorage.setItem('voide:app', JSON.stringify(parsed));
          }
        }
        const settingsState = localStorage.getItem('voide:settings');
        if (settingsState) {
          const parsed = JSON.parse(settingsState);
          if (parsed.lastRepoPath === path) {
            parsed.lastRepoPath = '';
            localStorage.setItem('voide:settings', JSON.stringify(parsed));
          }
        }
      } catch (e) {
        console.log('[VoideCore] Error clearing localStorage:', e);
      }

      // Only show error message once per path (track in sessionStorage)
      if (showMessage) {
        const shownKey = 'voide_invalid_path_shown_' + path;
        if (!sessionStorage.getItem(shownKey)) {
          sessionStorage.setItem(shownKey, 'true');
          chatStore.addMessage('error', 'The previously saved path no longer exists:\n' + path + '\n\nPlease enter a valid repository path.', 'Error');
        }
      }
    }

    function initUrlRouting() {
      const chatIdFromUrl = chatStore.getChatIdFromUrl();
      const routeParams = window.__STX_ROUTE_PARAMS__ || {};
      const chatId = routeParams.id || chatIdFromUrl;

      if (chatId) {
        if (!loadChat(chatId)) {
          history.replaceState({}, '', '/');
        }
      } else {
        // Restore repo path from app store (persisted in localStorage)
        const pathToValidate = appStore.repoPath || settingsStore.lastRepoPath;

        if (pathToValidate) {
          // Validate the stored path exists
          validateRepoPath(pathToValidate).then(valid => {
            if (valid === false) {
              // Path confirmed invalid - clear and show message once
              clearInvalidRepoPath(pathToValidate, true);
            } else if (valid === true) {
              // Path confirmed valid
              if (!appStore.repoPath) {
                appStore.setRepoPath(pathToValidate);
              }
            }
            // If valid === null, backend unavailable - keep path but can't validate
          });
        }
      }

      // Handle browser back/forward navigation
      window.addEventListener('popstate', (e) => {
        const chatId = chatStore.getChatIdFromUrl();
        if (chatId) {
          loadChat(chatId);
        } else {
          chatStore.newChat();
        }
      });
    }

    // =========================================================================
    // Global Keyboard Shortcuts
    // =========================================================================

    function initKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        // Space to toggle recording (when not in input field)
        if (e.code === 'Space' && !e.repeat) {
          const active = document.activeElement;
          const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
          if (!isInput && window.voide && window.voide.toggleRecording) {
            e.preventDefault();
            window.voide.toggleRecording();
          }
        }
      });
    }

    // =========================================================================
    // Initialize
    // =========================================================================

    initNativeFeatures();
    initUrlRouting();
    initKeyboardShortcuts();

    // =========================================================================
    // Expose Stores and Core Methods to window.voide
    // =========================================================================

    const stores = window.VoideStores || {};

    window.voide = window.voide || {};
    Object.assign(window.voide, {
      // Stores (using new pattern)
      stores: window.__STX_STORES__,
      appStore: appStore,
      chatStore: chatStore,
      settingsStore: settingsStore,
      uiStore: uiStore,

      // Composables (from bundled stores)
      useStorage: stores.useStorage,
      useLocalStorage: stores.useLocalStorage,
      useSessionStorage: stores.useSessionStorage,
      useCookie: stores.useCookie,
      useClipboard: stores.useClipboard,
      useMediaQuery: stores.useMediaQuery,
      usePreferredDark: stores.usePreferredDark,
      useNetwork: stores.useNetwork,
      useOnline: stores.useOnline,
      useWindowSize: stores.useWindowSize,
      useScroll: stores.useScroll,
      useVisibility: stores.useVisibility,
      useTitle: stores.useTitle,
      useFavicon: stores.useFavicon,
      useIsMobile: stores.useIsMobile,
      useIsDesktop: stores.useIsDesktop,
      copyToClipboard: stores.copyToClipboard,

      // State getters
      get state() { return appStore.$state; },
      get messages() { return chatStore.messages; },
      get charCount() { return chatStore.charCount; },

      // Core methods
      loadChat: loadChat,
      newChat: () => chatStore.newChat(),
      getAllChats: () => chatStore.getAllChats(),
      deleteChat: (id) => chatStore.deleteChat(id),
      updateTrayStatus: updateTrayStatus,
      sendNotification: sendNotification
    });

    console.log('[VoideCore] Initialized');
    console.log('[VoideCore] window.voide methods:', Object.keys(window.voide).join(', '));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
