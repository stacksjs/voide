/**
 * Audio Recorder Composable
 * Records audio with volume level monitoring and duration tracking
 */

export interface AudioRecorderState {
  isRecording: boolean
  isPaused: boolean
  duration: number // seconds
  volumeLevel: number // 0-10 scale
  audioBlob: Blob | null
  audioUrl: string | null
  transcript: string | null
  isTranscribing: boolean
  error: string | null
}

export interface AudioRecorderOptions {
  /** Audio MIME type (default: audio/webm) */
  mimeType?: string
  /** Sample rate for recording */
  sampleRate?: number
  /** Callback when volume level changes */
  onVolumeChange?: (level: number) => void
  /** Callback when duration updates */
  onDurationChange?: (duration: number) => void
  /** Callback when recording stops */
  onRecordingStop?: (blob: Blob, duration: number) => void
  /** Callback when transcription completes */
  onTranscript?: (transcript: string) => void
  /** Language for transcription */
  lang?: string
}

export interface AudioRecorderRef {
  get: () => AudioRecorderState
  isSupported: boolean
  start: () => Promise<boolean>
  stop: () => Promise<Blob | null>
  pause: () => void
  resume: () => void
  reset: () => void
  transcribe: () => Promise<string | null>
  getVolumeLevel: () => number
  getDuration: () => number
  subscribe: (fn: (state: AudioRecorderState) => void) => () => void
}

// Check browser support
function checkSupport(): { mediaRecorder: boolean; audioContext: boolean; speechRecognition: boolean } {
  if (typeof window === 'undefined') {
    return { mediaRecorder: false, audioContext: false, speechRecognition: false }
  }
  return {
    mediaRecorder: !!window.MediaRecorder,
    audioContext: !!(window.AudioContext || (window as any).webkitAudioContext),
    speechRecognition: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  }
}

