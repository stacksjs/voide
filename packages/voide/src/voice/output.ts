// Voice Output (Text-to-Speech) for Voide CLI

import { EventEmitter } from 'node:events'
import { spawn, type ChildProcess } from 'node:child_process'
import { writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export type TTSProvider = 'say' | 'espeak' | 'pico2wave' | 'openai' | 'elevenlabs'

export interface VoiceOutputConfig {
  /** TTS provider */
  provider?: TTSProvider
  /** Voice name/ID */
  voice?: string
  /** Speech rate (0.5-2.0) */
  rate?: number
  /** Pitch adjustment (-1 to 1) */
  pitch?: number
  /** Volume (0-1) */
  volume?: number
  /** OpenAI API key */
  openaiKey?: string
  /** ElevenLabs API key */
  elevenlabsKey?: string
  /** ElevenLabs voice settings */
  voiceSettings?: {
    stability?: number
    similarityBoost?: number
  }
}

export interface SpeechResult {
  text: string
  duration?: number
  audioPath?: string
}

// Default voices per provider
const DEFAULT_VOICES: Record<TTSProvider, string> = {
  say: 'Samantha', // macOS
  espeak: 'en', // Linux
  pico2wave: 'en-US',
  openai: 'alloy',
  elevenlabs: '21m00Tcm4TlvDq8ikWAM', // Rachel
}

/**
 * Voice Output handler
 */
export class VoiceOutput extends EventEmitter {
  private config: VoiceOutputConfig
  private currentProcess?: ChildProcess
  private isSpeaking = false
  private queue: string[] = []
  private processingQueue = false

  constructor(config: VoiceOutputConfig = {}) {
    super()
    this.config = {
      provider: config.provider || (process.platform === 'darwin' ? 'say' : 'espeak'),
      voice: config.voice,
      rate: config.rate ?? 1.0,
      pitch: config.pitch ?? 0,
      volume: config.volume ?? 1.0,
      ...config,
    }
  }

  /**
   * Speak text
   */
  async speak(text: string): Promise<SpeechResult> {
    if (!text.trim()) return { text, duration: 0 }

    this.emit('speak:start', text)
    this.isSpeaking = true

    try {
      const result = await this.synthesize(text)
      this.emit('speak:end', result)
      return result
    }
    catch (error) {
      this.emit('speak:error', error)
      throw error
    }
    finally {
      this.isSpeaking = false
    }
  }

  /**
   * Add text to speech queue
   */
  queueSpeak(text: string): void {
    this.queue.push(text)
    this.emit('queue:add', text)
    this.processQueue()
  }

  /**
   * Process speech queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.queue.length === 0) return

    this.processingQueue = true

    while (this.queue.length > 0) {
      const text = this.queue.shift()!
      try {
        await this.speak(text)
      }
      catch (error) {
        this.emit('queue:error', { text, error })
      }
    }

    this.processingQueue = false
    this.emit('queue:empty')
  }

  /**
   * Clear speech queue
   */
  clearQueue(): void {
    this.queue = []
    this.emit('queue:clear')
  }

  /**
   * Stop current speech
   */
  stop(): void {
    if (this.currentProcess) {
      this.currentProcess.kill()
      this.currentProcess = undefined
    }
    this.isSpeaking = false
    this.emit('speak:stop')
  }

  /**
   * Synthesize speech
   */
  private async synthesize(text: string): Promise<SpeechResult> {
    const { provider } = this.config

    switch (provider) {
      case 'say':
        return this.synthesizeSay(text)
      case 'espeak':
        return this.synthesizeEspeak(text)
      case 'pico2wave':
        return this.synthesizePico(text)
      case 'openai':
        return this.synthesizeOpenAI(text)
      case 'elevenlabs':
        return this.synthesizeElevenLabs(text)
      default:
        throw new Error(`Unknown TTS provider: ${provider}`)
    }
  }

  /**
   * macOS say command
   */
  private synthesizeSay(text: string): Promise<SpeechResult> {
    return new Promise((resolve, reject) => {
      const voice = this.config.voice || DEFAULT_VOICES.say
      const rate = Math.floor((this.config.rate || 1.0) * 200) // Default is ~200 wpm

      const args: string[] = []
      if (voice) args.push('-v', voice)
      args.push('-r', String(rate))
      args.push(text)

      const startTime = Date.now()
      this.currentProcess = spawn('say', args)

      this.currentProcess.on('close', (code) => {
        this.currentProcess = undefined
        const duration = (Date.now() - startTime) / 1000

        if (code === 0) {
          resolve({ text, duration })
        }
        else {
          reject(new Error(`say exited with code ${code}`))
        }
      })

      this.currentProcess.on('error', (error) => {
        this.currentProcess = undefined
        reject(error)
      })
    })
  }

  /**
   * Linux espeak command
   */
  private synthesizeEspeak(text: string): Promise<SpeechResult> {
    return new Promise((resolve, reject) => {
      const voice = this.config.voice || DEFAULT_VOICES.espeak
      const rate = Math.floor((this.config.rate || 1.0) * 175) // Default is ~175 wpm
      const pitch = Math.floor(50 + (this.config.pitch || 0) * 50) // 0-99

      const args: string[] = []
      if (voice) args.push('-v', voice)
      args.push('-s', String(rate))
      args.push('-p', String(pitch))
      args.push(text)

      const startTime = Date.now()
      this.currentProcess = spawn('espeak', args)

      this.currentProcess.on('close', (code) => {
        this.currentProcess = undefined
        const duration = (Date.now() - startTime) / 1000

        if (code === 0) {
          resolve({ text, duration })
        }
        else {
          reject(new Error(`espeak exited with code ${code}`))
        }
      })

      this.currentProcess.on('error', (error) => {
        this.currentProcess = undefined
        reject(error)
      })
    })
  }

  /**
   * pico2wave (higher quality Linux TTS)
   */
  private synthesizePico(text: string): Promise<SpeechResult> {
    return new Promise((resolve, reject) => {
      const voice = this.config.voice || DEFAULT_VOICES.pico2wave
      const tempPath = join(tmpdir(), `voide-tts-${Date.now()}.wav`)

      // Generate audio file
      const picoProc = spawn('pico2wave', ['-l', voice, '-w', tempPath, text])

      picoProc.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error(`pico2wave exited with code ${code}`))
          return
        }

        // Play the audio
        const startTime = Date.now()
        const playProc = spawn('aplay', [tempPath])

        playProc.on('close', async () => {
          const duration = (Date.now() - startTime) / 1000
          await unlink(tempPath).catch(() => {})
          resolve({ text, duration })
        })

        playProc.on('error', async (error) => {
          await unlink(tempPath).catch(() => {})
          reject(error)
        })
      })

      picoProc.on('error', reject)
    })
  }

  /**
   * OpenAI TTS
   */
  private async synthesizeOpenAI(text: string): Promise<SpeechResult> {
    const apiKey = this.config.openaiKey
    if (!apiKey) throw new Error('OpenAI API key required')

    const voice = this.config.voice || DEFAULT_VOICES.openai
    const speed = this.config.rate || 1.0

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice,
        speed: Math.max(0.25, Math.min(4.0, speed)),
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI TTS failed: ${response.status}`)
    }

    const audioData = await response.arrayBuffer()
    const result = await this.playAudioBuffer(Buffer.from(audioData), 'mp3')

    return { text, duration: result.duration }
  }

  /**
   * ElevenLabs TTS
   */
  private async synthesizeElevenLabs(text: string): Promise<SpeechResult> {
    const apiKey = this.config.elevenlabsKey
    if (!apiKey) throw new Error('ElevenLabs API key required')

    const voiceId = this.config.voice || DEFAULT_VOICES.elevenlabs
    const settings = this.config.voiceSettings || {}

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: settings.stability ?? 0.5,
            similarity_boost: settings.similarityBoost ?? 0.75,
          },
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS failed: ${response.status}`)
    }

    const audioData = await response.arrayBuffer()
    const result = await this.playAudioBuffer(Buffer.from(audioData), 'mp3')

    return { text, duration: result.duration }
  }

  /**
   * Play audio buffer
   */
  private async playAudioBuffer(
    buffer: Buffer,
    format: 'mp3' | 'wav' = 'mp3',
  ): Promise<{ duration: number; audioPath: string }> {
    const tempPath = join(tmpdir(), `voide-tts-${Date.now()}.${format}`)
    await writeFile(tempPath, buffer)

    const startTime = Date.now()

    await new Promise<void>((resolve, reject) => {
      let playCommand: string
      let playArgs: string[]

      if (process.platform === 'darwin') {
        playCommand = 'afplay'
        playArgs = [tempPath]
      }
      else {
        playCommand = 'mpv'
        playArgs = ['--no-terminal', tempPath]
      }

      this.currentProcess = spawn(playCommand, playArgs)

      this.currentProcess.on('close', () => {
        this.currentProcess = undefined
        resolve()
      })

      this.currentProcess.on('error', (error) => {
        this.currentProcess = undefined
        reject(error)
      })
    })

    const duration = (Date.now() - startTime) / 1000

    await unlink(tempPath).catch(() => {})

    return { duration, audioPath: tempPath }
  }

  /**
   * Generate audio file without playing
   */
  async generateAudio(text: string, outputPath: string): Promise<SpeechResult> {
    const { provider } = this.config

    if (provider === 'openai') {
      const apiKey = this.config.openaiKey
      if (!apiKey) throw new Error('OpenAI API key required')

      const voice = this.config.voice || DEFAULT_VOICES.openai

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1-hd',
          input: text,
          voice,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI TTS failed: ${response.status}`)
      }

      const audioData = await response.arrayBuffer()
      await writeFile(outputPath, Buffer.from(audioData))

      return { text, audioPath: outputPath }
    }

    throw new Error(`Audio generation not supported for provider: ${provider}`)
  }

  /**
   * List available voices
   */
  async listVoices(): Promise<string[]> {
    const { provider } = this.config

    if (provider === 'say') {
      return new Promise((resolve, reject) => {
        const proc = spawn('say', ['-v', '?'])
        let stdout = ''

        proc.stdout.on('data', (data) => {
          stdout += data.toString()
        })

        proc.on('close', () => {
          const voices = stdout.split('\n')
            .map(line => line.split(/\s+/)[0])
            .filter(Boolean)
          resolve(voices)
        })

        proc.on('error', reject)
      })
    }

    if (provider === 'espeak') {
      return new Promise((resolve, reject) => {
        const proc = spawn('espeak', ['--voices'])
        let stdout = ''

        proc.stdout.on('data', (data) => {
          stdout += data.toString()
        })

        proc.on('close', () => {
          const voices = stdout.split('\n')
            .slice(1) // Skip header
            .map(line => line.split(/\s+/)[4])
            .filter(Boolean)
          resolve(voices)
        })

        proc.on('error', reject)
      })
    }

    if (provider === 'openai') {
      return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    }

    return []
  }

  /**
   * Get current state
   */
  get speaking(): boolean {
    return this.isSpeaking
  }

  /**
   * Get queue length
   */
  get queueLength(): number {
    return this.queue.length
  }
}

/**
 * Create voice output handler
 */
export function createVoiceOutput(config: VoiceOutputConfig = {}): VoiceOutput {
  return new VoiceOutput(config)
}

/**
 * One-shot speak
 */
export async function speak(text: string, config: VoiceOutputConfig = {}): Promise<SpeechResult> {
  const output = createVoiceOutput(config)
  return output.speak(text)
}
