# Performance

This guide covers techniques for optimizing voide's performance, from speech recognition latency to AI response times and memory management.

## Speech Recognition Performance

### Latency Optimization

Reduce the delay between speaking and seeing text:

```ts
export default {
  voice: {
    // Show results as they come
    interimResults: true,

    // Reduce finalization delay
    finalizationDelay: 300, // ms (default: 500)

    // Faster silence detection
    silenceTimeout: 1500, // ms

    // Lower confidence threshold for speed
    confidenceThreshold: 0.6, // (default: 0.7)
  },
}
```

### Audio Processing

```ts
export default {
  voice: {
    audio: {
      // Sample rate (higher = better quality, more CPU)
      sampleRate: 16000, // 16kHz is sufficient for speech

      // Buffer size (smaller = lower latency, more processing)
      bufferSize: 2048,

      // Noise reduction
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true,
    },
  },
}
```

### Recognition Engine

```ts
export default {
  voice: {
    engine: {
      // Optimize for speed vs accuracy
      mode: 'speed', // 'speed' | 'balanced' | 'accuracy'

      // Use smaller language model
      modelSize: 'small', // 'small' | 'medium' | 'large'
    },
  },
}
```

## AI Response Performance

### Model Selection

Choose the right model for your needs:

| Model | Speed | Quality | Best For |
|-------|-------|---------|----------|
| claude-3-haiku | Fastest | Good | Quick questions |
| claude-3-5-sonnet | Fast | Excellent | Most coding tasks |
| claude-3-sonnet | Fast | Great | General purpose |
| claude-3-opus | Slower | Best | Complex analysis |

### Streaming Responses

Enable streaming for faster perceived response:

```ts
export default {
  anthropic: {
    // Always stream responses
    streaming: true,

    // Start TTS as soon as first sentence complete
    streamingTTS: true,
  },
}
```

### Context Optimization

Reduce context size for faster responses:

```ts
export default {
  conversation: {
    // Limit context window
    maxContextTokens: 50000, // Lower = faster

    // Keep fewer messages
    maxMessages: 20,

    // Summarize old context
    strategy: 'summarize',
    summarizeThreshold: 30000,
  },
}
```

### Prompt Optimization

Shorter prompts = faster responses:

```ts
export default {
  anthropic: {
    systemPrompt: `You are voide. Be concise.
- Short answers preferred
- Code only when needed
- Ask before long explanations`,
  },
}
```

## UI Performance

### Message Rendering

```ts
export default {
  ui: {
    // Virtualize long conversations
    virtualizeMessages: true,

    // Only render visible messages
    maxVisibleMessages: 50,

    // Lazy load message content
    lazyLoadContent: true,

    // Debounce re-renders
    renderDebounce: 16, // ms (60fps)
  },
}
```

### Code Highlighting

```ts
export default {
  ui: {
    codeHighlighting: {
      // Defer highlighting for large blocks
      deferThreshold: 1000, // characters

      // Use web worker for highlighting
      useWorker: true,

      // Cache highlighted code
      cache: true,
    },
  },
}
```

### Animations

```ts
export default {
  ui: {
    // Reduce animations on slower devices
    animations: {
      enabled: true,
      reducedMotion: 'auto', // Respect system setting
      duration: 150, // ms
    },
  },
}
```

## Memory Management

### Transcript Buffer

```ts
export default {
  memory: {
    // Maximum transcript buffer
    maxTranscriptBuffer: 5000, // characters

    // Clear interim results
    clearInterimAfter: 2000, // ms

    // Garbage collection interval
    gcInterval: 30000, // ms
  },
}
```

### Conversation History

```ts
export default {
  memory: {
    conversation: {
      // Maximum stored messages
      maxMessages: 100,

      // Auto-cleanup old messages
      autoCleanup: true,
      cleanupThreshold: 150,

      // Don't store in memory, use IndexedDB
      persistOnly: true,
    },
  },
}
```

### Code Block Caching

```ts
export default {
  memory: {
    codeBlocks: {
      // Cache parsed code blocks
      cache: true,

      // Maximum cached blocks
      maxCached: 50,

      // Cache TTL
      ttl: 300000, // 5 minutes
    },
  },
}
```

## Network Performance

### Request Optimization

```ts
export default {
  network: {
    // Connection pooling
    keepAlive: true,

    // Request compression
    compression: true,

    // Timeout settings
    timeout: {
      connect: 5000,
      response: 30000,
    },
  },
}
```

### Caching

