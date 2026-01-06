/**
 * Voide Client Runtime
 * Main application logic for Voide - Voice AI Code Assistant
 */
(() => {
  'use strict';

  function initVoide() {
    const stores = window.VoideStores;
    if (!stores) {
      console.error('[Voide] CRITICAL: VoideStores not available! App will not function.');
      document.body.innerHTML = '<div style="padding:20px;color:red;">Error: Stores failed to load. Check console for details.</div>';
      return;
    }
    console.log('[Voide] Stores found, initializing app...');
    setupApp(stores);
  }

  // Wait for stores if not immediately available
  if (window.VoideStores) {
    initVoide();
  } else {
    console.log('[Voide] Waiting for stores to load...');
    let checkCount = 0;
    const checkInterval = setInterval(() => {
      checkCount++;
      if (window.VoideStores) {
        clearInterval(checkInterval);
        initVoide();
      } else if (checkCount > 50) {
        clearInterval(checkInterval);
        console.error('[Voide] Stores failed to load after 5 seconds');
        document.body.innerHTML = '<div style="padding:20px;color:red;">Error: Stores failed to load. Check console for details.</div>';
      }
    }, 100);
  }

  function setupApp(stores) {
    const appStore = stores.appStore;
    const appActions = stores.appActions;
    const chatStore = stores.chatStore;
    const chatActions = stores.chatActions;
    const settingsStore = stores.settingsStore;
    const settingsActions = stores.settingsActions;
    const uiStore = stores.uiStore;
    const uiActions = stores.uiActions;

    const speechRecognition = stores.useSpeechRecognition({
      continuous: false,
      interimResults: true,
      lang: 'en-US'
    });

    const config = {
      title: 'Voide',
      version: '1.0.0',
      apiBaseUrl: 'http://localhost:3008/voide',
      drivers: {
        'claude-sdk': { name: 'Claude Agent SDK', requiresKey: null },
        'openai': { name: 'OpenAI', requiresKey: 'OPENAI_API_KEY' },
        'ollama': { name: 'Ollama', requiresKey: null },
        'mock': { name: 'Mock', requiresKey: null }
      }
    };

    function saveChat() {
      const app = appStore.get();
      chatActions.saveCurrentChat(app.repoPath, app.currentDriver);
    }

    function loadChat(chatId) {
      const success = chatActions.loadChat(chatId);
      if (success) {
        const chats = chatActions.getAllChats();
        const chat = chats[chatId];
        if (chat) {
          appActions.setRepoPath(chat.repoPath || '');
          appActions.setDriver(chat.driver || 'claude-cli-local');
        }
      }
      return success;
    }

    function startNewChat() {
      const app = appStore.get();
      return chatActions.startNewChat(app.repoPath, app.currentDriver);
    }

    function getCurrentDriverName() {
      const app = appStore.get();
      const driver = config.drivers[app.currentDriver];
      return driver ? driver.name : 'AI';
    }

    function addMessage(type, content, header) {
      const driverName = getCurrentDriverName();
      const headerText = header || (type === 'user' ? 'You' : type === 'assistant' ? driverName : type === 'system' ? 'System' : 'Error');
      chatActions.addMessage(type, content, headerText);
      saveChat();
      if (type === 'user') {
        setTimeout(() => {
          const output = document.getElementById('output');
          if (output) output.scrollTop = output.scrollHeight;
        }, 10);
      }
    }

    function checkBackendAPI() {
      return fetch(config.apiBaseUrl + '/state')
        .then((res) => res.ok)
        .catch(() => false);
    }

    let saveChatDebounceTimer = null;
    function updateLastMessage(type, content) {
      chatActions.updateLastMessage(type, content);
      clearTimeout(saveChatDebounceTimer);
      saveChatDebounceTimer = setTimeout(saveChat, 500);
    }

    function processWithStreaming(command) {
      return new Promise(function(resolve, reject) {
        let fullContent = '';
        let currentEvent = '';
        const app = appStore.get();

        fetch(config.apiBaseUrl + '/process/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: command,
            driver: app.currentDriver,
            repository: app.repoPath
          })
        }).then((response) => {
          if (!response.ok) throw new Error('Stream request failed');

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          function readChunk() {
            reader.read().then(function(result) {
              if (result.done) {
                resolve({ message: fullContent, hasChanges: false });
                return;
              }

              buffer += decoder.decode(result.value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                if (line.indexOf('event: ') === 0) {
                  currentEvent = line.substring(7);
                  continue;
                }

                if (line.indexOf('data: ') === 0) {
                  try {
                    const data = JSON.parse(line.substring(6));
                    if (currentEvent === 'chunk' && data.text) {
                      fullContent += data.text;
                      updateLastMessage('assistant', fullContent);
                    } else if (currentEvent === 'tool' && data.tool) {
                      // Show tool activity with context
                      var toolInfo = data.tool;
                      if (data.input) {
                        if (data.tool === 'Read' && data.input.file_path) {
                          toolInfo = 'Reading ' + data.input.file_path.split('/').pop();
                        } else if (data.tool === 'Edit' && data.input.file_path) {
                          toolInfo = 'Editing ' + data.input.file_path.split('/').pop();
                        } else if (data.tool === 'Write' && data.input.file_path) {
                          toolInfo = 'Writing ' + data.input.file_path.split('/').pop();
                        } else if (data.tool === 'Bash' && data.input.command) {
                          var cmd = data.input.command.substring(0, 40);
                          toolInfo = '$ ' + cmd + (data.input.command.length > 40 ? '...' : '');
                        } else if (data.tool === 'Glob' && data.input.pattern) {
                          toolInfo = 'Finding ' + data.input.pattern;
                        } else if (data.tool === 'Grep' && data.input.pattern) {
                          toolInfo = 'Searching "' + data.input.pattern + '"';
                        } else if (data.tool === 'Task' && data.input.description) {
                          toolInfo = 'Task: ' + data.input.description;
                        } else if (data.tool === 'WebSearch' && data.input.query) {
                          toolInfo = 'Searching web: ' + data.input.query;
                        }
                      }
                      fullContent += '\n`' + toolInfo + '`';
                      updateLastMessage('assistant', fullContent);
                    } else if (currentEvent === 'prompt') {
                      // Claude CLI is asking for input
                      chatActions.setPendingPrompt({
                        id: data.id || Date.now().toString(),
                        text: data.text || 'Please select an option:',
                        options: data.options || ['y', 'n'],
                        labels: data.labels || data.options || ['Yes', 'No']
                      });
                      // Don't resolve yet - wait for user response
                    } else if (currentEvent === 'done') {
                      chatActions.clearPendingPrompt();
                      resolve({ message: fullContent, hasChanges: data.hasChanges || false });
                      return;
                    } else if (currentEvent === 'error') {
                      chatActions.clearPendingPrompt();
                      reject(new Error(data.error || 'Stream error'));
                      return;
                    }
                  } catch (e) {}
                }
              }
              readChunk();
            }).catch(reject);
          }
          readChunk();
        }).catch(reject);
      });
    }

    function processCommand(command) {
      if (!command.trim()) return;

      const chat = chatStore.get();
      const app = appStore.get();

      if (!chat.currentChatId) {
        const userMessage = {
          type: 'user',
          content: command,
          header: 'You',
          timestamp: Date.now()
        };
        chatActions.startNewChat(app.repoPath, app.currentDriver, userMessage);
      } else {
        addMessage('user', command);
      }
      appActions.setTerminalTitle('Processing...');

      if (!app.repoPath) {
        addMessage('error', 'Please enter a repository URL or path first.');
        appActions.setTerminalTitle(config.title + ' - Ready');
        return;
      }

      appActions.setProcessing(true);
      addMessage('assistant', '...');

      checkBackendAPI().then((hasBackend) => {
        if (hasBackend) {
          return processWithStreaming(command);
        } else if (appStore.get().currentDriver === 'mock') {
          return new Promise(function(resolve) {
            setTimeout(() => {
              resolve({
                message: '[Mock] Processing: "' + command + '"\n\nThis is a simulated response.',
                hasChanges: command.toLowerCase().indexOf('fix') !== -1
              });
            }, 1500);
          });
        } else {
          return Promise.reject(new Error('Backend API not available. Start the server at localhost:3008.'));
        }
      }).then((response) => {
        if (response.hasChanges) {
          appActions.setHasChanges(true);
          addMessage('system', 'Changes staged. Click "Commit Changes" to create a commit.');
          sendNotification('Changes Ready', 'Code changes are staged.');
        }
        appActions.setTerminalTitle(config.title + ' - Ready');
        updateTrayStatus('success');
        setTimeout(() => { updateTrayStatus('ready'); }, 2000);
      }).catch((error) => {
        chatActions.removeLastMessage();
        addMessage('error', 'Failed: ' + error.message);
        appActions.setTerminalTitle(config.title + ' - Error');
        updateTrayStatus('error');
        setTimeout(() => { updateTrayStatus('ready'); }, 3000);
      }).finally(() => {
        appActions.setProcessing(false);
      });
    }

    function handleRepoAction() {
      const input = document.getElementById('repoInput');
      const inputValue = input ? input.value.trim() : '';

      if (!inputValue) {
        addMessage('error', 'Please enter a repository URL or path.');
        return;
      }

      checkBackendAPI().then((hasBackend) => {
        if (hasBackend) {
          return fetch(config.apiBaseUrl + '/repo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: inputValue })
          }).then((res) => res.json());
        } else {
          return {
            success: true,
            data: {
              repo: { path: inputValue, name: inputValue.split('/').pop(), branch: 'main' }
            }
          };
        }
      }).then((response) => {
        const data = response.data || response;
        const repo = data.repo;

        if (repo) {
          appActions.setRepoPath(repo.path);
          settingsActions.setLastRepoPath(repo.path);
          saveChat();
          addMessage('system', 'Opened "' + repo.name + '"\nPath: ' + repo.path + '\nBranch: ' + repo.branch);
          appActions.setTerminalTitle(config.title + ' - ' + repo.name);
        } else if (response.error) {
          throw new Error(response.error);
        } else {
          throw new Error('Failed to open repository');
        }
      }).catch((error) => {
        addMessage('error', 'Failed: ' + error.message);
      });
    }

    function commitChanges() {
      if (!appStore.get().hasChanges) return;

      addMessage('system', 'Creating commit...');
      updateTrayStatus('processing');

      checkBackendAPI().then((hasBackend) => {
        if (hasBackend) {
          return fetch(config.apiBaseUrl + '/commit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }).then((res) => res.json());
        } else {
          return { success: true, hash: 'mock-commit-hash' };
        }
      }).then((response) => {
        addMessage('system', 'Committed: ' + (response.hash || 'success'));
        appActions.setHasChanges(false);
        updateTrayStatus('success');
        setTimeout(() => { updateTrayStatus('ready'); }, 2000);
      }).catch((error) => {
        addMessage('error', 'Failed: ' + error.message);
        updateTrayStatus('error');
        setTimeout(() => { updateTrayStatus('ready'); }, 3000);
      });
    }

    function pushChanges() {
      addMessage('system', 'Pushing to remote...');
      updateTrayStatus('processing');

      checkBackendAPI().then((hasBackend) => {
        if (hasBackend) {
          return fetch(config.apiBaseUrl + '/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return Promise.resolve();
      }).then(() => {
        addMessage('system', 'Pushed successfully.');
        updateTrayStatus('success');
        setTimeout(() => { updateTrayStatus('ready'); }, 2000);
      }).catch((error) => {
        addMessage('error', 'Failed: ' + error.message);
        updateTrayStatus('error');
        setTimeout(() => { updateTrayStatus('ready'); }, 3000);
      });
    }

    function respondToPrompt(response) {
      const chat = chatStore.get();
      if (!chat.pendingPrompt) return;

      addMessage('user', response, 'You');
      chatActions.clearPendingPrompt();

      // Send response to backend
      fetch(config.apiBaseUrl + '/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: chat.pendingPrompt.id,
          response: response
        })
      }).catch((error) => {
        addMessage('error', 'Failed to send response: ' + error.message);
      });
    }

    function initSpeechRecognition() {
      if (!speechRecognition.isSupported) {
        appActions.setSpeechSupported(false);
        addMessage('system', 'Speech recognition not available. Please use text input.');
        return false;
      }

      speechRecognition.on('start', () => {
        console.log('[Voide] Speech recognition started');
        const app = appStore.get();
        if (!app.isRecording) {
          appActions.setTranscript('');
        }
        appActions.setRecording(true);
        updateTrayStatus('recording');
      });

      let accumulatedTranscript = '';

      speechRecognition.on('result', (data) => {
        const fullTranscript = accumulatedTranscript + data.transcript;
        console.log('[Voide] Speech result:', data.transcript, 'Full:', fullTranscript);

        const trimmed = fullTranscript.trim().toLowerCase();

        // Check for "reset" trigger word - clears the prompt area
        if (trimmed.endsWith(' reset') || trimmed === 'reset') {
          console.log('[Voide] "Reset" detected, clearing prompt');
          accumulatedTranscript = '';
          appActions.setTranscript('');
          chatActions.setInputText('');
          const textInput = document.getElementById('textInput');
          if (textInput) {
            textInput.value = '';
            textInput.style.height = 'auto';
          }
          return;
        }

        // Check for "backspace" trigger word - deletes the last word
        if (trimmed.endsWith(' backspace') || trimmed === 'backspace') {
          // Remove "backspace" and the word before it
          var words = fullTranscript.trim().split(/\s+/);
          // Remove "backspace"
          words.pop();
          // Remove the last actual word
          if (words.length > 0) {
            words.pop();
          }
          var newTranscript = words.join(' ');
          console.log('[Voide] "Backspace" detected, new transcript:', newTranscript);

          accumulatedTranscript = newTranscript + (newTranscript ? ' ' : '');
          appActions.setTranscript(newTranscript);
          chatActions.setInputText(newTranscript);
          const textInput = document.getElementById('textInput');
          if (textInput) {
            textInput.value = newTranscript;
            textInput.style.height = 'auto';
            textInput.style.height = Math.min(textInput.scrollHeight, 120) + 'px';
          }
          return;
        }

        // Check for "go" trigger word at the end - submits the prompt
        if (trimmed.endsWith(' go') || trimmed === 'go') {
          // Remove "go" from the transcript and submit
          const cleanTranscript = fullTranscript.replace(/\s*go\s*$/i, '').trim();
          console.log('[Voide] "Go" detected, submitting:', cleanTranscript);

          if (cleanTranscript) {
            // Stop recording and clear everything
            appActions.setRecording(false);
            speechRecognition.stop();
            accumulatedTranscript = '';
            appActions.setTranscript('');
            chatActions.clearInput();
            updateTrayStatus('ready');

            // Clear the text input
            const textInput = document.getElementById('textInput');
            if (textInput) {
              textInput.value = '';
              textInput.style.height = 'auto';
            }

            // Submit the command
            setTimeout(() => processCommand(cleanTranscript), 100);
          }
          return;
        }

        appActions.setTranscript(fullTranscript);
      });

      speechRecognition.on('end', (data) => {
        const app = appStore.get();
        if (app.isRecording) {
          accumulatedTranscript = app.transcript + ' ';
          speechRecognition.start();
        } else {
          accumulatedTranscript = '';
        }
      });

      window._resetAccumulatedTranscript = () => {
        accumulatedTranscript = '';
      };

      speechRecognition.on('error', (data) => {
        console.error('Speech recognition error:', data.code);
        stopRecording();
        if (data.code !== 'aborted' && data.code !== 'no-speech') {
          addMessage('error', data.message);
        }
      });

      appActions.setSpeechSupported(true);
      return true;
    }

    function startRecording() {
      const app = appStore.get();
      if (!app.speechSupported) {
        console.error('[Voide] Speech not supported');
        addMessage('error', 'Speech recognition is not supported in this browser.');
        return;
      }
      if (app.isRecording) {
        console.log('[Voide] Already recording');
        return;
      }
      console.log('[Voide] Starting recording...');
      appActions.setTranscript('');
      if (window._resetAccumulatedTranscript) {
        window._resetAccumulatedTranscript();
      }
      speechRecognition.start();
    }

    function stopRecording() {
      console.log('[Voide] Stopping recording...');
      const app = appStore.get();
      if (app.transcript && app.transcript.trim()) {
        console.log('[Voide] Transcript:', app.transcript);
        chatActions.setInputText(app.transcript.trim());
        const textInput = document.getElementById('textInput');
        if (textInput) {
          textInput.value = app.transcript.trim();
        }
      } else {
        console.log('[Voide] No transcript captured');
      }
      appActions.setRecording(false);
      updateTrayStatus('ready');
      speechRecognition.stop();
    }

    function toggleRecording() {
      const app = appStore.get();
      if (app.isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }

    function initNativeFeatures() {
      if (!window.craft) return;

      appActions.setNativeApp(true);
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
        addMessage('system', 'Running as native app - system tray enabled');
      } catch (e) {
        console.log('Native features not fully available:', e);
      }
    }

    function updateTrayStatus(status) {
      if (!appStore.get().isNativeApp || !window.craft) return;
      const icons = { ready: '🤖', recording: '🔴', processing: '⏳', success: '✅', error: '❌' };
      try {
        window.craft.tray.setTitle((icons[status] || '🤖') + ' Voide');
      } catch (e) {}
    }

    function sendNotification(title, body) {
      if (!appStore.get().isNativeApp || !window.craft) return;
      try {
        window.craft.app.notify({ title: title, body: body });
      } catch (e) {}
    }

    function openGithubModal() {
      uiActions.openModal('github');
    }

    function closeGithubModal() {
      uiActions.closeModal('github');
    }

    function openSettingsModal() {
      uiActions.openModal('settings');
    }

    function closeSettingsModal() {
      uiActions.closeModal('settings');
    }

    function saveApiSettings() {
      const anthropicInput = document.getElementById('anthropicApiKey');
      const openaiInput = document.getElementById('openaiApiKey');
      const claudeHostInput = document.getElementById('claudeCliHost');

      settingsActions.setAllApiKeys({
        anthropic: anthropicInput ? anthropicInput.value.trim() || null : null,
        openai: openaiInput ? openaiInput.value.trim() || null : null,
        claudeCliHost: claudeHostInput ? claudeHostInput.value.trim() || null : null
      });

      closeSettingsModal();
      addMessage('system', 'API settings saved.');
    }

    function connectGithub() {
      const tokenInput = document.getElementById('githubToken');
      const nameInput = document.getElementById('gitName');
      const emailInput = document.getElementById('gitEmail');

      const token = tokenInput ? tokenInput.value.trim() : '';
      if (!token) {
        addMessage('error', 'Please enter a GitHub personal access token.');
        return;
      }

      fetch('https://api.github.com/user', {
        headers: {
          'Authorization': 'token ' + token,
          'Accept': 'application/vnd.github.v3+json'
        }
      })
      .then((res) => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then(function(user) {
        settingsActions.connectGithub({
          token: token,
          username: user.login,
          name: nameInput ? nameInput.value.trim() || user.name : user.name,
          email: emailInput ? emailInput.value.trim() || user.email : user.email,
          avatarUrl: user.avatar_url
        });
        addMessage('system', 'Connected to GitHub as @' + user.login);
        closeGithubModal();
      })
      .catch((error) => {
        addMessage('error', 'GitHub connection failed: ' + error.message);
      });
    }

    function disconnectGithub() {
      settingsActions.disconnectGithub();
      addMessage('system', 'Disconnected from GitHub.');
      closeGithubModal();
    }

    function handleTextSubmit() {
      const chat = chatStore.get();
      const text = chat.inputText.trim();
      if (text && !appStore.get().isProcessing) {
        // Clear input immediately
        chatActions.clearInput();
        const textInput = document.getElementById('textInput');
        if (textInput) {
          textInput.value = '';
          textInput.style.height = 'auto';
        }
        processCommand(text);
      }
    }

    function handleInputChange(event) {
      const el = event.target;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
      chatActions.setInputText(el.value);
    }

    function handleInputKeydown(event) {
      // Enter without Shift submits the form
      if (!event.shiftKey) {
        event.preventDefault();
        handleTextSubmit();
        event.target.value = '';
        event.target.style.height = 'auto';
      }
    }

    function handleSendClick() {
      handleTextSubmit();
    }

    function handleDriverChange(event) {
      appActions.setDriver(event.target.value);
      addMessage('system', 'Switched to ' + config.drivers[event.target.value].name);
    }

    function init() {
      console.log('[Voide] Initializing...');
      console.log('[Voide] VoideStores available:', !!window.VoideStores);
      console.log('[Voide] VoideTerminal available:', !!window.VoideTerminal);

      initNativeFeatures();
      initSpeechRecognition();

      appStore.subscribe((state) => {
        const textInput = document.getElementById('textInput');
        if (textInput && state.isRecording) {
          textInput.value = state.transcript;
          textInput.style.height = 'auto';
          textInput.style.height = Math.min(textInput.scrollHeight, 120) + 'px';
        }
        // Keep repo input synced with store
        const repoInput = document.getElementById('repoInput');
        if (repoInput && state.repoPath && !repoInput.value) {
          repoInput.value = state.repoPath;
        }
      });

      // Also set repo input immediately on init
      setTimeout(() => {
        const app = appStore.get();
        const repoInput = document.getElementById('repoInput');
        if (repoInput && app.repoPath) {
          repoInput.value = app.repoPath;
        }
      }, 0);

      // Check URL for existing chat (supports both /chat/[id] and query params)
      const chatIdFromUrl = chatActions.getChatIdFromUrl();
      const routeParams = window.__STX_ROUTE_PARAMS__ || {};
      const chatId = routeParams.id || chatIdFromUrl;

      if (chatId) {
        if (!loadChat(chatId)) {
          history.replaceState({}, '', '/');
        }
      } else {
        // Restore repo path from app store (persisted in localStorage)
        const app = appStore.get();
        if (app.repoPath) {
          const repoInput = document.getElementById('repoInput');
          if (repoInput) repoInput.value = app.repoPath;
        } else {
          // Fallback to settings if app store doesn't have it
          const settings = settingsStore.get();
          if (settings.lastRepoPath) {
            appActions.setRepoPath(settings.lastRepoPath);
            const repoInput = document.getElementById('repoInput');
            if (repoInput) repoInput.value = settings.lastRepoPath;
          }
        }
      }

      window.addEventListener('popstate', (e) => {
        const chatId = chatActions.getChatIdFromUrl();
        if (chatId) {
          loadChat(chatId);
        } else {
          chatActions.newChat();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !e.repeat) {
          const active = document.activeElement;
          const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
          if (!isInput) {
            e.preventDefault();
            toggleRecording();
          }
        }
        if (e.key === 'Escape') {
          uiActions.closeAllModals();
          if (appStore.get().isRecording) {
            stopRecording();
          }
        }
      });
    }

    window.voide = {
      stores: stores,
      appStore: appStore,
      chatStore: chatStore,
      settingsStore: settingsStore,
      uiStore: uiStore,
      appActions: appActions,
      chatActions: chatActions,
      settingsActions: settingsActions,
      uiActions: uiActions,
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
      get state() { return appStore.get(); },
      get messages() { return chatStore.get().messages; },
      get charCount() { return chatStore.get().charCount; },
      config: config,
      getCurrentDriverName: getCurrentDriverName,
      addMessage: addMessage,
      processCommand: processCommand,
      handleRepoAction: handleRepoAction,
      commitChanges: commitChanges,
      pushChanges: pushChanges,
      respondToPrompt: respondToPrompt,
      startRecording: startRecording,
      stopRecording: stopRecording,
      toggleRecording: toggleRecording,
      handleTextSubmit: handleTextSubmit,
      handleInputChange: handleInputChange,
      handleInputKeydown: handleInputKeydown,
      handleSendClick: handleSendClick,
      handleDriverChange: handleDriverChange,
      openGithubModal: openGithubModal,
      closeGithubModal: closeGithubModal,
      connectGithub: connectGithub,
      disconnectGithub: disconnectGithub,
      openSettingsModal: openSettingsModal,
      closeSettingsModal: closeSettingsModal,
      saveApiSettings: saveApiSettings,
      newChat: chatActions.newChat,
      loadChat: loadChat,
      getAllChats: chatActions.getAllChats,
      deleteChat: chatActions.deleteChat
    };

    console.log('[Voide] Setting up window.voide object...');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
    console.log('[Voide] window.voide created with methods:', Object.keys(window.voide).join(', '));
  }
})();