export function useAudioRecorder(options: AudioRecorderOptions = {}): AudioRecorderRef {
  const {
    mimeType = 'audio/webm;codecs=opus',
    sampleRate = 44100,
    onVolumeChange,
    onDurationChange,
    onRecordingStop,
    onTranscript,
    lang = 'en-US'
  } = options

  const support = checkSupport()
  const isSupported = support.mediaRecorder && support.audioContext
  const subscribers = new Set<(state: AudioRecorderState) => void>()

  // Internal state
  let state: AudioRecorderState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    volumeLevel: 0,
    audioBlob: null,
    audioUrl: null,
    transcript: null,
    isTranscribing: false,
    error: null
  }

  // MediaRecorder and AudioContext
  let mediaRecorder: MediaRecorder | null = null
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let mediaStream: MediaStream | null = null
  let audioChunks: Blob[] = []

  // Timer
  let timerInterval: ReturnType<typeof setInterval> | null = null
  let startTime: number = 0

  // Volume monitoring
  let volumeInterval: ReturnType<typeof setInterval> | null = null
  let dataArray: Uint8Array | null = null

  const notify = () => {
    for (const fn of subscribers) {
      try { fn({ ...state }) } catch (e) { console.error('[useAudioRecorder]', e) }
    }
  }

  const setState = (updates: Partial<AudioRecorderState>) => {
    state = { ...state, ...updates }
    notify()
  }

  const startTimer = () => {
    startTime = Date.now()
    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setState({ duration: elapsed })
      onDurationChange?.(elapsed)
    }, 100)
  }

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  const startVolumeMonitoring = () => {
    if (!analyser || !dataArray) return

    volumeInterval = setInterval(() => {
      if (!analyser || !dataArray || state.isPaused) return

      analyser.getByteFrequencyData(dataArray)

      // Calculate RMS (root mean square) for better volume representation
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i]
      }
      const rms = Math.sqrt(sum / dataArray.length)

      // Map to 0-10 scale (adjust sensitivity as needed)
      const level = Math.min(10, Math.round((rms / 128) * 10))

      if (level !== state.volumeLevel) {
        setState({ volumeLevel: level })
        onVolumeChange?.(level)
      }
    }, 50)
  }

  const stopVolumeMonitoring = () => {
    if (volumeInterval) {
      clearInterval(volumeInterval)
      volumeInterval = null
    }
    setState({ volumeLevel: 0 })
  }

  const start = async (): Promise<boolean> => {
    if (!isSupported) {
      setState({ error: 'Audio recording not supported in this browser' })
      return false
    }

    if (state.isRecording) return true

    try {
      // Request microphone access
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      // Set up AudioContext for volume monitoring
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      audioContext = new AudioContextClass()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8

      const source = audioContext.createMediaStreamSource(mediaStream)
      source.connect(analyser)

      dataArray = new Uint8Array(analyser.frequencyBinCount)

      // Set up MediaRecorder
      const supportedMimeType = MediaRecorder.isTypeSupported(mimeType)
        ? mimeType
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      mediaRecorder = new MediaRecorder(mediaStream, { mimeType: supportedMimeType })
      audioChunks = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: supportedMimeType })
        const url = URL.createObjectURL(blob)
        setState({
          audioBlob: blob,
          audioUrl: url,
          isRecording: false
        })
        onRecordingStop?.(blob, state.duration)
      }

      mediaRecorder.onerror = (event: any) => {
        setState({ error: event.error?.message || 'Recording error' })
      }

      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioBlob: null,
        audioUrl: null,
        transcript: null,
        error: null
      })

      startTimer()
      startVolumeMonitoring()

      return true
    } catch (err: any) {
      const message = err.name === 'NotAllowedError'
        ? 'Microphone access denied'
        : err.message || 'Failed to start recording'
      setState({ error: message })
      return false
    }
  }

  const stop = async (): Promise<Blob | null> => {
    if (!state.isRecording || !mediaRecorder) return null

    stopTimer()
    stopVolumeMonitoring()

    return new Promise((resolve) => {
      if (!mediaRecorder) {
        resolve(null)
        return
      }

      mediaRecorder.onstop = () => {
        const mimeTypeUsed = mediaRecorder?.mimeType || mimeType
        const blob = new Blob(audioChunks, { type: mimeTypeUsed })
        const url = URL.createObjectURL(blob)
        setState({
          audioBlob: blob,
          audioUrl: url,
          isRecording: false
        })
        onRecordingStop?.(blob, state.duration)

        // Clean up media stream
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop())
          mediaStream = null
        }

        // Clean up audio context
        if (audioContext) {
          audioContext.close()
          audioContext = null
        }

        resolve(blob)
      }

      mediaRecorder.stop()
    })
  }

  const pause = () => {
    if (!state.isRecording || state.isPaused || !mediaRecorder) return
    mediaRecorder.pause()
    stopTimer()
    setState({ isPaused: true })
  }

  const resume = () => {
    if (!state.isRecording || !state.isPaused || !mediaRecorder) return
    mediaRecorder.resume()
    startTimer()
    setState({ isPaused: false })
  }

  const reset = () => {
    if (state.isRecording) {
      stop()
    }

    // Revoke object URL to free memory
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl)
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
    })
  }

  const transcribe = async (): Promise<string | null> => {
    if (!state.audioBlob || !support.speechRecognition) {
      return null
    }

    setState({ isTranscribing: true })

    return new Promise((resolve) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.lang = lang
      recognition.continuous = true
      recognition.interimResults = false

      let transcript = ''

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' '
          }
        }
      }

      recognition.onend = () => {
        const finalTranscript = transcript.trim()
        setState({ transcript: finalTranscript, isTranscribing: false })
        onTranscript?.(finalTranscript)
        resolve(finalTranscript)
      }

      recognition.onerror = (event: any) => {
        setState({ isTranscribing: false, error: event.error })
        resolve(null)
      }

      // Play the audio to transcribe it
      // Note: This is a workaround since Web Speech API doesn't directly transcribe blobs
      // For production, you'd want to use a proper speech-to-text API

      // For now, we'll create an audio element and use the speech recognition
      // to transcribe while playing (this requires the audio to play)

      // Alternative approach: Use the browser's speech recognition directly on the mic input
      // and store the transcript alongside the recording

      // Since transcribing a blob directly isn't supported, we'll skip actual transcription
      // and return a placeholder. In production, use Whisper API or similar.
      setState({ isTranscribing: false })
      resolve(null)
    })
  }

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
      subscribers.add(fn)
      fn({ ...state })
      return () => subscribers.delete(fn)
    }
  }
}

// Format duration as mm:ss
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Get volume level label
export function getVolumeLevelLabel(level: number): string {
  if (level === 0) return 'Silent'
  if (level <= 2) return 'Quiet'
  if (level <= 4) return 'Low'
  if (level <= 6) return 'Normal'
  if (level <= 8) return 'Loud'
  return 'Very Loud'
}