```ts
export default {
  network: {
    cache: {
      // Cache API responses
      enabled: true,

      // Cache duration
      ttl: 60000, // 1 minute

      // Cache size limit
      maxSize: '10MB',
    },
  },
}
```

### Retry Strategy

```ts
export default {
  network: {
    retry: {
      // Retry failed requests
      enabled: true,
      maxAttempts: 3,

      // Exponential backoff
      backoff: 'exponential',
      baseDelay: 1000,
      maxDelay: 10000,

      // Only retry certain errors
      retryOn: ['network', 'timeout', 'rate_limited'],
    },
  },
}
```

## Benchmarking

### Performance Metrics

```ts
import { getPerformanceMetrics } from 'voide'

const metrics = getPerformanceMetrics()

console.log(`Speech latency: ${metrics.speechLatency}ms`)
console.log(`AI response time: ${metrics.aiResponseTime}ms`)
console.log(`Render time: ${metrics.renderTime}ms`)
console.log(`Memory usage: ${metrics.memoryUsage}MB`)
```

### Performance Monitoring

```ts
import { enablePerformanceMonitoring } from 'voide'

enablePerformanceMonitoring({
  // Log slow operations
  slowThreshold: 500, // ms

  // Send metrics to analytics
  reportTo: 'https://analytics.example.com/metrics',

  // Sample rate
  sampleRate: 0.1, // 10% of sessions
})
```

### Profiling

```ts
import { profile } from 'voide'

// Profile specific operations
const result = await profile('ai-response', async () => {
  return await sendMessage('Generate code')
})

console.log(`Operation took ${result.duration}ms`)
console.log(`Memory delta: ${result.memoryDelta}MB`)
```

## Platform-Specific Optimization

### Desktop (Electron)

```ts
export default {
  platform: {
    electron: {
      // Use native speech recognition
      nativeSpeech: true,

      // Hardware acceleration
      hardwareAcceleration: true,

      // Background processing
      backgroundThrottling: false,
    },
  },
}
```

### Mobile

```ts
export default {
  platform: {
    mobile: {
      // Reduce features for mobile
      reducedFeatures: true,

      // Smaller buffers
      bufferSize: 1024,

      // Battery optimization
      lowPowerMode: true,

      // Respect data saver
      respectDataSaver: true,
    },
  },
}
```

### Low-End Devices

```ts
import { detectDeviceCapability, applyPerformancePreset } from 'voide'

const capability = detectDeviceCapability()

if (capability === 'low') {
  applyPerformancePreset('minimal')
}
else if (capability === 'medium') {
  applyPerformancePreset('balanced')
}
else {
  applyPerformancePreset('full')
}
```

## Performance Presets

### Minimal

```ts
import { applyPerformancePreset } from 'voide'

applyPerformancePreset('minimal')

// Equivalent to:
export default {
  anthropic: { model: 'claude-3-haiku-20240307', maxTokens: 1024 },
  voice: { interimResults: false, confidenceThreshold: 0.5 },
  ui: { animations: false, virtualizeMessages: true },
  memory: { maxMessages: 20 },
}
```

### Balanced

```ts
applyPerformancePreset('balanced')

// Equivalent to:
export default {
  anthropic: { model: 'claude-3-5-sonnet-20241022', maxTokens: 2048 },
  voice: { interimResults: true, confidenceThreshold: 0.7 },
  ui: { animations: true, virtualizeMessages: true },
  memory: { maxMessages: 50 },
}
```

### Full

```ts
applyPerformancePreset('full')

// Equivalent to:
export default {
  anthropic: { model: 'claude-3-5-sonnet-20241022', maxTokens: 4096 },
  voice: { interimResults: true, confidenceThreshold: 0.8 },
  ui: { animations: true, virtualizeMessages: false },
  memory: { maxMessages: 100 },
}
```

## Debugging Performance

### Debug Mode

```ts
export default {
  dev: {
    // Performance debugging
    performanceDebug: true,

    // Log slow operations
    logSlowOperations: true,
    slowThreshold: 100, // ms

    // Show metrics overlay
    metricsOverlay: true,
  },
}
```

### Performance Logs

```ts
import { enablePerformanceLogs } from 'voide'

enablePerformanceLogs({
  // Log to console
  console: true,

  // Log to file
  file: './performance.log',

  // Include stack traces
  stackTraces: true,
})
```

## Next Steps

- [Configuration](/advanced/configuration) - Full configuration options
- [API Integration](/advanced/api-integration) - Optimize API calls
- [Custom Commands](/advanced/custom-commands) - Efficient command handling
