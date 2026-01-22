// Voice Support for Voide CLI
// Voice Input (STT), Voice Output (TTS), and Voice Commands

import { EventEmitter } from 'node:events'
import { spawn, type ChildProcess } from 'node:child_process'
import { writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Re-export sub-modules
export * from './input'
export * from './output'
export * from './commands'

export interface VoiceConfig {
  /** Speech-to-text provider */
  sttProvider?: 'whisper' | 'system' | 'openai'
  /** Text-to-speech provider */
  ttsProvider?: 'say' | 'espeak' | 'openai' | 'elevenlabs'
  /** OpenAI API key (for whisper/tts) */
  openaiKey?: string
  /** ElevenLabs API key */
  elevenlabsKey?: string
  /** Voice for TTS */
  voice?: string
  /** Speech rate (0.5-2.0) */
  rate?: number
  /** Wake word for voice commands */
  wakeWord?: string
  /** Language code */
  language?: string
}

/**
 * Voice manager combining STT, TTS, and commands
 */
export class VoiceManager extends EventEmitter {
  private config: VoiceConfig
  private isListening = false
  private isSpeaking = false

  constructor(config: VoiceConfig = {}) {
    super()
    this.config = {
      sttProvider: config.sttProvider || 'system',
      ttsProvider: config.ttsProvider || 'say',
      voice: config.voice,
      rate: config.rate || 1.0,
      wakeWord: config.wakeWord || 'hey voide',
      language: config.language || 'en',
      ...config,
    }
  }

  /**
   * Start voice input (listening)
   */
  async startListening(): Promise<void> {
    if (this.isListening) return
    this.isListening = true
    this.emit('listening:start')

    // Implementation depends on provider
    // This emits transcription events
  }

  /**
   * Stop voice input
   */
  stopListening(): void {
    this.isListening = false
    this.emit('listening:stop')
  }

  /**
   * Speak text using TTS
   */
  async speak(text: string): Promise<void> {
    if (this.isSpeaking) {
      this.emit('speak:queued', text)
      return
    }

    this.isSpeaking = true
    this.emit('speak:start', text)

    try {
      await this.synthesize(text)
    }
    finally {
      this.isSpeaking = false
      this.emit('speak:end', text)
    }
  }

  /**
   * Synthesize speech
   */
  private async synthesize(text: string): Promise<void> {
    const { ttsProvider, voice, rate } = this.config

    switch (ttsProvider) {
      case 'say':
        await this.sayCommand(text, voice, rate)
        break
      case 'espeak':
        await this.espeakCommand(text, voice, rate)
        break
      case 'openai':
        await this.openaiTts(text, voice)
        break
      case 'elevenlabs':
        await this.elevenlabsTts(text, voice)
        break
    }
  }

  /**
   * macOS say command
   */
  private sayCommand(text: string, voice?: string, rate?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = []
      if (voice) args.push('-v', voice)
      if (rate) args.push('-r', String(Math.floor(rate * 200)))
      args.push(text)

      const proc = spawn('say', args)
      proc.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`say exited with code ${code}`))
      })
      proc.on('error', reject)
    })
  }

  /**
   * Linux espeak command
   */
  private espeakCommand(text: string, voice?: string, rate?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = []
      if (voice) args.push('-v', voice)
      if (rate) args.push('-s', String(Math.floor(rate * 175)))
      args.push(text)

      const proc = spawn('espeak', args)
      proc.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`espeak exited with code ${code}`))
      })
      proc.on('error', reject)
    })
  }

  /**
   * OpenAI TTS
   */
  private async openaiTts(text: string, voice?: string): Promise<void> {
    const apiKey = this.config.openaiKey
    if (!apiKey) throw new Error('OpenAI API key required for TTS')

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice || 'alloy',
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI TTS failed: ${response.status}`)
    }

    const audioData = await response.arrayBuffer()
    await this.playAudio(Buffer.from(audioData))
  }

  /**
   * ElevenLabs TTS
   */
  private async elevenlabsTts(text: string, voice?: string): Promise<void> {
    const apiKey = this.config.elevenlabsKey
    if (!apiKey) throw new Error('ElevenLabs API key required for TTS')

    const voiceId = voice || '21m00Tcm4TlvDq8ikWAM' // Default voice
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
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS failed: ${response.status}`)
    }

    const audioData = await response.arrayBuffer()
    await this.playAudio(Buffer.from(audioData))
  }

  /**
   * Play audio buffer
   */
  private async playAudio(buffer: Buffer): Promise<void> {
    const tempPath = join(tmpdir(), `voide-tts-${Date.now()}.mp3`)

    try {
      await writeFile(tempPath, buffer)

      // Play using system command
      await new Promise<void>((resolve, reject) => {
        let proc: ChildProcess

        if (process.platform === 'darwin') {
          proc = spawn('afplay', [tempPath])
        }
        else if (process.platform === 'linux') {
          proc = spawn('mpv', ['--no-terminal', tempPath])
        }
        else {
          reject(new Error('Unsupported platform for audio playback'))
          return
        }

        proc.on('close', () => resolve())
        proc.on('error', reject)
      })
    }
    finally {
      try {
        await unlink(tempPath)
      }
      catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Transcribe audio file
   */
  async transcribe(audioPath: string): Promise<string> {
    const { sttProvider } = this.config

    switch (sttProvider) {
      case 'whisper':
        return this.whisperTranscribe(audioPath)
      case 'openai':
        return this.openaiTranscribe(audioPath)
      case 'system':
      default:
        return this.systemTranscribe(audioPath)
    }
  }

  /**
   * Local Whisper transcription
   */
  private whisperTranscribe(audioPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('whisper', [
        audioPath,
        '--model', 'base',
        '--output_format', 'txt',
        '--output_dir', tmpdir(),
      ])

      let stderr = ''
      proc.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error(`Whisper failed: ${stderr}`))
          return
        }

        // Read the output file
        const { readFile } = await import('node:fs/promises')
        const { basename } = await import('node:path')
        const outputPath = join(tmpdir(), basename(audioPath, '.wav') + '.txt')

        try {
          const text = await readFile(outputPath, 'utf-8')
          resolve(text.trim())
        }
        catch (error) {
          reject(error)
        }
      })

      proc.on('error', reject)
    })
  }

  /**
   * OpenAI Whisper API transcription
   */
  private async openaiTranscribe(audioPath: string): Promise<string> {
    const apiKey = this.config.openaiKey
    if (!apiKey) throw new Error('OpenAI API key required for transcription')

    const { readFile } = await import('node:fs/promises')
    const audioData = await readFile(audioPath)

    const formData = new FormData()
    formData.append('file', new Blob([audioData]), 'audio.wav')
    formData.append('model', 'whisper-1')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`OpenAI transcription failed: ${response.status}`)
    }

    const result = await response.json() as { text: string }
    return result.text
  }

  /**
   * System transcription (macOS dictation)
   */
  private systemTranscribe(_audioPath: string): Promise<string> {
    // System-level dictation would require OS integration
    // This is a placeholder
    return Promise.reject(new Error('System transcription not implemented'))
  }

  /**
   * Check if voice features are available
   */
  async checkAvailability(): Promise<{
    stt: boolean
    tts: boolean
    features: string[]
  }> {
    const features: string[] = []
    let stt = false
    let tts = false

    // Check TTS
    if (process.platform === 'darwin') {
      tts = true
      features.push('macOS say')
    }
    else if (process.platform === 'linux') {
      try {
        await new Promise<void>((resolve, reject) => {
          const proc = spawn('which', ['espeak'])
          proc.on('close', (code) => code === 0 ? resolve() : reject())
          proc.on('error', reject)
        })
        tts = true
        features.push('espeak')
      }
      catch {
        // espeak not available
      }
    }

    // Check STT
    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('which', ['whisper'])
        proc.on('close', (code) => code === 0 ? resolve() : reject())
        proc.on('error', reject)
      })
      stt = true
      features.push('whisper')
    }
    catch {
      // whisper not available
    }

    // Check OpenAI keys
    if (this.config.openaiKey) {
      stt = true
      tts = true
      features.push('OpenAI Whisper', 'OpenAI TTS')
    }

    if (this.config.elevenlabsKey) {
      tts = true
      features.push('ElevenLabs TTS')
    }

    return { stt, tts, features }
  }

  /**
   * Get current state
   */
  get state(): { listening: boolean; speaking: boolean } {
    return {
      listening: this.isListening,
      speaking: this.isSpeaking,
    }
  }
}

/**
 * Create voice manager
 */
export function createVoiceManager(config: VoiceConfig = {}): VoiceManager {
  return new VoiceManager(config)
}
