# Real-time Transcription

voide uses the Web Speech API to provide real-time speech-to-text transcription. This guide covers how transcription works and how to optimize it for coding.

## How It Works

### Speech Recognition Flow

```
Microphone → Audio Stream → Speech Recognition → Text → Processing
     ↓             ↓              ↓                ↓         ↓
  Hardware     Browser      Web Speech API     Transcript  Commands
```

### Interim vs Final Results

voide shows results in two stages:

1. **Interim Results**: Text appears as you speak (may change)
2. **Final Results**: Confirmed text (won't change)

```
Speaking: "Create a function"

Interim:  "Create a fun..."
Interim:  "Create a function..."
Final:    "Create a function"
```

## Configuration

### Basic Setup

```ts
// voide.config.ts
export default {
  voice: {
    // Recognition language (BCP-47 code)
    language: 'en-US',

    // Keep listening after results
    continuous: true,

    // Show interim (unconfirmed) results
    interimResults: true,

    // Number of alternative transcriptions
    maxAlternatives: 1,
  },
}
```

### Language Support

voide supports many languages:

```ts
export default {
  voice: {
    language: 'en-US', // American English
    // language: 'en-GB', // British English
    // language: 'es-ES', // Spanish
    // language: 'fr-FR', // French
    // language: 'de-DE', // German
    // language: 'ja-JP', // Japanese
    // language: 'zh-CN', // Chinese (Simplified)
  },
}
```

### Confidence Threshold

Filter low-confidence results:

```ts
export default {
  voice: {
    // Only accept results above this confidence (0-1)
    confidenceThreshold: 0.7,

    // Show confidence in debug mode
    showConfidence: process.env.NODE_ENV === 'development',
  },
}
```

## Optimizing Recognition

### Microphone Quality

Better microphones improve accuracy:

| Microphone Type | Quality | Best For |
|----------------|---------|----------|
| Built-in laptop | Fair | Quiet rooms |
| USB headset | Good | General use |
| Condenser mic | Excellent | Professional use |
| Noise-canceling | Best | Noisy environments |

### Environment Tips

- **Reduce background noise**: Close windows, turn off fans
- **Speak clearly**: Moderate pace, clear enunciation
- **Consistent volume**: Not too loud or quiet
- **Distance**: 6-12 inches from microphone

### Technical Terms

Train yourself to speak technical terms clearly:

| Term | Pronunciation Tips |
|------|-------------------|
| `async` | "a-sink" |
| `const` | "const" (not "constant") |
| `useState` | "use-state" (two words) |
| `npm` | "N-P-M" (spell it out) |
| `API` | "A-P-I" (spell it out) |

## Recognition Events

### Handling Results

```ts
import { useSpeechRecognition } from 'voide'

const recognition = useSpeechRecognition({
  onResult: (event) => {
    const result = event.results[event.resultIndex]

    if (result.isFinal) {
      console.log('Final:', result[0].transcript)
      console.log('Confidence:', result[0].confidence)
    }
    else {
      console.log('Interim:', result[0].transcript)
    }
  },

  onError: (event) => {
    console.error('Error:', event.error)
  },

  onEnd: () => {
    console.log('Recognition ended')
  },
})
```

### Event Types

```ts
interface RecognitionEvents {
  onStart: () => void // Recognition started
  onResult: (event: SpeechRecognitionEvent) => void // Got result
  onError: (event: SpeechRecognitionErrorEvent) => void // Error occurred
  onEnd: () => void // Recognition ended
  onSpeechStart: () => void // User started speaking
  onSpeechEnd: () => void // User stopped speaking
  onNoMatch: () => void // No recognition match
}
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `not-allowed` | No microphone permission | Grant permission in browser |
| `no-speech` | No speech detected | Speak louder, check mic |
| `audio-capture` | Microphone unavailable | Check mic connection |
| `network` | Network issue | Check internet connection |
| `aborted` | Recognition was stopped | Restart if needed |

### Error Recovery

```ts
export default {
  voice: {
    errorHandling: {
      // Auto-restart on certain errors
      autoRestart: true,
      restartOn: ['no-speech', 'network'],

      // Max restart attempts
      maxRestarts: 3,

      // Delay between restarts (ms)
      restartDelay: 1000,
    },
  },
}
```

## Punctuation Processing

### Automatic Conversion

voide converts spoken punctuation:

```
Input:  "function add open paren a comma b close paren"
Output: "function add(a, b)"
```

### Custom Punctuation Rules

```ts
import { convertSpokenPunctuation } from 'voide'

// Add custom rules
const result = convertSpokenPunctuation(text, {
  custom: [
    { pattern: /arrow function/gi, replacement: '=>' },
    { pattern: /spread operator/gi, replacement: '...' },
  ],
})
```

### Disable Punctuation Conversion

```ts
export default {
  voice: {
    punctuation: {
      enabled: false, // Disable all conversion
      // Or disable specific patterns
      disabled: ['hash', 'star'],
    },
  },
}
```

## Silence Detection

### Auto-Send on Silence

Automatically send after a pause:

```ts
export default {
  voice: {
    // Time of silence before auto-send (ms)
    silenceTimeout: 2000,

    // Enable auto-send
    autoSendOnSilence: true,

    // Minimum words before auto-send
    minWordsForAutoSend: 3,
  },
}
```

### Silence Feedback

```ts
export default {
  voice: {
    // Visual feedback during silence
    silenceIndicator: true,

    // Audio feedback before auto-send
    silenceBeep: true,
  },
}
```

## Performance

### Memory Management

```ts
export default {
  voice: {
    // Maximum transcript length before trimming
    maxTranscriptLength: 10000,

    // Clear old results
    clearInterimAfter: 5000, // ms
  },
}
```

### Battery Considerations

On mobile devices:

```ts
export default {
  voice: {
    // Reduce battery usage
    lowPowerMode: true,

    // Stop after inactivity
    inactivityTimeout: 60000, // 1 minute
  },
}
```

## Audio Recording

### Recording for Debugging

```ts
import { useAudioRecorder } from 'voide'

const recorder = useAudioRecorder({
  onRecording: (blob) => {
    // Save recording for debugging
    saveRecording(blob)
  },
})
```

### Audio Visualization

```ts
import { useAudioVisualization } from 'voide'

const { volume, frequency } = useAudioVisualization()

// Use for visual feedback
console.log(`Volume: ${volume}`) // 0-100
```

## Browser Compatibility

### Supported Browsers

| Browser | Support Level | Notes |
|---------|---------------|-------|
| Chrome | Full | Best support |
| Edge | Full | Chromium-based |
| Safari | Partial | iOS has limitations |
| Firefox | Limited | Requires flag |

### Feature Detection

```ts
import { checkSpeechSupport } from 'voide'

const support = checkSpeechSupport()

if (!support.speechRecognition) {
  console.log('Speech recognition not supported')
}

if (!support.continuous) {
  console.log('Continuous recognition not supported')
}
```

### Fallback Options

```ts
export default {
  voice: {
    fallback: {
      // Show text input if speech not supported
      showTextInput: true,

      // Alternative speech service
      useAlternativeService: false,
    },
  },
}
```

## Privacy

### Data Handling

- Speech is processed by browser/Google servers
- voide doesn't store audio recordings by default
- Transcripts are stored locally unless configured otherwise

### Privacy Settings

```ts
export default {
  privacy: {
    // Don't store transcripts
    storeTranscripts: false,

    // Clear on close
    clearOnClose: true,

    // Local processing only (if supported)
    localOnly: false,
  },
}
```

## Debugging

### Debug Mode

```ts
export default {
  voice: {
    debug: true, // Enable debug logging
  },
}
```

### Logging

```ts
import { enableVoiceLogging } from 'voide'

enableVoiceLogging({
  results: true, // Log all results
  errors: true, // Log errors
  timing: true, // Log timing info
})
```

## Next Steps

- [Voice Commands](/features/voice-commands) - Process voice commands
- [Configuration](/config) - Full configuration options
- [Performance](/advanced/performance) - Optimize recognition
